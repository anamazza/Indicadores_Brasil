# -*- coding: utf-8 -*-
"""Auditoria das coordenadas dos pontos de mapa dos painéis (unidades acompanhadas e pontos de contexto).

    py auditar_coordenadas.py            audita e grava coordenadas_corrigidas.json e o relatório em relatorios/

Teste: cada ponto deve cair dentro do próprio município, pela malha municipal oficial do IBGE (API de malhas, WGS 84,
baixada uma vez para .cache_ibge/). O município de cada estabelecimento vem do cadastro CNES (habilitacoes/
cnes_dados.json e habilitacoes/universo_cnes.json). Um ponto a mais de 3 km fora do próprio município tem a coordenada
do cadastro errada; no lugar dela os painéis passam a usar a sede do município (base territorial do Ministério da
Saúde, a mesma do Painel de Habilitações). Até 3 km de diferença é tolerância de limite e de litoral.

As coordenadas dos painéis nascem no build_dados.py do Painel de Nascimentos, que aplica o coordenadas_corrigidas.json;
os painéis de Internação, Mortalidade e Habilitações herdam dele."""
import glob, json, math, os, sys, time, unicodedata, urllib.request
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))
sys.stdout.reconfigure(encoding="utf-8")
CACHE = os.path.join(BASE, ".cache_ibge")
UFS = "RO AC AM RR PA AP TO MA PI CE RN PB PE AL SE BA MG ES RJ SP PR SC RS MS MT GO DF".split()
COD_UF = dict(zip("11 12 13 14 15 16 17 21 22 23 24 25 26 27 28 29 31 32 33 35 41 42 43 50 51 52 53".split(), UFS))
TOLERANCIA_KM = 3.0


def baixa_malhas():
    os.makedirs(CACHE, exist_ok=True)
    for uf in UFS:
        arq = os.path.join(CACHE, uf + ".json")
        if os.path.exists(arq) and os.path.getsize(arq) > 1000:
            continue
        url = f"https://servicodados.ibge.gov.br/api/v3/malhas/estados/{uf}?formato=application/vnd.geo%2Bjson&qualidade=intermediaria&intrarregiao=municipio"
        for tent in range(4):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "auditoria-mapas/1.0"})
                open(arq, "wb").write(urllib.request.urlopen(req, timeout=90).read())
                break
            except Exception as e:
                print(f"  {uf}: tentativa {tent + 1} falhou ({type(e).__name__})")
                time.sleep(4)
        else:
            sys.exit(f"ERRO: não foi possível baixar a malha de {uf} do IBGE")
        time.sleep(.4)


def carrega_malhas():
    pol = {}
    for a in glob.glob(os.path.join(CACHE, "*.json")):
        for f in json.load(open(a, encoding="utf-8"))["features"]:
            g = f["geometry"]
            polis = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
            pol[str(f["properties"]["codarea"])[:6]] = [r for p in polis for r in p]
    return pol


def dentro(rings, lon, lat):
    c = False
    for r in rings:
        for i in range(len(r) - 1):
            x1, y1, x2, y2 = r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]
            if (y1 > lat) != (y2 > lat) and lon < (x2 - x1) * (lat - y1) / (y2 - y1) + x1:
                c = not c
    return c


def dist_km(rings, lon, lat):
    k, md = math.cos(math.radians(lat)), 1e18
    for r in rings:
        for i in range(len(r) - 1):
            ax, ay, bx, by = (r[i][0] - lon) * k, r[i][1] - lat, (r[i + 1][0] - lon) * k, r[i + 1][1] - lat
            dx, dy = bx - ax, by - ay
            q = dx * dx + dy * dy
            t = 0 if q == 0 else max(0, min(1, -(ax * dx + ay * dy) / q))
            md = min(md, math.hypot(ax + t * dx, ay + t * dy))
    return md * 111.2


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s or "").lower()) if c.isalnum())


def main():
    baixa_malhas()
    pol = carrega_malhas()
    cn = json.load(open(os.path.join(BASE, "habilitacoes", "cnes_dados.json"), encoding="utf-8"))
    un = json.load(open(os.path.join(BASE, "habilitacoes", "universo_cnes.json"), encoding="utf-8"))
    mun, UN = un["municipios"], un["unidades"]
    por_nome = {(COD_UF.get(k[:2]), norm(v[0])): k for k, v in mun.items()}

    def onde(lon, lat):
        for cod, rings in pol.items():
            xs = [p[0] for p in rings[0]]
            if min(xs) - .01 <= lon <= max(xs) + .01 and dentro(rings, lon, lat):
                return cod
        return None

    pts = {}
    for p in ("nascimentos", "internacao", "mortalidade", "habilitacoes"):
        for m in json.load(open(os.path.join(BASE, p, "dados.json"), encoding="utf-8"))["maternidades"]:
            c = m["cnes"]
            cod = str(cn[c]["codigo_municipio"]) if c in cn else (str(UN[c]["m"]) if c in UN else None)
            pts.setdefault(c, {"tipo": "unidade dos painéis", "nome": m["nome"], "uf": m["uf"], "lat": m.get("lat"), "lon": m.get("lon"), "cod": cod})
    s = open(os.path.join(BASE, "nascimentos", "dados_nv2026.js"), encoding="utf-8").read()
    for q in json.JSONDecoder().raw_decode(s, s.index("const PONTOS = ") + len("const PONTOS = "))[0]:
        c = str(q["cnes"])
        if c in pts:
            continue
        cod = str(UN[c]["m"]) if c in UN else por_nome.get((q["uf"], norm(q.get("mun"))))
        pts[c] = {"tipo": "ponto de contexto", "nome": q["nome"], "uf": q["uf"], "lat": q["lat"], "lon": q["lon"], "cod": cod}

    ant_arq = os.path.join(BASE, "coordenadas_corrigidas.json")
    anteriores = json.load(open(ant_arq, encoding="utf-8"))["correcoes"] if os.path.exists(ant_arq) else {}
    ok, borda, errados, semmun, corr = 0, [], [], [], {}
    for c, v in pts.items():
        if c in anteriores:                     # já corrigido: mantém a correção e confere a coordenada original do cadastro
            a = anteriores[c]
            v["lat"], v["lon"] = a["lat_cadastro"], a["lon_cadastro"]
        if v["lat"] is None or not v["cod"] or v["cod"] not in pol:
            semmun.append((c, v["nome"], v["uf"]))
            continue
        if dentro(pol[v["cod"]], v["lon"], v["lat"]):
            ok += 1
            continue
        d = dist_km(pol[v["cod"]], v["lon"], v["lat"])
        caiu = onde(v["lon"], v["lat"])
        reg = {**v, "cnes": c, "municipio": mun[v["cod"]][0] if v["cod"] in mun else v["cod"], "km_fora": round(d, 1),
               "caiu_em": (mun[caiu][0] if caiu in mun else f"município {caiu}") if caiu else "fora do país ou no mar"}
        if d <= TOLERANCIA_KM:
            borda.append(reg)
            continue
        errados.append(reg)
        if v["cod"] in mun:
            corr[c] = {"nome": v["nome"], "uf": v["uf"], "municipio": reg["municipio"], "lat": mun[v["cod"]][3], "lon": mun[v["cod"]][4],
                       "lat_cadastro": v["lat"], "lon_cadastro": v["lon"],
                       "motivo": f"coordenada do cadastro cai em {reg['caiu_em']}, a {reg['km_fora']} km do limite de {reg['municipio']}; usada a sede do município"}
    hoje = date.today().isoformat()
    with open(ant_arq, "w", encoding="utf-8") as fh:
        json.dump({"geradoEm": hoje, "criterio": f"ponto a mais de {TOLERANCIA_KM:.0f} km fora do próprio município (malha municipal do IBGE); substituído pela sede do município (base territorial do Ministério da Saúde de {un.get('baseTerritorial')})",
                   "correcoes": dict(sorted(corr.items()))}, fh, ensure_ascii=False, indent=1)
    L = [f"# Auditoria das coordenadas dos pontos de mapa · {hoje}", "",
         "Teste: cada ponto dentro do próprio município, pela malha municipal do IBGE. Vale para os quatro painéis, que usam as mesmas coordenadas.", "",
         f"- Pontos conferidos: {len(pts)} ({sum(1 for v in pts.values() if v['tipo'] == 'unidade dos painéis')} unidades dos painéis e {sum(1 for v in pts.values() if v['tipo'] == 'ponto de contexto')} pontos de contexto).",
         f"- Dentro do próprio município: {ok}.", f"- Fora por até {TOLERANCIA_KM:.0f} km (limite ou litoral; mantidos): {len(borda)}.",
         f"- Fora por mais de {TOLERANCIA_KM:.0f} km (coordenada do cadastro errada; corrigidos para a sede do município): {len(errados)}.",
         f"- Sem município identificado (não conferidos): {len(semmun)}.", "",
         "## Coordenadas corrigidas", "", "| Tipo | UF | CNES | Estabelecimento | Município do cadastro | A coordenada do cadastro cai em | Distância do limite (km) |", "|---|---|---|---|---|---|---:|"]
    for r in sorted(errados, key=lambda r: (r["tipo"] != "unidade dos painéis", -r["km_fora"])):
        L.append(f"| {r['tipo']} | {r['uf']} | {r['cnes']} | {r['nome']} | {r['municipio']} | {r['caiu_em']} | {str(r['km_fora']).replace('.', ',')} |")
    L += ["", "## Fora por até 3 km (mantidos)", ""] + [f"- {r['uf']} {r['cnes']} {r['nome']} ({r['municipio']}): {str(r['km_fora']).replace('.', ',')} km." for r in borda]
    L += ["", "## Sem município identificado", ""] + ([f"- {u} {c} {n}." for c, n, u in semmun] or ["- Nenhum."])
    os.makedirs(os.path.join(BASE, "relatorios"), exist_ok=True)
    with open(os.path.join(BASE, "relatorios", f"auditoria_coordenadas_{hoje}.md"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(L) + "\n")
    print(f"pontos {len(pts)} | dentro {ok} | até {TOLERANCIA_KM:.0f} km {len(borda)} | errados {len(errados)} | sem município {len(semmun)} | correções gravadas {len(corr)}")
    for r in sorted(errados, key=lambda r: (r["tipo"] != "unidade dos painéis", -r["km_fora"])):
        print(f"  [{r['tipo'][:7]}] {r['uf']} {r['cnes']} {r['nome'][:40]} ({r['municipio']}) -> cai em {r['caiu_em']}, {r['km_fora']} km")
    print("sem município:", semmun)
    return len(errados)


if __name__ == "__main__":
    main()
