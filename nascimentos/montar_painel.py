# -*- coding: utf-8 -*-
"""Monta o painel em arquivo único: embute dados, app, logos e a foto do hero no HTML.
Saída: Painel_NV2026_Novo.html e index.html (idênticos).

Publicação (desde 11/10/2026): os três painéis e a página principal estão reunidos no repositório
Indicadores_Brasil (clone em Documentos/Página principal). Ao final, esta pasta é espelhada na subpasta
nascimentos/ desse repositório; publicar = commit + push de lá. O repositório antigo Indicadores_NV só
redireciona para os novos endereços."""
import base64, json, os, shutil
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))

# ---------------------------------------------------------------------------------------------
# CNES (desde 11/10/2026): a ficha CNES é atualizada na nuvem (GitHub Actions, workflow "Atualizar CNES"),
# direto no repositório. Aqui só resgatamos o cnes_dados.json do repositório se ele for mais novo que o local.
# ---------------------------------------------------------------------------------------------
REPO = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Página principal")
DESTINO = os.path.join(REPO, "nascimentos")


def _data_cnes(p):
    try:
        return json.load(open(p, encoding="utf-8")).get("_atualizado_em", "")
    except Exception:
        return ""


_cnes_repo, _cnes_local = os.path.join(DESTINO, "cnes_dados.json"), os.path.join(BASE, "cnes_dados.json")
if os.path.exists(_cnes_repo) and _data_cnes(_cnes_repo) > _data_cnes(_cnes_local):
    shutil.copy2(_cnes_repo, _cnes_local)
    print(f"cnes_dados.json resgatado do repositório (atualizado em {_data_cnes(_cnes_local)})")
html = open(os.path.join(BASE, "painel_base.html"), encoding="utf-8").read()
dados = open(os.path.join(BASE, "dados_nv2026.js"), encoding="utf-8").read()
app = open(os.path.join(BASE, "painel_app.js"), encoding="utf-8").read()

# ---------------------------------------------------------------------------------------------
# JSON puro dos indicadores (desde 11/10/2026): o mesmo DADOS que o HTML embute, gravado em dados.json
# e servido pelo GitHub Pages em <site>/<pasta>/dados.json — "API estática" para outros painéis e para o
# futuro sistema, sem depender do HTML.
# ---------------------------------------------------------------------------------------------
try:
    _i = dados.index("const DADOS = ") + len("const DADOS = ")
    _D = json.JSONDecoder().raw_decode(dados, _i)[0]
    with open(os.path.join(BASE, "dados.json"), "w", encoding="utf-8") as fh:
        json.dump(_D, fh, ensure_ascii=False, separators=(",", ":"))
    print(f"dados.json gravado ({len(_D.get('maternidades', []))} unidades)")
except Exception as e:
    print("aviso: dados.json não gerado:", e)

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
open(os.path.join(BASE, "index.html"), "w", encoding="utf-8").write(html)
print(f"gerado {out} ({os.path.getsize(out)//1024} KB) + index.html")

# ---------------------------------------------------------------------------------------------
# Espelha esta pasta na subpasta nascimentos/ do repositório Indicadores_Brasil (11/10/2026).
# Ficam de fora: pastas de controle e de cache, saídas antigas (nascimentos/, internacao/, deploy/)
# e a página de redirecionamento do repositório antigo (pagina_inicial.html).
# ---------------------------------------------------------------------------------------------
REPO = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Página principal")
DESTINO = os.path.join(REPO, "nascimentos")
EXCLUIR_DIRS = {".git", ".git_antigo", ".claude", "deploy", "__pycache__", "nascimentos", "internacao"}
EXCLUIR_ARQS = {"pagina_inicial.html", "atualizacao_cnes.log"}
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


# ---------------------------------------------------------------------------------------------
# Carimbo de atualização (lido por montar_pagina.py, que o mostra sob o botão do painel, e por verificar_site.py).
# dados_gerados_em só é recalculado localmente (na nuvem o git não preserva datas de arquivo).
# ---------------------------------------------------------------------------------------------
def _contar_unidades():
    try:
        js = open(os.path.join(BASE, "dados_nv2026.js"), encoding="utf-8").read()
        i = js.index("const DADOS = ") + len("const DADOS = ")
        return len(json.JSONDecoder().raw_decode(js, i)[0].get("maternidades", []))
    except Exception:
        return None


_carimbo_path = os.path.join(BASE, "atualizacao.json")
try:
    _anterior = json.load(open(_carimbo_path, encoding="utf-8"))
except Exception:
    _anterior = {}
_dados_path = os.path.join(BASE, "dados_nv2026.js")
_local = os.path.isdir(os.path.join(REPO, ".git"))
carimbo = {
    "painel": "nascimentos",
    "montado_em": date.today().isoformat(),
    "dados_gerados_em": (date.fromtimestamp(os.path.getmtime(_dados_path)).isoformat()
                         if _local and os.path.exists(_dados_path) else _anterior.get("dados_gerados_em")),
    "cnes_atualizado_em": _data_cnes(os.path.join(BASE, "cnes_dados.json")) or None,
    "unidades": _contar_unidades(),
}
with open(_carimbo_path, "w", encoding="utf-8") as fh:
    json.dump(carimbo, fh, ensure_ascii=False, indent=1)
print(f"carimbo: montado em {carimbo['montado_em']}, dados de {carimbo['dados_gerados_em']}, CNES de {carimbo['cnes_atualizado_em']}, {carimbo['unidades']} unidades")

if os.path.isdir(os.path.join(REPO, ".git")):
    c, r = espelhar(BASE, DESTINO)
    print(f"espelhado em {DESTINO} ({c} arquivos copiados, {r} removidos) — publicar com commit + push do Indicadores_Brasil")
else:
    print(f"AVISO: repositório Indicadores_Brasil não encontrado em {REPO}; nada foi espelhado")
