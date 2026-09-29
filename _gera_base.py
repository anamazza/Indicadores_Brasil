# -*- coding: utf-8 -*-
"""Gera painel_base.html do Painel de Internação a partir do painel_base.html do Painel de
Mortalidade (mesma família visual), trocando textos, retirando o mapa coroplético e o comparativo
entre anos (não há tabulação territorial do SIH) e acrescentando os botões dos três painéis.
Rode de novo sempre que o base de mortalidade mudar de estilo. 29/09/2026."""
import os, re
BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(os.path.dirname(os.path.dirname(BASE)), "Mortalidade Indicadores", "Painel_Mortalidade", "painel_base.html")
h = open(SRC, encoding="utf-8").read()

def rep(a, b, n=1):
    global h
    assert h.count(a) == n, (h.count(a), a[:70])
    h = h.replace(a, b)

rep("<title>Painel de Mortalidade 2026 · Maternidades Estratégicas · Saúde Materna e Neonatal</title>",
    "<title>Painel de Internação 2026 · Maternidades Estratégicas · Saúde Materna e Neonatal</title>")
# botões dos painéis da família (cabeçalho)
rep("/* faixa de destaques abaixo do cabeçalho */",
    """/* botões dos painéis da família */
.hero-links{display:flex; gap:.55rem; flex-wrap:wrap; margin-top:1.3rem; align-items:center}
.hero-links .rot{font-size:.7rem; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:#C9DCD0; margin-right:.2rem}
.hero-links a{
  display:inline-flex; align-items:center; gap:.4rem; text-decoration:none;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.35); color:#FFF;
  border-radius:999px; padding:.42rem 1rem; font-size:.86rem; font-weight:800; transition:background .15s;
}
.hero-links a:hover{background:rgba(255,255,255,.24)}
.hero-links a.atual{background:var(--verde-fiocruz); border-color:var(--verde-fiocruz); cursor:default}
/* faixa de destaques abaixo do cabeçalho */""")
rep("""    <p class="eyebrow">Painel de Indicadores · Mortalidade Materna, Fetal, Perinatal e Neonatal · 2019 a 2025</p>
    <h1 style="margin-top:.6rem">Qualificação do Modelo de Gestão em Maternidades Estratégicas</h1>
    <p class="sub">Rede de Atenção à Saúde Materna e Neonatal · óbitos ocorridos nas maternidades segundo o SIM (declarações de óbito e de óbito fetal) e nascidos vivos do SINASC, 2019 a 2025, com cadastro CNES e localização das unidades.</p>
    <div class="hero-blocos">
      <span>Mortalidade materna</span><span>Mortalidade fetal</span><span>Mortalidade perinatal</span><span>Mortalidade neonatal</span>
    </div>""",
    """    <p class="eyebrow">Painel de Indicadores · Internações Obstétricas e Neonatais · 2019 a 2025</p>
    <h1 style="margin-top:.6rem">Qualificação do Modelo de Gestão em Maternidades Estratégicas</h1>
    <p class="sub">Rede de Atenção à Saúde Materna e Neonatal · internações obstétricas e neonatais faturadas ao SUS (SIH/SUS), motivos, práticas assistenciais, morbidade materna grave, morbidade neonatal e uso da capacidade instalada, 2019 a 2025, com cadastro CNES e localização das unidades.</p>
    <div class="hero-blocos">
      <span>Internações obstétricas</span><span>Assistência ao parto</span><span>Morbidade materna grave</span><span>Internações neonatais</span><span>UTI neonatal</span>
    </div>
    <div class="hero-links" aria-label="Painéis da coordenação">
      <span class="rot">Painéis</span>
      <a href="https://anamazza.github.io/Indicadores_NV/">Início</a>
      <a href="https://anamazza.github.io/Indicadores_NV/nascimentos/">Nascimentos</a>
      <a class="atual" aria-current="page">Internação</a>
      <a href="https://anamazza.github.io/Indicadores_mortalidade-2026/">Mortalidade</a>
    </div>""")
rep("""  <div class="stat"><div class="num" id="statNV">—</div><div class="rot">Nascidos vivos 2025</div></div>
  <div class="stat"><div class="num" id="statMat">—</div><div class="rot">Óbitos maternos 2025</div><div class="sub" id="statMatSub"></div></div>
  <div class="stat"><div class="num" id="statNeo">—</div><div class="rot">Óbitos neonatais 2025</div><div class="sub" id="statNeoSub"></div></div>""",
    """  <div class="stat"><div class="num" id="statObst">—</div><div class="rot">Internações obstétricas 2025</div><div class="sub" id="statObstSub"></div></div>
  <div class="stat"><div class="num" id="statNeo">—</div><div class="rot">Internações neonatais 2025</div><div class="sub" id="statNeoSub"></div></div>
  <div class="stat"><div class="num" id="statMMG">—</div><div class="rot">Morbidade materna grave 2025</div><div class="sub" id="statMMGSub"></div></div>""")
# retira o mapa coroplético e o comparativo entre anos
h = re.sub(r"<!-- =+ MAPA SVG =+ -->\n<section id=\"secMapa\">.*?</section>\n\n", "", h, count=1, flags=re.S)
h = re.sub(r"<!-- =+ COMPARATIVO ENTRE ANOS =+ -->\n<section id=\"secComparativo\">.*?</section>\n\n", "", h, count=1, flags=re.S)
assert 'id="secMapa"' not in h and 'id="secComparativo"' not in h
# mapa de unidades: é a abertura do painel (já aberto)
rep("""      <h2>Mapa de unidades: localização das maternidades</h2>
    </div>
    <details class="acordeao acordeao-mapa" id="detUnidades">""",
    """      <h2>Mapa de unidades: localização das maternidades</h2>
      <p style="max-width:none">Cada ponto é uma maternidade do painel. Toque em um ponto para ver o resumo das internações de 2025 e abrir o dossiê da unidade.</p>
    </div>
    <details class="acordeao acordeao-mapa" id="detUnidades" open>""")
rep("""Toque em um ponto para ver o resumo de mortalidade de 2025 e abrir o dossiê.""",
    """Toque em um ponto para ver o resumo das internações de 2025 e abrir o dossiê.""")
rep("""<p style="max-width:none">O dossiê abre em página própria com todas as seções da apresentação de indicadores de mortalidade: identificação, ficha de cadastro CNES e habilitações ativas, razão de mortalidade materna e causas obstétricas, mortalidade fetal, perinatal e neonatal (taxas, faixa de peso, momento do óbito, grupos de causas e causas evitáveis). Em qualquer tabela, toque em um ano para ver o gráfico daquele ano ou no nome da linha para ver a evolução, e você pode baixar o dossiê em PDF.</p>""",
    """<p style="max-width:none">O dossiê abre em página própria com todas as seções da apresentação de indicadores de internação: identificação, ficha de cadastro CNES e habilitações ativas, internações obstétricas (volume, motivos, interrupção da gestação prevista em lei, AMIU, acompanhante, Centro de Parto Normal, assistência ao parto, morbidade materna grave, ocupação e permanência) e internações neonatais (volume, grupos de causas, UTI neonatal, morbidade neonatal, ocupação e permanência na UTIN). Em qualquer tabela, toque em um ano para ver o gráfico daquele ano ou no nome da linha para ver a evolução, e você pode baixar o dossiê em PDF.</p>""")
rep("""<p style="max-width:none">Dois modos: <b>entre unidades</b> — escolha primeiro o grupo (apoiadas, EBSERH ou QUALINEO) e compare de duas a quatro maternidades do grupo lado a lado, com a menor mortalidade destacada em cada indicador e a opção de incluir a <b>taxa agregada do grupo</b> como referência; ou <b>a mesma unidade entre anos</b>, marcando os anos desejados para ver a variação e a tendência de cada indicador.</p>""",
    """<p style="max-width:none">Dois modos: <b>entre unidades</b> — escolha primeiro o grupo (apoiadas, EBSERH ou QUALINEO) e compare de duas a quatro maternidades do grupo lado a lado, com o melhor valor destacado nos indicadores que têm direção (mais acompanhante, mais AMIU, menos morbidade) e a opção de incluir a <b>média do grupo</b> como referência; ou <b>a mesma unidade entre anos</b>, marcando os anos desejados para ver a variação e a tendência de cada indicador.</p>""")
rep("""<button class="chip" id="btnAddMedia" title="Inclui, como coluna de referência, a taxa agregada do grupo selecionado acima">+ agregado do grupo</button>""",
    """<button class="chip" id="btnAddMedia" title="Inclui, como coluna de referência, a média das unidades do grupo selecionado acima">+ média do grupo</button>""")
rep("""    Painel de Mortalidade 2026 · Qualificação do Modelo de Gestão em Maternidades Estratégicas na Rede de Atenção à Saúde Materna e Neonatal ·
    Coordenação de Ações Nacionais e de Cooperação em Saúde da Mulher, da Criança e do Adolescente · IFF/Fiocruz ·
    SIM (DO e DOFET) e SINASC 2019–2025, 2024 e 2025 preliminares, dados sujeitos a revisão.""",
    """    Painel de Internação 2026 · Qualificação do Modelo de Gestão em Maternidades Estratégicas na Rede de Atenção à Saúde Materna e Neonatal ·
    Coordenação de Ações Nacionais e de Cooperação em Saúde da Mulher, da Criança e do Adolescente · IFF/Fiocruz ·
    SIH/SUS (AIH reduzida e serviços profissionais), CNES e SINASC 2019–2025, competências até junho de 2026; 2025 sujeito a acréscimos; versão para validação da coordenação.""")
rep('<script src="dados_mortalidade.js"></script>', '<script src="dados_internacao.js"></script>')
rep("/* rampa de mortalidade: mais escuro = maior (do creme ao vinho) */", "/* rampa (herdada da família; sem mapa coroplético neste painel) */")
open(os.path.join(BASE, "painel_base.html"), "w", encoding="utf-8").write(h)
print("painel_base.html gerado:", len(h), "bytes")
