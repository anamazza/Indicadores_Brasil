# -*- coding: utf-8 -*-
"""Consolida as unidades dos três painéis e as suas habilitações do CNES para o Painel de Habilitações.

    py build_dados.py           (ou, de uma vez, py montar_painel.py, que chama esta consolidação)

Lê, nas pastas vizinhas nascimentos/, internacao/ e mortalidade/, o dados.json (lista de unidades e grupos) e o
cnes_dados.json (ficha CNES e habilitações, atualizados na nuvem pelo workflow "Atualizar CNES") e grava aqui:

- cnes_dados.json          ficha completa de cada unidade da união dos três painéis (mesmo formato dos outros painéis)
- dados_habilitacoes.js    const DADOS = {...} embutido no painel: unidades com grupos, ficha resumida e habilitações

Regras de composição (ver README.md):
- A união dos três painéis define as unidades (um registro por código CNES).
- Os grupos (apoiada, EBSERH, QUALINEO) seguem a lista oficial de maternidades por grupo de 09/09/2026, como nos
  painéis de Internação e de Mortalidade: a classificação é lida primeiro do painel de Mortalidade, depois do de
  Internação e, só se a unidade não estiver em nenhum deles, do de Nascimentos ("estrategica" vale como "apoiada").
- Unidades fora da lista oficial (acrescentadas pela coordenação) ficam marcadas como complementares (oficial = false).
- Ficha e habilitações: o registro do CNES com a data de atualização mais recente entre as cópias dos três painéis.
"""
import json, os, re
from collections import Counter

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(BASE)
PAINEIS = ["mortalidade", "internacao", "nascimentos"]          # ordem de prioridade para grupos e nomes
GRUPOS = {"apoiada": "Maternidades apoiadas (estratégicas)", "ebserh": "Unidades EBSERH", "qualineo": "QUALINEO 2026/2027"}
NORMALIZA_GRUPO = {"estrategica": "apoiada", "apoiadas": "apoiada"}


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


def consolidar(verboso=True):
    dados, cnes = {}, {}
    for p in PAINEIS:
        dados[p], cnes[p] = _carrega(p)
    unidades, consultas = {}, {}
    for p in PAINEIS:
        consultas[p] = cnes[p].get("_atualizado_em")
        for u in dados[p]["maternidades"]:
            c = u["cnes"]
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
        if reg.get("oficial") is None:
            reg["oficial"] = True
        reg["ficha"] = _ficha(info) if info else None
        habs = [_habilitacao(h) for h in (info.get("habilitacoes") or [])] if info else []
        habs.sort(key=lambda h: (h["co"], h["ini"] or ""))
        reg["habilitacoes"] = habs
        reg["paineis"] = sorted(reg["paineis"], key=["nascimentos", "internacao", "mortalidade"].index)
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
        "listaOficial": next((dados[p].get("listaOficial") for p in PAINEIS if dados[p].get("listaOficial")), None),
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
        fh.write("const DADOS = " + json.dumps(DADOS, ensure_ascii=False, separators=(",", ":")) + ";\n")
    if verboso:
        n_habs = sum(len(r["habilitacoes"]) for r in lista)
        por_grupo = {g: sum(1 for r in lista if g in r["grupos"]) for g in GRUPOS}
        sem = [r["nome"] for r in lista if not r["habilitacoes"]]
        print(f"{len(lista)} unidades (união dos painéis {dict(DADOS['unidadesPorPainel'])}), grupos {por_grupo}, "
              f"{len(fichas)} fichas CNES, {n_habs} habilitações de {len(tipos)} tipos; consulta ao CNES em {consulta}")
        if sem:
            print("sem habilitação registrada:", "; ".join(sem))
        sem_grupo = [r["nome"] for r in lista if not r["grupos"]]
        if sem_grupo:
            print("AVISO: unidades sem grupo:", "; ".join(sem_grupo))
    return DADOS


if __name__ == "__main__":
    consolidar()
