# -*- coding: utf-8 -*-
"""Monta o painel em arquivo único: embute dados, app e a foto do hero no HTML."""
import base64, os

BASE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(BASE, "painel_base.html"), encoding="utf-8").read()
dados = open(os.path.join(BASE, "dados_nv2026.js"), encoding="utf-8").read()
app = open(os.path.join(BASE, "painel_app.js"), encoding="utf-8").read()

# ficha CNES (busca oficial via atualizar_cnes.py)
cnes_path = os.path.join(BASE, "cnes_dados.json")
cnes_js = ""
if os.path.exists(cnes_path):
    cnes_js = "\nconst CNES_INFO = " + open(cnes_path, encoding="utf-8").read() + ";"

# comparativo 2019 x 2024 (build_comparativo.py)
comp_path = os.path.join(BASE, "comparativo_nv.js")
comp_js = ""
if os.path.exists(comp_path):
    comp_js = "\n" + open(comp_path, encoding="utf-8").read()

html = html.replace('<script src="dados_nv2026.js"></script>', "<script>\n" + dados + cnes_js + comp_js + "\n</script>")
html = html.replace('<script src="painel_app.js"></script>', "<script>\n" + app + "\n</script>")

# logos institucionais (base64)
logos_path = os.path.join(BASE, "logos_institucionais.png")
if os.path.exists(logos_path):
    b64l = base64.b64encode(open(logos_path, "rb").read()).decode("ascii")
    html = html.replace('src="logos_institucionais.png"', 'src="data:image/png;base64,' + b64l + '"')

# foto do hero (base64) — injeta a variável CSS no :root
foto_path = os.path.join(BASE, "foto_hero.jpg")
if os.path.exists(foto_path):
    b64 = base64.b64encode(open(foto_path, "rb").read()).decode("ascii")
    html = html.replace(":root{", ":root{\n  --foto-hero:url('data:image/jpeg;base64," + b64 + "');", 1)

out = os.path.join(BASE, "Painel_NV2026_Novo.html")
open(out, "w", encoding="utf-8").write(html)
# 29/09/2026: o painel de nascimentos é publicado na subpasta nascimentos/ (GitHub Pages
# anamazza.github.io/Indicadores_NV/nascimentos/); a raiz do repositório é a página inicial
# (pagina_inicial.html) com os botões para os dois painéis (nascimentos e internacao/).
os.makedirs(os.path.join(BASE, "nascimentos"), exist_ok=True)
open(os.path.join(BASE, "nascimentos", "index.html"), "w", encoding="utf-8").write(html)
inicial = open(os.path.join(BASE, "pagina_inicial.html"), encoding="utf-8").read()
if os.path.exists(logos_path):
    inicial = inicial.replace('src="logos_institucionais.png"', 'src="data:image/png;base64,' + b64l + '"')
open(os.path.join(BASE, "index.html"), "w", encoding="utf-8").write(inicial)
print(f"gerado {out} ({os.path.getsize(out)//1024} KB) + nascimentos/index.html + index.html (página inicial)")
