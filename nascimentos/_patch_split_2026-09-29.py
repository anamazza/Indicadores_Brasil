# -*- coding: utf-8 -*-
"""Patch de 29/09/2026 — separação dos painéis (pedido da usuária): o Painel NV fica só com
nascimentos. (1) build_dados.py: bloco assistencial passa a vir do JSON v3 (as mesmas regras dos decks)
e guarda só as seções de PERFIL (SINASC); (2) painel_app.js: cards do dossiê reduzidos aos 7 slides de
perfil da mãe do deck de NV (idade, raça/cor, escolaridade, situação conjugal, cesarianas anteriores,
tipo de gestação e pré-natal adequado); os indicadores de internação foram para o Painel de Internação."""
import os, shutil
os.chdir(os.path.dirname(os.path.abspath(__file__)))

def patch(arq, trocas, marca):
    src = open(arq, encoding="utf-8").read()
    if marca in src:
        print(arq, "ja tem o patch"); return
    shutil.copy(arq, arq + ".bak_2026-09-29")
    for a, b in trocas:
        assert src.count(a) == 1, (arq, src.count(a), a[:80])
        src = src.replace(a, b)
    open(arq, "w", encoding="utf-8").write(src)
    print(arq, "atualizado")

# ---------------------------------------------------------------- build_dados.py
patch("build_dados.py", [
    ('assist, avisos_a = blocos_assistenciais.carregar(os.path.join(PROJ, "Indicadores_Assistenciais"))\n',
     'assist_xlsx, avisos_a = blocos_assistenciais.carregar(os.path.join(PROJ, "Indicadores_Assistenciais"))\n'
     '# 29/09/2026: as planilhas xlsx de 31/08 (v1) servem so de MOLDE; os valores vem do JSON v3\n'
     '# (regras aprovadas em 09/09, as mesmas dos decks). PERFIL_SO: o Painel NV guarda apenas as secoes\n'
     '# de perfil da mae (SINASC); as de internacao foram para o Painel de Internacao (Projeto Apresentacoes Internacao).\n'
     'import blocos_adicionais\n'
     'assist, avisos_v3 = blocos_adicionais.carregar_v3(assist_xlsx["0000434"])\n'
     'avisos_a += avisos_v3\n'
     'print(f"[2c] blocos assistenciais do JSON v3: {len(assist)} (molde: {len(assist_xlsx)} blocos xlsx de 31/08)")\n'
     'PERFIL_SO = ("PERFIL SÓCIO-DEMOGRÁFICO (SINASC)", "PERFIL OBSTÉTRICO (SINASC)")\n'),
    ('import blocos_adicionais\nextra, avisos_x = blocos_adicionais.carregar(assist["0000434"])\n',
     'extra, avisos_x = blocos_adicionais.carregar(assist_xlsx["0000434"])\n'),
    ('        m["assistenciais"] = {"origem": b["origem"], "secoes": b["secoes"]}\n',
     '        m["assistenciais"] = {"origem": b["origem"], "secoes": [s for s in b["secoes"] if s["titulo"] in PERFIL_SO]}\n'),
], "PERFIL_SO")

# ---------------------------------------------------------------- painel_app.js
patch("painel_app.js", [
    ('''const ASSIST_CARDS = [
  {id:"idade",     h:"Idade da mãe (%)",                          fonte:"SINASC"},
  {id:"raca",      h:"Raça/cor da mãe (%)",                       fonte:"SINASC"},
  {id:"escola",    h:"Escolaridade da mãe (anos de estudo) (%)",  fonte:"SINASC"},
  {id:"conjugal",  h:"Situação conjugal da mãe (%)",              fonte:"SINASC"},
  {id:"partos_ant",h:"Partos anteriores da mãe (%)",              fonte:"SINASC"},
  {id:"ces_ant",   h:"Cesarianas anteriores da mãe (%)",          fonte:"SINASC"},
  {id:"tipo_gest", h:"Tipo de gestação (%)",                      fonte:"SINASC"},
  {id:"motivo",    h:"Internações obstétricas: motivo (%)",       fonte:"SIH"},
  {id:"volume",    h:"Internações obstétricas: volume e procedimentos", fonte:"SIH"},
  {id:"acomp",     h:"Internações com presença de acompanhante (%)", fonte:"SIH"},
  {id:"ocup",      h:"Ocupação e permanência (obstetrícia)",      fonte:"SIH"},
  {id:"assistparto",h:"Assistência ao parto",                     fonte:"MISTA"},
  {id:"neo",       h:"Internações neonatais e UTI",               fonte:"SIH"},
  {id:"mmg",       h:"Morbidade materna grave (MMG)",             fonte:"SIH"},
  {id:"mmg_causa", h:"MMG por grupo de causa (%)",                fonte:"SIH"},
  {id:"morb",      h:"Morbidade neonatal",                        fonte:"SINASC"},
  {id:"neo_causas",h:"Internações neonatais por grupo de causa (%)", fonte:"SIH"},
];''',
     '''/* 29/09/2026: só os 7 slides de perfil da mãe do deck de NV; os indicadores de internação (SIH)
   estão no Painel de Internação 2026 (mesma família), acessível pelos botões do cabeçalho. */
const ASSIST_CARDS = [
  {id:"idade",     h:"Idade da mãe (%)",                          fonte:"SINASC"},
  {id:"raca",      h:"Raça/cor da mãe (%)",                       fonte:"SINASC"},
  {id:"escola",    h:"Escolaridade da mãe (anos de estudo) (%)",  fonte:"SINASC"},
  {id:"conjugal",  h:"Situação conjugal da mãe (%)",              fonte:"SINASC"},
  {id:"ces_ant",   h:"Cesarianas anteriores da mãe (%)",          fonte:"SINASC"},
  {id:"tipo_gest", h:"Tipo de gestação (%)",                      fonte:"SINASC"},
  {id:"prenatal",  h:"Pré-natal adequado à idade gestacional (%)", fonte:"SINASC"},
];'''),
    ('  [/número adequado de consultas para a idade gestacional/, "assistparto", "Pré-natal adequado para a idade gestacional (%)"],',
     '  [/número adequado de consultas para a idade gestacional/, "prenatal", "Nascidos vivos com pré-natal adequado à idade gestacional (%)"],'),
    ('''  const sep = `<div class="full"><p class="eyebrow titulo-linha" style="margin:1rem 0 .2rem">Perfil das mães e assistência hospitalar (SINASC · SIH)</p></div>`;
  const grupos = gruposAssist(mt);
  if(!grupos){
    return sep + `<div class="card full"><p class="suave">Indicadores assistenciais ainda não disponíveis para esta unidade nas planilhas da coordenação.</p></div>`;
  }''',
     '''  const sep = `<div class="full"><p class="eyebrow titulo-linha" style="margin:1rem 0 .2rem">Perfil das mães (SINASC)</p></div>`;
  const grupos = gruposAssist(mt);
  if(!grupos){
    return sep + `<div class="card full"><p class="suave">Perfil das mães ainda não disponível para esta unidade nas planilhas da coordenação.</p></div>`;
  }'''),
    ('''  if(grupos.outros)
    html += `<div class="card"><h3>Outros indicadores</h3>${tabelaAssist(grupos.outros, null)}<p class="fonte">${FONTE_SIH}</p></div>`;
  return html;''',
     '''  html += `<div class="card full"><p class="suave" style="font-size:.9rem">Os indicadores de internação obstétrica e neonatal desta unidade (SIH/SUS: motivos, acompanhante, AMIU, Centro de Parto Normal, morbidade materna grave, ocupação e permanência, internações neonatais e UTI neonatal) estão no <a href="https://anamazza.github.io/Indicadores_NV/internacao/" target="_blank" rel="noopener">Painel de Internação 2026</a>.</p></div>`;
  return html;'''),
], "Painel de Internação 2026 (mesma família)")

# ---------------------------------------------------------------- painel_base.html (botões dos painéis)
patch("painel_base.html", [
    ('    <p class="sub">Rede de Atenção à Saúde Materna e Neonatal · indicadores do SINASC 2019 a 2025, cadastro CNES e localização das unidades em todo o Brasil.</p>\n',
     '    <p class="sub">Rede de Atenção à Saúde Materna e Neonatal · nascidos vivos e perfil das mães segundo o SINASC 2019 a 2025, cadastro CNES e localização das unidades em todo o Brasil.</p>\n'
     '    <div class="hero-links" aria-label="Painéis da coordenação">\n'
     '      <span class="rot">Painéis</span>\n'
     '      <a class="atual" aria-current="page">Nascimentos</a>\n'
     '      <a href="https://anamazza.github.io/Indicadores_NV/internacao/">Internação</a>\n'
     '      <a href="https://anamazza.github.io/Indicadores_mortalidade-2026/">Mortalidade</a>\n'
     '    </div>\n'),
    ('/* faixa de destaques abaixo do cabeçalho */',
     '''/* botões dos painéis da família */
.hero-links{display:flex; gap:.55rem; flex-wrap:wrap; margin-top:1.3rem; align-items:center}
.hero-links .rot{font-size:.7rem; font-weight:800; letter-spacing:.11em; text-transform:uppercase; color:#C9DCD0; margin-right:.2rem}
.hero-links a{
  display:inline-flex; align-items:center; gap:.4rem; text-decoration:none;
  background:rgba(255,255,255,.12); border:1.5px solid rgba(255,255,255,.35); color:#FFF;
  border-radius:999px; padding:.42rem 1rem; font-size:.86rem; font-weight:800; transition:background .15s;
}
.hero-links a:hover{background:rgba(255,255,255,.24)}
.hero-links a.atual{background:var(--verde-fiocruz); border-color:var(--verde-fiocruz); cursor:default}
/* faixa de destaques abaixo do cabeçalho */'''),
], "hero-links")
print("patch concluido")
