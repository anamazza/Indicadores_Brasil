# -*- coding: utf-8 -*-
"""Monta a página principal em arquivo único: embute as logos institucionais e a foto do hero no HTML.
Fonte editável: pagina_inicial.html. Saída: index.html (publicado pelo GitHub Pages)."""
import base64, os

BASE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(BASE, "pagina_inicial.html"), encoding="utf-8").read()

# logos institucionais (base64)
logos_path = os.path.join(BASE, "logos_institucionais.png")
if os.path.exists(logos_path):
    b64 = base64.b64encode(open(logos_path, "rb").read()).decode("ascii")
    html = html.replace('src="logos_institucionais.png"', 'src="data:image/png;base64,' + b64 + '"')

# foto de fundo do hero (base64) — troque o arquivo foto_hero.jpg para mudar a foto
foto_path = os.path.join(BASE, "foto_hero.jpg")
if os.path.exists(foto_path):
    b64f = base64.b64encode(open(foto_path, "rb").read()).decode("ascii")
    html = html.replace("--foto-hero:url('foto_hero.jpg');", "--foto-hero:url('data:image/jpeg;base64," + b64f + "');", 1)

out = os.path.join(BASE, "index.html")
open(out, "w", encoding="utf-8").write(html)
print(f"gerado {out} ({os.path.getsize(out) // 1024} KB)")
