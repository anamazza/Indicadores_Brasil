# -*- coding: utf-8 -*-
"""Relatório do que mudou nos dados de um painel em relação à versão publicada (último commit).

    py relatorio_diferencas.py                      compara os três painéis
    py relatorio_diferencas.py nascimentos          só um painel

Compara o DADOS do dados_*.js que está na subpasta (recém-espelhado da pasta de trabalho) com a versão em
HEAD (git show), por maternidade (CNES): unidades que entraram ou saíram e cada valor que mudou (caminho,
antes, depois). Grava relatorios/diferencas_<painel>_<data>.md quando há diferenças e imprime um resumo.
É o que a coordenação valida antes da publicação, no lugar de abrir dezenas de decks."""
import json, os, subprocess, sys
from datetime import date

sys.stdout.reconfigure(encoding="utf-8", errors="replace")   # o "→" do resumo quebrava no console cp1252

RAIZ = os.path.dirname(os.path.abspath(__file__))
ARQUIVOS = {"nascimentos": "dados_nv2026.js", "internacao": "dados_internacao.js", "mortalidade": "dados_mortalidade.js"}
PASTA_RELATORIOS = os.path.join(RAIZ, "relatorios")
LIMITE_LINHAS = 400      # linhas de detalhe por relatório (o resto fica só nas contagens)


def extrair_dados(js):
    i = js.index("const DADOS = ") + len("const DADOS = ")
    return json.JSONDecoder().raw_decode(js, i)[0]


def versao_publicada(pasta, arquivo):
    r = subprocess.run(["git", "-C", RAIZ, "show", f"HEAD:{pasta}/{arquivo}"], capture_output=True)
    if r.returncode != 0:
        return None
    return extrair_dados(r.stdout.decode("utf-8"))


def folhas(obj, caminho=""):
    """Achata um JSON em {caminho: valor} (listas indexadas por posição)."""
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from folhas(v, f"{caminho}.{k}" if caminho else k)
    elif isinstance(obj, list):
        for i, v in enumerate(obj):
            yield from folhas(v, f"{caminho}[{i}]")
    else:
        yield caminho, obj


def rotular_anos(dados):
    """18/10/2026: séries por ANO em vez de por posição, para que uma coluna nova (ex.: 1º sem. 2026) apareça como
    "valor novo" e não desloque a comparação de todas as colunas seguintes. Blocos: [rot, [v...]] com len = anos
    ou anos+1 (Total/Acumulado); linhas de perfil: "valores" com len = anos."""
    anos = [str(a) for a in dados.get("anos", [])]
    if not anos:
        return dados
    def serie(vals):
        if not isinstance(vals, list) or not all(v is None or isinstance(v, (int, float)) for v in vals):
            return vals
        if len(vals) == len(anos):
            return {a: v for a, v in zip(anos, vals)}
        if len(vals) == len(anos) + 1:
            d = {a: v for a, v in zip(anos, vals)}; d["Total"] = vals[-1]; return d
        return vals
    for m in dados.get("maternidades", []):
        for bloco, linhas in list((m.get("blocos") or {}).items()):
            if not isinstance(linhas, list):
                continue
            # linhas por RÓTULO (não por posição): uma linha nova (ex.: UF de residência inédita) não desloca as demais
            por_rot, vistos = {}, {}
            for l in linhas:
                if not (isinstance(l, list) and len(l) >= 2):
                    continue
                rot = str(l[0]); vistos[rot] = vistos.get(rot, 0) + 1
                chave = rot if vistos[rot] == 1 else f"{rot} #{vistos[rot]}"
                por_rot[chave] = [serie(l[1])] + list(l[2:])
            m["blocos"][bloco] = por_rot
        for sec in (m.get("assistenciais") or {}).get("secoes", []):
            for l in sec.get("linhas", []):
                l["valores"] = serie(l.get("valores"))
    return dados


def fmt(v):
    if isinstance(v, float):
        return f"{v:g}"
    s = json.dumps(v, ensure_ascii=False)
    return s if len(s) <= 40 else s[:37] + "..."


def comparar(pasta, arquivo):
    caminho = os.path.join(RAIZ, pasta, arquivo)
    if not os.path.exists(caminho):
        return None, f"{pasta}: {arquivo} não existe"
    novo = extrair_dados(open(caminho, encoding="utf-8").read())
    antigo = versao_publicada(pasta, arquivo)
    if antigo is None:
        return None, f"{pasta}: sem versão publicada para comparar"
    novo, antigo = rotular_anos(novo), rotular_anos(antigo)
    anos_novos = [a for a in novo.get("anos", []) if a not in antigo.get("anos", [])]

    linhas, resumo = [], {"entraram": 0, "sairam": 0, "unidades_alteradas": 0, "valores_alterados": 0, "valores_novos": 0}
    if anos_novos:
        linhas.append(f"- **Coluna(s) nova(s)**: {', '.join(str(a) for a in anos_novos)} — os valores dessa coluna entram como "
                      f"novos (∅ → valor) e são contados à parte; as colunas antigas são comparadas ano a ano.")
    # cabeçalho do DADOS (anos, preliminares, regras, datas de extração...)
    for k in sorted(set(antigo) | set(novo)):
        if k == "maternidades":
            continue
        if antigo.get(k) != novo.get(k):
            linhas.append(f"- Cabeçalho `{k}`: {fmt(antigo.get(k))} → {fmt(novo.get(k))}")
    a = {m["cnes"]: m for m in antigo.get("maternidades", [])}
    n = {m["cnes"]: m for m in novo.get("maternidades", [])}
    for cnes in sorted(set(n) - set(a)):
        resumo["entraram"] += 1
        linhas.append(f"- **Entrou** {cnes} · {n[cnes].get('nome', '')} ({n[cnes].get('uf', '')})")
    for cnes in sorted(set(a) - set(n)):
        resumo["sairam"] += 1
        linhas.append(f"- **Saiu** {cnes} · {a[cnes].get('nome', '')} ({a[cnes].get('uf', '')})")
    por_bloco = {}
    for cnes in sorted(set(a) & set(n)):
        fa, fn = dict(folhas(a[cnes])), dict(folhas(n[cnes]))
        mudancas = [(c, fa.get(c, "∅"), fn.get(c, "∅")) for c in sorted(set(fa) | set(fn)) if fa.get(c, "∅") != fn.get(c, "∅")]
        novos = [x for x in mudancas if x[1] == "∅" and any(x[0].endswith(f".{a}") for a in anos_novos)]
        mudancas = [x for x in mudancas if x not in novos]
        resumo["valores_novos"] += len(novos)
        if not mudancas:
            continue
        resumo["unidades_alteradas"] += 1
        resumo["valores_alterados"] += len(mudancas)
        linhas.append(f"\n### {cnes} · {n[cnes].get('nome', '')} ({n[cnes].get('uf', '')}) — {len(mudancas)} valor(es)")
        for c, va, vn in mudancas:
            bloco = c.split(".")[0] + ("." + c.split(".")[1].split("[")[0] if c.startswith("blocos.") else "")
            if c.startswith("blocos."): bloco = "blocos." + c.split(".")[1]
            por_bloco[bloco] = por_bloco.get(bloco, 0) + 1
            if len(linhas) < LIMITE_LINHAS:
                linhas.append(f"- `{c}`: {fmt(va)} → {fmt(vn)}")
    if not linhas and not resumo["valores_novos"]:
        return resumo, None
    if resumo["valores_novos"]:
        linhas.insert(1 if anos_novos else 0, f"- Valores da(s) coluna(s) nova(s): {resumo['valores_novos']}")

    hoje = date.today().isoformat()
    cab = [f"# Diferenças · {pasta} · {hoje}", "",
           f"Comparação de `{pasta}/{arquivo}` (pasta de trabalho espelhada) com a versão publicada (HEAD).", "",
           f"- Unidades que entraram: {resumo['entraram']} · saíram: {resumo['sairam']} · com valores alterados: "
           f"{resumo['unidades_alteradas']} · valores alterados: {resumo['valores_alterados']}"]
    if por_bloco:
        cab.append("- Valores alterados por bloco: " + ", ".join(f"{b} ({q})" for b, q in sorted(por_bloco.items(), key=lambda x: -x[1])[:15]))
    if len(linhas) >= LIMITE_LINHAS:
        cab.append(f"- Detalhe limitado às primeiras {LIMITE_LINHAS} linhas.")
    texto = "\n".join(cab + [""] + linhas) + "\n"
    os.makedirs(PASTA_RELATORIOS, exist_ok=True)
    saida = os.path.join(PASTA_RELATORIOS, f"diferencas_{pasta}_{hoje}.md")
    open(saida, "w", encoding="utf-8").write(texto)
    return resumo, saida


if __name__ == "__main__":
    alvos = [p for p in sys.argv[1:] if p in ARQUIVOS] or list(ARQUIVOS)
    houve = False
    for pasta in alvos:
        resumo, saida = comparar(pasta, ARQUIVOS[pasta])
        if resumo is None:
            print(saida); continue
        if saida is None:
            print(f"{pasta}: sem diferenças em relação ao publicado")
        else:
            houve = True
            print(f"{pasta}: entraram {resumo['entraram']}, saíram {resumo['sairam']}, {resumo['unidades_alteradas']} unidades "
                  f"com {resumo['valores_alterados']} valores alterados, {resumo['valores_novos']} valores de coluna nova "
                  f"→ {os.path.relpath(saida, RAIZ)}")
    sys.exit(0)
