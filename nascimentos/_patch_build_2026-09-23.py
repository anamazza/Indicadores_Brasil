# -*- coding: utf-8 -*-
"""Patch de 23/09/2026 no build_dados.py: (1) planilha das unidades adicionais MA/CE/SP no
conjunto das estrategicas/apoiadas (mesmo criterio do Iauarete); (2) blocos assistenciais
dessas unidades vindos dos JSON das extracoes proprias (blocos_adicionais.py)."""
import os, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))
src = open("build_dados.py", encoding="utf-8").read()
if "blocos_adicionais" in src:
    raise SystemExit("build_dados.py ja tem o patch")
shutil.copy("build_dados.py", "build_dados.py.bak_2026-09-23")

a1 = '    ("estrategica", "INDICADORES MATERNIDADE IAUARETE_2019_2025.xlsx", "_config_iauarete"),\n]'
b1 = ('    ("estrategica", "INDICADORES MATERNIDADE IAUARETE_2019_2025.xlsx", "_config_iauarete"),\n'
      '    # 23/09/2026: Carmosina Coutinho/MA, Santa Casa de Sobral/CE e Santa Casa de Franca/SP,\n'
      '    # pedidas pela coordenacao (Brenda) para decks + painel; nao constam da lista oficial\n'
      '    # por grupo de 09/09, por isso entram como o Iauarete (estrategicas/apoiadas)\n'
      '    ("estrategica", "INDICADORES MATERNIDADES ADICIONAIS MA CE SP_2019_2025.xlsx",\n'
      '     "_config_adicionais_ma_ce_sp"),\n]')
assert src.count(a1) == 1, "ancora 1 nao encontrada"
src = src.replace(a1, b1)

a2 = 'assist, avisos_a = blocos_assistenciais.carregar(os.path.join(PROJ, "Indicadores_Assistenciais"))\n'
b2 = (a2 +
      '# 23/09/2026: unidades adicionais fora das planilhas da coordenacao - blocos montados dos\n'
      '# JSON das extracoes proprias, com a estrutura de um bloco oficial como molde\n'
      'import blocos_adicionais\n'
      'extra, avisos_x = blocos_adicionais.carregar(assist["0000434"])\n'
      'for cnes, b in extra.items():\n'
      '    if cnes in assist:\n'
      '        avisos_x.append(f"{cnes} ja tinha bloco oficial - mantido o oficial"); continue\n'
      '    assist[cnes] = b\n'
      'avisos_a += avisos_x\n'
      'print(f"[2c] blocos assistenciais adicionais (JSON): {len(extra)}")\n')
assert src.count(a2) == 1, "ancora 2 nao encontrada"
src = src.replace(a2, b2)
open("build_dados.py", "w", encoding="utf-8").write(src)
print("build_dados.py atualizado (backup build_dados.py.bak_2026-09-23)")
