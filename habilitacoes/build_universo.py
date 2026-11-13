# -*- coding: utf-8 -*-
"""Universo do Painel de Habilitações: todos os estabelecimentos com leitos obstétricos e/ou neonatais SUS.

    py -3.12 build_universo.py [AAMM]        (padrão 2609 = setembro/2026)

Pedido da coordenação em 13/11/2026: o painel de habilitações passa a cobrir todas as unidades que tenham leitos
obstétricos e/ou neonatais para o SUS, mantendo a sinalização dos grupos acompanhados. Este script lê os arquivos do
CNES distribuídos pelo DATASUS (baixados por Extracao_SIH/69_baixar_cnes_habilitacoes.py) e grava, ao lado,
universo_cnes.json, que o build_dados.py junta às unidades dos outros três painéis. O arquivo de saída vai para o
repositório; os arquivos brutos (cerca de 150 MB) ficam fora dele.

Arquivos lidos, todos da mesma competência:
  LT<UF><AAMM>.dbc   leitos por especialidade            -> critério de entrada e leitos SUS de cada unidade
  HB<UF><AAMM>.dbc   habilitações                        -> habilitações vigentes na competência
  ST<UF><AAMM>.dbc   cadastro dos estabelecimentos       -> tipo, gestão, natureza jurídica, estruturas
  TAB_CNES.zip       tabelas do TabWin (CADGERBR.dbf: nome fantasia; HABILITA.DBF: descrição das habilitações;
                     TP_ESTAB.CNV: tipo de estabelecimento; ESFERAJUR.CNV: esfera jurídica)
Tabelas de território (já usadas nos outros projetos, só leitura):
  base_territorial.zip do DATASUS (município -> região de saúde e macrorregião; coordenadas da sede municipal)
  BR_Municipios_2024.zip do IBGE (nome do município com acentuação)

Critério de entrada: pelo menos um leito SUS (QT_SUS > 0) em uma destas especialidades do CNES:
  obstétricos  10 Obstetrícia cirúrgica, 43 Obstetrícia clínica
  neonatais    41 Neonatologia, 65 Unidade intermediária neonatal, 80/81/82 UTI neonatal tipos I, II e III,
               92 UCINCo (cuidados intermediários neonatal convencional), 93 UCINCa (canguru)
Entram também, mesmo sem esses leitos, os códigos CNES das unidades acompanhadas nos outros painéis.
"""
import csv, io, json, os, re, struct, sys, zipfile
from collections import Counter, defaultdict

import datasus_dbc

BASE = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(BASE)
DOCS = os.path.dirname(RAIZ)
sys.stdout.reconfigure(encoding="utf-8")
COMP = sys.argv[1] if len(sys.argv) > 1 else "2609"
BRUTOS = os.environ.get("CNES_BRUTOS") or os.path.join(DOCS, "Projeto Apresentações Internação", "Extracao_SIH", "dados", "brutos")
AUX = os.path.join(BRUTOS, "cnes_aux", f"TAB_CNES_{COMP}")
TERR_ZIP = os.path.join(DOCS, "Indicadores_partos_Brasil2024", "extracao", "territorio", "base_territorial.zip")
IBGE_ZIP = os.path.join(DOCS, "Malhas", "BR_Municipios_2024.zip")
UFS = "AC AL AM AP BA CE DF ES GO MA MG MS MT PA PB PE PI PR RJ RN RO RR RS SC SE SP TO".split()
OBST = {"10": "Obstetrícia cirúrgica", "43": "Obstetrícia clínica"}
NEO = {"41": "Neonatologia", "65": "Unidade intermediária neonatal", "80": "UTI neonatal tipo I", "81": "UTI neonatal tipo II",
       "82": "UTI neonatal tipo III", "92": "UCINCo (cuidados intermediários neonatal convencional)",
       "93": "UCINCa (cuidados intermediários neonatal canguru)"}
PAINEIS = ["nascimentos", "internacao", "mortalidade"]
COMPLEXOS = {"2025507": "2025523"}          # mesmo dicionário do build_dados.py


# ------------------------------------------------------------------ leitura de DBF (só os campos pedidos)
def registros_dbf(dados, pedidos, codificacao="latin-1"):
    n, tam_cab, tam_reg = struct.unpack("<IHH", dados[4:12])
    if len(dados) < tam_cab + n * tam_reg:
        raise ValueError("DBF incompleto")
    campos, pos, p = [], 1, 32
    while dados[p:p + 1] not in (b"\r", b"\x00"):
        d = dados[p:p + 32]
        campos.append((d[0:11].split(b"\x00")[0].decode("ascii"), pos, d[16])); pos += d[16]; p += 32
    nomes = {c[0] for c in campos}
    falta = [c for c in pedidos if c not in nomes]
    if falta:
        raise KeyError(f"campos ausentes no DBF: {falta}")
    recorte = [(nm, a, a + t) for nm, a, t in campos if nm in pedidos]
    for i in range(n):
        b = tam_cab + i * tam_reg
        if dados[b:b + 1] == b"*":
            continue
        yield {nm: dados[b + a:b + z].decode(codificacao).strip() for nm, a, z in recorte}


def dbc(tipo, sub, uf):
    with open(os.path.join(BRUTOS, sub, f"{tipo}{uf}{COMP}.dbc"), "rb") as f:
        return datasus_dbc.decompress_bytes(f.read())


def inteiro(v):
    try:
        return int(float(v or 0))
    except ValueError:
        return 0


def cnv(nome):
    """Tabela de conversão do TabWin: código -> rótulo (um código por linha ou lista separada por vírgula)."""
    saida = {}
    for l in open(os.path.join(AUX, nome), encoding="latin-1").read().splitlines()[1:]:
        m = re.match(r"^\s*(?:\d+\s+)?\d+\s{2}(.+?)\s{2,}(\S.*?)\s*$", l)
        if not m:
            continue
        for cod in m.group(2).split(","):
            cod = cod.strip()
            if cod and "-" not in cod:
                saida.setdefault(cod, m.group(1).strip())
    return saida


# ------------------------------------------------------------------ unidades acompanhadas (entram sempre)
acompanhadas = set()
for p in PAINEIS:
    for m in json.load(open(os.path.join(RAIZ, p, "dados.json"), encoding="utf-8"))["maternidades"]:
        acompanhadas.add(m["cnes"]); acompanhadas.update(m.get("cnesComplexo") or [])
acompanhadas |= set(COMPLEXOS) | set(COMPLEXOS.values())
print(f"competência {COMP} | códigos CNES das unidades acompanhadas: {len(acompanhadas)}")

# ------------------------------------------------------------------ 1. leitos (critério de entrada)
leitos = defaultdict(dict)          # cnes -> {cod: [existentes, SUS]}
mun_de = {}
for uf in UFS:
    for r in registros_dbf(dbc("LT", "cnes_lt", uf), ("CNES", "CODUFMUN", "CODLEITO", "QT_EXIST", "QT_SUS")):
        cod = r["CODLEITO"].zfill(2)
        if cod in OBST or cod in NEO:
            v = leitos[r["CNES"]].setdefault(cod, [0, 0])
            v[0] += inteiro(r["QT_EXIST"]); v[1] += inteiro(r["QT_SUS"])
            mun_de[r["CNES"]] = r["CODUFMUN"]
sus = lambda c, cods: sum(leitos[c][k][1] for k in cods if k in leitos.get(c, {}))
universo = {c for c in leitos if sus(c, OBST) + sus(c, NEO) > 0}
so_obst = sum(1 for c in universo if sus(c, OBST) and not sus(c, NEO))
so_neo = sum(1 for c in universo if sus(c, NEO) and not sus(c, OBST))
print(f"[1] com leitos obstétricos ou neonatais SUS: {len(universo)} (só obstétricos {so_obst}, só neonatais {so_neo}, "
      f"os dois {len(universo) - so_obst - so_neo}) | acompanhadas fora do critério: {sorted(acompanhadas - universo)}")
alvo = universo | acompanhadas

# ------------------------------------------------------------------ 2. cadastro (ST)
CAMPOS_ST = ("CNES", "CODUFMUN", "COD_CEP", "VINC_SUS", "TPGESTAO", "TP_UNID", "NAT_JUR", "CENTRCIR", "CENTROBS", "CENTRNEO",
             "ATENDHOS", "ATENDAMB", "DT_ATUAL", "COMPETEN")
st = {}
for uf in UFS:
    for r in registros_dbf(dbc("ST", "cnes_st", uf), CAMPOS_ST):
        if r["CNES"] in alvo:
            st[r["CNES"]] = dict(r, uf=uf)
print(f"[2] cadastro (ST): {len(st)} de {len(alvo)} | sem registro no ST: {sorted(alvo - set(st))}")

# ------------------------------------------------------------------ 3. habilitações (HB)
CAMPOS_HB = ("CNES", "SGRUPHAB", "CMPT_INI", "CMPT_FIM", "DTPORTAR", "PORTARIA", "NULEITOS", "COMPETEN")
hb = defaultdict(list); n_hb = 0; comp_vistas = Counter()
for uf in UFS:
    for r in registros_dbf(dbc("HB", "cnes_hb", uf), CAMPOS_HB):
        n_hb += 1; comp_vistas[r["COMPETEN"]] += 1
        if r["CNES"] in alvo:
            if r["CMPT_FIM"] != "999999" and r["CMPT_FIM"] < "20" + COMP:
                raise SystemExit(f"habilitação já encerrada no arquivo: {r}")          # o arquivo só traz as vigentes
            dt = r["DTPORTAR"] if re.fullmatch(r"\d{2}/\d{2}/(19|20)\d{2}", r["DTPORTAR"]) else None     # 01/01/9000 = sem data
            hb[r["CNES"]].append([r["SGRUPHAB"], r["CMPT_INI"], r["CMPT_FIM"], r["PORTARIA"] or None, dt, inteiro(r["NULEITOS"])])
assert set(comp_vistas) == {"20" + COMP}, comp_vistas
for c in hb:
    hb[c].sort(key=lambda h: (h[0], h[1]))
n_alvo = sum(len(v) for v in hb.values())
futuras = sum(1 for v in hb.values() for h in v if h[1] > "20" + COMP)
print(f"[3] habilitações no arquivo: {n_hb} | das unidades do painel: {n_alvo} em {len(hb)} unidades "
      f"({len(alvo) - len(hb)} sem nenhuma) | com início posterior à competência: {futuras}")

# ------------------------------------------------------------------ 4. nomes e tabelas auxiliares
nomes, excluidos = {}, set()
with open(os.path.join(AUX, "CADGERBR.dbf"), "rb") as f:
    bruto = f.read()
for r in registros_dbf(bruto, ("CNES", "FANTASIA", "EXCLUIDO")):
    if r["CNES"] in alvo:
        nomes[r["CNES"]] = r["FANTASIA"]
        if r["EXCLUIDO"] not in ("", "0"):
            excluidos.add(r["CNES"])
del bruto
with open(os.path.join(AUX, "HABILITA.DBF"), "rb") as f:
    ds_hab = {r["CD_HABILIT"]: r["DS_HABIL"] for r in registros_dbf(f.read(), ("CD_HABILIT", "DS_HABIL"))}
tp_estab = cnv("TP_ESTAB.CNV")
esfera_folha = {}
for l in open(os.path.join(AUX, "ESFERAJUR.CNV"), encoding="latin-1").read().splitlines()[1:]:
    m = re.match(r"^\s*\d+\s+\d+\s{2}\.\.\s(.+?)\s{2,}(\S.*?)\s*$", l)
    if m:
        for cod in m.group(2).split(","):
            if cod.strip():
                esfera_folha[cod.strip()] = m.group(1).strip()


def esfera(nat):
    """Esfera jurídica pela natureza jurídica (tabela ESFERAJUR do TabWin)."""
    if not nat or not nat.isdigit() or nat == "0000":
        return None
    f = esfera_folha.get(nat)
    if nat[0] == "1":
        return {"Federal": "Administração pública federal", "Estadual ou Distrito Federal": "Administração pública estadual ou do Distrito Federal",
                "Municipal": "Administração pública municipal"}.get(f, "Administração pública (outros)")
    if nat[0] == "2":
        return "Empresa pública ou sociedade de economia mista" if f and f.startswith("Empresa Pública") else "Entidade empresarial"
    return {"3": "Entidade sem fins lucrativos", "4": "Pessoa física", "5": "Instituição extraterritorial"}.get(nat[0])


sem_nome = sorted(c for c in alvo if not nomes.get(c))
cod_sem_ds = sorted({h[0] for v in hb.values() for h in v} - set(ds_hab))
print(f"[4] nomes (CADGER): {len(nomes)} de {len(alvo)} | sem nome: {sem_nome} | marcados como excluídos no cadastro geral: {sorted(excluidos)} | "
      f"códigos de habilitação sem descrição na tabela: {cod_sem_ds}")

# ------------------------------------------------------------------ 5. território
z = zipfile.ZipFile(TERR_ZIP)
rs_de = {r["CO_MUNICIP"]: r["CO_REGSAUD"] for r in csv.DictReader(io.StringIO(z.read("rl_municip_regsaud.csv").decode("utf-8")), delimiter=";")}
mac_de = {r["CO_MUNICIP"]: r["CO_MACSAUD"] for r in csv.DictReader(io.StringIO(z.read("rl_municip_macsaud.csv").decode("utf-8")), delimiter=";")}
sede = {}
for r in csv.DictReader(io.StringIO(z.read("tb_municip.csv").decode("utf-8")), delimiter=";"):
    if r.get("NU_LATITUD") and r.get("NU_LONGIT"):
        sede[r["CO_MUNICIP"]] = (round(float(r["NU_LATITUD"].replace(",", ".")), 4), round(float(r["NU_LONGIT"].replace(",", ".")), 4))
data_terr = max(i.date_time for i in z.infolist())
zi = zipfile.ZipFile(IBGE_ZIP)
nome_mun = {r["CD_MUN"][:6]: r["NM_MUN"] for r in registros_dbf(zi.read("BR_Municipios_2024.dbf"), ("CD_MUN", "NM_MUN"), "utf-8")}

municipios, sem_terr = {}, []
for c in sorted(alvo):
    m = (st.get(c) or {}).get("CODUFMUN") or mun_de.get(c)
    if not m:
        continue
    if m not in municipios:
        if m not in nome_mun or m not in rs_de or m not in mac_de:
            sem_terr.append((c, m))
        lat, lon = sede.get(m, (None, None))
        municipios[m] = [nome_mun.get(m), int(rs_de[m]) if rs_de.get(m) else None, int(mac_de[m]) if mac_de.get(m) else None, lat, lon]
print(f"[5] municípios com unidade: {len(municipios)} | sem nome ou sem território: {sem_terr} | sem coordenada da sede: "
      f"{[m for m, v in municipios.items() if v[3] is None]}")

# ------------------------------------------------------------------ 6. saída
unidades = {}
for c in sorted(alvo):
    s = st.get(c)
    if not s:
        continue
    u = {"n": nomes.get(c), "m": s["CODUFMUN"], "uf": s["uf"], "tp": s["TP_UNID"], "g": s["TPGESTAO"] or None, "nj": s["NAT_JUR"] or None,
         "cep": s["COD_CEP"] or None, "at": s["DT_ATUAL"] or None, "sus": s["VINC_SUS"] == "1",
         "e": [int(s[k] == "1") for k in ("CENTROBS", "CENTRNEO", "CENTRCIR", "ATENDHOS", "ATENDAMB")],
         "l": {k: v for k, v in sorted(leitos.get(c, {}).items())}, "h": hb.get(c, [])}
    if c not in universo:
        u["fora"] = True                      # unidade acompanhada sem leitos obstétricos/neonatais SUS no arquivo
    unidades[c] = u

registro = {}
caminho_reg = os.path.join(BRUTOS, f"cnes_download_{COMP}.json")
if os.path.exists(caminho_reg):
    registro = json.load(open(caminho_reg, encoding="utf-8"))


def data_ftp(prefixo):
    """Data de publicação no FTP (MM-DD-AA) mais recente dos arquivos do tipo, em AAAA-MM-DD."""
    ds = [v["dataFTP"].split()[0] for k, v in (registro.get("arquivos") or {}).items() if k.upper().startswith(prefixo)]
    conv = sorted(f"20{d[6:8]}-{d[0:2]}-{d[3:5]}" for d in ds)
    return conv[-1] if conv else None


cod_usados = sorted({h[0] for u in unidades.values() for h in u["h"]})
saida = {
    "competencia": f"20{COMP[:2]}-{COMP[2:]}",
    "baixadoEm": registro.get("baixadoEm"),
    "publicadoNoFTP": {"leitos": data_ftp("LT"), "habilitacoes": data_ftp("HB"), "cadastro": data_ftp("ST"), "tabelas": data_ftp("TAB_CNES")},
    "baseTerritorial": "%04d-%02d-%02d" % data_terr[:3],
    "criterio": {"obstetricos": OBST, "neonatais": NEO},
    "contagem": {"universo": len(universo), "soObstetricos": so_obst, "soNeonatais": so_neo, "osDois": len(universo) - so_obst - so_neo,
                 "acompanhadasForaDoCriterio": sorted(acompanhadas - universo)},
    "habilitacoes": {co: ds_hab.get(co) for co in cod_usados},
    "tiposEstabelecimento": {k: tp_estab.get(k) for k in sorted({u["tp"] for u in unidades.values()})},
    "esferas": {k: esfera(k) for k in sorted({u["nj"] for u in unidades.values() if u["nj"]})},
    "municipios": municipios,
    "unidades": unidades,
}
destino = os.path.join(BASE, "universo_cnes.json")
with open(destino, "w", encoding="utf-8") as fh:
    json.dump(saida, fh, ensure_ascii=False, separators=(",", ":"))
tipos = Counter(tp_estab.get(u["tp"], u["tp"]) for u in unidades.values())
print(f"[6] {destino}: {len(unidades)} unidades, {sum(len(u['h']) for u in unidades.values())} habilitações de {len(cod_usados)} tipos, "
      f"{os.path.getsize(destino) // 1024} KB")
print("    tipo de estabelecimento:", dict(tipos.most_common()))
print("    esfera jurídica:", dict(Counter(esfera(u["nj"]) for u in unidades.values()).most_common()))
print("    por UF:", dict(sorted(Counter(u["uf"] for u in unidades.values()).items())))
