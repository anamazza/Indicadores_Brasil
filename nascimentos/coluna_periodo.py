# -*- coding: utf-8 -*-
"""18/10/2026 - Coluna de um PERÍODO extraído diretamente do microdado do SINASC (ex.: 1º semestre de 2026)
para os blocos do Painel NV, sem passar pelas planilhas de indicadores.

Fontes (Extracao_SINASC/saida/, geradas pelos passos 1, 2, 10 e 11 com o rótulo do período):
  unidades_<periodo>.json                   contagens de todas as seções do bloco, por CNES (passos 1 e 2)
  perfil_sociodemografico_<periodo>.json    perfil da mãe: idade, raça/cor, escolaridade, situação conjugal (passo 10)
  perfil_obstetrico_novos_<periodo>.json    gestações/cesarianas anteriores, tipo de gestação, PN adequada (passo 11)

As colunas 2019-2025 continuam vindo das planilhas oficiais (como sempre); este módulo só ACRESCENTA a coluna
do período antes da coluna Total de cada bloco. A coluna Total (acumulado) NÃO inclui o período parcial.

Uso no build_dados.py:  coluna_periodo.acrescentar(dados, "2026S1", 2026, "1º sem. 2026", [1..6], "janeiro a junho de 2026", fonte, data)
Validação (regra da casa): py coluna_periodo.py 2025
  recalcula a coluna de 2025 a partir de unidades_2025.json e dos perfis 2019-2025 e compara, célula a célula,
  com a coluna 2025 que o painel já tem (vinda das planilhas oficiais e do JSON v3 da coordenação).
"""
import json
import os
import re
import sys
import unicodedata

BASE = os.path.dirname(os.path.abspath(__file__))
PROJ = os.path.dirname(BASE)
SAIDA = os.path.join(PROJ, "Extracao_SINASC", "saida")

# HCFAMEMA: o SINASC registra os nascimentos no CNES do Materno-Infantil (2025523); o painel usa 2025507
FONTES_CNES = {"2025507": ["2025523"]}      # só o Materno-Infantil, como nas planilhas oficiais (validado em 2025)

ROBSON_GRUPOS = ["Grupo %d" % i for i in range(1, 11)] + ["Nao classificados"]
# a extração escreve os nomes sem acento; as linhas novas de UF de residência entram com a grafia das planilhas
UF_ACENTO = {"Rondonia": "Rondônia", "Para": "Pará", "Amapa": "Amapá", "Maranhao": "Maranhão", "Piaui": "Piauí",
             "Ceara": "Ceará", "Paraiba": "Paraíba", "Espirito Santo": "Espírito Santo", "Sao Paulo": "São Paulo",
             "Parana": "Paraná", "Goias": "Goiás"}


def norm(s):
    s = unicodedata.normalize("NFD", str(s or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    return re.sub(r"\s+", " ", s).strip().lower()


# rótulos que uma planilha escreveu de outro jeito (1 unidade): mesma categoria
ALIAS_ROTULO = {"de 1 a 3": "1-3 consultas", "de 4 a 6": "4-6 consultas", "7 e mais": "7 e + consultas"}


def _dict_norm(d):
    return {norm(k): v for k, v in (d or {}).items()}


def _soma(d):
    return sum((d or {}).values())


def _junta(entradas):
    """Soma as contagens de mais de um CNES de origem (complexo HCFAMEMA)."""
    if len(entradas) == 1:
        return entradas[0]
    out = {}
    for u in entradas:
        for k, v in u.items():
            if isinstance(v, dict):
                acc = out.setdefault(k, {})
                for kk, vv in v.items():
                    acc[kk] = acc.get(kk, 0) + vv
            elif isinstance(v, (int, float)) and k not in ("cnes",):
                out[k] = out.get(k, 0) + v
            else:
                out.setdefault(k, v)
    return out


def carregar_unidades(periodo):
    return json.load(open(os.path.join(SAIDA, f"unidades_{periodo}.json"), encoding="utf-8"))


def entrada_unidade(unidades, cnes):
    ent = [unidades[c] for c in FONTES_CNES.get(cnes, [cnes]) if c in unidades]
    return _junta(ent) if ent else None


def valor_linha(bloco, rotulo, idx, u):
    """Valor do período para a linha `rotulo` (posição idx) do bloco, a partir da entrada u do JSON.
    Devolve (valor, novo) — novo=True quando a linha não existia e foi criada (não acontece aqui)."""
    r = norm(rotulo)
    r = ALIAS_ROTULO.get(r, r)
    total = u["total"]
    ehTotal = r == "total"
    if bloco == "res_regiao":
        return total if ehTotal else _dict_norm(u["res_regiao"]).get(r, 0)
    if bloco == "res_uf":
        return total if ehTotal else _dict_norm(u["res_uf"]).get(r, 0)
    if bloco == "prenatal":
        return total if ehTotal else _dict_norm(u["prenatal"]).get(r, 0)
    if bloco == "trimestre":                      # exclui quem não fez consulta: Total = soma das linhas
        return _soma(u["trimestre"]) if ehTotal else _dict_norm(u["trimestre"]).get(r, 0)
    if bloco == "peso":
        return total if ehTotal else _dict_norm(u["peso"]).get(r, 0)
    if bloco == "gestacao":
        return total if ehTotal else _dict_norm(u["gestacao"]).get(r, 0)
    if bloco == "via":
        return total if ehTotal else _dict_norm(u["via"]).get(r, 0)
    if bloco == "assistencia":                    # só partos vaginais: Total = partos vaginais
        return _dict_norm(u["via"]).get("parto vaginal", 0) if ehTotal else _dict_norm(u["assistencia"]).get(r, 0)
    if bloco == "apgar":                          # só >=2500 g sem anomalia: Total = soma das linhas
        return _soma(u["apgar"]) if ehTotal else _dict_norm(u["apgar"]).get(r, 0)
    if bloco == "robson_n":
        return total if ehTotal else _dict_norm(u["robson"]).get(r, 0)
    if bloco == "robson_taxa":
        n = total if ehTotal else _dict_norm(u["robson"]).get(r, 0)
        c = _soma(u["robson_ces"]) if ehTotal else _dict_norm(u["robson_ces"]).get(r, 0)
        return round(100.0 * c / n, 1) if n else 0      # grupo sem nascimento: 0, como nas planilhas oficiais
    if bloco == "p1500_uf":                       # 3ª linha (planilhas EBSERH): participação da unidade na UF, fração
        if idx == 0: return u["p1500"]
        if idx == 1: return u["oc1500_uf"]
        return round(u["p1500"] / u["oc1500_uf"], 4) if u["oc1500_uf"] else 0
    if bloco in ("nv_territorio", "p1500_territorio"):
        pref = "oc_" if bloco == "nv_territorio" else "oc1500_"
        if idx == 0:
            return total if bloco == "nv_territorio" else u["p1500"]
        return u.get(pref + {"municipio": "municipio", "regiao_saude": "rs", "macro": "macro", "uf": "uf"}[r], 0)
    if bloco in ("residentes_nv", "residentes_p1500"):
        suf = "" if bloco == "residentes_nv" else "_1500"
        if idx == 0:
            return total if bloco == "residentes_nv" else u["p1500"]
        return u.get({"municipio": "res_municipio", "regiao_saude": "res_rs", "macro": "res_macro", "uf": "res_uf_total"}[r] + suf, 0)
    raise KeyError(f"bloco desconhecido: {bloco}")


def linhas_novas(bloco, rotulos_existentes, u):
    """Categorias que aparecem no período e não têm linha no bloco (só UF de residência inédita)."""
    if bloco != "res_uf":
        return []
    tem = {norm(r) for r in rotulos_existentes}
    return [(UF_ACENTO.get(nome, nome), v) for nome, v in u["res_uf"].items() if norm(nome) not in tem and v]


# ---------------------------------------------------------------------------- perfil da mãe (passos 10 e 11)
MAPA10 = {"idade": "distribuicao percentual dos nascidos vivos por idade da mae - ",
          "raca": "distribuicao percentual dos nascidos vivos por raca/cor da mae - ",
          "escolaridade": "distribuicao percentual dos nascidos vivos por escolaridade da mae - ",
          "conjugal": "distribuicao percentual dos nascidos vivos por situacao conjugal da mae - "}
MAPA11 = {"partos": "distribuicao percentual dos nascidos vivos por numero de partos anteriores da mae - ",
          "cesarianas": "distribuicao percentual dos nascidos vivos por numero de cesarianas anteriores da mae - ",
          "gestacao": "distribuicao percentual dos nascidos vivos por tipo de gestacao - "}
PN_ROT = "numero adequado de consultas para a idade gestacional"


def carregar_perfis(periodo):
    p10 = json.load(open(os.path.join(SAIDA, f"perfil_sociodemografico_{periodo}.json"), encoding="utf-8"))
    p11 = json.load(open(os.path.join(SAIDA, f"perfil_obstetrico_novos_{periodo}.json"), encoding="utf-8"))
    return p10, p11


def _perfil_de(p, cnes):
    """Entrada do perfil para o CNES do painel (no complexo HCFAMEMA, a que tiver nascimentos)."""
    for c in FONTES_CNES.get(cnes, []) + [cnes]:   # o passo 11 já funde 2025523 em 2025507
        if c in p:
            return p[c]
    return None


def valor_perfil(rotulo, cnes, p10, p11, i=0):
    """Valor (percentual, 2 casas) da linha de perfil no índice i da série do JSON; None se não houver."""
    r = norm(rotulo)
    e10, e11 = _perfil_de(p10, cnes), _perfil_de(p11, cnes)
    for g, pref in MAPA10.items():
        if r.startswith(pref):
            cat = r[len(pref):]
            if not e10:
                return None
            vals = _dict_norm(e10[g]).get(cat)
            return None if vals is None or vals[i] is None else round(float(vals[i]), 2)
    for g, pref in MAPA11.items():
        if r.startswith(pref):
            cat = r[len(pref):]
            if not e11:
                return None
            vals = _dict_norm(e11[g]).get(cat)
            return None if vals is None or vals[i] is None else round(float(vals[i]), 2)
    if PN_ROT in r:
        if not e11:
            return None
        v = e11["pn_adequada"]["sem99"][i]           # variante calibrada (780/780 em 2019-2025)
        return None if v is None else round(float(v), 2)
    raise KeyError(f"linha de perfil não mapeada: {rotulo}")


# ---------------------------------------------------------------------------- acrescentar ao painel
def acrescentar(dados, periodo, ano, rotulo, meses, descricao, fonte, extraido_em):
    """Insere a coluna do período (antes da coluna Total) em todos os blocos e nas linhas de perfil."""
    unidades = carregar_unidades(periodo)
    p10, p11 = carregar_perfis(periodo)
    nt = len(dados["anos"])                        # posição da coluna Total nos blocos
    avisos, sem_dados = [], []
    for mt in dados["maternidades"]:
        u = entrada_unidade(unidades, mt["cnes"])
        if u is None:
            sem_dados.append(f"{mt['cnes']} {mt['nome']}")
        for bloco, linhas in mt["blocos"].items():
            for idx, linha in enumerate(linhas):
                v = valor_linha(bloco, linha[0], idx, u) if u else None   # sem registro no período: "—", não 0
                linha[1] = list(linha[1][:nt]) + [v] + list(linha[1][nt:])
            if u:
                for nome, v in linhas_novas(bloco, [l[0] for l in linhas], u):
                    pos = next((i for i, l in enumerate(linhas) if norm(l[0]) == "total"), len(linhas))
                    linhas.insert(pos, [nome, [0] * nt + [v] + [0] * (len(linhas[0][1]) - nt - 1)])
                    avisos.append(f"{mt['cnes']}: linha nova em {bloco}: {nome} = {v}")
        if "assistenciais" in mt:
            for sec in mt["assistenciais"]["secoes"]:
                for l in sec["linhas"]:
                    l["valores"] = list(l["valores"]) + [valor_perfil(l["rotulo"], mt["cnes"], p10, p11) if u else None]
    dados["anos"] = list(dados["anos"]) + [ano]
    dados["rotulosAno"] = {**dados.get("rotulosAno", {}), str(ano): rotulo}
    dados["parciais"] = sorted(set(dados.get("parciais", [])) | {ano})
    dados["preliminares"] = sorted(set(dados.get("preliminares", [2025])) | {ano})
    dados.setdefault("periodos", {})[str(ano)] = {"rotulo": rotulo, "meses": meses, "descricao": descricao, "fonte": fonte,
                                                  "extraidoEm": extraido_em, "unidadesSemDados": sem_dados}
    return avisos, sem_dados


# ---------------------------------------------------------------------------- validação contra a coluna existente
def validar(periodo="2025"):
    js = open(os.path.join(BASE, "dados_nv2026.js"), encoding="utf-8").read()
    i = js.index("const DADOS = ") + len("const DADOS = ")
    dados = json.JSONDecoder().raw_decode(js, i)[0]
    anos = [str(a) for a in dados["anos"]]
    ai = anos.index(periodo)
    unidades = carregar_unidades(periodo)
    # perfis: os JSON 2019-2025 (sem sufixo) têm a série inteira
    p10 = json.load(open(os.path.join(SAIDA, "perfil_sociodemografico.json"), encoding="utf-8"))
    p11 = json.load(open(os.path.join(SAIDA, "perfil_obstetrico_novos.json"), encoding="utf-8"))
    tot = ok = 0
    difs, por_bloco = [], {}
    for mt in dados["maternidades"]:
        u = entrada_unidade(unidades, mt["cnes"])
        if u is None:
            print("  sem entrada no JSON:", mt["cnes"], mt["nome"]); continue
        for bloco, linhas in mt["blocos"].items():
            for idx, (rot, vals) in enumerate(linhas):
                v = valor_linha(bloco, rot, idx, u)
                of = vals[ai]
                tot += 1; por_bloco.setdefault(bloco, [0, 0])[1] += 1
                igual = (of is None and v is None) or (of is not None and v is not None and abs(float(of) - float(v)) <= (0.11 if bloco == "robson_taxa" else 0))
                if igual:
                    ok += 1; por_bloco[bloco][0] += 1
                else:
                    difs.append((mt["cnes"], mt["nome"][:35], bloco, rot, of, v))
    print(f"BLOCOS {periodo}: {ok}/{tot} células iguais ({100.0*ok/tot:.2f}%)")
    for b, (o, t) in por_bloco.items():
        if o != t: print(f"   {b}: {o}/{t}")
    for d in difs:
        print("   dif:", d)
    # perfil
    tot = ok = 0; difs = []
    for mt in dados["maternidades"]:
        if "assistenciais" not in mt: continue
        for sec in mt["assistenciais"]["secoes"]:
            for l in sec["linhas"]:
                of = l["valores"][ai]
                v = valor_perfil(l["rotulo"], mt["cnes"], p10, p11, ai)
                tot += 1
                if (of is None and v is None) or (of is not None and v is not None and abs(float(of) - float(v)) <= 0.11):
                    ok += 1
                elif of in (None, 0) and v in (None, 0):
                    ok += 1
                else:
                    difs.append((mt["cnes"], mt["nome"][:35], l["rotulo"][-45:], of, v))
    print(f"PERFIL {periodo}: {ok}/{tot} células dentro de ±0,1 p.p. ({100.0*ok/tot:.2f}%)")
    for d in difs[:40]:
        print("   dif:", d)
    if len(difs) > 40: print(f"   ... e mais {len(difs)-40}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    validar(sys.argv[1] if len(sys.argv) > 1 else "2025")
