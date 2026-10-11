# -*- coding: utf-8 -*-
"""Monta a página principal em arquivo único: embute as logos e a foto do hero e preenche os carimbos de
atualização de cada painel (lidos de <painel>/atualizacao.json, gerado pelo montar_painel.py de cada um).
Fonte editável: pagina_inicial.html. Saída: index.html (publicado pelo GitHub Pages)."""
import base64, json, os, re

BASE = os.path.dirname(os.path.abspath(__file__))
PAINEIS = ["nascimentos", "internacao", "mortalidade"]
html = open(os.path.join(BASE, "pagina_inicial.html"), encoding="utf-8").read()


def br(iso):
    """2026-10-11 -> 11/10/2026"""
    return f"{iso[8:10]}/{iso[5:7]}/{iso[0:4]}" if iso and len(iso) >= 10 else ""


# carimbos: "atualizado em dd/mm/aaaa" sob cada botão, e a data mais recente da ficha CNES na nota de fontes
cnes_datas = []
for p in PAINEIS:
    caminho = os.path.join(BASE, p, "atualizacao.json")
    texto = ""
    if os.path.exists(caminho):
        try:
            at = json.load(open(caminho, encoding="utf-8"))
            quando = at.get("dados_gerados_em") or at.get("montado_em") or ""
            if quando:
                texto = f"atualizado em {br(quando)}"
            if at.get("cnes_atualizado_em"):
                cnes_datas.append(at["cnes_atualizado_em"])
        except Exception as e:
            print(f"aviso: {p}/atualizacao.json ilegível ({e})")
    else:
        print(f"aviso: {p}/atualizacao.json não encontrado (rode o montar_painel.py do painel)")
    html = html.replace(f'<span class="data" data-painel="{p}"></span>',
                        f'<span class="data" data-painel="{p}">{texto}</span>', 1)

if cnes_datas:
    html = html.replace('<span id="cnes-em"></span>',
                        f'<span id="cnes-em">Ficha CNES e habilitações atualizadas em {br(max(cnes_datas))}.</span>', 1)

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
