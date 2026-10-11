# -*- coding: utf-8 -*-
"""Converte um bloco de maternidade das planilhas de indicadores para o formato
`blocos` que o painel consome (o mesmo que o painel antigo trazia para as 59).

Usado por build_dados.py para acrescentar as unidades EBSERH e QUALINEO.
"""
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.path.dirname(BASE), "Extracao_SINASC"))
import bloco_lib as B                                     # noqa: E402

# secao canonica (bloco_lib) -> chave usada no painel
CHAVES = {
    "res_regiao": "res_regiao", "res_uf": "res_uf", "prenatal": "prenatal",
    "trimestre": "trimestre", "peso": "peso", "p1500_uf": "p1500_uf",
    "gestacao": "gestacao", "via": "via", "assistencia": "assistencia",
    "apgar": "apgar", "robson": "robson_n", "robson_cesarea": "robson_taxa",
    "nv_territorio": "nv_territorio", "p1500_territorio": "p1500_territorio",
    "nv_residencia": "residentes_nv", "p1500_residencia": "residentes_p1500",
}
# nessas secoes o painel guarda o nivel territorial, nao o nome do territorio
NORMALIZA_TERRITORIO = {"nv_territorio", "p1500_territorio",
                        "nv_residencia", "p1500_residencia"}


def _nivel(lab):
    """'Nº Residentes na Macrorregião de Saúde - X' -> 'macro'"""
    n = B.norm(lab)
    if "MACRORREGIAO" in n:      return "macro"           # antes de REGIAO DE SAUDE
    if "REGIAO DE SAUDE" in n:   return "regiao_saude"
    if "MUNICIPIO" in n:         return "municipio"
    if re.search(r"\bUF\b", n):  return "uf"
    return None


def _num(v):
    if v is None or v == "":
        return 0
    if isinstance(v, (int, float)):
        return round(v, 4) if isinstance(v, float) else v
    try:
        f = float(str(v).replace(",", "."))
        return int(f) if f.is_integer() else round(f, 4)
    except ValueError:
        return 0


def converte(wb, bloco, anos):
    """{chave_painel: [[rotulo, [valores...]], ...]} + metadados de territorio"""
    ws = wb[bloco["aba"]]
    saida, territorio = {}, {}
    for i, sec in enumerate(bloco["secoes"]):
        canon = B.chave_secao(bloco["secoes"], i)
        chave = CHAVES.get(canon)
        if not chave:
            continue
        offs = [sec["anos"][a] for a in anos if a in sec["anos"]]
        tot = next((sec["anos"][k] for k in sec["anos"]
                    if str(k).lower().startswith("total")), None)
        if len(offs) != len(anos) or tot is None:
            continue
        linhas = []
        for lab, r in sec["linhas"]:
            l = lab.strip()
            if l.startswith("%") or l.startswith("*"):
                continue
            vals = [_num(ws.cell(r, bloco["col"] + o).value) for o in offs]
            vals.append(_num(ws.cell(r, bloco["col"] + tot).value))
            rot = l
            if canon in NORMALIZA_TERRITORIO:
                niv = _nivel(l)
                if niv:
                    rot = niv
                    # guarda o nome do territorio para o cabecalho do dossie
                    if canon == "nv_territorio" and " - " in l:
                        territorio[niv] = l.split(" - ", 1)[1].strip()
                elif canon in ("nv_residencia", "p1500_residencia"):
                    rot = "maternidade"
            linhas.append([rot, vals])
        saida[chave] = linhas
    return saida, territorio


def blocos_da_planilha(caminho, anos, cnes_alvo=None):
    """{cnes: (nome_do_bloco, aba, blocos, territorio)}"""
    wb = B.abrir(caminho, data_only=True)
    out = {}
    for b in B.ler_blocos(wb):
        if cnes_alvo and b["cnes"] not in cnes_alvo:
            continue
        blocos, terr = converte(wb, b, anos)
        out[b["cnes"]] = (b["nome"], b["aba"], blocos, terr)
    return out
