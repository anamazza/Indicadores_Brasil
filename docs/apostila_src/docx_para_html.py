# -*- coding: utf-8 -*-
"""Converte a apostila (.docx gerado pelo docx-js) numa página HTML de leitura, sem depender do Word.
Uso: py -I docx_para_html.py <apostila.docx> <pasta_saida> [titulo]
Gera <pasta_saida>/apostila.html (UTF-8, estilo dos painéis, sumário próprio com âncoras, imagens embutidas)."""
import base64, html as H, io, os, re, sys, zipfile
import xml.etree.ElementTree as ET

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
R = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
A = "http://schemas.openxmlformats.org/drawingml/2006/main"
NS = {"w": W, "r": R, "a": A, "wp": "http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing",
      "pic": "http://schemas.openxmlformats.org/drawingml/2006/picture"}
q = lambda tag: "{%s}%s" % (W, tag)

src, out = sys.argv[1], sys.argv[2]
titulo_doc = sys.argv[3] if len(sys.argv) > 3 else "Apostila dos Dicionários de Dados"
z = zipfile.ZipFile(src)
doc = ET.fromstring(z.read("word/document.xml"))
rels = ET.fromstring(z.read("word/_rels/document.xml.rels"))
rel = {r.get("Id"): r.get("Target") for r in rels}
styles = ET.fromstring(z.read("word/styles.xml"))
nome_estilo = {}
for s in styles.findall("w:style", NS):
    n = s.find("w:name", NS)
    nome_estilo[s.get(q("styleId"))] = (n.get(q("val")) if n is not None else "").lower()


def nivel_titulo(p):
    ps = p.find("w:pPr/w:pStyle", NS)
    if ps is None: return None
    sid = ps.get(q("val")); nome = nome_estilo.get(sid, sid.lower())
    m = re.search(r"(heading|título|titulo)\s*([1-3])", nome) or re.search(r"(heading|titulo)([1-3])", sid.lower())
    return int(m.group(2)) if m else None


def eh_lista(p):
    return p.find("w:pPr/w:numPr", NS) is not None


def num_id(p):
    n = p.find("w:pPr/w:numPr/w:numId", NS)
    return n.get(q("val")) if n is not None else None


def runs_html(el):
    """Texto de um parágrafo com negrito, itálico e links; imagens embutidas em base64."""
    partes = []
    for filho in el:
        tag = filho.tag
        if tag == q("hyperlink"):
            alvo = rel.get(filho.get("{%s}id" % R), "#")
            partes.append('<a href="%s" target="_blank" rel="noopener">%s</a>' % (H.escape(alvo), runs_html(filho)))
        elif tag == q("r"):
            rpr = filho.find("w:rPr", NS)
            negrito = rpr is not None and rpr.find("w:b", NS) is not None
            italico = rpr is not None and rpr.find("w:i", NS) is not None
            txt = ""
            for t in filho:
                if t.tag == q("t"): txt += t.text or ""
                elif t.tag == q("tab"): txt += " "
                elif t.tag == q("br"): txt += "<br>"
                elif t.tag == q("drawing"):
                    blip = t.find(".//a:blip", NS)
                    if blip is not None:
                        alvo = rel.get(blip.get("{%s}embed" % R))
                        if alvo:
                            dados = z.read("word/" + alvo); ext = alvo.rsplit(".", 1)[-1].lower()
                            mime = "image/png" if ext == "png" else "image/jpeg"
                            descr = t.find(".//wp:docPr", NS)
                            alt = (descr.get("descr") or descr.get("title") or "") if descr is not None else ""
                            txt += '<img src="data:%s;base64,%s" alt="%s">' % (mime, base64.b64encode(dados).decode("ascii"), H.escape(alt))
            if not txt: continue
            s = H.escape(txt).replace("&lt;br&gt;", "<br>").replace("&lt;img ", "<img ").replace("&quot;&gt;", '">')
            # as imagens já vêm com HTML válido; o escape acima só afeta o texto
            if "<img " in txt:
                s = txt
            if negrito: s = "<strong>%s</strong>" % s
            if italico: s = "<em>%s</em>" % s
            partes.append(s)
        elif tag in (q("fldSimple"),):
            partes.append(runs_html(filho))
    return "".join(partes)


def celula_html(tc):
    pars = [runs_html(p) for p in tc.findall("w:p", NS)]
    pars = [p for p in pars if p.strip()]
    return "<br>".join(pars)


saida, toc = [], []
lista_aberta = None   # ("ul"|"ol")
n_tit = 0
corpo = doc.find("w:body", NS)
em_capa = True
for el in corpo:
    if el.tag == q("p"):
        if el.find(".//w:fldChar", NS) is not None or "TOC" in "".join(t.text or "" for t in el.iter(q("instrText"))):
            continue   # campos do sumário do Word: o HTML tem sumário próprio
        nivel = nivel_titulo(el)
        texto = runs_html(el)
        if nivel:
            if lista_aberta: saida.append("</%s>" % lista_aberta); lista_aberta = None
            n_tit += 1; anc = "s%d" % n_tit
            if nivel <= 2: toc.append((nivel, re.sub(r"<[^>]+>", "", texto), anc))
            if nivel == 1 and em_capa: em_capa = False; saida.append('</section><main class="conteudo">')
            saida.append('<h%d id="%s">%s</h%d>' % (nivel, anc, texto, nivel)); continue
        if not texto.strip():
            continue
        if eh_lista(el):
            tipo = "ol" if num_id(el) == "3" else "ul"
            if lista_aberta != tipo:
                if lista_aberta: saida.append("</%s>" % lista_aberta)
                saida.append("<%s>" % tipo); lista_aberta = tipo
            saida.append("<li>%s</li>" % texto); continue
        if lista_aberta: saida.append("</%s>" % lista_aberta); lista_aberta = None
        cls = ""
        plano = re.sub(r"<[^>]+>", "", texto).strip()
        if plano == "Sumário":
            continue   # título do sumário do Word; o HTML tem o seu próprio
        if em_capa:
            if plano.startswith("Painéis de Indicadores"): cls = ' class="kicker"'
            elif plano.startswith(titulo_doc.split(" · ")[0]): cls = ' class="titulo"'
            elif plano.startswith("Painéis de Nascimentos"): cls = ' class="subtitulo"'
            elif plano.startswith("Versão"): cls = ' class="versao"'
            elif plano.startswith("Documento de trabalho"): cls = ' class="nota"'
            else: cls = ' class="inst"'
        if re.match(r"Tabela \d+ – ", plano): cls = ' class="legenda"'
        saida.append("<p%s>%s</p>" % (cls, texto))
    elif el.tag == q("tbl"):
        if lista_aberta: saida.append("</%s>" % lista_aberta); lista_aberta = None
        linhas = el.findall("w:tr", NS); h = ["<table>"]
        for i, tr in enumerate(linhas):
            cels = tr.findall("w:tc", NS)
            tagc = "th" if i == 0 else "td"
            h.append("<tr>" + "".join("<%s>%s</%s>" % (tagc, celula_html(tc), tagc) for tc in cels) + "</tr>")
        h.append("</table>"); saida.append("".join(h))
if lista_aberta: saida.append("</%s>" % lista_aberta)

sumario = "".join('<li class="n%d"><a href="#%s">%s</a></li>' % (n, a, t) for n, t, a in toc)
pagina = """<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>%s</title>
<style>
:root{--verde:#279261; --verde-texto:#1E6E49; --esmeralda:#1B5F51; --indigo:#0A213D; --lima:#4E7A16; --mint:#EDF6EF; --card:#F6FBF7; --texto:#1D3229; --suave:#4E6A5C; --borda:#D8E8DC}
*{box-sizing:border-box}
html{background:var(--mint)}
body{margin:0; padding:1rem; font-family:Calibri, "Segoe UI", Roboto, Arial, sans-serif; font-size:1.02rem; line-height:1.55; color:var(--texto)}
.folha{max-width:1000px; margin:0 auto; background:#FFF; border-radius:16px; box-shadow:0 10px 28px rgba(10,33,61,.12); padding:2rem clamp(1rem, 4vw, 3rem) 3rem}
section.capa p{margin:.3rem 0}
section.capa img{max-width:100%%; height:auto; display:block; margin:.6rem 0}
section.capa p.kicker{color:var(--lima); font-weight:700; font-size:.85rem; letter-spacing:.08em; margin-top:1.2rem}
section.capa p.titulo{color:var(--indigo); font-weight:800; font-size:2.2rem; line-height:1.15; margin:.4rem 0 .4rem}
section.capa p.titulo strong{font-weight:800}
section.capa p.subtitulo{color:var(--esmeralda); font-size:1.25rem; margin:0 0 1.4rem}
section.capa p.inst{color:var(--texto); margin:.15rem 0}
section.capa p.versao{color:var(--verde-texto); font-weight:700; margin:1.4rem 0 .4rem}
section.capa p.nota{color:var(--suave); font-size:.9rem}
nav.sumario{background:var(--card); border:1px solid var(--borda); border-radius:12px; padding:1rem 1.2rem; margin:1.5rem 0}
nav.sumario h2{margin:0 0 .5rem; font-size:1.1rem; color:var(--indigo)}
nav.sumario ul{list-style:none; margin:0; padding:0; columns:2; column-gap:2rem}
nav.sumario li{margin:.15rem 0; break-inside:avoid}
nav.sumario li.n2{padding-left:1rem; font-size:.92rem}
nav.sumario a{color:var(--indigo); text-decoration:none}
nav.sumario a:hover{text-decoration:underline}
h1{color:var(--indigo); border-bottom:3px solid var(--verde); padding-bottom:.25rem; margin-top:2.4rem; font-size:1.7rem}
h2{color:var(--verde-texto); margin-top:1.8rem; font-size:1.3rem}
h3{color:var(--esmeralda); margin-top:1.3rem; font-size:1.1rem}
p{margin:.5rem 0}
p.legenda{color:var(--esmeralda); font-weight:700; font-size:.92rem; margin:1.2rem 0 .3rem}
table{border-collapse:collapse; width:100%%; margin:0 0 1rem; font-size:.9rem}
th, td{border:1px solid var(--borda); padding:.4rem .55rem; vertical-align:top; text-align:left}
th{background:var(--esmeralda); color:#FFF}
tr:nth-child(even) td{background:var(--card)}
td:first-child{font-weight:700; color:var(--indigo)}
ul, ol{padding-left:1.4rem}
li{margin:.25rem 0}
a{color:var(--indigo)}
.topo{position:sticky; top:0; z-index:2; background:var(--indigo); color:#FFF; padding:.5rem 1rem; border-radius:12px; margin-bottom:1rem; display:flex; gap:1rem; align-items:center; font-size:.9rem}
.topo a{color:#9FC3AE; font-weight:700; text-decoration:none}
@media print{ html{background:#FFF} body{padding:0} .folha{box-shadow:none; border-radius:0; padding:0; max-width:none} .topo{display:none} h1{break-before:page} h1:first-of-type{break-before:auto} table, tr{break-inside:avoid} nav.sumario ul{columns:1} }
@media (max-width:700px){ nav.sumario ul{columns:1} table{font-size:.84rem} }
</style>
</head>
<body>
<div class="folha">
<div class="topo"><span>%s</span><a href="#sumario">Sumário</a><a href="Apostila_Dicionarios_de_Dados_Paineis_Maternidades.pdf" download>Baixar PDF</a><a href="Apostila_Dicionarios_de_Dados_Paineis_Maternidades.docx" download>Baixar Word</a></div>
<section class="capa">
%s
<nav class="sumario" id="sumario"><h2>Sumário</h2><ul>%s</ul></nav>
%s
</main>
</div>
</body>
</html>
"""
# divide capa (antes do primeiro h1) do conteúdo
texto = "\n".join(saida)
if '</section><main class="conteudo">' in texto:
    capa_html, conteudo = texto.split('</section><main class="conteudo">', 1)
else:
    capa_html, conteudo = "", texto
final = pagina % (H.escape(titulo_doc), H.escape(titulo_doc), capa_html, sumario, '</section><main class="conteudo">' + conteudo if conteudo else "")
os.makedirs(out, exist_ok=True)
io.open(os.path.join(out, "apostila.html"), "w", encoding="utf-8", newline="\n").write(final)
print("gerado", os.path.join(out, "apostila.html"), len(final) // 1024, "KB;", len(toc), "entradas no sumário")
