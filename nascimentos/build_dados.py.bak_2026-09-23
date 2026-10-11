# -*- coding: utf-8 -*-
"""
Consolida os dados do novo Painel NV2026:
  1. DADOS  - 59 maternidades estratégicas (blocos SINASC) extraídos do painel antigo
              + coordenadas lat/lon dos CSVs GEO (Volume de partos Maio26)
  2. GEO    - polígonos compactados (uf / macro / rs) da página de referência (somente leitura)
  3. PONTOS - todos os estabelecimentos com partos (contexto no mapa), com CNES, nome,
              lat/lon, UF, macrorregião e volume anual de partos

Saída: dados_nv2026.js (const GEO / DADOS / PONTOS prontos para embutir no HTML)
"""
import re, json, csv, glob, os, sys, unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(BASE)
DOCS = os.path.dirname(PROJ)

PAINEL_ANTIGO = os.path.join(PROJ, "Apresentacoes_2026_NovoTemplate", "Painel_NV2026.html")
REF_PAGE      = os.path.join(DOCS, "Indicadores Partos", "index.html")   # leitura apenas
CSV_GEO_DIR   = os.path.join(DOCS, "Volume de partos Maio26", "Planilhas com GEO")

def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").upper().strip()

# ---------- 1. DADOS do painel antigo ----------
html = open(PAINEL_ANTIGO, encoding="utf-8").read()
m = re.search(r'const DADOS =\n(\{.*?\})\n;', html, re.S)
dados = json.loads(m.group(1))
mats = dados["maternidades"]
for mt in mats:                      # nomes sem travessão (padrão tipográfico do painel)
    mt["nome"] = mt["nome"].replace("—", "-")
print(f"[1] {len(mats)} maternidades extraídas do painel antigo")

# ---------- 2. pontos com coordenadas ----------
pontos = {}
for f in glob.glob(os.path.join(CSV_GEO_DIR, "*_GEO.csv")):
    uf = re.search(r'[_\s-]([A-Z]{2})_GEO\.csv$', os.path.basename(f)).group(1)
    with open(f, encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            c = str(row.get("CNES", "")).strip()
            lat, lon = row.get("LATITUDE"), row.get("LONGITUDE")
            if not (c and lat and lon):
                continue
            try:
                total = float(row.get("TOTAL") or 0)
            except ValueError:
                total = 0
            pontos[c] = {
                "cnes": c,
                "nome": (row.get("NOME_LIMPO") or "").title(),
                "uf": uf,
                "mun": (row.get("MUNICÍPIO") or row.get("MUNICIPIO_API") or "").title(),
                "macro": row.get("MACRO") or "",
                "lat": round(float(lat), 5),
                "lon": round(float(lon), 5),
                "partos": int(total),
            }
print(f"[2] {len(pontos)} estabelecimentos com coordenadas")

# coordenadas nas maternidades estratégicas
sem = []
for mt in mats:
    p = pontos.get(mt["cnes"])
    if p:
        mt["lat"], mt["lon"] = p["lat"], p["lon"]
        mt["partosAIH"] = p["partos"]
    else:
        sem.append(mt["nome"])
if sem:
    print("   ATENÇÃO — sem coordenada:", sem)
else:
    print("   todas as maternidades estratégicas têm lat/lon")

# ---------- 2b. unidades novas: EBSERH e QUALINEO ----------
# As 59 do painel antigo sao o conjunto "estrategica". A partir de 08/2026 entram
# tambem as unidades da planilha EBSERH e as novas do QUALINEO 26/27 - cada unidade
# guarda em `conjuntos` a que grupos pertence (uma unidade pode estar em mais de um).
import importlib.util
import blocos_painel

ANOS_TXT = [str(a) for a in dados.get("anos", range(2019, 2026))]
ADICIONAIS = [
    ("ebserh",   "INDICADORES MATERNIDADES DE REFERENCIA_EBSERH_2019_2025.xlsx", "_config_ebserh"),
    ("qualineo", "INDICADORES MATERNIDADES QUALINEO NOVAS_2019_2025.xlsx", "_config_qualineo"),
    ("qualineo", "INDICADORES MATERNIDADES DE REFERENCIA_2019_2025 atualizada 22_7.xlsx",
     "_config_qualineo2"),
    ("qualineo", "INDICADORES MATERNIDADES QUALINEO NOVE_2019_2025.xlsx", "_config_qualineo_nove"),
    # Iauarete veio na planilha APOIADAS de indicadores assistenciais (28/08/2026);
    # entra no conjunto das estrategicas/apoiadas para a coordenacao avaliar
    ("estrategica", "INDICADORES MATERNIDADE IAUARETE_2019_2025.xlsx", "_config_iauarete"),
]

# coordenadas de unidades fora do acervo AIH (sem producao de parto na AIH):
# Iauarete = ficha CNES (API apidadosabertos, 28/08/2026)
COORDS_EXTRA = {"2717387": {"lat": -0.1364627, "lon": -67.083642, "partos": None}}
CFG_DIR = os.path.join(PROJ, "Gerador_NV2026", "adicionar_unidades")
UF_NOME_PT = {"RO":"Rondônia","AC":"Acre","AM":"Amazonas","RR":"Roraima","PA":"Pará","AP":"Amapá",
              "TO":"Tocantins","MA":"Maranhão","PI":"Piauí","CE":"Ceará","RN":"Rio Grande do Norte",
              "PB":"Paraíba","PE":"Pernambuco","AL":"Alagoas","SE":"Sergipe","BA":"Bahia",
              "MG":"Minas Gerais","ES":"Espírito Santo","RJ":"Rio de Janeiro","SP":"São Paulo",
              "PR":"Paraná","SC":"Santa Catarina","RS":"Rio Grande do Sul","MS":"Mato Grosso do Sul",
              "MT":"Mato Grosso","GO":"Goiás","DF":"Distrito Federal"}

def _carrega_config(nome):
    spec = importlib.util.spec_from_file_location(nome, os.path.join(CFG_DIR, nome + ".py"))
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod

por_cnes = {m["cnes"].zfill(7): m for m in mats}
for m in mats:
    m["conjuntos"] = ["estrategica"]

novas = 0
for conjunto, xlsx, cfg_nome in ADICIONAIS:
    cfg = _carrega_config(cfg_nome)
    alvo = {c.zfill(7) for c in cfg.CNES}
    blocos = blocos_painel.blocos_da_planilha(os.path.join(PROJ, xlsx), ANOS_TXT, alvo)
    for cnes in sorted(alvo):
        if cnes not in blocos:
            print(f"   ATENÇÃO: {cnes} sem bloco em {xlsx}"); continue
        nome_pl, aba, bl, terr = blocos[cnes]
        ja = por_cnes.get(cnes)
        if ja is not None:                       # ja e uma das 59: so marca o conjunto
            if conjunto not in ja["conjuntos"]: ja["conjuntos"].append(conjunto)
            continue
        uf = cfg.UF_POR_CNES[cnes]
        mt = {"cnes": cnes, "nome": cfg.NOME_EXIBICAO[cnes], "nomePlanilha": nome_pl,
              "uf": uf, "regiao": aba,
              "territorio": {"municipio": terr.get("municipio", ""),
                             "regiao_saude": terr.get("regiao_saude", ""),
                             "macro": terr.get("macro", ""),
                             "uf": terr.get("uf", UF_NOME_PT.get(uf, uf))},
              "blocos": bl, "conjuntos": [conjunto]}
        p = pontos.get(cnes) or COORDS_EXTRA.get(cnes)
        if p:
            mt["lat"], mt["lon"], mt["partosAIH"] = p["lat"], p["lon"], p["partos"]
        else:
            mt["lat"] = mt["lon"] = None; mt["partosAIH"] = None
            print(f"   ATENÇÃO: {cnes} {mt['nome']} sem lat/lon")
        mats.append(mt); por_cnes[cnes] = mt; novas += 1

conta = {}
for m in mats:
    for c in m["conjuntos"]: conta[c] = conta.get(c, 0) + 1
print(f"[2b] {novas} unidades novas | total {len(mats)} | por conjunto: {conta}")

# ---------- 2c. indicadores assistenciais (planilhas de 26/08/2026) ----------
# Perfil sociodemografico (SINASC), internacoes obstetricas/neonatais (SIH) e
# morbidade neonatal — ver Indicadores_Assistenciais/LEIA-ME.md.
import blocos_assistenciais

assist, avisos_a = blocos_assistenciais.carregar(os.path.join(PROJ, "Indicadores_Assistenciais"))
com_a = 0
for m in mats:
    b = assist.pop(m["cnes"], None)
    if b:
        m["assistenciais"] = {"origem": b["origem"], "secoes": b["secoes"]}
        com_a += 1
sem_a = [m for m in mats if "assistenciais" not in m]
print(f"[2c] indicadores assistenciais: {com_a} unidades com bloco | {len(sem_a)} sem")
for m in sem_a:
    print(f"     sem bloco: {m['cnes']} {m['nome']}")
for cnes, b in assist.items():
    print(f"     ATENÇÃO bloco sem unidade no painel: {cnes} {b['nome']} ({b['origem']})")
for a in avisos_a:
    print("     AVISO:", a)

# ---------- 3. GEO compactado da referência ----------
ref = open(REF_PAGE, encoding="utf-8").read()
m = re.search(r'const GEO = (\{.*?\});', ref, re.S)
geo = json.loads(m.group(1))
print(f"[3] GEO: {', '.join(f'{k}={len(v)}' for k, v in geo['niveis'].items())}")

# ---------- 4. PONTOS de contexto (>=480 partos/ano, critério da apresentação) ----------
estrategicos = {mt["cnes"] for mt in mats}
contexto = [p for p in pontos.values()
            if p["partos"] >= 480 and p["cnes"] not in estrategicos]
contexto.sort(key=lambda p: -p["partos"])
print(f"[4] {len(contexto)} pontos de contexto (>=480 partos, não estratégicos)")

# ---------- 5. saída ----------
out = os.path.join(BASE, "dados_nv2026.js")
with open(out, "w", encoding="utf-8") as fh:
    fh.write("/* Gerado por build_dados.py — não editar à mão */\n")
    fh.write("const GEO = ")
    json.dump(geo, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\nconst DADOS = ")
    json.dump(dados, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\nconst PONTOS = ")
    json.dump(contexto, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\n")
print(f"[5] gravado {out} ({os.path.getsize(out)//1024} KB)")
