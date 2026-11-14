# -*- coding: utf-8 -*-
"""14/11/2026 - Correções da auditoria de consistência entre os painéis (pedido da coordenação: indicadores iguais
devem ter o mesmo valor em todos os painéis). Chamado pelo build_dados.py depois do passo 2c e ANTES da coluna do
período parcial (passo 2d), isto é, com as linhas no formato [2019 ... 2025, Total].

O que faz, sempre a partir dos microdados do SINASC já extraídos (Extracao_SINASC/saida/unidades_<ano>.json e
cache/municipios_<ano>.json, regionalização vigente de jun/2026, a mesma das malhas do painel):

  1. GRUPOS: `conjuntos` de cada unidade pela lista oficial de 09/09/2026 (lista_oficial_2026-09-09.csv, a mesma
     do painel de Habilitações): apoiada, ebserh, qualineo; unidade fora da lista entra como apoiada (anexo).
  2. TERRITÓRIO: linhas de município, região de saúde, macrorregião e UF (ocorrência e residência, todos e
     < 1.500 g) e a linha da UF da tabela de peso < 1.500 g passam a vir dos microdados em todos os anos de
     2019 a 2025. Nos anos em que a unidade ainda não tinha nascimentos, as linhas do território deixam de ficar
     zeradas (o território teve nascimentos); as linhas da própria unidade continuam 0.
  3. COMPLEXO HCFAMEMA: a unidade passa a somar os nascimentos dos dois códigos CNES (2025507 e 2025523) e ganha
     o campo cnesComplexo; antes só entravam os do 2025523.
  4. TOTAL: a coluna Total (acumulado 2019-2025) é refeita como soma dos anos nas linhas de contagem; nas linhas
     de taxa de cesariana por grupo de Robson e na fração da tabela de peso < 1.500 g, é recalculada.

Devolve a lista de alterações (cnes, unidade, bloco, linha, coluna, antes, depois), gravada pelo build em
ajustes_auditoria_2026-11-14.csv. Não altera célula que já confere com os microdados.
"""
import csv
import json
import os

import coluna_periodo as cp

BASE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(BASE)
EXT = os.path.join(PROJ, "Extracao_SINASC")
LISTA = os.path.join(BASE, "lista_oficial_2026-09-09.csv")
ANOS = [str(a) for a in range(2019, 2026)]
COMPLEXOS = cp.FONTES_CNES                            # código usado no painel -> códigos que formam a unidade
FICHA_COMPLEXO = {"2025507": "2025523"}
NOME_COMPLEXO = {"2025507": "Hospital das Clínicas da FAMEMA (complexo HCFAMEMA)"}   # igual a Mortalidade e Habilitações
TERR = ("nv_territorio", "p1500_territorio")
RESID = ("residentes_nv", "residentes_p1500")
ORDEM = ["apoiada", "ebserh", "qualineo"]


def grupos_oficiais():
    """CNES -> ['apoiada', 'ebserh', 'qualineo'] pela lista oficial (mesma leitura do painel de Habilitações)."""
    out = {}
    with open(LISTA, encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh, delimiter=";"):
            c = "".join(ch for ch in r["CNES"] if ch.isdigit()).zfill(7)
            gs = {{"APOIADA": "apoiada", "EXTRA": "apoiada", "EBSERH": "ebserh", "QUALINEO": "qualineo"}.get(t.strip().upper())
                  for t in r["TIPO_DE_APOIO"].split("/")}
            out[c] = [g for g in ORDEM if g in gs]
    return out


def _territorios():
    rs, mac = {}, {}
    with open(os.path.join(EXT, "municipio_territorios.csv"), encoding="utf-8-sig") as fh:
        for r in csv.DictReader(fh):
            rs[r["CO_MUNICIP"]] = r["CO_REGSAUD"]; mac[r["CO_MUNICIP"]] = r["CO_MACSAUD"]
    return rs, mac


def _totais_territorio(ano, codigos, rs, mac, _cache={}):
    """Totais de ocorrência (todos e < 1.500 g) do município, região de saúde, macrorregião e UF, direto do cache
    por município de ocorrência. Reproduz os campos oc_* de unidades_<ano>.json (conferido em 7.568 valores)."""
    if ano not in _cache:
        _cache[ano] = json.load(open(os.path.join(EXT, "cache", f"municipios_{ano}.json"), encoding="utf-8"))
    mu = _cache[ano]
    m, r_, mc = codigos["municipio"], codigos["regiao_saude"], codigos["macro"]
    out = {}
    for pref, base in (("oc_", mu["todos"]), ("oc1500_", mu["m1500"])):
        out[pref + "municipio"] = base.get(m, 0)
        out[pref + "rs"] = sum(v for k, v in base.items() if rs.get(k) == r_)
        out[pref + "macro"] = sum(v for k, v in base.items() if mac.get(k) == mc)
        out[pref + "uf"] = sum(v for k, v in base.items() if k[:2] == m[:2])
    return out


def entrada(unidades_ano, cnes):
    return cp.entrada_unidade(unidades_ano, cnes)       # no complexo, soma os dois códigos (território uma vez só)


def territorio_do_periodo(mats, periodo, col, sem_dados):
    """Coluna do período parcial: nas unidades sem registro no período, as linhas do território recebem o total
    do território (as linhas da própria unidade continuam vazias). `col` = posição da coluna do período."""
    rs, mac = _territorios()
    U = {a: cp.carregar_unidades(a) for a in ANOS}
    alt = []
    for mt in mats:
        if mt["cnes"] not in sem_dados:
            continue
        codigos = next((e for a in ANOS for e in [entrada(U[a], mt["cnes"])] if e), None)
        if not codigos:
            continue
        tt = _totais_territorio(periodo, codigos, rs, mac)
        for bloco, linhas in mt["blocos"].items():
            for idx, (rot, vals) in enumerate(linhas):
                if bloco in TERR and idx > 0:
                    chave = ("oc_" if bloco == "nv_territorio" else "oc1500_") + {"municipio": "municipio", "regiao_saude": "rs", "macro": "macro", "uf": "uf"}[cp.norm(rot)]
                elif bloco == "p1500_uf" and idx == 1:
                    chave = "oc1500_uf"
                else:
                    continue
                alt.append([mt["cnes"], mt["nome"], bloco, rot, periodo, vals[col], tt[chave], "território em período sem registro na unidade"])
                vals[col] = tt[chave]
    return alt


def aplicar(mats):
    """Aplica as correções em `mats` (linhas no formato [2019..2025, Total]). Devolve (alterações, resumo)."""
    U = {a: cp.carregar_unidades(a) for a in ANOS}
    rs, mac = _territorios()
    oficiais = grupos_oficiais()
    alt, resumo = [], {}

    def registra(mt, bloco, rot, col, antes, depois, motivo):
        if antes != depois:
            alt.append([mt["cnes"], mt["nome"], bloco, rot, col, antes, depois, motivo])
            resumo[motivo] = resumo.get(motivo, 0) + 1

    for mt in mats:
        cnes = mt["cnes"]
        # ---- 1. grupos
        cods = COMPLEXOS.get(cnes, [cnes])
        novo = next((oficiais[c] for c in cods if c in oficiais), ["apoiada"])
        if mt.get("conjuntos") != novo:
            registra(mt, "(cadastro)", "grupos", "", "+".join(mt.get("conjuntos", [])), "+".join(novo), "grupos pela lista oficial")
            mt["conjuntos"] = novo
        if cnes in COMPLEXOS:
            mt["cnesComplexo"] = sorted(COMPLEXOS[cnes])
            mt["cnesFicha"] = FICHA_COMPLEXO[cnes]      # ficha de cadastro exibida: a do código da lista oficial
            if mt["nome"] != NOME_COMPLEXO[cnes]:
                registra(mt, "(cadastro)", "nome", "", mt["nome"], NOME_COMPLEXO[cnes], "complexo HCFAMEMA")
                mt["nome"] = NOME_COMPLEXO[cnes]
        # códigos de território da unidade (de qualquer ano com registro)
        codigos = next((e for a in ANOS for e in [entrada(U[a], cnes)] if e), None)
        mexidos = set()
        for j, a in enumerate(ANOS):
            u = entrada(U[a], cnes)
            complexo = cnes in COMPLEXOS and sum(1 for c in COMPLEXOS[cnes] if c in U[a]) > 1
            tt = _totais_territorio(a, codigos, rs, mac) if (u is None and codigos) else None
            for bloco, linhas in mt["blocos"].items():
                for idx, linha in enumerate(linhas):
                    rot, vals = linha
                    antes = vals[j]
                    if u is None:
                        # ano sem nascimento na unidade: só as linhas do território ganham o valor do território
                        if tt and idx > 0 and bloco in TERR:
                            chave = ("oc_" if bloco == "nv_territorio" else "oc1500_") + {"municipio": "municipio", "regiao_saude": "rs", "macro": "macro", "uf": "uf"}[cp.norm(rot)]
                            vals[j] = tt[chave]
                            registra(mt, bloco, rot, a, antes, vals[j], "território em ano sem nascimento na unidade")
                        elif tt and bloco == "p1500_uf" and idx == 1:
                            vals[j] = tt["oc1500_uf"]
                            registra(mt, bloco, rot, a, antes, vals[j], "território em ano sem nascimento na unidade")
                        continue
                    territorial = (bloco in TERR and idx > 0) or (bloco in RESID and idx > 0) or (bloco == "p1500_uf" and idx >= 1)
                    if complexo or territorial or antes is None:
                        v = cp.valor_linha(bloco, rot, idx, u)
                        if bloco == "p1500_uf" and idx == 2 and antes is not None and abs(float(antes) - float(v)) <= 0.0006 and not complexo and (bloco, j) not in mexidos:
                            continue                      # fração já coerente com as duas linhas de cima
                        if antes != v: mexidos.add((bloco, j))
                        vals[j] = v
                        registra(mt, bloco, rot, a, antes, v,
                                 "complexo HCFAMEMA (soma dos dois códigos)" if complexo and not territorial else
                                 "célula vazia" if antes is None else "território pelos microdados")
                if complexo:      # UF de residência que só aparece no segundo código
                    for nome, v in cp.linhas_novas(bloco, [l[0] for l in linhas], u):
                        pos = next((i for i, l in enumerate(linhas) if cp.norm(l[0]) == "total"), len(linhas))
                        nova = [0] * (len(ANOS) + 1); nova[j] = v
                        linhas.insert(pos, [nome, nova])
                        registra(mt, bloco, nome, a, None, v, "complexo HCFAMEMA (soma dos dois códigos)")
        # ---- 4. coluna Total
        nt = len(ANOS)
        for bloco, linhas in mt["blocos"].items():
            for idx, linha in enumerate(linhas):
                rot, vals = linha
                antes = vals[nt]
                if bloco == "robson_taxa":
                    if cnes not in COMPLEXOS:
                        continue
                    r = cp.ALIAS_ROTULO.get(cp.norm(rot), cp.norm(rot)); n = c = 0
                    for a in ANOS:
                        u = entrada(U[a], cnes)
                        if not u: continue
                        n += u["total"] if r == "total" else cp._dict_norm(u["robson"]).get(r, 0)
                        c += cp._soma(u["robson_ces"]) if r == "total" else cp._dict_norm(u["robson_ces"]).get(r, 0)
                    novo_t = round(100.0 * c / n, 1) if n else 0
                elif bloco == "p1500_uf" and idx == 2:
                    a0, a1 = linhas[0][1][nt], linhas[1][1][nt]
                    novo_t = round(a0 / a1, 4) if a1 else 0
                else:
                    ok = [v for v in vals[:nt] if v is not None]
                    novo_t = sum(ok) if ok else None
                if antes != novo_t and not (isinstance(antes, float) and isinstance(novo_t, float) and abs(antes - novo_t) < 1e-9):
                    vals[nt] = novo_t
                    registra(mt, bloco, rot, "Total", antes, novo_t, "coluna Total refeita")
    return alt, resumo
