# -*- coding: utf-8 -*-
"""Extrai as fichas de metodologia de um painel (painel_app.js) para JSON: INDS (id, rot, desc, fonte, sentido,
meta, unidade, eixo), CALCULOS (n, d, obs) e FICHAS_EXTRAS (rot, desc, n, d, fonte).
Uso: py -I extrai_fichas_painel.py <painel_app.js> <saida.json>"""
import json, re, sys

js = open(sys.argv[1], encoding="utf-8").read()


def bloco(nome):
    i = js.index("const " + nome + " = ")
    fim = "\n];" if js[i + len("const " + nome + " = ")] == "[" else "\n};"
    return js[i:js.index(fim, i)]


def campo(txt, nome):
    m = re.search(r'(?<![A-Za-z_])' + nome + r':"((?:[^"\\]|\\.)*)"', txt)
    return m.group(1).replace('\\"', '"') if m else None


def entradas(texto):
    """Divide um array JS de objetos {…} pelas entradas de nível 1 (aninhamento de chaves)."""
    saida, nivel, ini = [], 0, None
    i = 0
    while i < len(texto):
        c = texto[i]
        if c == '"':                       # pula strings
            j = i + 1
            while j < len(texto) and texto[j] != '"':
                if texto[j] == "\\": j += 1
                j += 1
            i = j + 1; continue
        if c == "{":
            if nivel == 0: ini = i
            nivel += 1
        elif c == "}":
            nivel -= 1
            if nivel == 0 and ini is not None:
                saida.append(texto[ini:i + 1]); ini = None
        i += 1
    return saida


inds = []
for ent in entradas(bloco("INDS")):
    meta = re.search(r"\bmeta:([0-9.]+)", ent)
    inds.append({"id": campo(ent, "id"), "rot": campo(ent, "rot"), "eixo": campo(ent, "eixo"),
                 "sentido": campo(ent, "sentido"), "meta": meta.group(1) if meta else None,
                 "unidade": campo(ent, "unidade"), "fonte": campo(ent, "fonte"), "desc": campo(ent, "desc"),
                 "alias": campo(ent, "alias")})

calc = {}
try:
    corpo = bloco("CALCULOS")
    for m in re.finditer(r"\n  (\w+):\{", corpo):
        ini = m.end() - 1; nivel = 0; j = ini
        while j < len(corpo):
            if corpo[j] == '"':
                k = j + 1
                while k < len(corpo) and corpo[k] != '"':
                    if corpo[k] == "\\": k += 1
                    k += 1
                j = k + 1; continue
            if corpo[j] == "{": nivel += 1
            elif corpo[j] == "}":
                nivel -= 1
                if nivel == 0: break
            j += 1
        ent = corpo[ini:j + 1]
        calc[m.group(1)] = {"n": campo(ent, "n"), "d": campo(ent, "d"), "obs": campo(ent, "obs")}
except ValueError:
    pass

extras = []
try:
    for ent in entradas(bloco("FICHAS_EXTRAS")):
        extras.append({"rot": campo(ent, "rot"), "desc": campo(ent, "desc"), "n": campo(ent, "n"),
                       "d": campo(ent, "d"), "fonte": campo(ent, "fonte")})
except ValueError:
    pass

fontes = []
fm = re.search(r"const fontes = \[(.*?)\n  \];", js, re.S)
if fm:
    fontes = [[a, b.replace('\\"', '"')] for a, b in re.findall(r'\["([^"]+)", "((?:[^"\\]|\\.)*)"\]', fm.group(1))]

json.dump({"inds": inds, "calculos": calc, "extras": extras, "fontes": fontes},
          open(sys.argv[2], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("INDS:", len(inds), "| CALCULOS:", len(calc), "| EXTRAS:", len(extras), "| fontes:", len(fontes))
print("sem ficha de cálculo:", [i["id"] for i in inds if i["id"] not in calc])
print("eixos:", sorted({i["eixo"] for i in inds if i["eixo"]}))
