# -*- coding: utf-8 -*-
"""Verifica o site antes de publicar (roda no GitHub Actions a cada push e, localmente, ao fim das montagens).

    py verificar_site.py            sai com código 1 se alguma verificação falhar

O que confere: index.html presentes e com tamanho plausível, idênticos ao arquivo gêmeo Painel_*.html,
links internos apontando para pastas que existem, dados (DADOS, cnes_dados.json, atualizacao.json)
válidos, número de unidades e de fichas CNES dentro do esperado, e botões de navegação entre os painéis."""
import json, os, re, sys

RAIZ = os.path.dirname(os.path.abspath(__file__))
SITE = "https://anamazza.github.io/Indicadores_Brasil/"

# pasta: (arquivo gêmeo do index.html, tamanho mínimo do index.html em KB, arquivo de dados, mínimo de unidades)
PAINEIS = {
    "nascimentos": ("Painel_NV2026_Novo.html", 2500, "dados_nv2026.js", 100),
    "internacao":  ("Painel_Internacao_2026.html", 1200, "dados_internacao.js", 100),
    "mortalidade": ("Painel_Mortalidade_2026.html", 1800, "dados_mortalidade.js", 100),
    "habilitacoes": ("Painel_Habilitacoes_2026.html", 2000, "dados_habilitacoes.js", 110),  # unidades acompanhadas; as demais são conferidas abaixo
}
RAIZ_MIN_KB = 150          # a página principal embute a foto e as logos
TAMANHO_MAX_KB = 12000
PROPORCAO_MIN_FICHAS = 0.95   # fichas CNES / unidades do painel (tolera 1 ou 2 falhas da API)

falhas, avisos = [], []


def falha(msg): falhas.append(msg); print("  FALHA:", msg)
def ok(msg): print("  ok:", msg)
def aviso(msg): avisos.append(msg); print("  aviso:", msg)


def kb(p): return os.path.getsize(p) // 1024


def links_internos(html):
    """Caminhos (relativos ao site) de todos os href/src que apontam para o próprio site."""
    return sorted(set(re.findall(re.escape(SITE) + r'([A-Za-z0-9_./-]*)', html)))


def dados_do_js(path):
    js = open(path, encoding="utf-8").read()
    i = js.index("const DADOS = ") + len("const DADOS = ")
    return json.JSONDecoder().raw_decode(js, i)[0]


def verificar_pagina(nome, path, minimo_kb):
    if not os.path.exists(path):
        falha(f"{nome}: index.html não existe"); return None
    tam = kb(path)
    if tam < minimo_kb or tam > TAMANHO_MAX_KB:
        falha(f"{nome}: index.html com {tam} KB (esperado entre {minimo_kb} e {TAMANHO_MAX_KB} KB)")
    else:
        ok(f"{nome}: index.html com {tam} KB")
    html = open(path, encoding="utf-8").read()
    for rel in links_internos(html):
        alvo = rel.split("?")[0].split("#")[0]
        if alvo == "":
            continue
        pasta = os.path.join(RAIZ, *alvo.strip("/").split("/"))
        if os.path.isdir(pasta) and os.path.exists(os.path.join(pasta, "index.html")):
            continue
        if os.path.isfile(pasta):
            continue
        falha(f"{nome}: link para {SITE}{rel} não corresponde a nada no repositório")
    return html


print("== Página principal")
for arq in ["docs/apostila/apostila.html", "docs/apostila/Apostila_Dicionarios_de_Dados_Paineis_Maternidades.pdf"]:
    p = os.path.join(RAIZ, *arq.split("/"))
    if os.path.exists(p) and os.path.getsize(p) > 20000: ok(f"{arq} presente ({kb(p)} KB)")
    else: falha(f"{arq} ausente ou vazio (botões da apostila na página principal)")
# aplicativo instalável (PWA, 18/10/2026)
for arq in ["manifest.webmanifest", "sw.js", "icons/maos-192.png", "icons/maos-512.png", "icons/maos-maskable-512.png", "icons/maos-180.png"]:
    p = os.path.join(RAIZ, *arq.split("/"))
    if os.path.exists(p) and os.path.getsize(p) > 200: ok(f"{arq} presente")
    else: falha(f"{arq} ausente (aplicativo instalável)")
try:
    man = json.load(open(os.path.join(RAIZ, "manifest.webmanifest"), encoding="utf-8"))
    if man.get("start_url") != "/Indicadores_Brasil/" or man.get("display") != "standalone": falha("manifest.webmanifest: start_url ou display inesperados")
except Exception as e:
    falha(f"manifest.webmanifest inválido ({e})")
html_raiz = verificar_pagina("raiz", os.path.join(RAIZ, "index.html"), RAIZ_MIN_KB)
if html_raiz:
    for pasta in PAINEIS:
        if f'href="{SITE}{pasta}/"' not in html_raiz:
            falha(f"raiz: não tem botão para {pasta}/")
    for trecho in ('rel="manifest"', 'serviceWorker.register("sw.js")'):
        if trecho not in html_raiz: falha(f"raiz: index.html sem {trecho} (aplicativo instalável)")
    if 'data-painel=' in html_raiz and re.search(r'<span class="data" data-painel="[a-z]+"></span>', html_raiz):
        aviso("raiz: há carimbo de atualização vazio (montar_pagina.py não encontrou atualizacao.json de algum painel)")

for pasta, (gemeo, minimo_kb, dados_js, min_unidades) in PAINEIS.items():
    print(f"== {pasta}/")
    base = os.path.join(RAIZ, pasta)
    html = verificar_pagina(pasta, os.path.join(base, "index.html"), minimo_kb)
    if html is None:
        continue
    # gêmeo
    g = os.path.join(base, gemeo)
    if not os.path.exists(g):
        falha(f"{pasta}: falta {gemeo}")
    elif open(g, "rb").read() != open(os.path.join(base, "index.html"), "rb").read():
        falha(f"{pasta}: index.html difere de {gemeo} (montagem incompleta?)")
    else:
        ok(f"{pasta}: index.html idêntico a {gemeo}")
    if 'rel="manifest"' not in html:
        falha(f"{pasta}: index.html sem o manifesto do aplicativo")
    # navegação entre painéis
    if f'href="{SITE}"' not in html:
        falha(f"{pasta}: sem botão de volta à página principal")
    # dados
    n_unidades = None
    try:
        dados = dados_do_js(os.path.join(base, dados_js))
        n_unidades = len(dados.get("maternidades", []))
        if n_unidades < min_unidades:
            falha(f"{pasta}: {dados_js} tem {n_unidades} unidades (mínimo {min_unidades})")
        else:
            ok(f"{pasta}: {dados_js} válido, {n_unidades} unidades")
    except Exception as e:
        falha(f"{pasta}: {dados_js} inválido ({e})")
    # JSON puro (API estática)
    try:
        puro = json.load(open(os.path.join(base, "dados.json"), encoding="utf-8"))
        if n_unidades is not None and len(puro.get("maternidades", [])) != n_unidades:
            falha(f"{pasta}: dados.json tem {len(puro.get('maternidades', []))} unidades e {dados_js} tem {n_unidades} (remontar o painel)")
        else:
            ok(f"{pasta}: dados.json válido")
    except FileNotFoundError:
        falha(f"{pasta}: falta dados.json (gerado pelo montar_painel.py)")
    except Exception as e:
        falha(f"{pasta}: dados.json inválido ({e})")
    # fichas CNES
    try:
        cnes = json.load(open(os.path.join(base, "cnes_dados.json"), encoding="utf-8"))
        n_fichas = len([k for k in cnes if not k.startswith("_")])
        quando = cnes.get("_atualizado_em", "?")
        if n_unidades and n_fichas < PROPORCAO_MIN_FICHAS * n_unidades:
            falha(f"{pasta}: cnes_dados.json tem {n_fichas} fichas para {n_unidades} unidades (atualizado em {quando})")
        else:
            ok(f"{pasta}: cnes_dados.json com {n_fichas} fichas, atualizado em {quando}")
        sem_hab = sum(1 for k, v in cnes.items() if not k.startswith("_") and not (v or {}).get("habilitacoes"))
        if n_fichas and sem_hab > 0.5 * n_fichas:
            aviso(f"{pasta}: {sem_hab} de {n_fichas} fichas sem habilitações (serviço do CNES indisponível na atualização?)")
    except Exception as e:
        falha(f"{pasta}: cnes_dados.json inválido ({e})")
    # carimbo
    try:
        at = json.load(open(os.path.join(base, "atualizacao.json"), encoding="utf-8"))
        if not re.match(r"\d{4}-\d{2}-\d{2}$", at.get("montado_em", "")):
            falha(f"{pasta}: atualizacao.json sem data de montagem válida")
        else:
            ok(f"{pasta}: montado em {at['montado_em']}")
    except FileNotFoundError:
        falha(f"{pasta}: falta atualizacao.json (gerado pelo montar_painel.py)")
    except Exception as e:
        falha(f"{pasta}: atualizacao.json inválido ({e})")

# painel de habilitações: além das unidades acompanhadas, as demais unidades com leitos obstétricos/neonatais SUS
print("== habilitacoes/: demais unidades com leitos SUS")
try:
    dh = json.load(open(os.path.join(RAIZ, "habilitacoes", "dados.json"), encoding="utf-8"))
    n_demais = len(dh.get("demais") or [])
    if n_demais < 2500:
        falha(f"habilitacoes: dados.json com {n_demais} unidades além das acompanhadas (esperadas mais de 2.500; falta o universo_cnes.json?)")
    else:
        repetidas = {u["c"] for u in dh["demais"]} & {m["cnes"] for m in dh["maternidades"]}
        if repetidas:
            falha(f"habilitacoes: unidades acompanhadas repetidas entre as demais: {sorted(repetidas)[:5]}")
        else:
            ok(f"habilitacoes: {n_demais} unidades além das {len(dh['maternidades'])} acompanhadas, competência {(dh.get('universo') or {}).get('competencia')}")
except Exception as e:
    falha(f"habilitacoes: não foi possível conferir as demais unidades ({e})")

# mesmas unidades nos quatro painéis (13/11/2026, pedido da coordenação). Os dois códigos CNES do complexo da FAMEMA
# contam como uma unidade: Nascimentos e Internação usam 2025507; Mortalidade e Habilitações, 2025523.
print("== unidades iguais nos quatro painéis")
COMPLEXOS = {"2025507": "2025523"}
unidades = {}
for pasta in PAINEIS:
    try:
        ms = json.load(open(os.path.join(RAIZ, pasta, "dados.json"), encoding="utf-8")).get("maternidades", [])
        codigos = [COMPLEXOS.get(m["cnes"], m["cnes"]) for m in ms]
        if len(codigos) != len(set(codigos)):
            falha(f"{pasta}: unidade repetida no dados.json ({sorted(c for c in set(codigos) if codigos.count(c) > 1)})")
        unidades[pasta] = {c: m.get("nome", "") for c, m in zip(codigos, ms)}
    except Exception as e:
        falha(f"{pasta}: não foi possível ler as unidades do dados.json ({e})")
if len(unidades) == len(PAINEIS):
    todas = set().union(*unidades.values())
    for pasta, u in unidades.items():
        faltam = sorted(todas - set(u))
        if faltam:
            nomes = [f"{c} {next(v[c] for v in unidades.values() if c in v)}" for c in faltam]
            falha(f"{pasta}: faltam {len(faltam)} unidade(s) que estão em outro painel: {'; '.join(nomes)}")
    if all(set(u) == todas for u in unidades.values()):
        ok(f"as mesmas {len(todas)} unidades em {', '.join(PAINEIS)}")

print()
if avisos:
    print(f"{len(avisos)} aviso(s).")
if falhas:
    print(f"{len(falhas)} FALHA(S):"); [print(" -", f) for f in falhas]
    sys.exit(1)
print("Tudo certo: site pronto para publicar.")
