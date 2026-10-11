# -*- coding: utf-8 -*-
"""Monta o painel em arquivo único: embute dados, ficha CNES, app e logos no HTML.
Saída: Painel_Mortalidade_2026.html e index.html (idênticos).

Publicação (desde 11/10/2026): os três painéis e a página principal estão reunidos no repositório
Indicadores_Brasil (clone em Documentos/Página principal). Ao final, esta pasta é espelhada na subpasta
mortalidade/ desse repositório; publicar = commit + push de lá. O repositório antigo
Indicadores_mortalidade-2026 só redireciona para o novo endereço."""
import base64, os, shutil

BASE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(BASE, "painel_base.html"), encoding="utf-8").read()
dados = open(os.path.join(BASE, "dados_mortalidade.js"), encoding="utf-8").read()
app = open(os.path.join(BASE, "painel_app.js"), encoding="utf-8").read()

# ficha CNES + habilitações (build_dados.py / atualizar_cnes.py)
cnes_path = os.path.join(BASE, "cnes_dados.json")
cnes_js = ""
if os.path.exists(cnes_path):
    cnes_js = "\nconst CNES_INFO = " + open(cnes_path, encoding="utf-8").read() + ";"

html = html.replace('<script src="dados_mortalidade.js"></script>', "<script>\n" + dados + cnes_js + "\n</script>")
html = html.replace('<script src="painel_app.js"></script>', "<script>\n" + app + "\n</script>")

# logos institucionais (base64)
logos_path = os.path.join(BASE, "logos_institucionais.png")
if os.path.exists(logos_path):
    b64l = base64.b64encode(open(logos_path, "rb").read()).decode("ascii")
    html = html.replace('src="logos_institucionais.png"', 'src="data:image/png;base64,' + b64l + '"')

out = os.path.join(BASE, "Painel_Mortalidade_2026.html")
open(out, "w", encoding="utf-8").write(html)
open(os.path.join(BASE, "index.html"), "w", encoding="utf-8").write(html)
print(f"gerado {out} ({os.path.getsize(out) // 1024} KB) + index.html")

# ---------------------------------------------------------------------------------------------
# Espelha esta pasta na subpasta mortalidade/ do repositório Indicadores_Brasil (11/10/2026).
# ---------------------------------------------------------------------------------------------
REPO = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Página principal")
DESTINO = os.path.join(REPO, "mortalidade")
EXCLUIR_DIRS = {".git", ".git_antigo", ".claude", "deploy", "__pycache__"}
EXCLUIR_ARQS = {"atualizacao_cnes.log"}
EXCLUIR_EXT = {".pyc"}


def espelhar(origem, destino):
    """Copia tudo de origem para destino (fora as exclusões) e apaga em destino o que não existe mais."""
    os.makedirs(destino, exist_ok=True)
    mantidos, copiados, removidos = set(), 0, 0
    for raiz, dirs, arqs in os.walk(origem):
        dirs[:] = [d for d in dirs if d not in EXCLUIR_DIRS]
        rel = os.path.relpath(raiz, origem)
        for a in arqs:
            if a in EXCLUIR_ARQS or os.path.splitext(a)[1].lower() in EXCLUIR_EXT:
                continue
            dst = os.path.normpath(os.path.join(destino, rel, a))
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(os.path.join(raiz, a), dst)
            mantidos.add(os.path.normcase(dst)); copiados += 1
    for raiz, dirs, arqs in os.walk(destino, topdown=False):
        for a in arqs:
            p = os.path.normpath(os.path.join(raiz, a))
            if os.path.normcase(p) not in mantidos:
                os.remove(p); removidos += 1
        for d in dirs:
            p = os.path.join(raiz, d)
            if not os.listdir(p):
                try:
                    os.rmdir(p)
                except OSError:
                    pass  # pasta vazia presa pelo OneDrive; o git ignora pastas vazias
    return copiados, removidos


if os.path.isdir(os.path.join(REPO, ".git")):
    c, r = espelhar(BASE, DESTINO)
    print(f"espelhado em {DESTINO} ({c} arquivos copiados, {r} removidos) — publicar com commit + push do Indicadores_Brasil")
else:
    print(f"AVISO: repositório Indicadores_Brasil não encontrado em {REPO}; nada foi espelhado")
