# -*- coding: utf-8 -*-
"""Consolida as unidades dos três painéis e as suas habilitações do CNES para o Painel de Habilitações.

    py build_dados.py           (ou, de uma vez, py montar_painel.py, que chama esta consolidação)

Lê, nas pastas vizinhas nascimentos/, internacao/ e mortalidade/, o dados.json (lista de unidades e grupos) e o
cnes_dados.json (ficha CNES e habilitações, atualizados na nuvem pelo workflow "Atualizar CNES") e grava aqui:

- cnes_dados.json          ficha completa de cada unidade da união dos três painéis (mesmo formato dos outros painéis)
- dados_habilitacoes.js    const GEO = {...} (malhas de UF, macrorregiões e regiões de saúde, copiadas do painel de
                           Mortalidade) e const DADOS = {...}: unidades com grupos, ids de malha, ficha resumida e habilitações

Regras de composição (ver README.md):
- A união dos três painéis define as unidades (um registro por código CNES).
- Os grupos (Apoiadas, HU Brasil, QUALINEO) vêm da lista oficial de maternidades por grupo de 09/09/2026, guardada em
  lista_oficial_2026-09-09.csv (planilha LISTA_MATERNIDADES_POR_GRUPO_09092026 da coordenação, conferida em
  29/10/2026): TIPO_DE_APOIO "APOIADA", "APOIADA/EXTRA", "EBSERH", "QUALINEO" e combinações com "/". Unidade fora da
  lista (anexo) fica com oficial = false e com os grupos lidos dos painéis (Mortalidade, depois Internação, depois
  Nascimentos; "estrategica" vale como "apoiada").
- Ficha e habilitações: o registro do CNES com a data de atualização mais recente entre as cópias dos três painéis.
- Ids de malha (geo.rs, geo.macro): os resolvidos no painel de Mortalidade; para as demais unidades, pelo nome da região
  de saúde e da macrorregião (mesma heurística do painel), na UF da unidade.
"""
import json, os, re
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(BASE)
PAINEIS = ["mortalidade", "internacao", "nascimentos"]          # ordem de prioridade para grupos e nomes
GRUPOS = {"apoiada": "Apoiadas", "ebserh": "HU Brasil", "qualineo": "QUALINEO"}   # só o nome do grupo; EBSERH passou a HU Brasil (14/11/2026)
NORMALIZA_GRUPO = {"estrategica": "apoiada", "apoiadas": "apoiada"}
# Unidades retiradas deste painel por decisão da coordenação (continuam nos painéis de origem até serem retiradas lá).
# (O Hospital do Rocio/PR, 0013846, foi retirado daqui em 30/10/2026 e, em 13/11/2026, também do painel de Mortalidade.)
EXCLUIR = {}
# Complexos (13/11/2026, igualação das unidades entre os painéis): códigos CNES que formam UMA unidade. Chave = código
# secundário, valor = código principal (o da lista oficial). FAMEMA, Marília/SP: 2025507 (hospital adulto, usado nos
# painéis de Nascimentos e de Internação) e 2025523 (materno-infantil, lista oficial e painel de Mortalidade).
COMPLEXOS = {"2025507": "2025523"}
# Universo (13/11/2026, pedido da coordenação): todos os estabelecimentos com leitos obstétricos e/ou neonatais SUS,
# montado por build_universo.py a partir dos arquivos do CNES no DATASUS (leitos, habilitações e cadastro da mesma
# competência). As unidades acompanhadas continuam em DADOS.maternidades, com a ficha e as habilitações da consulta ao
# CNES; as demais vão para DADOS.demais, em formato compacto (ver README.md).
UNIVERSO = os.path.join(BASE, "universo_cnes.json")
LEITOS_OBST = ("10", "43")


def _carrega_universo():
    return json.load(open(UNIVERSO, encoding="utf-8")) if os.path.exists(UNIVERSO) else None


def _carrega(painel):
    d = json.load(open(os.path.join(RAIZ, painel, "dados.json"), encoding="utf-8"))
    c = json.load(open(os.path.join(RAIZ, painel, "cnes_dados.json"), encoding="utf-8"))
    return d, c


def _grupos(u):
    gs = []
    for g in (u.get("conjuntos") or []):
        g = NORMALIZA_GRUPO.get(g, g)
        if g in GRUPOS and g not in gs:
            gs.append(g)
    return gs


def _ficha(info):
    """Resumo da ficha CNES para o painel (o cnes_dados.json guarda a ficha completa)."""
    cep = str(info.get("codigo_cep_estabelecimento") or "")
    cep = re.sub(r"^(\d{5})(\d{3})$", r"\1-\2", cep) if cep else None
    estruturas = []
    if info.get("estabelecimento_possui_centro_obstetrico"): estruturas.append("Centro obstétrico")
    if info.get("estabelecimento_possui_centro_neonatal"): estruturas.append("Centro neonatal")
    if info.get("estabelecimento_possui_centro_cirurgico"): estruturas.append("Centro cirúrgico")
    if info.get("estabelecimento_possui_atendimento_hospitalar"): estruturas.append("Atendimento hospitalar")
    if info.get("estabelecimento_faz_atendimento_ambulatorial_sus") == "SIM": estruturas.append("Atendimento ambulatorial SUS")
    return {
        "razao": info.get("nome_razao_social"),
        "fantasia": info.get("nome_fantasia"),
        "cnpj": info.get("numero_cnpj") or info.get("numero_cnpj_entidade"),
        "esfera": info.get("descricao_esfera_administrativa"),
        "gestao": (info.get("tipo_gestao") or "").strip() or None,
        "endereco": ", ".join(x for x in [info.get("endereco_estabelecimento"), info.get("numero_estabelecimento")] if x) or None,
        "bairro": info.get("bairro_estabelecimento"),
        "cep": cep,
        "telefone": info.get("numero_telefone_estabelecimento"),
        "email": info.get("endereco_email_estabelecimento"),
        "turno": info.get("descricao_turno_atendimento"),
        "estruturas": estruturas,
        "atualizacao": info.get("data_atualizacao"),
        "id": info.get("codigo_estabelecimento_saude"),
    }


def _habilitacao(h):
    leitos = h.get("nuLeitos")
    try:
        leitos = int(leitos) if leitos not in (None, "") else 0
    except ValueError:
        leitos = 0
    return {
        "co": str(h.get("coGrupo") or "").strip(),
        "ds": (h.get("dsGrupo") or "").strip(),
        "ini": h.get("dtCompInicio"),
        "fim": h.get("dtCompFim"),
        "portaria": (h.get("portaria") or "").strip() or None,
        "dtPortaria": h.get("dtPortaria"),
        "leitos": leitos,
        "origem": h.get("tpOrigem") or None,
    }


def _carrega_geo():
    """Malhas (const GEO) do painel de Mortalidade, com o de Nascimentos como reserva."""
    for p, arq in (("mortalidade", "dados_mortalidade.js"), ("nascimentos", "dados_nv2026.js")):
        caminho = os.path.join(RAIZ, p, arq)
        if os.path.exists(caminho):
            js = open(caminho, encoding="utf-8").read()
            i = js.find("const GEO = ")
            if i >= 0:
                return json.JSONDecoder().raw_decode(js, i + len("const GEO = "))[0]
    return None


def _norm_terr(s):
    import unicodedata
    s = unicodedata.normalize("NFD", str(s or "")).encode("ascii", "ignore").decode().upper()
    s = re.sub(r"MACRORREGIONAL|MACRORREGIAO|MACROREGIAO|MACRO|REGIAO DE SAUDE|REGIONAL|\bRS\b|SAUDE|\bDE\b|\bDA\b|\bDO\b|\bE\b|\bUNICA\b|[^A-Z0-9 ]", " ", s)
    return set(s.split())


def _resolve_geo(geo, uf, nome_rs, nome_macro):
    """Ids da região de saúde e da macrorregião pelo nome, na UF (heurística do painel de Mortalidade)."""
    saida = {}
    for nivel, alvo in (("rs", nome_rs), ("macro", nome_macro)):
        A = _norm_terr(alvo)
        if not A:
            continue
        melhor, nota = None, 0
        for t in geo["niveis"][nivel]:
            m = re.search(r"-\s*([A-Z]{2})\s*$", t["nome"] or "")
            if not m or m.group(1) != uf:
                continue
            B = _norm_terr(t["nome"])
            inter = len(A & B)
            if inter and inter / min(len(A), len(B)) >= 0.5 and inter > nota:
                melhor, nota = t["id"], inter
        if melhor is not None:
            saida[nivel] = melhor
    return saida


def _lista_oficial():
    """{cnes: {"grupos": [...], "tipo": str, "nome": str}} da lista oficial de 09/09/2026 (csv ao lado deste script)."""
    import csv
    caminho = os.path.join(BASE, "lista_oficial_2026-09-09.csv")
    if not os.path.exists(caminho):
        return {}
    saida = {}
    with open(caminho, encoding="utf-8", newline="") as fh:
        for r in csv.DictReader(fh, delimiter=";"):
            gs = []
            for t in (r.get("TIPO_DE_APOIO") or "").upper().replace(" ", "").split("/"):
                g = {"APOIADA": "apoiada", "EXTRA": "apoiada", "EBSERH": "ebserh", "QUALINEO": "qualineo"}.get(t)
                if g and g not in gs:
                    gs.append(g)
            saida[str(r["CNES"]).strip().zfill(7)] = {"grupos": gs, "tipo": r.get("TIPO_DE_APOIO"), "nome": r.get("ESTABELECIMENTO")}
    return saida


def consolidar(verboso=True):
    oficial = _lista_oficial()
    dados, cnes = {}, {}
    for p in PAINEIS:
        dados[p], cnes[p] = _carrega(p)
    unidades, consultas = {}, {}
    for p in PAINEIS:
        consultas[p] = cnes[p].get("_atualizado_em")
        for u in dados[p]["maternidades"]:
            c0 = u["cnes"]
            if c0 in EXCLUIR:
                continue
            c = COMPLEXOS.get(c0, c0)                    # os códigos de um complexo formam uma única unidade
            reg = unidades.setdefault(c, {"cnes": c, "paineis": [], "codigos": [c]})
            if p not in reg["paineis"]:
                reg["paineis"].append(p)
            for cod in [c0] + list(u.get("cnesComplexo") or []):
                if cod not in reg["codigos"]:
                    reg["codigos"].append(cod)
            if "nome" not in reg:                      # primeiro painel na ordem de prioridade define nome e grupos
                t = u.get("territorio") or {}
                reg.update({
                    "nome": u["nome"], "uf": u.get("uf"), "regiao": u.get("regiao"),
                    "municipio": t.get("municipio"), "regiaoSaude": t.get("regiao_saude"), "macro": t.get("macro"),
                    "lat": u.get("lat"), "lon": u.get("lon"),
                    "grupos": _grupos(u),
                    "oficial": u.get("oficial"),
                    "listaOrigem": p,
                })
                if u.get("cnesComplexo"):
                    reg["complexo"] = list(u["cnesComplexo"])
            if not reg.get("geo") and u.get("geo"):
                reg["geo"] = {k: v for k, v in u["geo"].items() if v is not None}
            if not reg.get("grupos"):
                reg["grupos"] = _grupos(u)
            if reg.get("oficial") is None and u.get("oficial") is not None:
                reg["oficial"] = u.get("oficial")
    # ficha e habilitações: a cópia mais recente entre os três painéis
    fichas = {}
    for c in sorted({cod for reg in unidades.values() for cod in reg["codigos"]}):
        candidatos = [cnes[p][c] for p in PAINEIS if c in cnes[p] and cnes[p][c]]
        if not candidatos:
            continue
        candidatos.sort(key=lambda i: (i.get("data_atualizacao") or "", len(i.get("habilitacoes") or [])), reverse=True)
        fichas[c] = candidatos[0]
    for c, reg in unidades.items():
        codigos = sorted(reg.pop("codigos"))
        if len(codigos) > 1:
            reg["complexo"] = codigos
        info = fichas.get(c) or next((fichas[x] for x in codigos if x in fichas), None)
        if oficial:                                   # lista oficial manda nos grupos e na marca de anexo
            if c in oficial:
                reg["grupos"] = [g for g in GRUPOS if g in oficial[c]["grupos"]]
                reg["tipoApoio"] = oficial[c]["tipo"]
                reg["oficial"] = True
            else:
                reg["oficial"] = False
        elif reg.get("oficial") is None:
            reg["oficial"] = True
        reg["ficha"] = _ficha(info) if info else None
        habs = []
        for cod in codigos:                           # complexo: habilitações de todos os códigos, cada uma com o seu
            for h in ((fichas.get(cod) or {}).get("habilitacoes") or []):
                hh = _habilitacao(h)
                if len(codigos) > 1:
                    hh["cnes"] = cod
                habs.append(hh)
        habs.sort(key=lambda h: (h["co"], h["ini"] or ""))
        reg["habilitacoes"] = habs
        reg["paineis"] = sorted(reg["paineis"], key=["nascimentos", "internacao", "mortalidade"].index)
    # ids de malha para as unidades sem geo (pelo nome da região de saúde e da macrorregião, na UF)
    geo = _carrega_geo()
    if geo:
        for reg in unidades.values():
            if not reg.get("geo") or "rs" not in reg["geo"]:
                r = _resolve_geo(geo, reg.get("uf"), reg.get("regiaoSaude"), reg.get("macro"))
                reg["geo"] = {**r, **(reg.get("geo") or {})}
    # universo: leitos SUS, tipo e natureza jurídica das unidades acompanhadas; demais unidades em formato compacto
    uni = _carrega_universo()
    demais, municipios_usados = [], {}
    if uni:
        codigos_acomp = set()
        for reg in unidades.values():
            codigos = reg.get("complexo") or [reg["cnes"]]
            codigos_acomp.update(codigos)
            us = [uni["unidades"][c] for c in codigos if c in uni["unidades"]]
            lt = Counter()
            for u in us:
                for cod, (_, sus) in u["l"].items():
                    lt[cod] += sus
            reg["leitos"] = {cod: n for cod, n in sorted(lt.items()) if n}
            principal = uni["unidades"].get(reg["cnes"]) or (us[0] if us else None)
            if principal:
                reg["tipo"] = uni["tiposEstabelecimento"].get(principal["tp"])
                reg["natureza"] = uni["esferas"].get(principal["nj"])
        for c, u in sorted(uni["unidades"].items(), key=lambda kv: (kv[1]["uf"], kv[1]["n"] or "", kv[0])):
            if c in codigos_acomp:
                continue
            municipios_usados[u["m"]] = uni["municipios"][u["m"]]
            demais.append({"c": c, "n": u["n"], "u": u["uf"], "m": u["m"], "tp": u["tp"], "g": u["g"], "nj": u["nj"], "cep": u["cep"],
                           "at": u["at"], "e": u["e"], "l": {cod: v[1] for cod, v in u["l"].items() if v[1]}, "h": u["h"]})

    # catálogo dos tipos de habilitação: descrição (a da consulta ao CNES, quando existe; senão a da tabela do DATASUS),
    # nº de unidades (todas e acompanhadas), leitos somados e origem (a mesma em todos os registros do código na consulta)
    desc, n_unid, n_acomp, leitos, origens = {}, Counter(), Counter(), Counter(), {}
    for reg in unidades.values():
        vistos = set()
        for h in reg["habilitacoes"]:
            desc.setdefault(h["co"], Counter())[h["ds"]] += 1
            leitos[h["co"]] += h["leitos"]
            origens.setdefault(h["co"], set()).add(h["origem"])
            if h["co"] not in vistos:
                n_unid[h["co"]] += 1; n_acomp[h["co"]] += 1; vistos.add(h["co"])
    mistas = sorted(co for co, o in origens.items() if len(o) > 1)
    if mistas:
        raise SystemExit(f"códigos com mais de uma origem na consulta ao CNES: {mistas}")
    for u in demais:
        vistos = set()
        for h in u["h"]:
            leitos[h[0]] += h[5]
            if h[0] not in vistos:
                n_unid[h[0]] += 1; vistos.add(h[0])
    ds_datasus = (uni or {}).get("habilitacoes") or {}
    tipos = []
    for co in sorted(n_unid):
        ds = desc[co].most_common(1)[0][0] if co in desc else ds_datasus.get(co)
        tipos.append({"co": co, "ds": ds or "Descrição não disponível nas tabelas do CNES", "n": n_unid[co], "nAcomp": n_acomp[co],
                      "leitos": leitos[co],
                      # origem: "P" = gestor estadual ou municipal; "N" = demais registros da consulta (Ministério da Saúde);
                      # None = código que não ocorre nas unidades acompanhadas (os arquivos do DATASUS não trazem o campo)
                      "origem": ("P" if "P" in origens[co] else "N") if co in origens else None})

    lista = sorted(unidades.values(), key=lambda r: (r.get("uf") or "", r["nome"]))
    consulta = max(v for v in consultas.values() if v) if any(consultas.values()) else None
    DADOS = {
        "painel": "habilitacoes",
        "consultaCnes": consulta,
        "consultasPorPainel": consultas,
        "listaOficial": "LISTA MATERNIDADES POR GRUPO_09092026" if oficial else next((dados[p].get("listaOficial") for p in PAINEIS if dados[p].get("listaOficial")), None),
        "listaOficialN": len(oficial) or None,
        "excluidas": EXCLUIR,
        "unidadesPorPainel": {p: len(dados[p]["maternidades"]) for p in PAINEIS},
        "grupos": GRUPOS,
        "tipos": tipos,
        "maternidades": lista,
    }
    if uni:
        DADOS["universo"] = {k: uni[k] for k in ("competencia", "baixadoEm", "publicadoNoFTP", "baseTerritorial", "criterio", "contagem")}
        DADOS["tiposEstab"] = uni["tiposEstabelecimento"]
        DADOS["esferas"] = uni["esferas"]
        DADOS["municipios"] = municipios_usados          # código -> [nome, região de saúde, macrorregião, lat e lon da sede]
        DADOS["demais"] = demais
    # cnes_dados.json consolidado (ficha completa, mesmo formato dos outros painéis)
    saida_cnes = {"_atualizado_em": consulta}
    for reg in lista:
        for cod in (reg.get("complexo") or [reg["cnes"]]):
            if cod in fichas:
                saida_cnes[cod] = fichas[cod]
    with open(os.path.join(BASE, "cnes_dados.json"), "w", encoding="utf-8") as fh:
        json.dump(saida_cnes, fh, ensure_ascii=False, indent=1)
    with open(os.path.join(BASE, "dados_habilitacoes.js"), "w", encoding="utf-8") as fh:
        fh.write("/* gerado por build_dados.py: unidades dos três painéis com ficha CNES resumida e habilitações */\n")
        if geo:
            fh.write("const GEO = " + json.dumps(geo, ensure_ascii=False, separators=(",", ":")) + ";\n")
        fh.write("const DADOS = " + json.dumps(DADOS, ensure_ascii=False, separators=(",", ":")) + ";\n")
    if verboso:
        n_habs = sum(len(r["habilitacoes"]) for r in lista)
        por_grupo = {g: sum(1 for r in lista if g in r["grupos"]) for g in GRUPOS}
        sem = [r["nome"] for r in lista if not r["habilitacoes"]]
        faltam = sorted(set(oficial) - set(unidades))
        if faltam:
            print("AVISO: unidades da lista oficial ausentes nos painéis:", faltam)
        print(f"lista oficial: {len(oficial)} CNES; anexos (fora da lista): {sum(1 for r in lista if r['oficial'] is False)}; "
              f"retiradas por decisão da coordenação: {len(EXCLUIR)}")
        print(f"{len(lista)} unidades (união dos painéis {dict(DADOS['unidadesPorPainel'])}), grupos {por_grupo}, "
              f"{len(fichas)} fichas CNES, {n_habs} habilitações de {len(tipos)} tipos; consulta ao CNES em {consulta}")
        if sem:
            print("sem habilitação registrada:", "; ".join(sem))
        if uni:
            sem_leito = [r["nome"] for r in lista if not r.get("leitos")]
            print(f"universo (competência {uni['competencia']}): {uni['contagem']['universo']} estabelecimentos com leitos obstétricos ou "
                  f"neonatais SUS; {len(lista)} acompanhadas + {len(demais)} demais = {len(lista) + len(demais)} unidades no painel; "
                  f"{sum(len(u['h']) for u in demais)} habilitações nas demais ({sum(1 for u in demais if not u['h'])} sem nenhuma); "
                  f"{len(tipos)} tipos no catálogo; acompanhadas sem esses leitos no arquivo: {sem_leito}")
        else:
            print("AVISO: universo_cnes.json não encontrado; o painel fica só com as unidades acompanhadas")
        sem_geo = [f"{r['nome']} ({r['uf']})" for r in lista if not (r.get("geo") or {}).get("rs")]
        if sem_geo:
            print("AVISO: sem região de saúde na malha:", "; ".join(sem_geo))
        if not geo:
            print("AVISO: malhas (GEO) não encontradas nos painéis vizinhos; o mapa do Brasil ficará sem malha")
        sem_grupo = [r["nome"] for r in lista if not r["grupos"]]
        if sem_grupo:
            print("AVISO: unidades sem grupo:", "; ".join(sem_grupo))
    return DADOS


if __name__ == "__main__":
    consolidar()
