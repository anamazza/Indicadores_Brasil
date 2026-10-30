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
- Os grupos (apoiada, EBSERH, QUALINEO) vêm da lista oficial de maternidades por grupo de 09/09/2026, guardada em
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
GRUPOS = {"apoiada": "Maternidades apoiadas (estratégicas)", "ebserh": "Unidades EBSERH", "qualineo": "QUALINEO 2026/2027"}
NORMALIZA_GRUPO = {"estrategica": "apoiada", "apoiadas": "apoiada"}
# Unidades retiradas deste painel por decisão da coordenação (continuam nos painéis de origem até serem retiradas lá).
EXCLUIR = {
    "0013846": "Hospital do Rocio (PR): retirado em 30/10/2026 a pedido da coordenação; anexo só do painel de Mortalidade",
}


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
            c = u["cnes"]
            if c in EXCLUIR:
                continue
            reg = unidades.setdefault(c, {"cnes": c, "paineis": []})
            reg["paineis"].append(p)
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
    for c in unidades:
        candidatos = [cnes[p][c] for p in PAINEIS if c in cnes[p] and cnes[p][c]]
        if not candidatos:
            continue
        candidatos.sort(key=lambda i: (i.get("data_atualizacao") or "", len(i.get("habilitacoes") or [])), reverse=True)
        fichas[c] = candidatos[0]
    for c, reg in unidades.items():
        info = fichas.get(c)
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
        habs = [_habilitacao(h) for h in (info.get("habilitacoes") or [])] if info else []
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
    # catálogo dos tipos de habilitação (código -> descrição mais frequente, nº de unidades, leitos somados)
    desc, n_unid, leitos = {}, Counter(), Counter()
    for reg in unidades.values():
        vistos = set()
        for h in reg["habilitacoes"]:
            desc.setdefault(h["co"], Counter())[h["ds"]] += 1
            leitos[h["co"]] += h["leitos"]
            if h["co"] not in vistos:
                n_unid[h["co"]] += 1; vistos.add(h["co"])
    tipos = [{"co": co, "ds": desc[co].most_common(1)[0][0], "n": n_unid[co], "leitos": leitos[co]} for co in sorted(desc)]

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
    # cnes_dados.json consolidado (ficha completa, mesmo formato dos outros painéis)
    saida_cnes = {"_atualizado_em": consulta}
    for reg in lista:
        if reg["cnes"] in fichas:
            saida_cnes[reg["cnes"]] = fichas[reg["cnes"]]
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
