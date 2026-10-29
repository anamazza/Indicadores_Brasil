# -*- coding: utf-8 -*-
"""Monta o Painel de Habilitações em arquivo único: consolida os dados dos três painéis (build_dados.py), embute
dados, app e logos no HTML e grava o carimbo de atualização.

    py montar_painel.py        (na raiz do repositório: py habilitacoes/montar_painel.py)

Saída: Painel_Habilitacoes_2026.html e index.html (idênticos), dados.json (JSON puro, API estática),
dados_habilitacoes.js e cnes_dados.json (consolidados) e atualizacao.json (carimbo lido por montar_pagina.py).

Diferente dos outros três painéis, este vive só no repositório: não tem pasta de trabalho local nem espelhamento,
porque a sua única fonte é o CNES, atualizado na nuvem pelo workflow "Atualizar CNES" (que roda este script depois
de atualizar os três painéis). Localmente, publicar.ps1 também o roda depois de montar os outros painéis."""
import base64, json, os, sys
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, BASE)
from build_dados import consolidar  # noqa: E402

DADOS = consolidar()

html = open(os.path.join(BASE, "painel_base.html"), encoding="utf-8").read()
dados = open(os.path.join(BASE, "dados_habilitacoes.js"), encoding="utf-8").read()
app = open(os.path.join(BASE, "painel_app.js"), encoding="utf-8").read()

with open(os.path.join(BASE, "dados.json"), "w", encoding="utf-8") as fh:
    json.dump(DADOS, fh, ensure_ascii=False, separators=(",", ":"))
print(f"dados.json gravado ({len(DADOS['maternidades'])} unidades)")

html = html.replace('<script src="dados_habilitacoes.js"></script>', "<script>\n" + dados + "\n</script>")
html = html.replace('<script src="painel_app.js"></script>', "<script>\n" + app + "\n</script>")
logos_path = os.path.join(BASE, "logos_institucionais.png")
if os.path.exists(logos_path):
    b64l = base64.b64encode(open(logos_path, "rb").read()).decode("ascii")
    html = html.replace('src="logos_institucionais.png"', 'src="data:image/png;base64,' + b64l + '"')

out = os.path.join(BASE, "Painel_Habilitacoes_2026.html")
open(out, "w", encoding="utf-8").write(html)
open(os.path.join(BASE, "index.html"), "w", encoding="utf-8").write(html)
print(f"gerado {out} ({os.path.getsize(out) // 1024} KB) + index.html")

carimbo = {
    "painel": "habilitacoes",
    "montado_em": date.today().isoformat(),
    "dados_gerados_em": DADOS.get("consultaCnes"),       # a data dos dados é a da consulta ao CNES
    "cnes_atualizado_em": DADOS.get("consultaCnes"),
    "unidades": len(DADOS["maternidades"]),
}
with open(os.path.join(BASE, "atualizacao.json"), "w", encoding="utf-8") as fh:
    json.dump(carimbo, fh, ensure_ascii=False, indent=1)
print(f"carimbo: montado em {carimbo['montado_em']}, CNES de {carimbo['cnes_atualizado_em']}, {carimbo['unidades']} unidades")
