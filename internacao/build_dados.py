# -*- coding: utf-8 -*-
"""
Consolida os dados do Painel de Internação 2026 (indicadores de internação obstétrica e neonatal,
2019 a 2025) — mesma família do Painel NV 2026 e do Painel de Mortalidade 2026.

  1. DADOS  - uma entrada por maternidade com os blocos do dossiê, espelhando os 21 slides da
              apresentação de internação (gera_deck_v4.py): internações obstétricas, motivos,
              interrupção prevista em lei, AMIU, acompanhante, CPN, assistência ao parto, MMG por
              causas e por manejo, ocupação/permanência na obstetrícia, internações neonatais, causas,
              UTI neonatal, morbidade neonatal e ocupação/permanência na UTIN.
              Fonte: ../Extracao_SIH/saida/planilhas_corrigidas_v3.json (114 unidades, regras
              aprovadas pela coordenação em 09/09/2026 — as mesmas dos decks) + planilhas_adicionais_*.json
              (unidades avulsas pedidas depois: PE em 12/09, MA/CE/SP em 23/09).
              Metadados da unidade (nome, UF, território, coordenadas, grupo): painel NV (leitura),
              lista oficial por grupo de 09/09/2026 e EXTRA_META para quem não está no painel NV.
  2. PONTOS - estabelecimentos de contexto do mapa de unidades (>=480 partos/ano, SIH/AIH 2025),
              lidos do painel NV.
  3. cnes_dados.json - ficha CNES + habilitações: copiadas dos painéis NV e de mortalidade para as
              unidades em comum e buscadas na API oficial para as demais.

Saída: dados_internacao.js (const DADOS / PONTOS) e cnes_dados.json.
Uso:   py build_dados.py            (depois: py montar_painel.py)
"""
import csv, json, os, re, sys, time, unicodedata, urllib.request
from datetime import date

sys.stdout.reconfigure(encoding="utf-8")
BASE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(BASE)                                   # "Projeto Apresentações Internação"
DOCS = os.path.dirname(PROJ)                                   # "Documentos"
SAIDA_SIH = os.path.join(PROJ, "Extracao_SIH", "saida")
FONTES = [                                                     # (arquivo, data da tabulação)
    (os.path.join(SAIDA_SIH, "planilhas_corrigidas_v3.json"), "2026-09-10"),
    (os.path.join(SAIDA_SIH, "planilhas_adicionais_pe.json"), "2026-09-12"),
    (os.path.join(SAIDA_SIH, "planilhas_adicionais_ma_ce_sp.json"), "2026-09-23"),
]
LISTA_OFICIAL = os.path.join(DOCS, "Mortalidade Indicadores", "lista_oficial_116.csv")
PAINEL_NV = os.path.join(DOCS, "Pojeto Apresentações NV_2026", "Painel_2026_Novo")   # leitura apenas
NV_DADOS = os.path.join(PAINEL_NV, "dados_nv2026.js")
NV_CNES = os.path.join(PAINEL_NV, "cnes_dados.json")
MORT_CNES = os.path.join(DOCS, "Mortalidade Indicadores", "Painel_Mortalidade", "cnes_dados.json")

ANOS = list(range(2019, 2026))
PRELIMINARES = [2025]               # competências até jun/2026: 2025 sujeito a acréscimos

UF_NOME = {"AC":"Acre","AL":"Alagoas","AM":"Amazonas","AP":"Amapá","BA":"Bahia","CE":"Ceará",
           "DF":"Distrito Federal","ES":"Espírito Santo","GO":"Goiás","MA":"Maranhão","MG":"Minas Gerais",
           "MS":"Mato Grosso do Sul","MT":"Mato Grosso","PA":"Pará","PB":"Paraíba","PE":"Pernambuco",
           "PI":"Piauí","PR":"Paraná","RJ":"Rio de Janeiro","RN":"Rio Grande do Norte","RO":"Rondônia",
           "RR":"Roraima","RS":"Rio Grande do Sul","SC":"Santa Catarina","SE":"Sergipe","SP":"São Paulo",
           "TO":"Tocantins"}
REGIAO_UF = {}
for reg, ufs in {"Norte":["AC","AM","AP","PA","RO","RR","TO"],"Nordeste":["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
                 "Centro-Oeste":["DF","GO","MS","MT"],"Sudeste":["ES","MG","RJ","SP"],"Sul":["PR","RS","SC"]}.items():
    for u in ufs: REGIAO_UF[u] = reg

# unidades fora do painel NV: metadados de território (como no painel de mortalidade)
EXTRA_META = {
    "2711613": {"nome": "CISAM - Centro Integrado de Saúde Amaury de Medeiros", "uf": "PE",
                "territorio": {"municipio": "Recife", "regiao_saude": "I REGIÃO DE SAÚDE",
                               "macro": "METROPOLITANA", "uf": "Pernambuco"}},
    "7958838": {"nome": "Hospital da Mulher do Recife", "uf": "PE",
                "territorio": {"municipio": "Recife", "regiao_saude": "I REGIÃO DE SAÚDE",
                               "macro": "METROPOLITANA", "uf": "Pernambuco"}},
}
# FAMEMA: a planilha v3 usa o CNES 2025507 (o mesmo do painel NV); a lista oficial, o 2025523
ALIAS_OFICIAL = {"2025507": "2025523"}

# ----------------------------------------------------------------------------- blocos do dossiê
# (bloco, rótulo curto no painel, rótulo exato na planilha v3, formato)
MAPA = [
    ("obst_n",     "Internações obstétricas (nº)",                     "Número de internações obstétricas", "int"),
    ("motivos",    "Partos",                                           "Distribuição percentual das internações obstétricas por motivos de internação - Parto", "pct"),
    ("motivos",    "Abortos",                                          "Distribuição percentual das internações obstétricas por motivos de internação - Aborto", "pct"),
    ("motivos",    "Intercorrências clínicas",                         "Distribuição percentual das internações obstétricas por motivos de internação - Intercorrências Clínicas", "pct"),
    ("motivos",    "Outros motivos",                                   "Distribuição percentual das internações obstétricas por motivos de internação - Outros", "pct"),
    ("aborto_legal", "Internações para interrupção da gestação prevista em lei (nº)", "Número de internações obstétricas para assistência ao aborto legal", "int"),
    ("amiu",       "AMIU entre os procedimentos de esvaziamento uterino (%)", "Porcentagem de AMIU dentre procedimentos de esvaziamento uterino", "pct"),
    ("acomp",      "Internações que resultaram em parto",              "Porcentagem de internações que resultaram em parto com presença de acompanhante", "pct"),
    ("acomp",      "Parto vaginal",                                    "Porcentagem de internações para assistência ao parto vaginal com presença de acompanhante", "pct"),
    ("acomp",      "Cesariana",                                        "Porcentagem de internações para cesariana com presença de acompanhante", "pct"),
    ("acomp",      "Aborto",                                           "Porcentagem de internações para aborto com presença de acompanhante", "pct"),
    ("cpn",        "Partos no Centro de Parto Normal (nº)",            "Número de partos em Centro de Parto Normal", "int"),
    ("parto",      "Nascidos vivos por parto vaginal após cesariana anterior (%)", "Porcentagem de nascidos vivos por partos vaginais pós-cesariana", "pct"),
    ("parto",      "Analgesia nas internações para parto vaginal (%)", "Porcentagem de realização de analgesia em internações para partos vaginais", "pct"),
    ("parto",      "Nascidos vivos com trabalho de parto induzido (%)", "Porcentagem de nascidos vivos com trabalho de parto induzido", "pct"),
    ("mmg",        "Casos de MMG entre as internações obstétricas (%)", "Porcentagem de casos de morbidade materna grave", "pct"),
    ("mmg_causas", "Hemorragia",                                       "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Hemorragia", "pct"),
    ("mmg_causas", "Hipertensão",                                      "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Hipertensão", "pct"),
    ("mmg_causas", "Infecção",                                         "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Infecção", "pct"),
    ("mmg_causas", "Complicações tromboembólicas",                     "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Complicações tromboembólicas", "pct"),
    ("mmg_causas", "Causas obstétricas indiretas",                     "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Causas obstétricas indiretas", "pct"),
    ("mmg_causas", "Outras causas obstétricas",                        "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Outras causas obstétricas", "pct"),
    ("mmg_causas", "Demais causas",                                    "Distribuição percentual dos casos de morbidade materna grave por grupo de causa - Demais causas", "pct"),
    ("mmg_manejo", "Com internação em UTI",                            "Porcentagem de casos de morbidade materna grave com internação em UTI", "pct"),
    ("mmg_manejo", "Com permanência prolongada pós-parto",             "Porcentagem de casos de morbidade materna grave com tempo de permanência prolongado pós-parto", "pct"),
    ("mmg_manejo", "Com transfusão sanguínea",                         "Porcentagem de casos de morbidade materna grave com transfusão sanguínea", "pct"),
    ("mmg_manejo", "Com histerectomia",                                "Porcentagem de casos de morbidade materna grave com realização de histerectomia", "pct"),
    ("ocup_obst",  "Taxa de ocupação dos leitos obstétricos (%)",      "Taxa de Ocupação - Obstétricas", "pct"),
    ("tmp_obst",   "Geral",                                            "Tempo médio de permanência - geral", "dias"),
    ("tmp_obst",   "Parto vaginal",                                    "Tempo médio de permanência - parto vaginal", "dias"),
    ("tmp_obst",   "Cesariana",                                        "Tempo médio de permanência - cesariana", "dias"),
    ("tmp_obst",   "Aborto",                                           "Tempo médio de permanência - aborto", "dias"),
    ("tmp_obst",   "Intercorrências clínicas",                         "Tempo médio de permanência - intercorrências clínicas", "dias"),
    ("neo_n",      "Internações neonatais (nº)",                       "Número de internações neonatais", "int"),
    ("neo_utin",   "Internações neonatais em UTI neonatal (%)",        "Porcentagem de internações neonatais em UTI neonatal", "pct"),
    ("morb_neo",   "Nascidos vivos com condições potencialmente ameaçadoras à vida (%)", "Porcentagem de nascidos vivos com condições potencialmente ameaçadoras à vida", "pct"),
    ("ocup_utin",  "Taxa de ocupação da UTI neonatal (%)",             "Taxa de Ocupação - UTI neonatal", "pct"),
    ("tmp_utin",   "Tempo médio de permanência na UTI neonatal (dias)", "Tempo médio de permanência - UTI neonatal", "dias"),
]
CAUSAS_NEO = ["Asfixia/Hipóxia", "Infecções perinatais", "Transtornos cardiovasculares perinatais",
              "Afecções respiratórias do RN", "Condições relacionadas a fatores maternos",
              "Prematuridade e baixo peso ao nascer", "Transtornos metabólicos e endócrinos",
              "Anomalias congênitas", "Causas mal definidas", "Outras afecções do período perinatal", "Demais causas"]
for c in CAUSAS_NEO:
    MAPA.append(("neo_causas", c, "Distribuição percentual das internações neonatais por grupos de causas - " + c, "pct"))


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    return "".join(c for c in s if unicodedata.category(c) != "Mn").upper().strip()


def to_num(v):
    if v is None or v == "":
        return None
    try:
        f = float(v)
    except (TypeError, ValueError):
        return None
    if f != f:
        return None
    return int(f) if f.is_integer() else round(f, 2)


def titulo_nome(s):
    minus = {"DE", "DA", "DO", "DAS", "DOS", "E", "DR", "DRA", "N", "SRA"}
    out = []
    for p in str(s).split():
        pu = norm(p)
        if pu in {"DR", "DRA"}: out.append(pu.capitalize() + "."); continue
        if pu in {"IMIP", "HCFAMEMA", "CISAM", "HGCC", "HGF", "HRSM", "HRT", "HUCAM", "HEMU", "HMDLJ", "UFPEL",
                  "UFPR", "UFRJ", "UFTM", "UFMA", "SES", "AP", "RJ", "HC", "MVFA", "HMIB", "HGA"}:
            out.append(pu); continue
        if pu in minus and out: out.append(p.lower()); continue
        out.append(p.capitalize())
    return " ".join(out)


# ----------------------------------------------------------------------------- 1. painel NV (leitura)
def carrega_nv():
    js = open(NV_DADOS, encoding="utf-8").read()
    dados = json.loads(re.search(r"const DADOS = (\{.*?\});\nconst PONTOS", js, re.S).group(1))
    pontos = json.loads(re.search(r"const PONTOS = (\[.*?\]);", js, re.S).group(1))
    cnes = json.load(open(NV_CNES, encoding="utf-8")) if os.path.exists(NV_CNES) else {}
    return {m["cnes"]: m for m in dados["maternidades"]}, pontos, cnes


nv, pontos_nv, cnes_nv = carrega_nv()
cnes_mort = json.load(open(MORT_CNES, encoding="utf-8")) if os.path.exists(MORT_CNES) else {}
print(f"[1] painel NV lido: {len(nv)} unidades, {len(pontos_nv)} pontos de contexto, {len(cnes_nv) - 1} fichas CNES "
      f"(+ {len(cnes_mort) - 1 if cnes_mort else 0} do painel de mortalidade)")

# ----------------------------------------------------------------------------- 2. lista oficial
oficial = {}
with open(LISTA_OFICIAL, encoding="utf-8-sig") as fh:
    for r in csv.DictReader(fh):
        c = re.sub(r"\D", "", r["cnes"]).zfill(7)
        oficial[c] = {"tipo": r["tipo"].strip().upper(), "nome": r["nome"].strip(), "uf": r["uf"].strip(),
                      "municipio": r["municipio"].strip()}
print(f"[2] lista oficial: {len(oficial)} CNES")


def conjuntos_de(tipo):
    t = norm(tipo)
    out = []
    if "APOIADA" in t: out.append("apoiada")
    if "EBSERH" in t: out.append("ebserh")
    if "QUALINEO" in t: out.append("qualineo")
    return out or ["apoiada"]


# ----------------------------------------------------------------------------- 3. planilhas (JSON v3 + adicionais)
plan = {}          # cnes -> {"nome", "planilha", "linhas": {rotulo: valores}, "tabuladoEm"}
for arq, data_tab in FONTES:
    if not os.path.exists(arq):
        print(f"    [aviso] fonte ausente, pulando: {os.path.basename(arq)}"); continue
    j = json.load(open(arq, encoding="utf-8"))
    for cnes, u in j.items():
        cnes = cnes.zfill(7)
        if cnes in plan:
            print(f"    [aviso] {cnes} repetido em {os.path.basename(arq)} — mantida a primeira fonte"); continue
        plan[cnes] = {"nome": u["nome"], "planilha": u["planilha"], "tabuladoEm": data_tab,
                      "linhas": {l["rotulo"].strip(): [to_num(v) for v in l["valores"]] for l in u["linhas"]}}
print(f"[3] {len(plan)} unidades com planilha de internação")

faltas = {}
def blocos_de(cnes):
    bl = {}
    for bloco, curto, rot, fmt in MAPA:
        vals = plan[cnes]["linhas"].get(rot)
        if vals is None:
            faltas.setdefault(rot, []).append(cnes); vals = [None] * len(ANOS)
        bl.setdefault(bloco, []).append([curto, list(vals[:len(ANOS)]), fmt])
    return bl

# ----------------------------------------------------------------------------- 4. maternidades
mats, avisos = [], []
for cnes in sorted(plan):
    ref = nv.get(cnes)
    of = oficial.get(cnes) or oficial.get(ALIAS_OFICIAL.get(cnes, ""))
    extra = EXTRA_META.get(cnes)
    if ref:
        nome = ref["nome"].replace("—", "-"); uf = ref["uf"]; terr = dict(ref["territorio"])
        lat, lon, partos = ref.get("lat"), ref.get("lon"), ref.get("partosAIH")
    elif extra:
        nome, uf, terr = extra["nome"], extra["uf"], dict(extra["territorio"]); lat = lon = partos = None
    else:
        nome = titulo_nome((of or {}).get("nome", plan[cnes]["nome"])); uf = (of or {}).get("uf", "")
        terr = {"municipio": (of or {}).get("municipio", ""), "regiao_saude": "", "macro": "", "uf": UF_NOME.get(uf, uf)}
        lat = lon = partos = None
        avisos.append(f"{cnes} {nome}: sem território conhecido")
    tipo = of["tipo"] if of else "APOIADA"
    mats.append({
        "cnes": cnes, "nome": nome, "nomePlanilha": plan[cnes]["nome"], "uf": uf, "regiao": REGIAO_UF.get(uf, ""),
        "territorio": terr, "lat": lat, "lon": lon, "partosAIH": partos,
        "conjuntos": conjuntos_de(tipo), "tipoApoio": tipo, "oficial": of is not None,
        "origem": plan[cnes]["planilha"], "tabuladoEm": plan[cnes]["tabuladoEm"],
        "blocos": blocos_de(cnes),
    })
conta = {}
for m in mats:
    for c in m["conjuntos"]: conta[c] = conta.get(c, 0) + 1
print(f"[4] {len(mats)} maternidades | por grupo (com sobreposição): {conta} | fora da lista oficial: "
      f"{[m['cnes'] + ' ' + m['nome'] for m in mats if not m['oficial']]}")
for rot, lst in faltas.items():
    print(f"    ATENÇÃO linha ausente '{rot[:60]}' em {len(lst)} unidades: {lst[:5]}")
for a in avisos: print("    ATENÇÃO:", a)

# ----------------------------------------------------------------------------- 5. ficha CNES
API = "https://apidadosabertos.saude.gov.br/cnes/estabelecimentos/{}"
API_HAB = "https://cnes.datasus.gov.br/services/estabelecimentos-habilitacoes/{}"
HEADERS = {"User-Agent": "Mozilla/5.0", "Referer": "https://cnes.datasus.gov.br/"}


def busca(url):
    req = urllib.request.Request(url, headers=HEADERS)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


saida_cnes_path = os.path.join(BASE, "cnes_dados.json")
saida_cnes = json.load(open(saida_cnes_path, encoding="utf-8")) if os.path.exists(saida_cnes_path) else {}
saida_cnes.setdefault("_atualizado_em", cnes_nv.get("_atualizado_em", date.today().isoformat()))
buscadas = 0
for m in mats:
    c = m["cnes"]
    if c in saida_cnes:
        continue
    if c in cnes_nv:
        saida_cnes[c] = cnes_nv[c]; continue
    if c in cnes_mort:
        saida_cnes[c] = cnes_mort[c]; continue
    try:
        info = busca(API.format(int(c)))
        uid = info.get("codigo_estabelecimento_saude")
        try:
            info["habilitacoes"] = busca(API_HAB.format(uid)) if uid else None
        except Exception as e2:
            info["habilitacoes"] = None; print(f"    habilitações indisponíveis para {c}: {e2}")
        saida_cnes[c] = info; buscadas += 1
        print(f"    ficha CNES buscada na API: {c} {m['nome']} ({len(info.get('habilitacoes') or [])} habilitações)")
        time.sleep(0.4)
    except Exception as e:
        print(f"    ATENÇÃO: ficha CNES indisponível para {c} {m['nome']}: {e}")
for m in mats:
    info = saida_cnes.get(m["cnes"])
    if m["lat"] is None and info and info.get("latitude_estabelecimento_decimo_grau") is not None:
        m["lat"] = round(float(info["latitude_estabelecimento_decimo_grau"]), 5)
        m["lon"] = round(float(info["longitude_estabelecimento_decimo_grau"]), 5)
with open(saida_cnes_path, "w", encoding="utf-8") as fh:
    json.dump(saida_cnes, fh, ensure_ascii=False, indent=1)
sem_coord = [m["cnes"] + " " + m["nome"] for m in mats if m["lat"] is None]
print(f"[5] cnes_dados.json: {len(saida_cnes) - 1} fichas ({buscadas} buscadas agora) | sem coordenada: {sem_coord or 'nenhuma'}")

# ----------------------------------------------------------------------------- 6. pontos de contexto
alvo = {m["cnes"] for m in mats}
contexto = [p for p in pontos_nv if p["cnes"] not in alvo]
print(f"[6] {len(contexto)} pontos de contexto (>=480 partos/ano, fora do painel)")

# ----------------------------------------------------------------------------- 6b. dicionário de indicadores (Word final de 10/09/2026)
DICIONARIO_DOCX = os.path.join(PROJ, "DICIONARIO_INDICADORES_AIH_versao_final_2026-09-10.docx")
dicionario = []
if os.path.exists(DICIONARIO_DOCX):
    import zipfile, html
    x = zipfile.ZipFile(DICIONARIO_DOCX).read("word/document.xml").decode("utf-8")
    secao = ""
    for tbl in re.findall(r"<w:tbl>.*?</w:tbl>", x, re.S):
        for tr in re.findall(r"<w:tr[ >].*?</w:tr>", tbl, re.S):
            cells = []
            for tc in re.findall(r"<w:tc[ >].*?</w:tc>", tr, re.S):
                paras = ["".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)) for p in re.findall(r"<w:p[ >].*?</w:p>", tc, re.S)]
                cells.append(html.unescape("\n".join(p.strip() for p in paras if p.strip())))
            if len(cells) == 1 and cells[0]:
                secao = cells[0]
            elif len(cells) >= 3 and cells[0] and cells[0] != "INDICADOR":
                dicionario.append({"secao": secao, "ind": cells[0], "desc": cells[1], "regra": cells[2]})
    print(f"[6b] dicionário: {len(dicionario)} indicadores em {len({d['secao'] for d in dicionario})} seções")
else:
    print("    [aviso] dicionário Word não encontrado; metodologia sem fichas")

# ----------------------------------------------------------------------------- 7. saída
dados = {"anos": ANOS, "preliminares": PRELIMINARES, "regras": "v3 2026-09-09",
         "listaOficial": "LISTA MATERNIDADES POR GRUPO_09092026", "maternidades": mats}
out = os.path.join(BASE, "dados_internacao.js")
with open(out, "w", encoding="utf-8") as fh:
    fh.write("/* Gerado por build_dados.py — não editar à mão */\n")
    fh.write("const DADOS = "); json.dump(dados, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\nconst PONTOS = "); json.dump(contexto, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\nconst DICIONARIO = "); json.dump(dicionario, fh, ensure_ascii=False, separators=(",", ":"))
    fh.write(";\n")
print(f"[7] gravado {out} ({os.path.getsize(out) // 1024} KB)")
