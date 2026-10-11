# -*- coding: utf-8 -*-
"""Blocos de indicadores assistenciais das unidades ADICIONAIS (fora das planilhas da
coordenacao), montados a partir dos JSON das extracoes proprias (23/09/2026):
  - Extracao_SINASC/saida/perfil_<lote>_planilha.json (perfil sociodemografico e
    obstetrico da mae e PN adequada; passos 10-12) + perfil_obstetrico_novos.json
    (partos anteriores, que o passo 12 nao copia);
  - Projeto Apresentacoes Internacao/Extracao_SIH/saida/planilhas_<lote>.json
    (internacoes obstetricas e neonatais, assistencia ao parto, MMG, causas neonatais
    e VBAC/induzido/CPAV, regras v3 aprovadas pela coordenacao em 09/09/2026).
A estrutura (secoes e ordem das linhas) e copiada de um bloco oficial (molde), para o
dossie do painel ficar identico ao das demais unidades. Devolve o mesmo formato de
blocos_assistenciais.carregar: {cnes: {"origem", "nome", "secoes"}}.
"""
import json
import os

from blocos_assistenciais import _fmt

# (origem mostrada no painel, sufixo dos arquivos JSON)
LOTES = [("ADICIONAIS MA CE SP", "adicionais_ma_ce_sp")]
PROJ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SINASC = os.path.join(PROJ, "Extracao_SINASC", "saida")
SIH = os.path.join(os.path.dirname(PROJ), "Projeto Apresentações Internação", "Extracao_SIH", "saida")
PARTOS_PREF = "Distribuição percentual dos nascidos vivos por número de partos anteriores da mãe - "


def carregar(molde):
    """molde = um bloco oficial (saida de blocos_assistenciais) cuja estrutura e copiada."""
    blocos, avisos = {}, []
    rot_molde = [l["rotulo"] for s in molde["secoes"] for l in s["linhas"]]
    p11 = json.load(open(os.path.join(SINASC, "perfil_obstetrico_novos.json"), encoding="utf-8"))
    for origem, tag in LOTES:
        fp = os.path.join(SINASC, f"perfil_{tag}_planilha.json")
        fs = os.path.join(SIH, f"planilhas_{tag}.json")
        faltando = [f for f in (fp, fs) if not os.path.exists(f)]
        if faltando:
            avisos.append(f"{origem}: arquivo ausente {faltando[0]}")
            continue
        perfil = json.load(open(fp, encoding="utf-8"))
        sih = json.load(open(fs, encoding="utf-8"))
        for cnes in perfil:
            if cnes not in sih:
                avisos.append(f"{origem}: {cnes} sem bloco de internacao em {os.path.basename(fs)}")
                continue
            linhas = {l["rotulo"]: l["valores"] for l in perfil[cnes]["linhas"]}
            linhas.update({l["rotulo"]: l["valores"] for l in sih[cnes]["linhas"]})
            for cat, vals in p11.get(cnes, {}).get("partos", {}).items():
                linhas[PARTOS_PREF + cat] = [None if v is None else round(v, 2) for v in vals]
            secoes, sem_valor = [], []
            for s in molde["secoes"]:
                ls = []
                for l in s["linhas"]:
                    v = linhas.get(l["rotulo"])
                    if v is None:
                        sem_valor.append(l["rotulo"])
                        v = [None] * 7
                    ls.append({"rotulo": l["rotulo"], "fmt": _fmt(l["rotulo"]), "valores": list(v)})
                secoes.append({"titulo": s["titulo"], "linhas": ls})
            if sem_valor:
                avisos.append(f"{origem}: {cnes} sem valores em {len(sem_valor)} linhas: {sem_valor[:3]}")
            sobram = sorted(set(linhas) - set(rot_molde))
            if sobram:
                avisos.append(f"{origem}: {cnes} linhas fora do molde ignoradas: {sobram[:3]}")
            blocos[cnes] = {"origem": origem, "nome": sih[cnes]["nome"], "secoes": secoes}
    return blocos, avisos


def carregar_v3(molde):
    """29/09/2026: blocos das 114 unidades oficiais a partir do JSON v3 (planilhas_corrigidas_v3.json,
    regras aprovadas pela coordenacao em 09/09 — as mesmas dos decks), na estrutura do molde.
    Substitui a leitura das planilhas xlsx de 31/08 (v1), que so continuam servindo de molde."""
    blocos, avisos = {}, []
    fv3 = os.path.join(SIH, "planilhas_corrigidas_v3.json")
    if not os.path.exists(fv3):
        return blocos, [f"v3: arquivo ausente {fv3}"]
    v3 = json.load(open(fv3, encoding="utf-8"))
    for cnes, u in v3.items():
        linhas = {l["rotulo"].strip(): l["valores"] for l in u["linhas"]}
        secoes, sem_valor = [], []
        for s in molde["secoes"]:
            ls = []
            for l in s["linhas"]:
                v = linhas.get(l["rotulo"])
                if v is None:
                    sem_valor.append(l["rotulo"]); v = [None] * 7
                ls.append({"rotulo": l["rotulo"], "fmt": _fmt(l["rotulo"]), "valores": list(v)})
            secoes.append({"titulo": s["titulo"], "linhas": ls})
        if sem_valor:
            avisos.append(f"v3: {cnes} sem valores em {len(sem_valor)} linhas: {sem_valor[:3]}")
        blocos[cnes.zfill(7)] = {"origem": u["planilha"], "nome": u["nome"], "secoes": secoes}
    return blocos, avisos


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8")
    import blocos_assistenciais
    of, _ = blocos_assistenciais.carregar(os.path.join(PROJ, "Indicadores_Assistenciais"))
    bl, av = carregar(of["0000434"])
    for c, b in bl.items():
        print(c, b["nome"], "|", [(s["titulo"][:22], len(s["linhas"])) for s in b["secoes"]])
    for a in av:
        print("AVISO:", a)
