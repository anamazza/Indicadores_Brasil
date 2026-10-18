/* ============================================================
   Painel de Internação 2026 — app
   Dados: const DADOS / PONTOS / DICIONARIO (dados_internacao.js) e CNES_INFO (cnes_dados.json)
   Estrutura e interações espelham o Painel NV 2026 e o Painel de Mortalidade 2026 (mesma
   família); as funções compartilhadas (mapa de unidades, gráficos, modais, ficha CNES,
   comparador, evolução) foram copiadas do painel de mortalidade e só a camada de dados mudou.
   mt.blocos[bloco] = [[rótulo, [v2019..v2025], fmt], ...] — valores já calculados (nº, % ou dias)
   ============================================================ */
"use strict";

const ANOS = DADOS.anos;                 // [2019..2025]
const NT = ANOS.length;
const MAT = DADOS.maternidades;
const PRELIM = new Set(DADOS.preliminares || []);
const ROTULO_ANO = DADOS.rotulosAno || {};          // {2026: "1º sem. 2026"} (18/10/2026)
const PARCIAIS = new Set(DADOS.parciais || []);       // períodos incompletos: fora das tendências
const ULT = (() => { let u = 0; ANOS.forEach((a, i) => { if(!PARCIAIS.has(a)) u = i; }); return u; })();   // último ano completo
const nomeAno = i => ROTULO_ANO[ANOS[i]] || String(ANOS[i]);
const SERIE_ROT = PARCIAIS.size ? `${ANOS[0]} a ${ANOS[ULT]} e ${[...PARCIAIS].map(a => ROTULO_ANO[a] || a).join(", ")}` : `${ANOS[0]} a ${ANOS[NT-1]}`;
const NOTA_PARCIAL = [...PARCIAIS].map(a => {
  const p = (DADOS.periodos || {})[a] || {};
  return `${ROTULO_ANO[a] || a}: ${p.descricao || "período parcial"}${p.completude ? " (" + p.completude + ")" : ""}; período parcial e preliminar: números absolutos não são comparáveis com anos completos, percentuais, taxas e tempos médios são.`;
}).join(" ");
const NOTA_PRELIM = "* 2025: competências até junho de 2026, sujeito a acréscimos." + (PARCIAIS.size ? " " + NOTA_PARCIAL : "");
const temParcial = idx => idx.some(i => i < NT && PARCIAIS.has(ANOS[i]));
const NS = "http://www.w3.org/2000/svg";

const UF_NOME = {AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",
ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",MS:"Mato Grosso do Sul",MT:"Mato Grosso",
PA:"Pará",PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",
RO:"Rondônia",RR:"Roraima",RS:"Rio Grande do Sul",SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins"};
const REGIAO_UFS = {Norte:["AC","AM","AP","PA","RO","RR","TO"],Nordeste:["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
"Centro-Oeste":["DF","GO","MS","MT"],Sudeste:["ES","MG","RJ","SP"],Sul:["PR","RS","SC"]};

/* ---------------- formatação ---------------- */
const fmtInt = v => v == null ? "—" : Math.round(v).toLocaleString("pt-BR");
const fmtPct = v => v == null ? "—" : v.toLocaleString("pt-BR", {minimumFractionDigits:1, maximumFractionDigits:1}) + "%";
const fmtDias = v => v == null ? "—" : v.toLocaleString("pt-BR", {minimumFractionDigits:1, maximumFractionDigits:1});
const FMT = {int:fmtInt, pct:fmtPct, dias:fmtDias};
const fmtDe = (fmt, v) => (FMT[fmt] || fmtInt)(v);
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const rotAno = i => nomeAno(i) + (PRELIM.has(ANOS[i]) ? " (parcial)" : "");
const rotAnoCurto = i => nomeAno(i);

/* ---------------- acesso aos blocos ---------------- */
function linhaB(mt, bloco, i){ const b = mt.blocos[bloco]; return b ? b[i] || null : null; }
function valB(mt, bloco, i, a){ const l = linhaB(mt, bloco, i); return l ? l[1][a] : null; }

/* ---------------- indicadores ----------------
   id, eixo, rótulo, rótulo curto, bloco/linha de origem, formato, sentido
   ("maior" = mais é melhor, "menor" = menos é melhor, "neutro" = perfil, sem julgamento) */
const CAUSAS_NEO = ["Asfixia/Hipóxia", "Infecções perinatais", "Transtornos cardiovasculares perinatais",
  "Afecções respiratórias do RN", "Condições relacionadas a fatores maternos", "Prematuridade e baixo peso ao nascer",
  "Transtornos metabólicos e endócrinos", "Anomalias congênitas", "Causas mal definidas",
  "Outras afecções do período perinatal", "Demais causas"];
const MMG_CAUSAS = ["Hemorragia", "Hipertensão", "Infecção", "Complicações tromboembólicas",
  "Causas obstétricas indiretas", "Outras causas obstétricas", "Demais causas"];
const I = (id, eixo, rot, curto, bloco, i, fmt, sentido, fonte) => ({id, eixo, rot, curto, bloco, i, fmt, sentido, fonte});
const INDS = [
  I("obst_n", "obst", "Internações obstétricas (nº)", "Internações obstétricas", "obst_n", 0, "int", "neutro", "SIH"),
  I("mot_parto", "obst", "Internações obstétricas por parto (%)", "% partos", "motivos", 0, "pct", "neutro", "SIH"),
  I("mot_aborto", "obst", "Internações obstétricas por aborto (%)", "% abortos", "motivos", 1, "pct", "neutro", "SIH"),
  I("mot_interc", "obst", "Internações obstétricas por intercorrências clínicas (%)", "% intercorrências", "motivos", 2, "pct", "neutro", "SIH"),
  I("mot_outros", "obst", "Internações obstétricas por outros motivos (%)", "% outros motivos", "motivos", 3, "pct", "neutro", "SIH"),
  I("aborto_legal", "obst", "Internações para interrupção da gestação prevista em lei (nº)", "Interrupção prevista em lei", "aborto_legal", 0, "int", "neutro", "SIH"),
  I("amiu", "obst", "AMIU entre os procedimentos de esvaziamento uterino (%)", "AMIU", "amiu", 0, "pct", "maior", "SIH"),
  I("acomp_parto", "obst", "Internações que resultaram em parto com acompanhante (%)", "Acompanhante no parto", "acomp", 0, "pct", "maior", "SIH"),
  I("acomp_pv", "obst", "Partos vaginais com acompanhante (%)", "Acompanhante: parto vaginal", "acomp", 1, "pct", "maior", "SIH"),
  I("acomp_ces", "obst", "Cesarianas com acompanhante (%)", "Acompanhante: cesariana", "acomp", 2, "pct", "maior", "SIH"),
  I("acomp_ab", "obst", "Internações para aborto com acompanhante (%)", "Acompanhante: aborto", "acomp", 3, "pct", "maior", "SIH"),
  I("cpn", "obst", "Partos no Centro de Parto Normal (nº)", "Partos em CPN", "cpn", 0, "int", "neutro", "SIH"),
  I("vbac", "parto", "Nascidos vivos por parto vaginal após cesariana anterior (%)", "Parto vaginal após cesariana", "parto", 0, "pct", "maior", "SINASC"),
  I("analg", "parto", "Analgesia nas internações para parto vaginal (%)", "Analgesia no parto vaginal", "parto", 1, "pct", "maior", "SIH"),
  I("induz", "parto", "Nascidos vivos com trabalho de parto induzido (%)", "Trabalho de parto induzido", "parto", 2, "pct", "neutro", "SINASC"),
  I("mmg", "mmg", "Casos de morbidade materna grave entre as internações obstétricas (%)", "Casos de MMG", "mmg", 0, "pct", "menor", "SIH"),
  ...MMG_CAUSAS.map((c, k) => I("mmgc" + k, "mmg", "MMG por grupo de causa: " + c + " (%)", "MMG · " + c, "mmg_causas", k, "pct", "neutro", "SIH")),
  I("mmg_uti", "mmg", "Casos de MMG com internação em UTI (%)", "MMG com UTI", "mmg_manejo", 0, "pct", "neutro", "SIH"),
  I("mmg_perm", "mmg", "Casos de MMG com permanência prolongada pós-parto (%)", "MMG com permanência prolongada", "mmg_manejo", 1, "pct", "neutro", "SIH"),
  I("mmg_transf", "mmg", "Casos de MMG com transfusão sanguínea (%)", "MMG com transfusão", "mmg_manejo", 2, "pct", "neutro", "SIH"),
  I("mmg_hist", "mmg", "Casos de MMG com histerectomia (%)", "MMG com histerectomia", "mmg_manejo", 3, "pct", "neutro", "SIH"),
  I("ocup_obst", "ocup", "Taxa de ocupação dos leitos obstétricos (%)", "Ocupação obstétrica", "ocup_obst", 0, "pct", "neutro", "SIH e CNES"),
  I("tmp_geral", "ocup", "Tempo médio de permanência: geral (dias)", "Permanência geral", "tmp_obst", 0, "dias", "neutro", "SIH"),
  I("tmp_pv", "ocup", "Tempo médio de permanência: parto vaginal (dias)", "Permanência: parto vaginal", "tmp_obst", 1, "dias", "neutro", "SIH"),
  I("tmp_ces", "ocup", "Tempo médio de permanência: cesariana (dias)", "Permanência: cesariana", "tmp_obst", 2, "dias", "neutro", "SIH"),
  I("tmp_ab", "ocup", "Tempo médio de permanência: aborto (dias)", "Permanência: aborto", "tmp_obst", 3, "dias", "neutro", "SIH"),
  I("tmp_interc", "ocup", "Tempo médio de permanência: intercorrências clínicas (dias)", "Permanência: intercorrências", "tmp_obst", 4, "dias", "neutro", "SIH"),
  I("neo_n", "neo", "Internações neonatais (nº)", "Internações neonatais", "neo_n", 0, "int", "neutro", "SIH"),
  I("neo_utin", "neo", "Internações neonatais em UTI neonatal (%)", "Neonatais em UTI", "neo_utin", 0, "pct", "neutro", "SIH"),
  ...CAUSAS_NEO.map((c, k) => I("neoc" + k, "neo", "Internações neonatais por grupo de causa: " + c + " (%)", "Neonatal · " + c, "neo_causas", k, "pct", "neutro", "SIH")),
  I("cpav", "neomorb", "Nascidos vivos com condições potencialmente ameaçadoras à vida (%)", "NV com condições ameaçadoras", "morb_neo", 0, "pct", "menor", "SINASC"),
  I("ocup_utin", "neomorb", "Taxa de ocupação da UTI neonatal (%)", "Ocupação da UTIN", "ocup_utin", 0, "pct", "neutro", "SIH e CNES"),
  I("tmp_utin", "neomorb", "Tempo médio de permanência na UTI neonatal (dias)", "Permanência na UTIN", "tmp_utin", 0, "dias", "neutro", "SIH"),
];
const EIXOS = [
  {id:"obst", rot:"Internações obstétricas"}, {id:"parto", rot:"Assistência ao parto"},
  {id:"mmg", rot:"Morbidade materna grave"}, {id:"ocup", rot:"Ocupação e permanência na obstetrícia"},
  {id:"neo", rot:"Internações neonatais"}, {id:"neomorb", rot:"Morbidade neonatal e UTI neonatal"}
];
const indPorId = id => INDS.find(i => i.id === id);
const fmtInd = (ind, v) => fmtDe(ind.fmt, v);
function valorUnidade(mt, ind, a){ return valB(mt, ind.bloco, ind.i, a); }
/* média simples das unidades com dado (não há numeradores/denominadores nas planilhas) */
function media(lista, ind, a){
  const ok = lista.map(m => valorUnidade(m, ind, a)).filter(v => v != null);
  return ok.length ? ok.reduce((s, v) => s + v, 0) / ok.length : null;
}
function soma(lista, ind, a){
  const ok = lista.map(m => valorUnidade(m, ind, a)).filter(v => v != null);
  return ok.length ? ok.reduce((s, v) => s + v, 0) : null;
}

/* ---------------- estado ---------------- */
const estado = { cnes:MAT[0].cnes, comparar:[] };

/* ============================================================
   MAPA LEAFLET — pontos das unidades
   ============================================================ */
let leaf = null, camadaEstr = null, camadaCtx = null;
function iniciaLeaflet(){
  leaf = L.map("mapaLeaflet", {scrollWheelZoom:true}).setView([-14.5, -52], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom:18
  }).addTo(leaf);
  desenhaPontos();
}
const CONJUNTOS = {
  apoiada:  {rot:"Maternidade apoiada (estratégica)", fundo:"#279261", borda:"#154A4B"},
  ebserh:   {rot:"Unidade EBSERH",                    fundo:"#2471A3", borda:"#103B5E"},
  qualineo: {rot:"QUALINEO 2026/2027",                fundo:"#5FB0D9", borda:"#1B6B8F"},
};
const ORDEM_CONJ = ["apoiada", "ebserh", "qualineo"];
function conjuntoPrincipal(m){
  const c = m.conjuntos || ["apoiada"];
  return ORDEM_CONJ.find(k => c.includes(k)) || "apoiada";
}
function corDoConjunto(m){ return CONJUNTOS[conjuntoPrincipal(m)]; }
function rotuloConjuntos(m){
  const c = m.conjuntos || ["apoiada"];
  return ORDEM_CONJ.filter(k => c.includes(k)).map(k => CONJUNTOS[k].rot).join(" · ");
}
function normTxt(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase().replace(/[^A-Z0-9 ]/g," ").replace(/\s+/g," ").trim();
}
function passaFiltroPonto(p){
  const reg = document.getElementById("selRegiaoLeaflet").value;
  const uf = document.getElementById("selUFLeaflet").value;
  const q = normTxt(document.getElementById("buscaUnidade").value);
  if(reg && !(REGIAO_UFS[reg] || []).includes(p.uf)) return false;
  if(uf && p.uf !== uf) return false;
  if(q && !normTxt(p.nome).includes(q)) return false;
  return true;
}
function desenhaPontos(){
  if(!leaf) return;
  if(camadaEstr){ leaf.removeLayer(camadaEstr); camadaEstr = null; }
  if(camadaCtx){ leaf.removeLayer(camadaCtx); camadaCtx = null; }
  if(document.getElementById("chkContexto").checked){
    camadaCtx = L.markerClusterGroup({maxClusterRadius:44, disableClusteringAtZoom:9});
    PONTOS.filter(passaFiltroPonto).forEach(p => {
      const mk = L.circleMarker([p.lat, p.lon], {radius:4.5, color:"#7A8C80", weight:1, fillColor:"#AEBFB4", fillOpacity:.75});
      mk.bindPopup(`<div class="pop-nome">${esc(p.nome)}</div>
        <div>${esc(p.mun)} · ${p.uf} · CNES ${p.cnes}</div>
        <div>${fmtInt(p.partos)} partos em 2025 (SIH/AIH)</div>`);
      mk.on("click", () => leaf.flyTo(mk.getLatLng(), Math.max(leaf.getZoom(), 10), {duration:.7}));
      camadaCtx.addLayer(mk);
    });
    leaf.addLayer(camadaCtx);
  }
  camadaEstr = L.markerClusterGroup({maxClusterRadius:30, disableClusteringAtZoom:7});
  const visiveis = [];
  const a = ULT;
  MAT.filter(m => passaFiltroPonto({uf:m.uf, nome:m.nome + " " + (m.nomePlanilha || "")})).forEach(m => {
    if(m.lat == null) return;
    visiveis.push([m.lat, m.lon]);
    const cor = corDoConjunto(m);
    const li = (id, rot) => { const ind = indPorId(id); return `<div>${rot}: <b>${fmtInd(ind, valorUnidade(m, ind, a))}</b></div>`; };
    const mk = L.circleMarker([m.lat, m.lon], {radius:8, color:cor.borda, weight:2, fillColor:cor.fundo, fillOpacity:.95});
    mk.bindPopup(`<div class="pop-nome">${esc(m.nome)}</div>
      <div>${esc(m.territorio.municipio)} · ${m.uf} · CNES ${m.cnes}</div>
      <div style="color:${cor.borda}; font-weight:700">${esc(rotuloConjuntos(m))}</div>
      <div style="margin-top:.25rem; font-weight:700">${nomeAno(a)}${PRELIM.has(ANOS[a]) ? " (parcial)" : ""}</div>
      ${li("obst_n", "Internações obstétricas")}
      ${li("mot_parto", "Partos entre as internações")}
      ${li("mmg", "Morbidade materna grave")}
      ${li("neo_n", "Internações neonatais")}
      <a class="pop-btn" href="#" onclick="abrirDossie('${m.cnes}');return false;">Abrir perfil da unidade →</a>`);
    mk.on("click", () => leaf.flyTo(mk.getLatLng(), Math.max(leaf.getZoom(), 11), {duration:.7}));
    camadaEstr.addLayer(mk);
  });
  leaf.addLayer(camadaEstr);
  if(visiveis.length && (document.getElementById("selRegiaoLeaflet").value || document.getElementById("selUFLeaflet").value || document.getElementById("buscaUnidade").value)){
    leaf.fitBounds(visiveis, {padding:[36,36], maxZoom:11});
  }
}

/* ============================================================
   GRÁFICOS SVG
   ============================================================ */
function grafLinhas(alvo, series, opts = {}){
  const comRotulos = opts.rotulos !== false && series.length === 1;
  const W = 640, H = 320, mL = 52, mR = 22, mT = comRotulos ? 34 : 18, mB = 30;
  const todos = series.flatMap(s => s.vals).filter(v => v != null);
  const el = document.getElementById(alvo);
  if(!todos.length){ el.innerHTML = "<p class='suave'>Sem dados.</p>"; return; }
  let max = Math.max(...todos), min = 0;
  const span = (max - min) || 1; max += span * .12;
  const X = i => mL + (W - mL - mR) * i / (NT - 1);
  const Y = v => H - mB - (H - mT - mB) * (v - min) / (max - min);
  const fmt = opts.fmt || fmtInt;
  const fmtEixo = opts.fmt === fmtPct ? (v => Math.round(v) + "%") : opts.fmt === fmtDias ? fmtDias : fmtInt;
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  for(let k = 0; k <= 4; k++){
    const v = min + (max - min) * k / 4, y = Y(v);
    s += `<line x1="${mL}" y1="${y.toFixed(1)}" x2="${W-mR}" y2="${y.toFixed(1)}" stroke="#D8E8DC" stroke-width="1"/>`;
    s += `<text x="${mL-6}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="11.5" fill="#4E6A5C">${fmtEixo(v)}</text>`;
  }
  ANOS.forEach((ano, i) => {
    s += `<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="${PARCIAIS.has(ano) ? 10.5 : 12}" font-weight="700" fill="#1D3229">${nomeAno(i)}${PRELIM.has(ano) ? "*" : ""}</text>`;
  });
  series.forEach(sr => {
    let d = "", prev = false;
    sr.vals.forEach((v, i) => {
      if(v == null){ prev = false; return; }
      d += (prev ? "L" : "M") + X(i).toFixed(1) + "," + Y(v).toFixed(1);
      prev = true;
    });
    s += `<path d="${d}" fill="none" stroke="${sr.cor}" stroke-width="3"${sr.dash ? ' stroke-dasharray="8 6"' : ""} stroke-linecap="round" stroke-linejoin="round"/>`;
    sr.vals.forEach((v, i) => {
      if(v == null) return;
      const _rot = fmt(v);
      s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4" fill="${sr.cor}"><title>${esc(sr.nome)} · ${nomeAno(i)} · ${_rot}</title></circle>`;
      if(comRotulos) s += `<text x="${X(i).toFixed(1)}" y="${(Y(v) - 11).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1D3229">${_rot}</text>`;
    });
  });
  s += "</svg>";
  let leg = "";
  if(series.length > 1 || opts.legenda){
    leg = `<div class="legenda">` + series.map(sr => `<span><i style="background:${sr.cor}"></i>${esc(sr.nome)}</span>`).join("") + `</div>`;
  }
  el.innerHTML = s + leg + (PRELIM.size ? `<p class="fonte" style="margin-top:.3rem">${esc(NOTA_PRELIM)}</p>` : "");
}
/* barras verticais por ano (como nos slides "Número de internações …" da apresentação) */
function grafBarrasV(alvo, vals, cor, fmt = fmtInt){
  const el = document.getElementById(alvo);
  const ok = vals.filter(v => v != null);
  if(!ok.length){ el.innerHTML = "<p class='suave'>Sem dados.</p>"; return; }
  const W = 640, H = 300, mL = 52, mR = 16, mT = 30, mB = 30;
  const max = Math.max(...ok) * 1.12 || 1;
  const bw = (W - mL - mR) / NT, larg = bw * 0.62;
  const Y = v => H - mB - (H - mT - mB) * v / max;
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  for(let k = 0; k <= 4; k++){
    const v = max * k / 4, y = Y(v);
    s += `<line x1="${mL}" y1="${y.toFixed(1)}" x2="${W-mR}" y2="${y.toFixed(1)}" stroke="#D8E8DC"/>`;
    s += `<text x="${mL-6}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="11.5" fill="#4E6A5C">${fmtInt(v)}</text>`;
  }
  vals.forEach((v, i) => {
    const x = mL + bw * i + (bw - larg) / 2;
    s += `<text x="${(x + larg/2).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="${PARCIAIS.has(ANOS[i]) ? 10.5 : 12}" font-weight="700" fill="#1D3229">${nomeAno(i)}${PRELIM.has(ANOS[i]) ? "*" : ""}</text>`;
    if(v == null) return;
    s += `<rect x="${x.toFixed(1)}" y="${Y(v).toFixed(1)}" width="${larg.toFixed(1)}" height="${(H - mB - Y(v)).toFixed(1)}" rx="4" fill="${cor}"><title>${nomeAno(i)} · ${fmt(v)}</title></rect>`;
    s += `<text x="${(x + larg/2).toFixed(1)}" y="${(Y(v) - 6).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1D3229">${fmt(v)}</text>`;
  });
  s += "</svg>";
  el.innerHTML = s + (PRELIM.size ? `<p class="fonte" style="margin-top:.3rem">${esc(NOTA_PRELIM)}</p>` : "");
}
function grafRanking(alvo, itens, opts = {}){
  const linhas = itens.filter(i => i.v != null).sort((a,b) => opts.sentido === "menor" ? a.v - b.v : b.v - a.v).slice(0, 15);
  if(!linhas.length){ document.getElementById(alvo).innerHTML = "<p class='suave'>Sem dados na seleção.</p>"; return; }
  const W = 640, rh = 27, mL = 8, H = linhas.length * rh + 12;
  const max = Math.max(...linhas.map(i => i.v), 1e-9);
  const fmt = opts.fmt || fmtInt;
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  linhas.forEach((it, i) => {
    const y = 8 + i * rh, w = (W - 275) * it.v / max;
    s += `<text x="${mL}" y="${y+13}" font-size="11.8" fill="#1D3229">${esc(it.nome.length > 30 ? it.nome.slice(0,29) + "…" : it.nome)}</text>`;
    s += `<rect x="205" y="${y}" width="${Math.max(w,2).toFixed(1)}" height="${rh-9}" rx="5" fill="${it.cor || "#279261"}"/>`;
    s += `<text x="${(207 + Math.max(w,2)).toFixed(1)}" y="${y+13}" font-size="11.8" font-weight="700" fill="#1D3229">${fmt(it.v)}</text>`;
  });
  s += "</svg>";
  document.getElementById(alvo).innerHTML = s;
}
function grafBarrasH(linhas, fmt, pctMax){
  const W = 660, rh = 40, mEsq = 230, H = linhas.length * rh + 12;
  const max = Math.max(...linhas.map(r => r.v), pctMax ? 100 : 1e-9);
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  linhas.forEach((r, i) => {
    const v = r.v, y = 8 + i * rh;
    const w = (W - mEsq - 110) * v / max;
    const rot = String(r.rot);
    s += `<text x="${mEsq - 8}" y="${y + 17}" text-anchor="end" font-size="12.5" fill="#1D3229">${esc(rot.length > 32 ? rot.slice(0,31) + "…" : rot)}<title>${esc(rot)}</title></text>`;
    s += `<rect x="${mEsq}" y="${y + 5}" width="${Math.max(w, 2).toFixed(1)}" height="${rh - 16}" rx="6" fill="#279261"/>`;
    s += `<text x="${(mEsq + Math.max(w, 2) + 8).toFixed(1)}" y="${y + 17}" font-size="12.5" font-weight="800" fill="#1D3229">${fmt(v)}</text>`;
  });
  return s + "</svg>";
}

/* ============================================================
   CARD — ficha de cadastro CNES e habilitações (API oficial)
   ============================================================ */
const dataBR = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
function cardCnesHTML(mt){
  const temInfo = typeof CNES_INFO !== "undefined" && CNES_INFO[mt.cnes];
  if(!temInfo){
    return `<h3>Ficha de cadastro CNES</h3>
      <p class="suave" style="margin-top:.5rem">Cadastro não embutido nesta versão do painel: rode <code>atualizar_cnes.py</code> e depois <code>montar_painel.py</code>.</p>`;
  }
  const info = CNES_INFO[mt.cnes];
  const gest = {M:"Municipal", E:"Estadual", D:"Dupla"}[(info.tipo_gestao || "").trim()] || info.tipo_gestao || null;
  const cep = info.codigo_cep_estabelecimento ? String(info.codigo_cep_estabelecimento).replace(/^(\d{5})(\d{3})$/, "$1-$2") : null;
  let end = [info.endereco_estabelecimento, info.numero_estabelecimento].filter(Boolean).join(", ");
  if(end && info.bairro_estabelecimento) end += " · " + info.bairro_estabelecimento;
  if(end && cep) end += " · CEP " + cep;
  const cnpj = info.numero_cnpj || info.numero_cnpj_entidade;
  const badges = [];
  if(info.estabelecimento_possui_centro_obstetrico) badges.push("Centro obstétrico");
  if(info.estabelecimento_possui_centro_neonatal) badges.push("Centro neonatal");
  if(info.estabelecimento_possui_centro_cirurgico) badges.push("Centro cirúrgico");
  if(info.estabelecimento_possui_atendimento_hospitalar) badges.push("Atendimento hospitalar");
  if(info.estabelecimento_faz_atendimento_ambulatorial_sus === "SIM") badges.push("Atendimento SUS");
  const consulta = CNES_INFO._atualizado_em;
  const linhasFicha = [
    ["Código CNES", mt.cnes],
    ["Razão social", info.nome_razao_social],
    ["Nome fantasia", info.nome_fantasia],
    ["CNPJ", cnpj],
    ["Esfera administrativa", info.descricao_esfera_administrativa],
    ["Gestão", gest],
    ["Endereço", end],
    ["Turno de atendimento", info.descricao_turno_atendimento],
    ["Estruturas cadastradas", badges.join(" · ")]
  ].filter(l => l[1]);
  return `<h3>Ficha de cadastro CNES</h3>
    <div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde tab-ficha">
      <thead><tr><th style="width:230px">Ficha do estabelecimento</th><th style="text-align:left">CNES / DATASUS</th></tr></thead>
      <tbody>${linhasFicha.map(l => `<tr><td style="font-weight:700">${l[0]}</td><td style="text-align:left; white-space:normal">${esc(l[1])}</td></tr>`).join("")}</tbody>
    </table></div>
    <p class="fonte" style="font-size:.8rem">
      <b>Última atualização do cadastro no CNES:</b> ${dataBR(info.data_atualizacao)} ·
      <b>Dados baixados da API oficial em:</b> ${dataBR(consulta)}. Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.
    </p>`;
}
function cardHabilitacoesHTML(mt){
  const info = typeof CNES_INFO !== "undefined" ? CNES_INFO[mt.cnes] : null;
  const habs = info && Array.isArray(info.habilitacoes) ? info.habilitacoes : null;
  if(!habs) return "";
  const ativas = habs.filter(h => h.dtCompFim === "99/9999")
    .sort((a, b) => String(a.coGrupo).localeCompare(String(b.coGrupo)));
  const origem = v => !v ? "Nacional" : (v === "P" ? "Local" : v);
  const consulta = CNES_INFO._atualizado_em;
  const corpo = ativas.length
    ? ativas.map(h => `<tr>
        <td class="mono" style="font-weight:700">${esc(h.coGrupo)}</td>
        <td style="text-align:left; white-space:normal">${esc(h.dsGrupo)}</td>
        <td style="text-align:center">${esc(origem(h.tpOrigem))}</td>
        <td class="mono" style="text-align:center">${esc(h.dtCompInicio || "—")}</td>
      </tr>`).join("")
    : `<tr><td colspan="4" class="suave" style="text-align:left">Nenhuma habilitação ativa registrada no CNES.</td></tr>`;
  return `<h3>Habilitações ativas no CNES</h3>
    <div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde">
      <thead><tr>
        <th style="width:90px; text-align:center">Código</th>
        <th style="text-align:left">Descrição</th>
        <th style="width:110px; text-align:center">Origem</th>
        <th style="width:150px; text-align:center">Competência Inicial</th>
      </tr></thead>
      <tbody>${corpo}</tbody>
    </table></div>
    <p class="fonte" style="font-size:.8rem">
      <b>Dados baixados do CNES em:</b> ${dataBR(consulta)} ·
      Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.
    </p>`;
}

/* ============================================================
   DOSSIÊ — cards espelhando a apresentação de internação (21 slides)
   ============================================================ */
const FONTE_SIH = "Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil (CNES) e Sistema de Informações Hospitalares do SUS (SIH/SUS) · competências até junho de 2026 · dados sujeitos a revisão.";
const FONTE_SINASC = "Fonte: Ministério da Saúde - Sistema de Informações sobre Nascidos Vivos (SINASC) · dados sujeitos a revisão.";
const FONTE_MISTA = "Fonte: Ministério da Saúde - Sistema de Informações sobre Nascidos Vivos (SINASC) e Sistema de Informações Hospitalares do SUS (SIH/SUS) · dados sujeitos a revisão.";
const notaPrelim = `<span class="chip chip-prelim" title="${esc(NOTA_PRELIM)}">* preliminar</span>`;

function thsAno(clicavel){
  return ANOS.map((a, i) => clicavel
    ? `<th class="th-ano" data-a="${i}"><button class="btn-ano" title="Ver gráfico de ${nomeAno(i)}">${nomeAno(i)}${PRELIM.has(a) ? "*" : ""}</button></th>`
    : `<th>${nomeAno(i)}${PRELIM.has(a) ? "*" : ""}</th>`).join("");
}
/* tabela de um bloco: linhas [rótulo, valores, fmt]; anos clicáveis quando há ≥2 linhas do mesmo formato */
function tabelaBloco(mt, bloco, cab){
  const b = mt.blocos[bloco];
  if(!b || !b.length) return "<p class='suave'>Sem dados.</p>";
  const uniforme = b.length >= 2 && b.every(l => l[2] === b[0][2]);
  const rows = b.map((l, ri) =>
    `<tr><td class="rot-click" data-row="${ri}" title="Ver a evolução, ${SERIE_ROT}">${esc(l[0])}</td>${l[1].map(v => `<td class="mono">${fmtDe(l[2], v)}</td>`).join("")}</tr>`).join("");
  return `<div class="tab-wrap"><table class="dados tab-verde" data-bloco="${bloco}"${uniforme ? ' data-dist="1"' : ""}>
    <thead><tr><th>${esc(cab || "")}</th>${thsAno(uniforme)}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}

/* ---------------- modal: gráfico da distribuição de um ano ---------------- */
function abrirGraficoAno(tbl, a, tituloCard){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const b = mt.blocos[tbl.dataset.bloco];
  if(!b) return;
  const linhas = b.filter(l => l[1][a] != null).map(l => ({rot:l[0], v:l[1][a]}));
  const fmt = FMT[b[0][2]] || fmtInt;
  document.getElementById("mgConteudo").innerHTML = linhas.length ? grafBarrasH(linhas, fmt, b[0][2] === "pct") : "<p class='suave'>Sem dados neste ano.</p>";
  document.getElementById("mgTitulo").textContent = (tituloCard || "Distribuição") + " · " + rotAno(a);
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: SIH/SUS, dados sujeitos a revisão.";
  document.getElementById("modalGrafico").hidden = false;
}
function fecharModalGrafico(){ document.getElementById("modalGrafico").hidden = true; }
function baixarPngModal(){
  const svg = document.querySelector("#mgConteudo svg");
  if(!svg) return;
  const vb = svg.viewBox.baseVal;
  const escala = 2.5;
  const W = Math.round(vb.width * escala), H = Math.round(vb.height * escala);
  const alto = 64 * (escala / 2);
  const xml = new XMLSerializer().serializeToString(svg);
  const url = URL.createObjectURL(new Blob([xml], {type: "image/svg+xml;charset=utf-8"}));
  const img = new Image();
  img.onload = () => {
    const cv = document.createElement("canvas");
    cv.width = W; cv.height = H + alto;
    const cx = cv.getContext("2d");
    cx.fillStyle = "#FFFFFF"; cx.fillRect(0, 0, cv.width, cv.height);
    cx.fillStyle = "#1D3229";
    cx.font = "700 " + Math.round(15 * escala / 2 * 1.25) + "px Arial";
    cx.fillText(document.getElementById("mgTitulo").textContent, 16, 26 * (escala / 2));
    cx.fillStyle = "#4E6A5C";
    cx.font = Math.round(11.5 * escala / 2 * 1.25) + "px Arial";
    cx.fillText(document.getElementById("mgSub").textContent, 16, 48 * (escala / 2));
    cx.drawImage(img, 0, alto, W, H);
    URL.revokeObjectURL(url);
    const nome = (document.getElementById("mgTitulo").textContent || "grafico")
      .normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 90) || "grafico";
    const a = document.createElement("a");
    a.download = nome + ".png";
    a.href = cv.toDataURL("image/png");
    a.click();
  };
  img.src = url;
}
document.addEventListener("DOMContentLoaded", () => {
  const b = document.getElementById("btnBaixarPng");
  if(b) b.addEventListener("click", baixarPngModal);
});
/* clique no rótulo da linha: evolução 2019-2025 */
function abrirTendenciaBloco(tbl, rowKey, tituloCard){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const l = linhaB(mt, tbl.dataset.bloco, +rowKey);
  if(!l) return;
  document.getElementById("mgTitulo").textContent = (tituloCard ? tituloCard + " · " : "") + l[0] + " · evolução " + SERIE_ROT;
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: SIH/SUS e SINASC, dados sujeitos a revisão.";
  document.getElementById("modalGrafico").hidden = false;
  grafLinhas("mgConteudo", [{nome: l[0], cor: "#279261", vals: l[1].slice(0, NT)}], {fmt: FMT[l[2]] || fmtInt, legenda:false});
}
function abrirTendencia(indId, cnes){
  const ind = indPorId(indId);
  const mt = MAT.find(m => m.cnes === cnes) || MAT[0];
  document.getElementById("mgTitulo").textContent = ind.rot + " · tendência " + SERIE_ROT;
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: SIH/SUS e SINASC, dados sujeitos a revisão.";
  document.getElementById("modalGrafico").hidden = false;
  grafLinhas("mgConteudo", [{nome:ind.curto, cor:"#279261", vals:ANOS.map((_, i) => valorUnidade(mt, ind, i))}], {fmt: FMT[ind.fmt], legenda:false});
}
function tituloDoCard(el){
  const h = el.closest(".card")?.querySelector("h3");
  if(!h) return "";
  const c = h.cloneNode(true);
  c.querySelectorAll(".chip, select").forEach(x => x.remove());
  return c.textContent.replace(/\s+/g, " ").trim();
}
document.addEventListener("click", e => {
  const tdv = e.target.closest("td.var-click");
  if(tdv){ abrirTendencia(tdv.dataset.ind, evoCnes); return; }
  const tdr = e.target.closest("td.rot-click");
  if(tdr){
    const tb = tdr.closest("table[data-bloco]");
    if(tb) abrirTendenciaBloco(tb, tdr.dataset.row, tituloDoCard(tdr));
    return;
  }
  const th = e.target.closest("th.th-ano");
  if(th){
    const tbl = th.closest("table[data-bloco]");
    if(tbl) abrirGraficoAno(tbl, +th.dataset.a, tituloDoCard(th));
    return;
  }
  if(e.target.id === "modalGrafico" || e.target.id === "btnFecharModal") fecharModalGrafico();
});
document.addEventListener("keydown", e => { if(e.key === "Escape") fecharModalGrafico(); });

function abrirDossie(cnes){
  estado.cnes = cnes;
  const sel = document.getElementById("selUnidade" + {apoiada:"", ebserh:"Ebserh", qualineo:"Qualineo"}[conjuntoPrincipal(MAT.find(m => m.cnes === cnes) || MAT[0])]);
  if(sel) sel.value = cnes;
  document.getElementById("selUnidadePd").value = cnes;
  desenhaDossie();
  const pg = document.getElementById("paginaDossie");
  if(pg.hidden){
    pg.hidden = false;
    document.body.classList.add("dossie-aberto");
    history.pushState({dossie:cnes}, "", "#dossie");
  }
  pg.scrollTop = 0;
}
window.abrirDossie = abrirDossie;
function fecharDossie(voltarHistorico = true){
  const pg = document.getElementById("paginaDossie");
  if(pg.hidden) return;
  pg.hidden = true;
  document.body.classList.remove("dossie-aberto");
  if(voltarHistorico && location.hash === "#dossie") history.back();
}
window.addEventListener("popstate", () => { fecharDossie(false); fecharMetodo(false); });

const card = (titulo, corpo, fonte, extra) => `<div class="card full"><h3>${titulo} ${notaPrelim}</h3>${corpo}<p class="fonte">${fonte}${extra ? " " + extra : ""}</p></div>`;
function desenhaDossie(){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const el = document.getElementById("dossieConteudo");
  const t = mt.territorio;
  const a = ULT;
  const k = (id, rot, sub) => {
    const ind = indPorId(id);
    return `<div class="k"><div class="n mono">${fmtInd(ind, valorUnidade(mt, ind, a))}</div><div class="t">${rot} ${nomeAno(a)}</div><div class="s">${sub || "&nbsp;"}</div></div>`;
  };
  const sep = txt => `<div class="full"><p class="eyebrow titulo-linha" style="margin:.6rem 0 .1rem">${txt}</p></div>`;
  const periodo = SERIE_ROT;
  el.innerHTML = `
  <div class="dossie-topo">
    <div>
      <p class="eyebrow" style="color:#A5D6A7">${esc(t.uf)} · ${esc(mt.regiao)}</p>
      <h2 style="color:#FFF">${esc(mt.nome)}</h2>
      <div class="meta">
        <span>CNES ${mt.cnes}</span><span>${esc(t.municipio)} · ${mt.uf}</span>
        ${t.regiao_saude ? `<span>Região de saúde: ${esc(t.regiao_saude)}</span>` : ""}${t.macro ? `<span>${esc(t.macro)}</span>` : ""}
        <span>${esc(rotuloConjuntos(mt))}</span>
        ${mt.oficial === false ? `<span class="anexo">anexo · fora da lista oficial de 09/09/2026</span>` : ""}
        <span title="Versão para validação da coordenação: regras aprovadas em 09/09/2026">versão para validação</span>
      </div>
    </div>
    <div class="kpis-topo">
      ${k("obst_n", "Internações obstétricas", "partos: " + fmtPct(valorUnidade(mt, indPorId("mot_parto"), a)))}
      ${k("mmg", "Morbidade materna grave", "entre as internações obstétricas")}
      ${k("neo_n", "Internações neonatais", "em UTIN: " + fmtPct(valorUnidade(mt, indPorId("neo_utin"), a)))}
      ${k("ocup_obst", "Ocupação obstétrica", "UTIN: " + fmtPct(valorUnidade(mt, indPorId("ocup_utin"), a)))}
    </div>
  </div>
  <div class="dossie-cards">
    <div class="card full">${cardCnesHTML(mt)}</div>
    ${cardHabilitacoesHTML(mt) ? `<div class="card full">${cardHabilitacoesHTML(mt)}</div>` : ""}

    ${sep("Internações obstétricas")}
    <div class="card full"><h3>Internações obstétricas, ${periodo} ${notaPrelim}</h3>
      <div id="gObst" style="max-width:820px; margin:.7rem auto 0"></div>
      <div style="margin-top:.9rem">${tabelaBloco(mt, "obst_n", "Internações")}</div>
      <p class="fonte">${FONTE_SIH} Internações de mulheres de 10 a 59 anos com diagnóstico ou procedimento obstétrico, pelo ano da data de internação.</p></div>
    ${card(`Internações obstétricas por motivo de internação (%), ${periodo}`, tabelaBloco(mt, "motivos", "Motivos de internação (%)"), FONTE_SIH, "Parto, aborto e intercorrências clínicas classificados pelo procedimento realizado e pelo diagnóstico principal; a linha Outros completa 100%.")}
    ${card(`Interrupção da gestação em casos previstos em lei, ${periodo}`, tabelaBloco(mt, "aborto_legal", "Internações"), FONTE_SIH)}
    ${card(`Uso de AMIU nos procedimentos de esvaziamento uterino (%), ${periodo}`, tabelaBloco(mt, "amiu", "AMIU"), FONTE_SIH, "Aspiração manual intrauterina entre todos os esvaziamentos uterinos (AMIU + curetagens pós-abortamento), sem a curetagem semiótica.")}
    ${card(`Presença de acompanhante (%), ${periodo}`, tabelaBloco(mt, "acomp", "Internações com acompanhante (%)"), FONTE_SIH, "Internações com registro de diária de acompanhante.")}
    ${card(`Partos no Centro de Parto Normal, ${periodo}`, tabelaBloco(mt, "cpn", "Centro de Parto Normal"), FONTE_SIH)}
    ${card(`Assistência ao parto, ${periodo}`, tabelaBloco(mt, "parto", "Assistência ao parto (%)"), FONTE_MISTA, "Parto vaginal após cesariana e trabalho de parto induzido pelo SINASC; analgesia pelas AIH de parto vaginal (SIH/SUS).")}
    <div class="card full"><h3>Morbidade materna grave por grupo de causas (%), ${periodo} ${notaPrelim}</h3>
      ${tabelaBloco(mt, "mmg", "Casos de MMG (%)")}
      <div style="margin-top:.8rem">${tabelaBloco(mt, "mmg_causas", "Grupos de causas (% dos casos de MMG)")}</div>
      <p class="fonte">${FONTE_SIH} Critérios de morbidade materna grave conforme o Observatório Obstétrico Brasileiro (OOBr); os grupos de causas não são exclusivos, por isso não somam 100%.</p></div>
    ${card(`Morbidade materna grave por manejo (%), ${periodo}`, tabelaBloco(mt, "mmg_manejo", "Manejo (% dos casos de MMG)"), FONTE_SIH)}
    <div class="card full"><h3>Taxa de ocupação e tempo médio de permanência na obstetrícia, ${periodo} ${notaPrelim}</h3>
      ${tabelaBloco(mt, "ocup_obst", "Taxa de ocupação (%)")}
      <div style="margin-top:.8rem">${tabelaBloco(mt, "tmp_obst", "Tempo médio de permanência (dias)")}</div>
      <p class="fonte">${FONTE_SIH} Ocupação = dias de permanência das internações obstétricas ÷ leitos-dia obstétricos existentes no CNES (códigos 10 e 43).</p></div>

    ${sep("Internações neonatais")}
    <div class="card full"><h3>Internações neonatais, ${periodo} ${notaPrelim}</h3>
      <div id="gNeo" style="max-width:820px; margin:.7rem auto 0"></div>
      <div style="margin-top:.9rem">${tabelaBloco(mt, "neo_n", "Internações")}</div>
      <p class="fonte">${FONTE_SIH} AIH próprias de recém-nascidos com 0 a 27 dias de vida, pelo ano da data de internação.</p></div>
    ${card(`Internações neonatais por grupo de causas (%), ${periodo}`, tabelaBloco(mt, "neo_causas", "Grupo de causas (% das internações neonatais)"), FONTE_SIH, "Grupo pelo diagnóstico principal da AIH; categorias exclusivas.")}
    ${card(`Internações em UTI neonatal (%), ${periodo}`, tabelaBloco(mt, "neo_utin", "UTI neonatal"), FONTE_SIH, "Internações neonatais com diária em UTI neonatal tipo II ou III (leitos 81 e 82).")}
    ${card(`Morbidade neonatal (%), ${periodo}`, tabelaBloco(mt, "morb_neo", "Morbidade neonatal"), FONTE_SINASC, "Peso ao nascer abaixo de 1.500 g, idade gestacional abaixo de 32 semanas ou Apgar no 5º minuto abaixo de 7.")}
    <div class="card full"><h3>Taxa de ocupação e tempo médio de permanência na UTI neonatal, ${periodo} ${notaPrelim}</h3>
      ${tabelaBloco(mt, "ocup_utin", "Taxa de ocupação (%)")}
      <div style="margin-top:.8rem">${tabelaBloco(mt, "tmp_utin", "Tempo médio de permanência (dias)")}</div>
      <p class="fonte">${FONTE_SIH} Diárias de UTI neonatal de todas as AIH com uso de UTIN ÷ leitos-dia de UTIN existentes no CNES (códigos 81 e 82).</p></div>
  </div>`;
  grafBarrasV("gObst", (linhaB(mt, "obst_n", 0) || [null, []])[1].slice(0, NT), "#440A27");
  grafBarrasV("gNeo", (linhaB(mt, "neo_n", 0) || [null, []])[1].slice(0, NT), "#705D2F");
}

/* ============================================================
   COMPARADOR
   ============================================================ */
const CORES_COMP = ["#279261","#0A213D","#D68910","#C0392B"];
const COR_MEDIA = "#5E716A";
const MEDIA_ROT = {apoiada:"Apoiadas", ebserh:"EBSERH", qualineo:"QUALINEO"};
let anoComp = ULT;
let grupoComp = "apoiada";
function unidadesDoGrupo(g){ return MAT.filter(m => (m.conjuntos || ["apoiada"]).includes(g)); }
function entradaComp(c){
  if(String(c).startsWith("media:")){
    const g = String(c).slice(6), lst = unidadesDoGrupo(g);
    return {media:true, cnes:c, grupo:g, lista:lst, nome:"Média · " + (MEDIA_ROT[g] || g), sub:lst.length + " unidades · média simples"};
  }
  return MAT.find(m => m.cnes === c);
}
function valorEntrada(e, ind, a){ return e.media ? media(e.lista, ind, a) : valorUnidade(e, ind, a); }
function coresComp(lst){
  let k = 0;
  return lst.map(e => e && e.media ? COR_MEDIA : CORES_COMP[k++ % CORES_COMP.length]);
}
function desenhaChipsComp(){
  const el = document.getElementById("compChips");
  const lst = estado.comparar.map(entradaComp);
  const cores = coresComp(lst);
  el.innerHTML = lst.map((m, i) => `<span class="chip" style="border-color:${cores[i]}; color:${cores[i]}">
      ${esc(m.nome.length > 34 ? m.nome.slice(0,33) + "…" : m.nome)}
      <button aria-label="remover" onclick="removeComp('${m.cnes}')">✕</button></span>`).join("");
}
window.removeComp = c => { estado.comparar = estado.comparar.filter(x => x !== c); desenhaChipsComp(); desenhaComparador(); };
function addComp(cnes){
  if(!cnes || estado.comparar.includes(cnes)) return;
  if(estado.comparar.length >= 4){ alert("Máximo de 4 unidades no comparador."); return; }
  estado.comparar.push(cnes);
  desenhaChipsComp(); desenhaComparador();
  document.getElementById("secComparar").scrollIntoView({behavior:"smooth"});
}
function addMediaGrupo(){
  const id = "media:" + grupoComp;
  if(estado.comparar.includes(id)) return;
  if(estado.comparar.length >= 4){ alert("Máximo de 4 colunas no comparador."); return; }
  estado.comparar.push(id);
  desenhaChipsComp(); desenhaComparador();
  document.getElementById("secComparar").scrollIntoView({behavior:"smooth"});
}
function desenhaComparador(){
  const el = document.getElementById("compConteudo");
  const lst = estado.comparar.map(entradaComp).filter(Boolean);
  if(lst.length < 2){
    el.innerHTML = `<div class="card"><p class="suave">Adicione pelo menos duas maternidades do grupo escolhido acima — ou uma maternidade e a média do grupo, com o botão “+ média do grupo”.</p></div>`;
    return;
  }
  const cores = coresComp(lst);
  const temMedia = lst.some(e => e.media);
  const a = anoComp;
  let linhas = "";
  EIXOS.forEach(ex => {
    linhas += `<tr class="grupo"><td colspan="${lst.length + 1}">${esc(ex.rot)}</td></tr>`;
    INDS.filter(i => i.eixo === ex.id).forEach(ind => {
      const vals = lst.map(m => valorEntrada(m, ind, a));
      const ok = vals.filter((v, j) => v != null && !lst[j].media);
      let melhor = null;
      if(ok.length > 1 && ind.sentido === "menor") melhor = Math.min(...ok);
      if(ok.length > 1 && ind.sentido === "maior") melhor = Math.max(...ok);
      const tds = vals.map((v, j) => `<td class="mono ${melhor != null && !lst[j].media && v === melhor ? "melhor" : ""}">${fmtInd(ind, v)}</td>`).join("");
      linhas += `<tr><td>${esc(ind.rot)}</td>${tds}</tr>`;
    });
  });
  el.innerHTML = `
  <div class="card comp-grid">
    <h3>Indicadores · ${rotAno(a)} <span class="chip">melhor valor destacado</span></h3>
    <div class="tab-wrap"><table class="comp">
      <thead><tr><th>Indicador</th>${lst.map((m, i) => `<th style="color:${cores[i]}">${esc(m.nome.length > 26 ? m.nome.slice(0,25) + "…" : m.nome)}<br><span class="suave" style="font-weight:400">${m.media ? m.sub : m.uf}</span></th>`).join("")}</tr></thead>
      <tbody>${linhas}</tbody></table></div>
    <p class="fonte">O destaque marca o maior valor nos indicadores de boas práticas (AMIU, acompanhante, parto vaginal após cesariana, analgesia) e o menor nos de morbidade (casos de MMG, condições ameaçadoras à vida). Números absolutos, distribuições, ocupação e permanência não têm destaque. Indicadores por estabelecimento: unidades de referência recebem gestantes e recém-nascidos de outros serviços.${temMedia ? " A média do grupo é a média simples das unidades do grupo com dado no ano (as planilhas trazem só os indicadores calculados, sem numeradores e denominadores) e não participa do destaque." : ""}</p>
  </div>
  <div class="grid-2" style="margin-top:1.1rem">
    <div class="card"><h3 style="display:flex; justify-content:space-between; align-items:center; gap:.6rem">Série comparada <select id="selIndComp"></select></h3><div id="grafComp"></div></div>
    <div class="card"><h3 id="tituloRankComp">—</h3><div id="grafCompRank"></div></div>
  </div>`;
  const sel = document.getElementById("selIndComp");
  sel.innerHTML = EIXOS.map(e => `<optgroup label="${e.rot}">` + INDS.filter(i => i.eixo === e.id).map(i => `<option value="${i.id}">${esc(i.rot)}</option>`).join("") + `</optgroup>`).join("");
  sel.value = "mmg";
  sel.addEventListener("change", desenhaGrafComp);
  desenhaGrafComp();
  function desenhaGrafComp(){
    const ind = indPorId(sel.value);
    grafLinhas("grafComp",
      lst.map((m, i) => ({nome:m.nome, cor:cores[i], vals:ANOS.map((_, k) => valorEntrada(m, ind, k)), dash:m.media})),
      {fmt:FMT[ind.fmt], legenda:true});
    document.getElementById("tituloRankComp").textContent = ind.rot + " · " + rotAnoCurto(a);
    grafRanking("grafCompRank", lst.map((m, i) => ({nome:m.nome, v:valorEntrada(m, ind, a), cor:cores[i]})), {sentido:ind.sentido === "menor" ? "menor" : "maior", fmt:v => fmtInd(ind, v)});
  }
}

/* ============================================================
   EVOLUÇÃO — a mesma unidade comparada entre anos
   ============================================================ */
let evoCnes = MAT[0].cnes;
let anosEvoSel = new Set([ULT - 1, ULT]);
function sparkline(vals){
  const ok = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if(ok.length < 2) return "";
  const W = 110, H = 26, m = 3;
  const ys = ok.map(p => p[1]);
  const min = Math.min(...ys), max = Math.max(...ys), span = (max - min) || 1;
  const X = i => m + (W - 2*m) * i / (vals.length - 1);
  const Y = v => H - m - (H - 2*m) * (v - min) / span;
  const d = ok.map((p, k) => (k ? "L" : "M") + X(p[0]).toFixed(1) + "," + Y(p[1]).toFixed(1)).join("");
  const fim = ok[ok.length - 1];
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="vertical-align:middle">
    <path d="${d}" fill="none" stroke="#279261" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${X(fim[0]).toFixed(1)}" cy="${Y(fim[1]).toFixed(1)}" r="2.6" fill="#1B5F51"/>
  </svg>`;
}
function desenhaEvolucao(){
  const mt = MAT.find(m => m.cnes === evoCnes) || MAT[0];
  const el = document.getElementById("evoConteudo");
  const anos = [...anosEvoSel].sort((a, b) => a - b);
  if(anos.length < 2){
    el.innerHTML = `<div class="card"><p class="suave">Marque pelo menos dois anos para ver a evolução.</p></div>`;
    return;
  }
  const a0 = anos[0], a1 = anos[anos.length - 1];
  const parcialSel = temParcial(anos);
  const extremoParcial = PARCIAIS.has(ANOS[a0]) || PARCIAIS.has(ANOS[a1]);   // número absoluto de período parcial não se compara
  let linhas = "";
  EIXOS.forEach(ex => {
    linhas += `<tr class="grupo"><td colspan="${anos.length + 3}">${esc(ex.rot)}</td></tr>`;
    INDS.filter(i => i.eixo === ex.id).forEach(ind => {
      const serie = ANOS.map((_, i) => valorUnidade(mt, ind, i));
      const tds = anos.map(a => `<td class="mono">${fmtInd(ind, serie[a])}</td>`).join("");
      const v0 = serie[a0], v1 = serie[a1];
      let varTxt = "—", cls = "var-neutra";
      if(v0 != null && v1 != null && !(ind.fmt === "int" && extremoParcial)){
        if(ind.fmt === "int"){
          const d = v0 ? (v1 - v0) / v0 * 100 : null;
          varTxt = d == null ? (v1 > 0 ? "▲ +" + fmtInt(v1) : "—") : (d >= 0 ? "▲ +" : "▼ ") + d.toLocaleString("pt-BR", {maximumFractionDigits:1}) + "%";
        } else {
          const d = v1 - v0;
          const un = ind.fmt === "pct" ? " p.p." : " dias";
          varTxt = (d >= 0 ? "▲ +" : "▼ ") + d.toLocaleString("pt-BR", {maximumFractionDigits:1}) + un;
          if(ind.sentido === "menor") cls = d <= 0 ? "var-ok" : "var-ruim";
          if(ind.sentido === "maior") cls = d >= 0 ? "var-ok" : "var-ruim";
        }
      }
      linhas += `<tr><td>${esc(ind.rot)}</td>
        ${tds}<td class="${cls} var-click" data-ind="${ind.id}" title="Ver o gráfico da tendência" style="white-space:nowrap">${varTxt}</td><td>${sparkline(serie.slice(0, ULT + 1))}</td></tr>`;
    });
  });
  el.innerHTML = `
  <div class="card comp-grid">
    <h3>${esc(mt.nome)} · ${mt.uf} <span class="chip">variação de ${nomeAno(a0)} a ${nomeAno(a1)}</span></h3>
    <div class="tab-wrap"><table class="comp">
      <thead><tr><th>Indicador</th>${anos.map(a => `<th>${nomeAno(a)}${PRELIM.has(ANOS[a]) ? "*" : ""}</th>`).join("")}<th>Variação</th><th>Tendência ${ANOS[0]}–${ANOS[ULT]}</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>
    <p class="fonte">Variação entre o primeiro e o último ano marcados: percentuais em pontos percentuais, permanência em dias, números absolutos em variação relativa. Verde = melhorou (mais boas práticas ou menos morbidade); vermelho = piorou; sem cor = número absoluto, distribuição, ocupação ou permanência, sem julgamento. A tendência mostra os anos completos, ${ANOS[0]} a ${ANOS[ULT]}.${parcialSel ? " " + esc(NOTA_PARCIAL) + " Por isso a variação dos números absolutos não é calculada quando o período parcial é um dos extremos." : ""} * 2025 parcial (competências até junho de 2026). ${FONTE_MISTA}</p>
  </div>`;
}

/* ============================================================
   PÁGINA DE METODOLOGIA — dicionário final de indicadores (10/09/2026)
   ============================================================ */
let _metodoPronta = false;
const normDic = s => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function desenhaMetodologia(){
  if(_metodoPronta) return;
  _metodoPronta = true;
  const fontes = [
    ["SIH/SUS · AIH reduzida (RD)", "Sistema de Informações Hospitalares do SUS, arquivos RD<UF><aaaamm>.dbc de todas as competências de 2019 a junho de 2026 (colunas 2019-2025) e até agosto de 2026 (1º semestre de 2026), das 27 UFs. Internações atribuídas ao CNES do estabelecimento e ao ano da data de internação; o universo obstétrico são as mulheres de 10 a 59 anos com diagnóstico ou procedimento obstétrico. Base do volume, motivos, acompanhante, CPN, permanência, morbidade materna grave, internações neonatais e UTI neonatal."],
    ["1º semestre de 2026", (() => { const p = (DADOS.periodos || {})[2026] || {}; return `Coluna acrescentada em ${p.extraidoEm ? p.extraidoEm.split("-").reverse().join("/") : "18/10/2026"}: ${p.descricao || "internações de janeiro a junho de 2026"}. Mesmas regras v3 das colunas 2019-2025 (o tabulador do período é gerado a partir do script da tabulação v3 e reproduziu a coluna de 2024). ${p.completude ? p.completude.charAt(0).toUpperCase() + p.completude.slice(1) + "." : ""} Taxas de ocupação com os leitos-dia de janeiro a junho de 2026. Período parcial e preliminar: fora das tendências; números absolutos não comparáveis com anos completos.${(p.unidadesSemDados || []).length ? " Sem AIH no período: " + p.unidadesSemDados.map(c => { const m = MAT.find(x => x.cnes === c); return m ? m.nome + " (CNES " + c + ")" : c; }).join("; ") + "." : ""}`; })()],
    ["SIH/SUS · serviços profissionais (SP)", "Arquivos SP<UF><aaaamm>.dbc: atos profissionais de cada AIH, usados para marcar analgesia, transfusão, histerectomia, admissão em UTI, AMIU e curetagens, diárias de acompanhante e demais critérios de morbidade materna grave."],
    ["CNES · leitos (LT)", "Arquivos LT<UF><aaaamm>.dbc: leitos existentes por competência. Leitos-dia obstétricos (códigos 10 e 43) e de UTI neonatal tipo II e III (códigos 81 e 82) são os denominadores das taxas de ocupação."],
    ["SINASC", "Sistema de Informações sobre Nascidos Vivos: nascidos vivos ocorridos na unidade (CODESTAB) por ano de nascimento. Base do parto vaginal após cesariana, do trabalho de parto induzido e das condições potencialmente ameaçadoras à vida; 2024 e 2025 preliminares; 1º semestre de 2026 = nascidos de janeiro a junho de 2026 (SINASC 2026 preliminar)."],
    ["CNES · ficha e habilitações", "Ficha de cadastro pela API oficial de Dados Abertos do Ministério da Saúde e habilitações ativas pelo serviço do próprio site do CNES; coordenadas georreferenciadas a partir do cadastro."],
    ["Lista de maternidades e regras", "LISTA MATERNIDADES POR GRUPO de 09/09/2026 (apoiadas, EBSERH e QUALINEO 2026/2027) e regras de cálculo aprovadas pela coordenação em 09/09/2026 (dicionário final de 10/09/2026): universo de mulheres de 10 a 59 anos, morbidade materna grave conforme o Observatório Obstétrico Brasileiro, AMIU sem a curetagem semiótica, procedimento 0409060313 como parto vaginal e causas neonatais pelo diagnóstico principal. Unidades acrescentadas depois da lista (12 e 23/09/2026) entram como anexo, com as mesmas regras."]
  ];
  const dic = (typeof DICIONARIO !== "undefined" ? DICIONARIO : []).filter(d => !/^PERFIL/i.test(d.secao));
  const secoes = [...new Set(dic.map(d => d.secao))];
  const ficha = d => `<div class="card">
      <h3>${esc(d.ind)}</h3>
      <p class="suave" style="font-size:.88rem; margin-top:.4rem">${esc(d.desc)}</p>
      <p style="font-size:.86rem; margin-top:.5rem; white-space:pre-line"><b>Variáveis e regra:</b> ${esc(d.regra)}</p>
      <p class="fonte">Dicionário de indicadores de internação · versão final de 10/09/2026 · dados sujeitos a revisão.</p>
    </div>`;
  document.getElementById("metodoConteudo").innerHTML = `
    <div class="sec-head" style="margin-top:.7rem">
      <p class="eyebrow">Metodologia</p>
      <h2>De onde vem cada número</h2>
      <p style="max-width:none">As bases oficiais utilizadas no painel e, abaixo, a ficha de cada indicador conforme o dicionário final de indicadores de internação (10/09/2026), o mesmo das apresentações. Os valores são os das planilhas retabuladas com as regras aprovadas pela coordenação em 09/09/2026, em versão para validação.</p>
    </div>
    <div class="grid-3">
      ${fontes.map(f => `<div class="card"><h3>${f[0]}</h3><p class="suave" style="font-size:.88rem; margin-top:.5rem">${f[1]}</p></div>`).join("")}
    </div>
    <div class="card" style="margin-top:1.4rem">
      <h3>Leitura dos indicadores por estabelecimento</h3>
      <p class="suave" style="font-size:.9rem; margin-top:.5rem">
        As internações são as faturadas ao SUS pela própria unidade (AIH), pelo ano da data de internação; 2025 cobre as competências até junho de 2026 e pode receber acréscimos. Unidades de referência recebem gestantes e recém-nascidos transferidos de outros serviços, o que eleva a morbidade materna grave e as internações neonatais. Taxas de ocupação acima de 100% indicam mais dias de permanência do que leitos-dia cadastrados no CNES — em geral, cadastro de leitos desatualizado ou internações obstétricas em leitos de outra especialidade. Anos sem dado (unidade ainda não existia ou sem faturamento) ficam em branco.
      </p>
    </div>
    ${secoes.map(s => `<h3 class="titulo-linha" style="margin:1.6rem 0 .7rem">${esc(s)}</h3><div class="grid-2">${dic.filter(d => d.secao === s).map(ficha).join("")}</div>`).join("")}
    <div class="card" style="margin-top:1.4rem">
      <h3>Média do grupo, destaques e dados parciais</h3>
      <p class="suave" style="font-size:.9rem; margin-top:.5rem">
        No comparador, a média do grupo é a média simples das unidades do grupo com dado no ano (as planilhas trazem só os indicadores calculados, sem numeradores e denominadores). O destaque marca o maior valor nos indicadores de boas práticas (AMIU, acompanhante, parto vaginal após cesariana, analgesia) e o menor nos de morbidade (casos de MMG, condições ameaçadoras à vida). Nas faixas de destaque da página inicial, os totais somam as unidades do painel e a morbidade materna grave é a média das unidades. 2025 é parcial (competências até junho de 2026).
      </p>
    </div>`;
}
function abrirMetodo(){
  desenhaMetodologia();
  const pg = document.getElementById("paginaMetodo");
  if(pg.hidden){
    pg.hidden = false;
    document.body.classList.add("dossie-aberto");
    history.pushState({metodo:1}, "", "#metodologia");
  }
  pg.scrollTop = 0;
}
function fecharMetodo(voltarHistorico = true){
  const pg = document.getElementById("paginaMetodo");
  if(pg.hidden) return;
  pg.hidden = true;
  if(document.getElementById("paginaDossie").hidden) document.body.classList.remove("dossie-aberto");
  if(voltarHistorico && location.hash === "#metodologia") history.back();
}

/* ============================================================
   LIGAÇÕES DE INTERFACE
   ============================================================ */
function opcaoUnidades(sel, conjunto){
  const porUF = {};
  const lista = conjunto ? MAT.filter(m => conjuntoPrincipal(m) === conjunto) : MAT;
  lista.forEach(m => { (porUF[m.uf] = porUF[m.uf] || []).push(m); });
  sel.innerHTML = Object.keys(porUF).sort().map(uf =>
    `<optgroup label="${UF_NOME[uf]}">` +
    porUF[uf].sort((a,b) => a.nome.localeCompare(b.nome)).map(m => `<option value="${m.cnes}">${esc(m.nome)}</option>`).join("") +
    `</optgroup>`).join("");
}
const GRUPO_ROT_PLURAL = {apoiada:"Maternidades apoiadas (estratégicas)", ebserh:"Unidades EBSERH", qualineo:"QUALINEO 2026/2027"};
function opcaoUnidadesPorGrupo(sel){
  sel.innerHTML = ORDEM_CONJ.map(g => {
    const lst = MAT.filter(m => conjuntoPrincipal(m) === g).sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome));
    if(!lst.length) return "";
    return `<optgroup label="${GRUPO_ROT_PLURAL[g]} (${lst.length})">` +
      lst.map(m => `<option value="${m.cnes}">${m.uf} · ${esc(m.nome)}</option>`).join("") + `</optgroup>`;
  }).join("");
}
const opcoesAno = (sel, padrao) => {
  sel.innerHTML = ANOS.map((a, i) => `<option value="${i}" ${i === padrao ? "selected" : ""}>${nomeAno(i)}${PRELIM.has(a) ? " · parcial" : ""}</option>`).join("");
};
function inicia(){
  // faixa de destaques
  const a = ULT;
  document.getElementById("statMats").textContent = MAT.length;
  document.getElementById("statUFs").textContent = new Set(MAT.map(m => m.uf)).size;
  document.getElementById("statObst").textContent = fmtInt(soma(MAT, indPorId("obst_n"), a));
  document.getElementById("statObstSub").textContent = "partos: " + fmtPct(media(MAT, indPorId("mot_parto"), a)) + " (média das unidades)";
  document.getElementById("statNeo").textContent = fmtInt(soma(MAT, indPorId("neo_n"), a));
  document.getElementById("statNeoSub").textContent = "em UTIN: " + fmtPct(media(MAT, indPorId("neo_utin"), a)) + " (média das unidades)";
  document.getElementById("statMMG").textContent = fmtPct(media(MAT, indPorId("mmg"), a));
  document.getElementById("statMMGSub").textContent = "média das unidades · % das internações obstétricas";

  // trilho lateral
  const ICO = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const TRILHO = [
    {alvo:"inicio", rot:"Início", ico:ICO('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>')},
    {alvo:"secUnidades", rot:"Mapa de unidades", ico:ICO('<path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>')},
    {alvo:"secDossie", rot:"Perfil da unidade", ico:ICO('<path d="M5 21V8l7-4 7 4v13"/><path d="M9.5 21v-4.5h5V21"/><path d="M12 8v3.5M10.25 9.75h3.5"/><path d="M4 21h16"/>')},
    {alvo:"secComparar", rot:"Comparar unidades", ico:ICO('<path d="M6 3v18M18 3v18"/><path d="M6 8h5M13 8h5M6 13h5M13 13h5"/>')},
    {alvo:"__metodo", rot:"Metodologia", ico:ICO('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>')}
  ];
  const trilho = document.getElementById("trilho");
  trilho.innerHTML = TRILHO.map(t => `<button data-alvo="${t.alvo}" data-rotulo="${t.rot}" aria-label="${t.rot}">${t.ico}</button>`).join("");
  trilho.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      if(b.dataset.alvo === "__metodo"){ abrirMetodo(); return; }
      document.getElementById(b.dataset.alvo).scrollIntoView({behavior:"smooth"});
    });
  });
  const secs = [...document.querySelectorAll("section[id]"), document.getElementById("inicio")];
  const spy = new IntersectionObserver(es => {
    es.forEach(e => { if(e.isIntersecting) trilho.querySelectorAll("button").forEach(b => b.classList.toggle("ativo", b.dataset.alvo === e.target.id)); });
  }, {rootMargin:"-40% 0px -55% 0px"});
  secs.forEach(s => spy.observe(s));
  document.getElementById("btnMetodologia").addEventListener("click", abrirMetodo);
  document.getElementById("btnVoltarMetodo").addEventListener("click", () => fecharMetodo());

  // leaflet — filtros
  const sReg = document.getElementById("selRegiaoLeaflet");
  sReg.innerHTML += Object.keys(REGIAO_UFS).map(r => `<option>${r}</option>`).join("");
  const sUF = document.getElementById("selUFLeaflet");
  sUF.innerHTML += Object.keys(UF_NOME).sort().map(u => `<option value="${u}">${UF_NOME[u]}</option>`).join("");
  const busca = document.getElementById("buscaUnidade");
  const chkCtx = document.getElementById("chkContexto");
  const btnLimpar = document.getElementById("btnLimparUnidades");
  [sReg, sUF].forEach(s => s.addEventListener("change", desenhaPontos));
  busca.addEventListener("input", () => { clearTimeout(window._tBusca); window._tBusca = setTimeout(desenhaPontos, 250); });
  chkCtx.addEventListener("change", desenhaPontos);
  btnLimpar.addEventListener("click", () => {
    sReg.value = ""; sUF.value = ""; busca.value = ""; chkCtx.checked = false;
    desenhaPontos();
    if(leaf) leaf.setView([-14.5, -52], 4);
  });

  // perfil da unidade — um seletor por grupo + página sobreposta
  const sU = document.getElementById("selUnidade");
  opcaoUnidades(sU, "apoiada");
  sU.value = estado.cnes;
  if(!sU.value){ estado.cnes = sU.options[0]?.value || estado.cnes; sU.value = estado.cnes; }
  document.getElementById("btnAbrirDossie").addEventListener("click", () => abrirDossie(sU.value));
  [["Ebserh", "ebserh", "nEbserh"], ["Qualineo", "qualineo", "nQualineo"]].forEach(([sufixo, conj, elN]) => {
    const s = document.getElementById("selUnidade" + sufixo);
    if(!s) return;
    opcaoUnidades(s, conj);
    document.getElementById("btnAbrirDossie" + sufixo).addEventListener("click", () => abrirDossie(s.value));
    const n = document.getElementById(elN);
    if(n) n.textContent = `(${MAT.filter(m => conjuntoPrincipal(m) === conj).length})`;
  });
  const nAp = document.getElementById("nApoiada");
  if(nAp) nAp.textContent = `(${MAT.filter(m => conjuntoPrincipal(m) === "apoiada").length})`;
  const sPd = document.getElementById("selUnidadePd");
  opcaoUnidades(sPd);
  sPd.value = estado.cnes;
  sPd.addEventListener("change", () => abrirDossie(sPd.value));
  document.getElementById("btnVoltarDossie").addEventListener("click", () => fecharDossie());
  document.getElementById("btnPdfDossie").addEventListener("click", () => window.print());

  // comparador
  const sC = document.getElementById("selAddComp");
  opcaoUnidades(sC, grupoComp);
  document.querySelectorAll("#segGrupoComp button").forEach(b => {
    b.textContent += ` (${MAT.filter(m => conjuntoPrincipal(m) === b.dataset.grupo).length})`;
    b.addEventListener("click", () => {
      if(b.dataset.grupo === grupoComp) return;
      document.querySelectorAll("#segGrupoComp button").forEach(x => x.classList.remove("ativo"));
      b.classList.add("ativo");
      grupoComp = b.dataset.grupo;
      opcaoUnidades(sC, grupoComp);
      estado.comparar = [];
      desenhaChipsComp(); desenhaComparador();
    });
  });
  document.getElementById("btnAddComp").addEventListener("click", () => addComp(sC.value));
  document.getElementById("btnAddMedia").addEventListener("click", addMediaGrupo);
  const sAC = document.getElementById("selAnoComp");
  opcoesAno(sAC, ULT);
  sAC.addEventListener("change", () => { anoComp = +sAC.value; desenhaComparador(); });

  // modo "mesma unidade entre anos"
  document.querySelectorAll("#segModoComp button").forEach(b => {
    b.addEventListener("click", () => {
      document.querySelectorAll("#segModoComp button").forEach(x => x.classList.remove("ativo"));
      b.classList.add("ativo");
      const anosMode = b.dataset.modo === "anos";
      document.getElementById("compModoUnidades").hidden = anosMode;
      document.getElementById("compModoAnos").hidden = !anosMode;
      if(anosMode) desenhaEvolucao();
    });
  });
  const sEvo = document.getElementById("selUnidadeEvo");
  opcaoUnidadesPorGrupo(sEvo);
  sEvo.value = evoCnes;
  sEvo.addEventListener("change", () => { evoCnes = sEvo.value; desenhaEvolucao(); });
  const anosBox = document.getElementById("anosEvo");
  anosBox.innerHTML = ANOS.map((a, i) => `<button class="chip chip-ano ${anosEvoSel.has(i) ? "ativo" : ""}" data-a="${i}">${nomeAno(i)}</button>`).join("");
  anosBox.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      const i = +b.dataset.a;
      if(anosEvoSel.has(i)){
        if(anosEvoSel.size <= 2) return;
        anosEvoSel.delete(i); b.classList.remove("ativo");
      } else {
        anosEvoSel.add(i); b.classList.add("ativo");
      }
      desenhaEvolucao();
    });
  });

  // mapa de unidades: é a abertura do painel (acordeão já aberto); reinicializa se fechar/abrir
  const detUn = document.getElementById("detUnidades");
  detUn.addEventListener("toggle", () => {
    if(!detUn.open) return;
    if(!leaf) iniciaLeaflet();
    else setTimeout(() => leaf.invalidateSize(), 60);
  });
  if(detUn.open && !leaf) iniciaLeaflet();

  desenhaChipsComp();
  desenhaComparador();
}
document.addEventListener("DOMContentLoaded", inicia);
if(document.readyState !== "loading") inicia();
