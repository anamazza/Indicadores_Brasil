# -*- coding: utf-8 -*-
"""Números absolutos dos quadros do Perfil das mães e do pré-natal adequado à idade gestacional (22/11/2026, pedido
da coordenação: essas tabelas mostravam só o percentual).

Cada linha desses quadros ganha o campo "n": o número de nascidos vivos da categoria em cada período, na mesma ordem
de "valores" (os percentuais, que NÃO são alterados). Os números vêm da contagem no SINASC feita pelo
Extracao_SINASC/13_perfil_contagens.py, com as mesmas regras de classificação dos passos 10 e 11.

Conferência célula a célula: o número só entra se reproduzir o percentual publicado sobre o total de nascidos vivos
da unidade no período. Quando a contagem não reproduz o percentual (ocorre em poucas células do pré-natal adequado,
por 1 a 4 registros), usa-se o único inteiro que reproduz o percentual publicado; se houver mais de um inteiro
possível, ou nenhum, a montagem para."""
import json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
CONTAGENS = os.path.join(os.path.dirname(BASE), "Extracao_SINASC", "saida", "perfil_contagens.json")
MAPA = [(re.compile(r"por idade da mãe - (.+)$"), "idade"),
        (re.compile(r"por raça/cor da mãe - (.+)$"), "raca"),
        (re.compile(r"por escolaridade da mãe - (.+)$"), "escolaridade"),
        (re.compile(r"por situação conjugal da mãe - (.+)$"), "conjugal"),
        (re.compile(r"por número de cesarianas anteriores da mãe - (.+)$"), "cesarianas"),
        (re.compile(r"por tipo de gestação - (.+)$"), "gestacao"),
        (re.compile(r"número adequado de consultas para a idade gestacional"), "pn")]


def _casas(v):
    s = repr(float(v))
    return len(s.split(".")[1]) if "." in s and not s.endswith(".0") else 0


def acrescentar(dados, periodo_do_ano):
    """periodo_do_ano: {2026: "2026S1"} para os anos que são período parcial. Devolve (resumo, avisos)."""
    C = json.load(open(CONTAGENS, encoding="utf-8"))
    pers = [periodo_do_ano.get(a, str(a)) for a in dados["anos"]]
    da_contagem = pelo_percentual = sem_nasc = sem_valor = 0
    avisos = []
    for m in dados["maternidades"]:
        if "assistenciais" not in m:
            continue
        codigos = [str(c).zfill(7) for c in (m.get("cnesComplexo") or [m["cnes"]])]
        falta = [c for c in codigos if c not in C]
        if falta:
            raise SystemExit(f"perfil_contagens: sem contagem para {falta} ({m['nome']}) - rode Extracao_SINASC/13_perfil_contagens.py")
        nv = m["blocos"]["nv_territorio"][0][1]
        tot = []
        for i, per in enumerate(pers):
            t = sum(C[c].get(per, {}).get("total", 0) for c in codigos)
            if t != (nv[i] or 0):
                raise SystemExit(f"perfil_contagens: total da contagem ({t}) diferente dos nascidos vivos do painel ({nv[i]}) em {m['cnes']} {m['nome']} {per}")
            tot.append(t)
        # casas decimais com que os percentuais da unidade foram gravados (1 ou 2, conforme a origem): a maior que
        # aparece nas linhas de perfil da unidade, separando os anos completos da coluna do período parcial, porque um
        # valor como 64,90 é gravado como 64.9
        # (as seções sócio-demográfica e obstétrica vêm de extrações diferentes e podem ter precisão diferente)
        for s in m["assistenciais"]["secoes"]:
            linhas_perfil = [l for l in s["linhas"] if any(rx.search(l["rotulo"]) for rx, _ in MAPA)]
            casas_col = []
            for i, per in enumerate(pers):
                parcial = dados["anos"][i] in periodo_do_ano
                vs = [l["valores"][j] for l in linhas_perfil for j in range(len(pers))
                      if (dados["anos"][j] in periodo_do_ano) == parcial and l["valores"][j] is not None]
                casas_col.append(max([_casas(v) for v in vs], default=2))
            for l in s["linhas"]:
                g = cat = None
                for rx, gg in MAPA:
                    mm = rx.search(l["rotulo"])
                    if mm:
                        g, cat = gg, (mm.group(1) if mm.groups() else None)
                        break
                if not g:
                    continue
                ns = []
                for i, per in enumerate(pers):
                    v, t = l["valores"][i], tot[i]
                    if g == "pn":
                        n = sum(C[c].get(per, {}).get("pn_adequada", 0) for c in codigos)
                    else:
                        n = sum(C[c].get(per, {}).get(g, {}).get(cat, 0) for c in codigos)
                    if v is None:                       # unidade sem dados no período (sem coluna no painel)
                        ns.append(None); sem_valor += 1; continue
                    if not t:                           # sem nascimentos no período
                        ns.append(0); sem_nasc += 1; continue
                    dec = casas_col[i]
                    tol = 0.5 * 10 ** (-dec) + 1e-9
                    if abs(100.0 * n / t - v) <= tol:
                        ns.append(n); da_contagem += 1; continue
                    cand = [k for k in range(max(0, n - 25), min(t, n + 25) + 1) if abs(100.0 * k / t - v) <= tol]
                    if len(cand) != 1:
                        raise SystemExit(f"perfil_contagens: {m['cnes']} {m['nome']} {per} {l['rotulo']}: percentual publicado {v} "
                                         f"não tem inteiro único sobre {t} (contagem {n}, candidatos {cand})")
                    ns.append(cand[0]); pelo_percentual += 1
                    avisos.append(f"{m['cnes']} {m['nome']} {per} {l['rotulo'][-60:]}: contagem {n}, publicado {v}% -> número {cand[0]} (de {t})")
                l["n"] = ns
    resumo = f"{da_contagem} células pela contagem | {pelo_percentual} pelo percentual publicado | {sem_nasc} sem nascimentos no período | {sem_valor} sem dado"
    return resumo, avisos
