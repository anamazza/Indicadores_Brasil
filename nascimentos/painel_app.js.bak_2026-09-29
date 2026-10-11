/* ============================================================
   Painel NV 2026 — app
   Dados: const GEO / DADOS / PONTOS (dados_nv2026.js)
   ============================================================ */
"use strict";

const ANOS = DADOS.anos;                 // [2019..2025]
const NT = ANOS.length;                  // índice da coluna Total nos blocos
const MAT = DADOS.maternidades;
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
const esc = s => String(s).replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* ---------------- acesso aos blocos ---------------- */
function linha(mt, bloco, rotulo){
  const b = mt.blocos[bloco]; if(!b) return null;
  const r = b.find(x => x[0] === rotulo);
  return r ? r[1] : null;
}
function somaLinhas(mt, bloco, rotulos, a){
  let s = 0, tem = false;
  rotulos.forEach(rot => { const v = linha(mt, bloco, rot); if(v && v[a] != null){ s += v[a]; tem = true; } });
  return tem ? s : null;
}

/* ---------------- indicadores ----------------
   cada indicador sabe extrair num/den de uma maternidade num ano  */
const INDS = [
  {id:"nv", eixo:"geral", rot:"Nascidos vivos ocorridos", curto:"Nascidos vivos", tipo:"num", sentido:"neutro",
   num:(m,a)=> (m.blocos.nv_territorio ? m.blocos.nv_territorio[0][1][a] : null), den:null,
   desc:"Total de nascidos vivos ocorridos na unidade (SINASC)."},
  {id:"shareUF", eixo:"geral", rot:"% dos nascimentos da UF ocorridos nas maternidades", curto:"% da UF", tipo:"pct", sentido:"neutro", denUnico:true,
   num:(m,a)=> m.blocos.nv_territorio[0][1][a], den:(m,a)=> m.blocos.nv_territorio[4][1][a],
   desc:"Participação das maternidades estratégicas do território no total de nascidos vivos da UF."},
  {id:"resRS", eixo:"geral", rot:"% de NV ocorridos na região de residência", curto:"% NV na região de residência", tipo:"pct", sentido:"neutro",
   num:(m,a)=> linha(m,"residentes_nv","regiao_saude")?.[a],
   den:(m,a)=> m.blocos.residentes_nv?.[0]?.[1]?.[a],
   classifica: v => v > 95 ? "#A9CFE5" : v >= 90 ? "#B4E284" : v >= 75 ? "#FBF0A0" : v >= 50 ? "#F6AA4E" : "#CD4A45",
   legenda: [{c:"#A9CFE5", r:">95"}, {c:"#B4E284", r:"90 - 95"}, {c:"#FBF0A0", r:"75 - 89"}, {c:"#F6AA4E", r:"50 - 74"}, {c:"#CD4A45", r:"<50"}],
   desc:"Percentual dos nascidos vivos da maternidade cujas mães residem na própria região de saúde da unidade."},
  {id:"pn7", eixo:"prenatal", rot:"% com 7 ou mais consultas de pré-natal", curto:"7+ consultas", tipo:"pct", sentido:"maior",
   num:(m,a)=> linha(m,"prenatal","7 e + consultas")?.[a],
   den:(m,a)=>{ const t=linha(m,"prenatal","Total")?.[a], i=linha(m,"prenatal","Ignorado")?.[a]||0; return t==null?null:t-i; },
   desc:"Nascidos vivos cujas mães fizeram 7 ou mais consultas de pré-natal (exclui ignorados)."},
  {id:"tri1", eixo:"prenatal", rot:"% com pré-natal iniciado no 1º trimestre", curto:"1º trimestre", tipo:"pct", sentido:"maior",
   num:(m,a)=> linha(m,"trimestre","Primeiro Trimestre")?.[a],
   den:(m,a)=>{ const t=linha(m,"trimestre","Total")?.[a], i=linha(m,"trimestre","Ignorado")?.[a]||0; return t==null?null:t-i; },
   desc:"Entre quem fez ao menos uma consulta, proporção que começou no primeiro trimestre (exclui ignorados)."},
  {id:"ces", eixo:"parto", rot:"% de cesárea", curto:"Cesárea", tipo:"pct", sentido:"menor", faixas:[30,35,45,55],
   num:(m,a)=> linha(m,"via","Cesárea")?.[a],
   den:(m,a)=>{ const t=linha(m,"via","Total")?.[a], i=linha(m,"via","Ignorado")?.[a]||0; return t==null?null:t-i; },
   desc:"Partos cesáreos sobre o total de nascidos vivos com via informada."},
  {id:"enf", eixo:"parto", rot:"% de parto vaginal assistido por enfermeira ou obstetriz", curto:"Enfermeira/obstetriz", tipo:"pct", sentido:"maior", meta:50,
   num:(m,a)=> linha(m,"assistencia","Enferm/Obstetriz")?.[a],
   den:(m,a)=>{ const t=linha(m,"assistencia","Total")?.[a], i=linha(m,"assistencia","Ignorado")?.[a]||0; return t==null?null:t-i; },
   desc:"Entre os partos vaginais, proporção assistida por enfermeira obstétrica ou obstetriz. Meta institucional ≥50%."},
  {id:"p2500", eixo:"rn", rot:"% de baixo peso (<2500 g)", curto:"<2500 g", tipo:"pct", sentido:"neutro",
   num:(m,a)=> somaLinhas(m,"peso",["0g a 999g","1000g a 1499g","1500g a 2499g"],a),
   den:(m,a)=> linha(m,"peso","Total")?.[a],
   desc:"Perfil de risco recebido: são maternidades de referência para gestação de alto risco."},
  {id:"p1500", eixo:"rn", rot:"% de muito baixo peso (<1500 g)", curto:"<1500 g", tipo:"pct", sentido:"neutro",
   num:(m,a)=> somaLinhas(m,"peso",["0g a 999g","1000g a 1499g"],a),
   den:(m,a)=> linha(m,"peso","Total")?.[a],
   desc:"Concentração de recém-nascidos de muito baixo peso: complexidade assumida pela unidade."},
  {id:"prem", eixo:"rn", rot:"% de prematuridade (<37 semanas)", curto:"<37 semanas", tipo:"pct", sentido:"neutro",
   num:(m,a)=> somaLinhas(m,"gestacao",["Menos 22","22 a 27","28 a 31","32 a 36"],a),
   den:(m,a)=>{ const t=linha(m,"gestacao","Total")?.[a], i=linha(m,"gestacao","N Inf")?.[a]||0; return t==null?null:t-i; },
   desc:"Nascidos vivos com menos de 37 semanas de gestação (exclui idade gestacional não informada)."},
  {id:"asf", eixo:"rn", rot:"% de Apgar <7 no 5º minuto", curto:"Apgar <7", tipo:"pct", sentido:"menor",
   num:(m,a)=> somaLinhas(m,"apgar",["0 a 3","4 a 6"],a),
   den:(m,a)=>{ const t=linha(m,"apgar","Total")?.[a], ni=(linha(m,"apgar","N Inf")?.[a]||0)+(linha(m,"apgar","Ign")?.[a]||0); return t==null?null:t-ni; },
   desc:"Apgar de 0 a 6 no 5º minuto, entre nascidos com ≥2500 g e sem anomalias congênitas."},
  {id:"rg1", eixo:"robson", rot:"Taxa de cesárea no grupo 1 de Robson", curto:"Robson G1", tipo:"robson", g:"Grupo 1", sentido:"menor", meta:10,
   desc:"Nulíparas, feto único cefálico, ≥37 semanas, trabalho de parto espontâneo. Meta ≤10%."},
  {id:"rg2", eixo:"robson", rot:"Taxa de cesárea no grupo 2 de Robson", curto:"Robson G2", tipo:"robson", g:"Grupo 2", sentido:"menor", meta:35,
   desc:"Nulíparas, feto único cefálico, ≥37 semanas, parto induzido ou cesárea antes do trabalho de parto. Meta ≤35%."},
  {id:"rg3", eixo:"robson", rot:"Taxa de cesárea no grupo 3 de Robson", curto:"Robson G3", tipo:"robson", g:"Grupo 3", sentido:"menor", meta:3,
   desc:"Multíparas sem cesárea anterior, feto único cefálico, ≥37 semanas, trabalho de parto espontâneo. Meta ≤3%."},
  {id:"rg4", eixo:"robson", rot:"Taxa de cesárea no grupo 4 de Robson", curto:"Robson G4", tipo:"robson", g:"Grupo 4", sentido:"menor", meta:15,
   desc:"Multíparas sem cesárea anterior, feto único cefálico, ≥37 semanas, parto induzido ou cesárea antes do trabalho de parto. Meta ≤15%."},
  {id:"rg5", eixo:"robson", rot:"Taxa de cesárea no grupo 5 de Robson", curto:"Robson G5", tipo:"robson", g:"Grupo 5", sentido:"menor",
   desc:"Multíparas com pelo menos uma cesárea anterior, feto único cefálico, ≥37 semanas."}
];
const EIXOS = [
  {id:"geral", rot:"Visão geral"}, {id:"prenatal", rot:"Pré-natal"},
  {id:"parto", rot:"Via de Nascimento"}, {id:"rn", rot:"Recém-nascido"}, {id:"robson", rot:"Grupos de Robson"}
];
const indPorId = id => INDS.find(i => i.id === id);

/* valor de um indicador para UMA maternidade num ano (a = 0..NT) */
function valorUnidade(mt, ind, a){
  if(ind.tipo === "robson"){
    const tx = linha(mt, "robson_taxa", ind.g);
    return tx && tx[a] != null ? tx[a] : null;
  }
  const n = ind.num(mt, a);
  if(ind.tipo === "num") return n;
  const d = ind.den(mt, a);
  return (n != null && d) ? n / d * 100 : null;
}
/* agregação de uma lista de maternidades */
function agrega(lista, ind, a){
  if(ind.tipo === "num"){
    let s = 0, tem = false;
    lista.forEach(m => { const v = ind.num(m, a); if(v != null){ s += v; tem = true; } });
    return tem ? s : null;
  }
  if(ind.tipo === "robson"){
    let ces = 0, n = 0;
    lista.forEach(m => {
      const tx = linha(m, "robson_taxa", ind.g), qt = linha(m, "robson_n", ind.g);
      if(tx && qt && tx[a] != null && qt[a] != null){ ces += tx[a]/100*qt[a]; n += qt[a]; }
    });
    return n > 0 ? ces/n*100 : null;
  }
  let sn = 0, sd = 0;
  const ufVista = {};
  lista.forEach(m => {
    const n = ind.num(m, a), d = ind.den(m, a);
    if(n == null || d == null) return;
    sn += n;
    if(ind.denUnico){                 // denominador por UF conta uma única vez
      if(!ufVista[m.uf]){ ufVista[m.uf] = true; sd += d; }
    } else {
      sd += d;
    }
  });
  return sd > 0 ? sn/sd*100 : null;
}

/* ---------------- estado ---------------- */
const estado = {
  nivel:"uf",            // uf | macro | rs
  regiao:null,           // região do Brasil filtrada (dropdown)
  uf:null,               // sigla filtrada (dropdown ou clique no mapa)
  eixoMapa:"geral", indMapa:"nv", anoMapa:NT-1,
  eixoPan:"geral", indPan:"nv",
  cnes:MAT[0].cnes,
  comparar:[]
};
function selecionadas(){
  if(estado.uf) return MAT.filter(m => m.uf === estado.uf);
  if(estado.regiao) return MAT.filter(m => (REGIAO_UFS[estado.regiao] || []).includes(m.uf));
  return MAT;
}
function rotuloSelecao(){
  if(estado.uf) return UF_NOME[estado.uf];
  if(estado.regiao) return "Região " + estado.regiao;
  return "Brasil";
}

/* ============================================================
   MAPA SVG — coroplético com zoom por viewBox
   ============================================================ */
const svgBox = document.getElementById("mapaSvg");
let svgEl = null, vbHome = [0, 0, GEO.W, GEO.H];

/* tooltip flutuante do mapa */
function mostraTipMapa(e, html){
  const tip = document.getElementById("tipMapa");
  tip.innerHTML = html;
  tip.hidden = false;
  const larg = 310;
  tip.style.left = Math.min(e.clientX + 14, window.innerWidth - larg - 12) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 12) + "px";
}
function escondeTipMapa(){ document.getElementById("tipMapa").hidden = true; }

const RAMPA_VERDES = ["#DCEFE0","#A9D8B4","#6FBE87","#2E9A63","#0A5C42"];
/* limiares de quintis calculados sobre os territórios visíveis (mudam com o recorte) */
function limiaresQuintis(vals){
  const ord = vals.filter(x => x != null).sort((a, b) => a - b);
  if(!ord.length) return null;
  const q = p => ord[Math.min(ord.length - 1, Math.floor(p * ord.length))];
  return [q(.2), q(.4), q(.6), q(.8)];
}
function corIndicador(v, ind, lims){
  if(v == null) return "var(--sem-dado)";
  if(ind.classifica) return ind.classifica(v);       // faixas fixas com cores próprias
  if(ind.sentido === "menor" && ind.faixas){         // faixas fixas (cesárea)
    const f = ind.faixas;
    const cores = ["#2471A3","#7FB3D5","#F5B041","#E67E22","#C0392B"];
    let i = f.findIndex(x => v <= x); if(i < 0) i = f.length;
    return cores[i];
  }
  if(!lims) return "var(--sem-dado)";
  const use = ind.sentido === "menor" ? [...RAMPA_VERDES].reverse() : RAMPA_VERDES;
  let i = 0;
  lims.forEach((t, k) => { if(v > t) i = k + 1; });
  return use[i];
}

function ufDoTerritorio(t){
  // nivel uf: id é a sigla; macro/rs: sigla no fim do nome "… - RO"
  if(estado.nivel === "uf") return t.id;
  const m = /-\s*([A-Z]{2})\s*$/.exec(t.nome || "");
  return m ? m[1] : null;
}

/* cache: quais maternidades pertencem a cada território de cada nível */
const _cacheTerr = {};
function unidadesDoTerritorio(nivel, ti){
  if(!_cacheTerr[nivel]){
    _cacheTerr[nivel] = GEO.niveis[nivel].map(tt => {
      if(nivel === "uf") return MAT.filter(m => m.uf === tt.id);
      const mUF = /-\s*([A-Z]{2})\s*$/.exec(tt.nome || "");
      const uf = mUF ? mUF[1] : null;
      return MAT.filter(m => m.uf === uf && territorioContem(nivel, tt, m));
    });
  }
  return _cacheTerr[nivel][ti];
}

function desenhaMapa(){
  const ind = indPorId(estado.indMapa), a = estado.anoMapa;
  const terr = GEO.niveis[estado.nivel];
  // valor calculado território a território, na escala escolhida (UF, macro ou RS)
  const valorTerr = terr.map((t, ti) => {
    const lst = unidadesDoTerritorio(estado.nivel, ti);
    return lst.length ? agrega(lst, ind, a) : null;
  });
  // recorte ativo: as faixas de quintis consideram só os territórios visíveis
  const ufsRecorte = estado.uf ? [estado.uf] : estado.regiao ? (REGIAO_UFS[estado.regiao] || []) : null;
  const vals = valorTerr.filter((v, ti) =>
    v != null && (!ufsRecorte || ufsRecorte.includes(ufDoTerritorio(terr[ti]))));
  const lims = limiaresQuintis(vals);

  svgBox.innerHTML = "";
  svgEl = document.createElementNS(NS, "svg");
  svgEl.setAttribute("viewBox", vbHome.join(" "));
  svgEl.setAttribute("role", "img");
  svgEl.setAttribute("aria-label", "Mapa do Brasil");

  // recorte: com seleção ativa, só os territórios selecionados ficam visíveis
  const ufsVisiveis = estado.uf ? [estado.uf]
    : estado.regiao ? (REGIAO_UFS[estado.regiao] || []) : null;

  const anoRotMapa = estado.anoMapa >= NT ? "Acumulado 2019-2025" : ANOS[estado.anoMapa];
  const g = document.createElementNS(NS, "g");
  terr.forEach((t, ti) => {
    const uf = ufDoTerritorio(t);
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", t.d);
    p.setAttribute("class", "t");
    if(ufsVisiveis && !ufsVisiveis.includes(uf)) p.style.display = "none";
    const v = valorTerr[ti];
    p.setAttribute("fill", corIndicador(v, ind, lims));
    // tooltip: território, valor do indicador e maternidades estratégicas dali
    const nomeT = estado.nivel === "uf" ? UF_NOME[t.id] : t.nome;
    const lst = unidadesDoTerritorio(estado.nivel, ti);
    const maxLista = 7;
    const nomes = lst.slice(0, maxLista).map(m => `<li>${esc(m.nome)}</li>`).join("") +
      (lst.length > maxLista ? `<li>+ ${lst.length - maxLista} outras</li>` : "");
    const tipHtml = `<div class="tm-titulo">${esc(nomeT)}</div>
      ${v != null ? `<div class="tm-valor">${esc(ind.curto)} · ${anoRotMapa}: ${ind.tipo === "num" ? fmtInt(v) : fmtPct(v)}</div>` : ""}
      ${lst.length
        ? `Maternidade${lst.length > 1 ? "s" : ""} estratégica${lst.length > 1 ? "s" : ""} (${lst.length}):<ul>${nomes}</ul>`
        : `<div class="tm-sem">Sem maternidade estratégica neste território.</div>`}`;
    p.addEventListener("mousemove", e => mostraTipMapa(e, tipHtml));
    p.addEventListener("mouseleave", escondeTipMapa);
    p.addEventListener("click", () => { escondeTipMapa(); cliqueTerritorio(t, p); });
    g.appendChild(p);
  });
  // contorno das UFs por cima (nos níveis de detalhe, com ou sem recorte ativo)
  if(estado.nivel !== "uf"){
    const bordasUF = ufsVisiveis
      ? GEO.niveis.uf.filter(t => ufsVisiveis.includes(t.id)).map(t => t.d)
      : (GEO.bordaUF ? [GEO.bordaUF] : []);
    bordasUF.forEach(d => {
      const b = document.createElementNS(NS, "path");
      b.setAttribute("d", d);
      b.setAttribute("fill", "none");
      b.setAttribute("stroke", "var(--indigo)");
      b.setAttribute("stroke-width", ufsVisiveis ? "1.4" : "1");
      b.setAttribute("vector-effect", "non-scaling-stroke");
      b.setAttribute("pointer-events", "none");
      b.setAttribute("opacity", ".45");
      g.appendChild(b);
    });
  }
  svgEl.appendChild(g);
  svgBox.appendChild(svgEl);

  // siglas das UFs (nível Estados)
  if(estado.nivel === "uf"){
    const escuras = new Set(["#2E9A63","#0A5C42","#2471A3","#C0392B","#E67E22"]);
    const paths = svgEl.querySelectorAll("path.t");
    terr.forEach((t, i) => {
      if(paths[i].style.display === "none") return;
      const bb = paths[i].getBBox();
      if(bb.width < 14 && bb.height < 14) return;      // muito pequeno para rótulo
      const txt = document.createElementNS(NS, "text");
      txt.setAttribute("x", (bb.x + bb.width/2).toFixed(1));
      txt.dataset.cy = (bb.y + bb.height/2).toFixed(1);
      txt.setAttribute("text-anchor", "middle");
      txt.setAttribute("class", "sigla");
      txt.setAttribute("fill", escuras.has(paths[i].getAttribute("fill")) ? "#FFFFFF" : "#0A213D");
      txt.textContent = t.id;
      g.appendChild(txt);
    });
  }

  if(estado.uf) zoomUFs([estado.uf], false);
  else if(estado.regiao) zoomUFs(REGIAO_UFS[estado.regiao] || [], false);
  // siglas com tamanho constante na tela: proporcional à largura do viewBox atual
  if(estado.nivel === "uf"){
    const vbw = Number(svgEl.getAttribute("viewBox").split(" ")[2]);
    const fsSigla = 13 * vbw / GEO.W;
    svgEl.querySelectorAll("text.sigla").forEach(tx => {
      tx.setAttribute("font-size", fsSigla.toFixed(2));
      tx.setAttribute("y", (Number(tx.dataset.cy) + fsSigla * 0.35).toFixed(1));
    });
  }
  desenhaLegenda(ind, lims, vals);
  desenhaPainelSelecao();
}

function territorioContem(nivel, t, m){
  // heurística: nome do território ~ macro/região de saúde da unidade
  const alvo = nivel === "macro" ? m.territorio.macro : m.territorio.regiao_saude;
  return simil(t.nome, alvo);
}
function normTxt(s){
  return String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").toUpperCase()
    .replace(/MACRORREGIONAL|MACRORREGIAO|MACROREGIAO|MACRO|REGIAO DE SAUDE|REGIONAL|\bRS\b|SAUDE|\bDE\b|\bDA\b|\bDO\b|\bE\b|\bUNICA\b|[^A-Z0-9 ]/g," ")
    .replace(/\s+/g," ").trim();
}
function simil(a, b){
  const A = new Set(normTxt(a).split(" ").filter(Boolean));
  const B = new Set(normTxt(b).split(" ").filter(Boolean));
  if(!A.size || !B.size) return false;
  let inter = 0; A.forEach(x => { if(B.has(x)) inter++; });
  return inter / Math.min(A.size, B.size) >= 0.6;
}

function cliqueTerritorio(t, pathEl){
  const uf = ufDoTerritorio(t);
  if(estado.uf === uf){ limparSelecaoMapa(); return; }
  estado.uf = uf;
  sincronizaFiltrosMapa();
  desenhaMapa();
  sincronizaSelecao();
}
function limparSelecaoMapa(){
  estado.uf = null;
  estado.regiao = null;
  sincronizaFiltrosMapa();
  animaViewBox(vbHome);
  desenhaMapa();
  sincronizaSelecao();
}
function preencheUFMapa(){
  // Estado ligado ao Território: só os estados da região escolhida
  const sUM = document.getElementById("selUFMapa");
  const ufs = estado.regiao ? [...(REGIAO_UFS[estado.regiao] || [])].sort() : Object.keys(UF_NOME).sort();
  sUM.innerHTML = `<option value="">${estado.regiao ? "Toda a região " + estado.regiao : "Todo o Brasil"}</option>` +
    ufs.map(u => `<option value="${u}">${UF_NOME[u]}</option>`).join("");
  sUM.value = estado.uf || "";
}
function sincronizaFiltrosMapa(){
  preencheUFMapa();
  document.getElementById("selRegiaoMapa").value = estado.regiao || "";
  document.getElementById("btnResetMapa").hidden = !(estado.uf || estado.regiao);
}
function zoomUFs(ufs, animar = true){
  // caixa envolvente das partes das UFs no nível atual
  const terr = GEO.niveis[estado.nivel];
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, achou = false;
  const paths = svgEl.querySelectorAll("path.t");
  terr.forEach((t, i) => {
    if(!ufs.includes(ufDoTerritorio(t))) return;
    const bb = paths[i].getBBox();
    x0 = Math.min(x0, bb.x); y0 = Math.min(y0, bb.y);
    x1 = Math.max(x1, bb.x + bb.width); y1 = Math.max(y1, bb.y + bb.height);
    achou = true;
  });
  if(!achou) return;
  const pad = Math.max((x1-x0), (y1-y0)) * 0.12;
  const vb = [x0-pad, y0-pad, (x1-x0)+2*pad, (y1-y0)+2*pad];
  if(animar) animaViewBox(vb); else svgEl.setAttribute("viewBox", vb.join(" "));
}
let animId = null;
function animaViewBox(alvo){
  if(!svgEl) return;
  cancelAnimationFrame(animId);
  const de = svgEl.getAttribute("viewBox").split(" ").map(Number);
  const t0 = performance.now(), dur = 480;
  const passo = now => {
    const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3);
    const vb = de.map((v, i) => v + (alvo[i] - v) * e);
    svgEl.setAttribute("viewBox", vb.map(v => v.toFixed(1)).join(" "));
    if(k < 1) animId = requestAnimationFrame(passo);
  };
  animId = requestAnimationFrame(passo);
}

function desenhaLegenda(ind, lims, vals){
  const nomeNivel = {uf:"UF", macro:"macrorregião de saúde", rs:"região de saúde"}[estado.nivel];
  const tl = document.getElementById("tituloLegenda");
  if(tl) tl.textContent = ind.curto + " · por " + nomeNivel + " · " + rotuloSelecao();
  const el = document.getElementById("legendaMapa");
  let itens = [];
  if(ind.legenda){
    itens = [...ind.legenda];
  } else if(ind.sentido === "menor" && ind.faixas){
    const f = ind.faixas, cores = ["#2471A3","#7FB3D5","#F5B041","#E67E22","#C0392B"];
    itens = f.map((x, i) => ({c:cores[i], r:(i === 0 ? "≤ " + x + "%" : f[i-1] + " - " + x + "%")}));
    itens.push({c:cores[f.length], r:"> " + f[f.length-1] + "%"});
  } else if(lims){
    // faixas com os valores reais dos quintis — recalculadas conforme escala e recorte
    const fmt = ind.tipo === "num" ? fmtInt : fmtPct;
    const distintos = [...new Set(vals)].sort((a, b) => a - b);
    if(distintos.length <= 5){
      // recorte pequeno: mostra os próprios valores
      itens = distintos.map(v => ({c:corIndicador(v, ind, lims), r:fmt(v)}));
    } else {
      const use = ind.sentido === "menor" ? [...RAMPA_VERDES].reverse() : RAMPA_VERDES;
      const rot = [
        "≤ " + fmt(lims[0]),
        fmt(lims[0]) + " - " + fmt(lims[1]),
        fmt(lims[1]) + " - " + fmt(lims[2]),
        fmt(lims[2]) + " - " + fmt(lims[3]),
        "> " + fmt(lims[3])
      ];
      itens = use.map((c, i) => ({c, r:rot[i]}));
    }
  }
  itens.push({c:"var(--sem-dado)", r:"sem maternidade estratégica"});
  el.innerHTML = itens.map(i => `<span><i style="background:${i.c}"></i>${i.r}</span>`).join("");
}

function desenhaPainelSelecao(){
  const lst = selecionadas();
  const a = estado.anoMapa;
  const el = document.getElementById("painelSelecao");
  const kpis = ["nv","ces","pn7","enf","asf","rg1"].map(id => {
    const ind = indPorId(id);
    const v = agrega(lst, ind, a);
    let cls = "";
    if(ind.meta != null && v != null) cls = (ind.sentido === "menor" ? v <= ind.meta : v >= ind.meta) ? "ok" : "ruim";
    return `<div class="kpi"><span>${esc(ind.curto)}</span><span class="v ${cls} mono">${ind.tipo === "num" ? fmtInt(v) : fmtPct(v)}</span></div>`;
  }).join("");
  el.innerHTML = `
    <p class="eyebrow">${esc(rotuloSelecao())} · ${a >= NT ? "Acumulado 2019-2025" : ANOS[a]}</p>
    <p style="margin-top:.15rem"><b class="mono" style="font-size:1.35rem; color:var(--verde-esmeralda)">${lst.length}</b>
      <span class="suave" style="font-size:.85rem"> maternidade${lst.length > 1 ? "s" : ""} estratégica${lst.length > 1 ? "s" : ""} na seleção</span></p>
    <div class="kpi-lista">${kpis}</div>
    <p class="fonte" style="margin-top:.5rem">Toque em um território para filtrar.</p>`;
}

/* ============================================================
   COMPARATIVO 2019 x 2024 — NV <1500g na região de residência
   (todos os nascimentos; dois mapas que reagem juntos aos filtros)
   ============================================================ */
const FAIXA_RES_COR = v => v > 95 ? "#A9CFE5" : v >= 90 ? "#B4E284" : v >= 75 ? "#FBF0A0" : v >= 50 ? "#F6AA4E" : "#CD4A45";
const FAIXA_RES_LEG = [
  {c:"#A9CFE5", r:">95"}, {c:"#B4E284", r:"90 - 95"}, {c:"#FBF0A0", r:"75 - 89"},
  {c:"#F6AA4E", r:"50 - 74"}, {c:"#CD4A45", r:"<50"}
];
const compSel = {regiao:null, uf:null, nivel:"rs", recorte:"todos"};

/* centro (bbox) de cada UF no espaço do mapa — calculado uma vez */
let _centrosUF = null;
function centroUF(svg, uf){
  if(!_centrosUF){
    _centrosUF = {};
    GEO.niveis.uf.forEach(t => {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("d", t.d);
      p.setAttribute("fill", "none");
      svg.appendChild(p);
      const bb = p.getBBox();
      _centrosUF[t.id] = [bb.x + bb.width/2, bb.y + bb.height/2];
      svg.removeChild(p);
    });
  }
  return _centrosUF[uf];
}

function dadoComp(nivel, t, ano){
  if(typeof COMP === "undefined") return null;
  const base = COMP[compSel.recorte];
  if(!base) return null;
  const d = nivel === "uf" ? base.uf[t.id] : (base[nivel] || {})[String(t.id)];
  return d && d[ano] ? d[ano] : null;   // [ocorridos, residentes, pct]
}

function desenhaMapaCompEm(alvoId, ano){
  const terr = GEO.niveis[compSel.nivel];
  const ufsVis = compSel.uf ? [compSel.uf] : compSel.regiao ? (REGIAO_UFS[compSel.regiao] || []) : null;
  const box = document.getElementById(alvoId);
  box.innerHTML = "";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", vbHome.join(" "));
  const g = document.createElementNS(NS, "g");
  const visiveis = [];
  terr.forEach(t => {
    const uf = compSel.nivel === "uf" ? t.id : (/-\s*([A-Z]{2})\s*$/.exec(t.nome || "") || [])[1];
    const p = document.createElementNS(NS, "path");
    p.setAttribute("d", t.d);
    p.setAttribute("class", "t");
    if(ufsVis && !ufsVis.includes(uf)){ p.style.display = "none"; }
    else visiveis.push(p);
    const d = dadoComp(compSel.nivel, t, ano);
    p.setAttribute("fill", d ? FAIXA_RES_COR(d[2]) : "var(--sem-dado)");
    const nomeT = compSel.nivel === "uf" ? UF_NOME[t.id] : t.nome;
    const rotNV = compSel.recorte === "m1500" ? "NV &lt;1500 g de residentes" : "NV de residentes";
    const tip = `<div class="tm-titulo">${esc(nomeT)} · ${ano}</div>
      ${d ? `<div class="tm-valor">% no território de residência: ${fmtPct(d[2])}</div>
             <div>${rotNV}: <b>${fmtInt(d[1])}</b> · nascidos no próprio território: <b>${fmtInt(d[0])}</b></div>`
          : `<div class="tm-sem">Sem dados na planilha.</div>`}`;
    p.addEventListener("mousemove", e => mostraTipMapa(e, tip));
    p.addEventListener("mouseleave", escondeTipMapa);
    g.appendChild(p);
  });
  // contorno das UFs em evidência (níveis regiões de saúde e macro)
  if(compSel.nivel !== "uf"){
    const bordasUF = ufsVis
      ? GEO.niveis.uf.filter(t => ufsVis.includes(t.id)).map(t => t.d)
      : (GEO.bordaUF ? [GEO.bordaUF] : []);
    bordasUF.forEach(d => {
      const b = document.createElementNS(NS, "path");
      b.setAttribute("d", d);
      b.setAttribute("fill", "none");
      b.setAttribute("stroke", "var(--indigo)");
      b.setAttribute("stroke-width", ufsVis ? "1.4" : "1");
      b.setAttribute("vector-effect", "non-scaling-stroke");
      b.setAttribute("pointer-events", "none");
      b.setAttribute("opacity", ".5");
      g.appendChild(b);
    });
  }
  svg.appendChild(g);
  box.appendChild(svg);
  // recorte: enquadra apenas o que está visível
  if(ufsVis && visiveis.length){
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    visiveis.forEach(p => {
      const bb = p.getBBox();
      x0 = Math.min(x0, bb.x); y0 = Math.min(y0, bb.y);
      x1 = Math.max(x1, bb.x + bb.width); y1 = Math.max(y1, bb.y + bb.height);
    });
    const pad = Math.max(x1 - x0, y1 - y0) * 0.06;
    svg.setAttribute("viewBox", [x0 - pad, y0 - pad, (x1 - x0) + 2*pad, (y1 - y0) + 2*pad].map(v => v.toFixed(1)).join(" "));
  }

  // siglas das UFs (tamanho proporcional ao recorte, com halo branco)
  const vb = svg.getAttribute("viewBox").split(" ").map(Number);
  const fs = vb[2] / 62;   // proporcional ao recorte: tamanho constante na tela
  (ufsVis || Object.keys(UF_NOME)).forEach(uf => {
    const c = centroUF(svg, uf);
    if(!c) return;
    const txt = document.createElementNS(NS, "text");
    txt.setAttribute("x", c[0].toFixed(1));
    txt.setAttribute("y", (c[1] + fs * 0.35).toFixed(1));
    txt.setAttribute("text-anchor", "middle");
    txt.setAttribute("font-size", fs.toFixed(1));
    txt.setAttribute("font-weight", "800");
    txt.setAttribute("fill", "#0A213D");
    txt.setAttribute("stroke", "#FFFFFF");
    txt.setAttribute("stroke-width", (fs * 0.16).toFixed(1));
    txt.setAttribute("paint-order", "stroke");
    txt.setAttribute("pointer-events", "none");
    txt.textContent = uf;
    svg.appendChild(txt);
  });
}

function desenhaComparativo(){
  if(typeof COMP === "undefined") return;
  const anoA = document.getElementById("selAnoCompA").value || "2019";
  const anoB = document.getElementById("selAnoCompB").value || "2024";
  desenhaMapaCompEm("mapaComp2019", anoA);
  desenhaMapaCompEm("mapaComp2024", anoB);
  const nomeNivel = {uf:"UF", macro:"macrorregião", rs:"região de saúde"}[compSel.nivel];
  document.getElementById("tituloLegComp").textContent =
    (compSel.recorte === "m1500" ? "% de NV <1500 g" : "% de NV") +
    " ocorridos na " + (compSel.nivel === "uf" ? "UF" : nomeNivel) + " de residência";
  document.getElementById("legendaComp").innerHTML =
    [...FAIXA_RES_LEG, {c:"var(--sem-dado)", r:"sem dados"}]
      .map(i => `<span><i style="background:${i.c}"></i>${i.r}</span>`).join("");
}

/* ============================================================
   MAPA LEAFLET — pontos das unidades
   ============================================================ */
let leaf = null, camadaEstr = null, camadaCtx = null;
function iniciaLeaflet(){
  leaf = L.map("mapaLeaflet", {scrollWheelZoom:true}).setView([-14.5, -52], 4);
  // 28/08/2026: o basemap do CARTO passou a exigir chave de API (tiles com marca
  // "API KEY REQUIRED") — trocado pelo OpenStreetMap padrão, gratuito e sem chave
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom:18
  }).addTo(leaf);
  desenhaPontos();
}
/* conjuntos: as 59 estratégicas em verde; as unidades novas em tons de azul */
const CONJUNTOS = {
  estrategica:{rot:"Maternidade estratégica", fundo:"#279261", borda:"#154A4B"},
  ebserh:     {rot:"Unidade EBSERH",          fundo:"#2471A3", borda:"#103B5E"},
  qualineo:   {rot:"QUALINEO 2026/2027",      fundo:"#5FB0D9", borda:"#1B6B8F"},
};
const ORDEM_CONJ = ["estrategica", "ebserh", "qualineo"];
/* uma unidade pode pertencer a mais de um conjunto (5 das novas já eram estratégicas).
   Para não repeti-la em dois seletores, cada uma entra só no primeiro desta ordem —
   que é também a cor que ela recebe no mapa. */
function conjuntoPrincipal(m){
  const c = m.conjuntos || ["estrategica"];
  return ORDEM_CONJ.find(k => c.includes(k)) || "estrategica";
}
function corDoConjunto(m){
  return CONJUNTOS[conjuntoPrincipal(m)];
}
function rotuloConjuntos(m){
  const c = m.conjuntos || ["estrategica"];
  return ORDEM_CONJ.filter(k => c.includes(k)).map(k => CONJUNTOS[k].rot).join(" · ");
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

  // contexto (cinza, cluster)
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
  // maternidades: verde para as estratégicas, tons de azul para as unidades novas
  camadaEstr = L.markerClusterGroup({maxClusterRadius:30, disableClusteringAtZoom:7});
  const visiveis = [];
  MAT.filter(m => passaFiltroPonto({uf:m.uf, nome:m.nome})).forEach(m => {
    if(m.lat == null) return;
    visiveis.push([m.lat, m.lon]);
    const nv = valorUnidade(m, indPorId("nv"), NT-1);
    const ces = valorUnidade(m, indPorId("ces"), NT-1);
    const enf = valorUnidade(m, indPorId("enf"), NT-1);
    const cor = corDoConjunto(m);
    const mk = L.circleMarker([m.lat, m.lon], {radius:8, color:cor.borda, weight:2, fillColor:cor.fundo, fillOpacity:.95});
    mk.bindPopup(`<div class="pop-nome">${esc(m.nome)}</div>
      <div>${esc(m.territorio.municipio)} · ${m.uf} · CNES ${m.cnes}</div>
      <div style="color:${cor.borda}; font-weight:700">${esc(rotuloConjuntos(m))}</div>
      <div style="margin-top:.25rem">Nascidos vivos 2025: <b>${fmtInt(nv)}</b></div>
      <div><u>Via de nascimento</u>: Cesárea <b>${fmtPct(ces)}</b> · Vaginal: <b>${ces == null ? "—" : fmtPct(100 - ces)}</b></div>
      <div>Parto vaginal por enfermeira/obstetriz: <b>${fmtPct(enf)}</b> <span style="color:#4E6A5C">(meta ≥50%)</span></div>
      <a class="pop-btn" href="#" onclick="abrirDossie('${m.cnes}');return false;">Abrir dossiê →</a>`);
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
function grafBarras(alvo, rotulos, valores, opts = {}){
  const W = 640, H = 225, mL = 10, mR = 10, mT = 30, mB = 28;
  const max = Math.max(...valores.filter(v => v != null), 1);
  const n = valores.length, bw = (W - mL - mR) / n;
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  valores.forEach((v, i) => {
    if(v == null) return;
    const h = (H - mT - mB) * v / max;
    const x = mL + i * bw + bw * 0.26, y = H - mB - h;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(bw*0.48).toFixed(1)}" height="${h.toFixed(1)}" rx="6" fill="${opts.cor || "#279261"}"/>`;
    s += `<text x="${(x + bw*0.24).toFixed(1)}" y="${(y - 8).toFixed(1)}" text-anchor="middle" font-size="13" font-weight="700" fill="#1D3229">${opts.pct ? fmtPct(v) : fmtInt(v)}</text>`;
    s += `<text x="${(x + bw*0.24).toFixed(1)}" y="${H - 9}" text-anchor="middle" font-size="12.5" fill="#4E6A5C">${rotulos[i]}</text>`;
  });
  s += "</svg>";
  document.getElementById(alvo).innerHTML = s;
}
function grafLinhas(alvo, series, opts = {}){
  // series: [{nome, cor, vals:[…por ano…]}]
  const comRotulos = opts.rotulos !== false && series.length === 1;
  const W = 640, H = 320, mL = 46, mR = 22, mT = comRotulos ? 34 : 18, mB = 30;
  const todos = series.flatMap(s => s.vals).filter(v => v != null);
  if(!todos.length){ document.getElementById(alvo).innerHTML = "<p class='suave'>Sem dados.</p>"; return; }
  let max = Math.max(...todos), min = Math.min(...todos, opts.meta ?? Infinity);
  if(opts.meta != null) max = Math.max(max, opts.meta);
  const span = (max - min) || 1; max += span * .12; min = Math.max(0, min - span * .12);
  const X = i => mL + (W - mL - mR) * i / (NT - 1);
  const Y = v => H - mB - (H - mT - mB) * (v - min) / (max - min);
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  // grade
  for(let k = 0; k <= 4; k++){
    const v = min + (max - min) * k / 4, y = Y(v);
    s += `<line x1="${mL}" y1="${y.toFixed(1)}" x2="${W-mR}" y2="${y.toFixed(1)}" stroke="#D8E8DC" stroke-width="1"/>`;
    s += `<text x="${mL-6}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="11.5" fill="#4E6A5C">${opts.fmt ? opts.fmt(v) : (opts.pct ? Math.round(v) + "%" : fmtInt(v))}</text>`;
  }
  ANOS.forEach((ano, i) => {
    s += `<text x="${X(i).toFixed(1)}" y="${H-8}" text-anchor="middle" font-size="12" font-weight="700" fill="#1D3229">${ano}</text>`;
  });
  if(opts.meta != null){
    const y = Y(opts.meta);
    s += `<line x1="${mL}" y1="${y.toFixed(1)}" x2="${W-mR}" y2="${y.toFixed(1)}" stroke="#2471A3" stroke-width="1.6" stroke-dasharray="6 5"/>`;
    s += `<text x="${W-mR}" y="${(y-6).toFixed(1)}" text-anchor="end" font-size="11.5" font-weight="700" fill="#2471A3">meta ${opts.meta}%</text>`;
  }
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
      const _rot = opts.fmt ? opts.fmt(v) : (opts.pct ? fmtPct(v) : fmtInt(v));
      s += `<circle cx="${X(i).toFixed(1)}" cy="${Y(v).toFixed(1)}" r="4" fill="${sr.cor}"><title>${esc(sr.nome)} · ${ANOS[i]} · ${_rot}</title></circle>`;
      if(comRotulos){
        s += `<text x="${X(i).toFixed(1)}" y="${(Y(v) - 11).toFixed(1)}" text-anchor="middle" font-size="11.5" font-weight="700" fill="#1D3229">${_rot}</text>`;
      }
    });
  });
  s += "</svg>";
  let leg = "";
  if(series.length > 1 || opts.legenda){
    leg = `<div class="legenda">` + series.map(sr => `<span><i style="background:${sr.cor}"></i>${esc(sr.nome)}</span>`).join("") + `</div>`;
  }
  document.getElementById(alvo).innerHTML = s + leg;
}
function grafRanking(alvo, itens, opts = {}){
  // itens: [{nome, v}]
  const linhas = itens.filter(i => i.v != null).sort((a,b) => opts.sentido === "menor" ? a.v - b.v : b.v - a.v).slice(0, 15);
  if(!linhas.length){ document.getElementById(alvo).innerHTML = "<p class='suave'>Sem dados na seleção.</p>"; return; }
  const W = 640, rh = 27, mL = 8, H = linhas.length * rh + 12;
  const max = Math.max(...linhas.map(i => i.v), 1);
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  linhas.forEach((it, i) => {
    const y = 8 + i * rh, w = (W - 275) * it.v / max;
    s += `<text x="${mL}" y="${y+13}" font-size="11.8" fill="#1D3229">${esc(it.nome.length > 30 ? it.nome.slice(0,29) + "…" : it.nome)}</text>`;
    s += `<rect x="205" y="${y}" width="${Math.max(w,2).toFixed(1)}" height="${rh-9}" rx="5" fill="${it.cor || "#279261"}"/>`;
    s += `<text x="${(207 + Math.max(w,2)).toFixed(1)}" y="${y+13}" font-size="11.8" font-weight="700" fill="#1D3229">${opts.pct ? fmtPct(it.v) : fmtInt(it.v)}</text>`;
  });
  s += "</svg>";
  document.getElementById(alvo).innerHTML = s;
}

/* ============================================================
   ABRANGÊNCIA TERRITORIAL (bloco do dossiê)
   ============================================================ */
let dosRec = "nv", dosPersp = "res";

function montaTerritorioHTML(mt, rec, persp){
  const t = mt.territorio;
  const rotRec = rec === "nv" ? "Nascidos vivos" : "Nascidos vivos <1500g";

  const linhaTab = (rot, arr, opts = {}) => {
    const tds = arr.map((v, i) => `<td class="mono">${opts.pct ? (v == null ? "—" : fmtPct(v)) : fmtInt(v)}</td>`).join("");
    return `<tr class="${opts.classe || ""}"><td>${rot}</td>${tds}</tr>`;
  };

  if(persp === "origem"){
    // slide: região e UF de residência (apenas todos os nascidos vivos)
    const tabela = (bloco, cab) => {
      const linhas = mt.blocos[bloco].map(r =>
        linhaTab(esc(r[0]), r[1].slice(0, NT), {classe:/total/i.test(r[0]) ? "total" : ""})).join("");
      return `<div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde" data-bloco="${bloco}">
        <thead><tr><th>${cab}</th>${thsAno(false)}</tr></thead>
        <tbody>${linhas}</tbody></table></div>`;
    };
    return `<div class="card">
        <h3>Nascidos vivos segundo região e UF de residência, 2019 a 2025 - ${esc(mt.nome)} - ${mt.uf}</h3>
        ${rec !== "nv" ? '<p class="suave" style="font-size:.82rem; margin-top:.4rem">Esta tabela da apresentação existe apenas para o total de nascidos vivos.</p>' : ""}
        ${tabela("res_regiao", "Região de Residência")}
        ${tabela("res_uf", "UF de Residência")}
        <p class="fonte">${FONTE_SINASC}</p>
      </div>`;
  }

  // residência e ocorrência — blocos com hierarquia maternidade → município → RS → macro → UF
  const bloco = persp === "res" ? (rec === "nv" ? "residentes_nv" : "residentes_p1500")
                                : (rec === "nv" ? "nv_territorio" : "p1500_territorio");
  const b = mt.blocos[bloco];
  const vals = {};
  b.forEach((r, i) => { vals[i === 0 ? "maternidade" : r[0]] = r[1]; });
  const niveis = [
    {k:"municipio", rot:"Município - " + t.municipio, rotRes:"Nº de Residentes no Município - " + t.municipio},
    {k:"regiao_saude", rot:"Região de Saúde - " + t.regiao_saude, rotRes:"Nº Residentes na Região de Saúde - " + t.regiao_saude},
    {k:"macro", rot:"Macrorregião de Saúde - " + t.macro, rotRes:"Nº Residentes na Macrorregião de Saúde - " + t.macro},
    {k:"uf", rot:"UF - " + t.uf, rotRes:"Nº Residentes na UF - " + t.uf}
  ];
  const pctDe = (k, a) => {
    const hosp = vals.maternidade?.[a], niv = vals[k]?.[a];
    if(hosp == null || niv == null) return null;
    if(persp === "res") return hosp > 0 ? niv / hosp * 100 : null;
    return niv > 0 ? hosp / niv * 100 : null;
  };
  const todosAnos = [...ANOS.map((_, i) => i), NT];

  const cabecalho = persp === "res"
    ? (rec === "nv" ? "Total de Nascidos Vivos Ocorridos na Maternidade por Residência" : "Peso ao Nascer <1500g Ocorridos na Maternidade por Residência")
    : (rec === "nv" ? "Total de Nascidos Vivos na Maternidade por Ocorrência" : "Peso ao Nascer <1500g na Maternidade por Ocorrência");
  const titulo = persp === "res"
    ? `${rotRec} ocorridos na maternidade e local de residência, 2019 a 2025 - ${esc(mt.nome)} - ${mt.uf}`
    : `${rec === "nv" ? "Total de nascidos vivos" : "Nascidos vivos <1500g"} ocorridos na maternidade e local de ocorrência, 2019 a 2025 - ${esc(mt.nome)} - ${mt.uf}`;

  let corpo = linhaTab(persp === "res" ? "Nº Ocorridos no " + esc(mt.nome) : esc(mt.nome), vals.maternidade);
  niveis.forEach(n => { if(vals[n.k]) corpo += linhaTab(esc(persp === "res" ? n.rotRes : n.rot), vals[n.k]); });
  niveis.forEach(n => {
    if(!vals[n.k]) return;
    corpo += linhaTab("% " + esc(persp === "res" ? n.rot.replace("Município - ", "Residentes no Município - ").replace("Região de Saúde - ", "Residentes na Região de Saúde - ").replace("Macrorregião de Saúde - ", "Residentes na Macrorregião de Saúde - ").replace("UF - ", "Residentes na UF - ") : n.rot),
      todosAnos.map(a => pctDe(n.k, a)), {pct:true, classe:"pct"});
  });

  return `<div class="card">
      <h3>${titulo}</h3>
      <div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde" data-bloco="${bloco}">
        <thead><tr><th>${cabecalho}</th>${thsAno()}</tr></thead>
        <tbody>${corpo}</tbody></table></div>
      <p class="fonte">${FONTE_SINASC} ${persp === "res"
        ? "Leitura: quanto maior o %, mais as gestantes atendidas moram perto da unidade."
        : "Leitura: participação da maternidade nos nascimentos de cada nível territorial."}</p>
    </div>`;
}

/* ============================================================
   CARD — ficha de cadastro CNES (dados da API oficial de Dados Abertos)
   ============================================================ */
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
  const dataBR = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
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
      <b>Dados baixados da API oficial em:</b> ${dataBR(consulta)} ·
      atualização automática semestral. Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.
    </p>`;
}

/* ============================================================
   CARD — habilitações ativas no CNES (serviço oficial do site)
   ============================================================ */
function cardHabilitacoesHTML(mt){
  const info = typeof CNES_INFO !== "undefined" ? CNES_INFO[mt.cnes] : null;
  const habs = info && Array.isArray(info.habilitacoes) ? info.habilitacoes : null;
  if(!habs) return "";
  // ativa = competência final em aberto (99/9999)
  const ativas = habs.filter(h => h.dtCompFim === "99/9999")
    .sort((a, b) => String(a.coGrupo).localeCompare(String(b.coGrupo)));
  const origem = v => !v ? "Nacional" : (v === "P" ? "Local" : v);
  const consulta = CNES_INFO._atualizado_em;
  const dataBR = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : iso; };
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
      <b>Dados baixados do CNES em:</b> ${dataBR(consulta)} · atualização automática semestral ·
      Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.
    </p>`;
}

/* ============================================================
   CARD — trimestre de início de pré-natal (espelho da apresentação)
   ============================================================ */
function cardTrimestreHTML(mt){
  const b = mt.blocos.trimestre;
  const lin = rot => b.find(r => r[0] === rot)?.[1] || [];
  const prim = lin("Primeiro Trimestre"), tot = lin("Total");
  const ordem = ["Primeiro Trimestre","Segundo Trimestre","Terceiro Trimestre","Ignorado","Total"];
  const linhas = ordem.map(rot => {
    const v = lin(rot);
    const tds = ANOS.map((_, a) => `<td class="mono">${fmtInt(v[a])}</td>`).join("");
    return `<tr class="${rot === "Total" ? "total" : ""}"><td>${rot}</td>${tds}</tr>`;
  }).join("");
  const pct = ANOS.map((_, a) =>
    `<td class="mono">${(prim[a] != null && tot[a]) ? fmtPct(prim[a]/tot[a]*100) : "—"}</td>`).join("");
  return `
    <h3>Pré-natal: trimestre de início</h3>
    <div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde" data-bloco="trimestre">
      <thead><tr><th>Trimestre da 1ª Consulta</th>${thsAno(false)}</tr></thead>
      <tbody>${linhas}<tr class="pct"><td>% Primeiro Trimestre</td>${pct}</tr></tbody>
    </table></div>
    <p class="fonte">Nota: Exclui os registros de nascidos vivos sem nenhuma consulta de pré-natal. ${FONTE_SINASC}</p>`;
}

/* ============================================================
   DOSSIÊ — cards espelhando a apresentação
   ============================================================ */
function tabelaBloco(mt, bloco, opts = {}){
  const b = mt.blocos[bloco];
  if(!b) return "<p class='suave'>Sem dados.</p>";
  const rows = b.map((r, ri) => {
    const rot = opts.rotulos ? (opts.rotulos[r[0]] ?? r[0]) : r[0];
    const tds = r[1].map((v, i) => {
      let cls = "";
      if(opts.metaCol && opts.metas && opts.metas[r[0]] != null && i < NT){
        cls = v != null && v <= opts.metas[r[0]] ? "meta-ok" : "meta-ruim";
      }
      return `<td class="mono ${cls}">${opts.pct ? (v == null ? "—" : fmtPct(v)) : fmtInt(v)}</td>`;
    }).join("");
    const ehTotal = /total/i.test(r[0]);
    return `<tr class="${ehTotal ? "total" : ""}"><td class="rot-click" data-row="${ri}" title="Ver a evolução deste indicador, 2019 a 2025">${esc(rot)}</td>${tds}</tr>`;
  }).join("");
  return `<div class="tab-wrap"><table class="dados" data-bloco="${bloco}"${opts.pct ? ' data-pct="1"' : ""}>
    <thead><tr><th></th>${thsAno()}</tr></thead>
    <tbody>${rows}</tbody></table></div>`;
}
/* cabeçalhos de ano como botões (abre o gráfico do ano) */
function thsAno(comTotal = true){
  let s = ANOS.map((a, i) =>
    `<th class="th-ano" data-a="${i}"><button class="btn-ano" title="Ver gráfico de ${a}">${a}</button></th>`).join("");
  if(comTotal) s += `<th class="th-ano" data-a="${NT}"><button class="btn-ano" title="Ver gráfico do acumulado">Total</button></th>`;
  return s;
}

/* ---------------- modal: gráfico da distribuição de um ano ---------------- */
function abrirGraficoAno(bloco, a, pct, tituloCard){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const b = mt.blocos[bloco];
  if(!b) return;
  // blocos territoriais usam rótulos técnicos — troca pelos nomes reais
  const ehTerr = ["residentes_nv","residentes_p1500","nv_territorio","p1500_territorio"].includes(bloco);
  const t = mt.territorio;
  const rotTerr = [mt.nome, "Município - " + t.municipio, "Região de Saúde - " + t.regiao_saude, t.macro, "UF - " + t.uf];
  const linhas = b.map((r, i) => [ehTerr ? (rotTerr[i] || r[0]) : r[0], r[1]])
    .filter(r => !/total/i.test(r[0]) && r[1][a] != null);
  if(!linhas.length) return;
  const anoRot = a >= NT ? "Acumulado 2019–2025" : ANOS[a];
  const W = 660, rh = 40, mEsq = 200, H = linhas.length * rh + 12;
  const max = Math.max(...linhas.map(r => r[1][a]), pct ? 100 : 1);
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  linhas.forEach((r, i) => {
    const v = r[1][a], y = 8 + i * rh;
    const w = (W - mEsq - 84) * v / max;
    s += `<text x="${mEsq - 8}" y="${y + 17}" text-anchor="end" font-size="12.5" fill="#1D3229">${esc(String(r[0]).length > 26 ? String(r[0]).slice(0,25) + "…" : r[0])}</text>`;
    s += `<rect x="${mEsq}" y="${y + 5}" width="${Math.max(w, 2).toFixed(1)}" height="${rh - 16}" rx="6" fill="#279261"/>`;
    s += `<text x="${(mEsq + Math.max(w, 2) + 8).toFixed(1)}" y="${y + 17}" font-size="12.5" font-weight="800" fill="#1D3229">${pct ? fmtPct(v) : fmtInt(v)}</text>`;
  });
  s += "</svg>";
  document.getElementById("mgTitulo").textContent = (tituloCard || "Distribuição") + " · " + anoRot;
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: SINASC, dados sujeitos a revisão.";
  document.getElementById("mgConteudo").innerHTML = s;
  document.getElementById("modalGrafico").hidden = false;
}
function fecharModalGrafico(){ document.getElementById("modalGrafico").hidden = true; }

/* baixar o grafico do modal como PNG (pedido da Tatiana, 28/08) */
function baixarPngModal(){
  const svg = document.querySelector("#mgConteudo svg");
  if(!svg) return;
  const vb = svg.viewBox.baseVal;
  const escala = 2.5;                      // resolucao boa para colar em documento
  const W = Math.round(vb.width * escala), H = Math.round(vb.height * escala);
  const alto = 64 * (escala / 2);          // faixa branca extra para titulo + subtitulo
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
      .normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Za-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 90) || "grafico";
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
function abrirTendencia(indId){
  const ind = indPorId(indId);
  const mt = MAT.find(m => m.cnes === evoCnes) || MAT[0];
  document.getElementById("mgTitulo").textContent = ind.rot + " · tendência 2019-2025";
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: SINASC, dados sujeitos a revisão.";
  document.getElementById("modalGrafico").hidden = false;
  grafLinhas("mgConteudo",
    [{nome:ind.curto, cor:"#279261", vals:ANOS.map((_, i) => valorUnidade(mt, ind, i))}],
    {pct:ind.tipo !== "num", meta:ind.meta, legenda:false});
}
document.addEventListener("click", e => {
  const tdv = e.target.closest("td.var-click");
  if(tdv){ abrirTendencia(tdv.dataset.ind); return; }
  const tdr = e.target.closest("td.rot-click");
  if(tdr){
    const tituloCard = (tdr.closest(".card")?.querySelector("h3")?.textContent || "").trim();
    if(tdr.dataset.acard){
      abrirTendenciaAssist(tdr.dataset.acard, +tdr.dataset.row, tituloCard);
    } else {
      const tb = tdr.closest("table[data-bloco]");
      if(tb) abrirTendenciaBloco(tb.dataset.bloco, +tdr.dataset.row, tb.dataset.pct === "1", tituloCard);
    }
    return;
  }
  const th = e.target.closest("th.th-ano");
  if(th){
    const ta = th.closest("table[data-assist]");
    if(ta){
      abrirGraficoAnoAssist(ta.dataset.assist, +th.dataset.a,
        (th.closest(".card")?.querySelector("h3")?.textContent || "").trim());
      return;
    }
    const tbl = th.closest("table[data-bloco]");
    if(tbl) abrirGraficoAno(tbl.dataset.bloco, +th.dataset.a, tbl.dataset.pct === "1",
      (th.closest(".card")?.querySelector("h3")?.textContent || "").trim());
    return;
  }
  if(e.target.id === "modalGrafico" || e.target.id === "btnFecharModal") fecharModalGrafico();
});
document.addEventListener("keydown", e => { if(e.key === "Escape") fecharModalGrafico(); });
const FONTE_SINASC = "Fonte: Ministério da Saúde - SINASC · dados sujeitos a revisão.";
const FONTE_SIH = "Fonte: Ministério da Saúde - SIH/SUS · dados sujeitos a revisão.";
const FONTE_MISTA = "Fonte: Ministério da Saúde - SINASC e SIH/SUS · dados sujeitos a revisão.";

/* ============================================================
   INDICADORES ASSISTENCIAIS (planilhas da coordenação, 26/08/2026)
   mt.assistenciais = {origem, secoes:[{titulo, linhas:[{rotulo, fmt, valores[7]}]}]}
   ============================================================ */
const ASSIST_CARDS = [
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
];
const ASSIST_MAP = [
  [/por idade da mãe - (.+)$/,                       "idade",     null],
  [/por raça\/cor da mãe - (.+)$/,                   "raca",      null],
  [/por escolaridade da mãe - (.+)$/,                "escola",    null],
  [/por situação conjugal da mãe - (.+)$/,           "conjugal",  null],
  [/por número de partos anteriores da mãe - (.+)$/, "partos_ant", null],
  [/por número de cesarianas anteriores da mãe - (.+)$/, "ces_ant", null],
  [/por tipo de gestação - (.+)$/,                   "tipo_gest", null],
  [/obstétricas por motivos de internação - (.+)$/,  "motivo",    null],
  [/obstétricas por tipo de saída - (.+)$/,          "saida_obs", null],
  [/^Número de internações obstétricas$/,            "volume",    "Internações obstétricas (nº)"],
  [/aborto legal/,                                   "volume",    "Internações para aborto legal (nº)"],
  [/Centro de Parto Normal/,                         "volume",    "Partos em Centro de Parto Normal (nº)"],
  [/AMIU/,                                           "volume",    "AMIU entre esvaziamentos uterinos (%)"],
  [/parto vaginal com presença de acompanhante/,     "acomp",     "Parto vaginal"],
  [/cesariana com presença de acompanhante/,         "acomp",     "Cesariana"],
  [/resultaram em parto com presença de acompanhante/,"acomp",    "Todas que resultaram em parto"],
  [/aborto com presença de acompanhante/,            "acomp",     "Aborto"],
  [/^Taxa de Ocupação - Obstétricas$/,               "ocup",      "Taxa de ocupação (%)"],
  [/^Tempo médio de permanência - geral$/,           "ocup",      "Permanência média: geral (dias)"],
  [/^Tempo médio de permanência - parto vaginal$/,   "ocup",      "Permanência média: parto vaginal (dias)"],
  [/^Tempo médio de permanência - cesariana$/,       "ocup",      "Permanência média: cesariana (dias)"],
  [/^Tempo médio de permanência - aborto$/,          "ocup",      "Permanência média: aborto (dias)"],
  [/^Tempo médio de permanência - intercorrências/,  "ocup",      "Permanência média: intercorrências (dias)"],
  [/número adequado de consultas para a idade gestacional/, "assistparto", "Pré-natal adequado para a idade gestacional (%)"],
  [/partos vaginais pós-cesariana/,                  "assistparto", "Parto vaginal após cesariana anterior (%)"],
  [/analgesia em internações para partos vaginais/,  "assistparto", "Analgesia no parto vaginal (%)"],
  [/trabalho de parto induzido/,                     "assistparto", "Trabalho de parto induzido (%)"],
  [/neonatais por tipo de saída - (.+)$/,            "saida_neo", null],
  [/^Número de internações neonatais$/,              "neo",       "Internações neonatais (nº)"],
  [/internações neonatais em UTI neonatal/,          "neo",       "Em UTI neonatal (%)"],
  [/^Taxa de Ocupação - UTI neonatal$/,              "neo",       "Taxa de ocupação da UTI (%)"],
  [/^Tempo médio de permanência - UTI neonatal$/,    "neo",       "Permanência média na UTI (dias)"],
  [/morbidade materna grave por grupo de causa - (.+)$/, "mmg_causa", null],
  [/^Porcentagem de casos de morbidade materna grave$/, "mmg",    "Casos de MMG entre as internações obstétricas (%)"],
  [/morbidade materna grave com internação em UTI/,  "mmg",       "Com internação em UTI (%)"],
  [/morbidade materna grave com tempo de permanência prolongado/, "mmg", "Com permanência acima de 7 dias pós-parto (%)"],
  [/morbidade materna grave com transfusão sanguínea/, "mmg",     "Com transfusão sanguínea (%)"],
  [/morbidade materna grave com realização de histerectomia/, "mmg", "Com histerectomia (%)"],
  [/condições potencialmente ameaçadoras/,           "morb",      "NV com condições potencialmente ameaçadoras à vida (%)"],
  [/neonatais por grupos de causas - (.+)$/,         "neo_causas", null],
];
function fmtAssist(v, fmt){
  if(v == null) return "—";
  if(fmt === "pct") return fmtPct(v);
  if(fmt === "dias") return v.toLocaleString("pt-BR", {minimumFractionDigits:1, maximumFractionDigits:1});
  return fmtInt(v);
}
function gruposAssist(mt){
  if(!mt.assistenciais) return null;
  const grupos = {};
  mt.assistenciais.secoes.forEach(s => s.linhas.forEach(l => {
    for(const [re, id, rotFixo] of ASSIST_MAP){
      const m = l.rotulo.match(re);
      if(m){ (grupos[id] = grupos[id] || []).push({rot: rotFixo || m[1], fmt: l.fmt, valores: l.valores}); return; }
    }
    (grupos.outros = grupos.outros || []).push({rot: l.rotulo, fmt: l.fmt, valores: l.valores});
  }));
  return grupos;
}
function tabelaAssist(linhas, idCard){
  const rows = linhas.map((l, ri) =>
    `<tr><td${idCard ? ` class="rot-click" data-acard="${idCard}" data-row="${ri}" title="Ver a evolução deste indicador, 2019 a 2025"` : ""}>${esc(l.rot)}</td>${l.valores.map(v => `<td class="mono">${fmtAssist(v, l.fmt)}</td>`).join("")}</tr>`
  ).join("");
  // ano clicavel (grafico do ano) so quando todas as linhas tem o mesmo formato —
  // nos cards mistos (nº + % + dias) a barra compararia grandezas diferentes
  const uniforme = idCard && linhas.every(l => l.fmt === linhas[0].fmt);
  const ths = uniforme ? thsAno(false) : ANOS.map(a => `<th>${a}</th>`).join("");
  const attr = uniforme ? ` data-assist="${idCard}"` : "";
  return `<div class="tab-wrap"><table class="dados"${attr}><thead><tr><th></th>${ths}</tr></thead><tbody>${rows}</tbody></table></div>`;
}
function assistenciaisHTML(mt){
  const sep = `<div class="full"><p class="eyebrow titulo-linha" style="margin:1rem 0 .2rem">Perfil das mães e assistência hospitalar (SINASC · SIH)</p></div>`;
  const grupos = gruposAssist(mt);
  if(!grupos){
    return sep + `<div class="card full"><p class="suave">Indicadores assistenciais ainda não disponíveis para esta unidade nas planilhas da coordenação.</p></div>`;
  }
  let html = sep;
  ASSIST_CARDS.forEach(c => {
    if(!grupos[c.id]) return;
    const fonte = c.fonte === "SIH" ? FONTE_SIH : c.fonte === "MISTA" ? FONTE_MISTA : FONTE_SINASC;
    html += `<div class="card"><h3>${esc(c.h)}</h3>${tabelaAssist(grupos[c.id], c.id)}<p class="fonte">${fonte}</p></div>`;
  });
  if(grupos.outros)
    html += `<div class="card"><h3>Outros indicadores</h3>${tabelaAssist(grupos.outros, null)}<p class="fonte">${FONTE_SIH}</p></div>`;
  return html;
}
/* clique no INDICADOR (rótulo da linha): evolução 2019-2025 (pedido da Tatiana, 28/08) */
const METAS_ROBSON = {"Grupo 1": 10, "Grupo 2": 35, "Grupo 3": 3, "Grupo 4": 15};
function abrirTendenciaBloco(bloco, ri, pctTabela, tituloCard){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const b = mt.blocos[bloco];
  if(!b || !b[ri]) return;
  const ehTerr = ["residentes_nv", "residentes_p1500", "nv_territorio", "p1500_territorio"].includes(bloco);
  const t = mt.territorio;
  const rotTerr = [mt.nome, "Município - " + t.municipio, "Região de Saúde - " + t.regiao_saude, t.macro, "UF - " + t.uf];
  let rot = String(b[ri][0]);
  if(ehTerr){
    const base = rotTerr[ri % 5] || rot;
    rot = (ri >= 5 ? "% " : "") + base;
  }
  const vals = b[ri][1].slice(0, NT);
  const pct = pctTabela || rot.trim().startsWith("%");
  const meta = bloco === "robson_taxa" ? METAS_ROBSON[b[ri][0]] : null;
  document.getElementById("mgTitulo").textContent =
    (tituloCard ? tituloCard + " · " : "") + rot + " · evolução 2019-2025";
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: SINASC, dados sujeitos a revisão.";
  document.getElementById("modalGrafico").hidden = false;
  grafLinhas("mgConteudo", [{nome: rot, cor: "#279261", vals}], {pct, meta: meta ?? undefined, legenda: false});
}
function abrirTendenciaAssist(idCard, ri, tituloCard){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const grupos = gruposAssist(mt);
  const l = grupos && grupos[idCard] && grupos[idCard][ri];
  if(!l) return;
  const card = ASSIST_CARDS.find(c => c.id === idCard);
  const fonte = card && card.fonte === "SIH" ? "SIH/SUS"
              : card && card.fonte === "MISTA" ? "SINASC e SIH/SUS" : "SINASC";
  const opts = {legenda: false};
  if(l.fmt === "pct") opts.pct = true;
  if(l.fmt === "dias") opts.fmt = v => v.toLocaleString("pt-BR", {minimumFractionDigits: 1, maximumFractionDigits: 1});
  document.getElementById("mgTitulo").textContent =
    (tituloCard ? tituloCard + " · " : "") + l.rot + " · evolução 2019-2025";
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: " + fonte + ", dados sujeitos a revisão.";
  document.getElementById("modalGrafico").hidden = false;
  grafLinhas("mgConteudo", [{nome: l.rot, cor: "#279261", vals: l.valores.slice(0, NT)}], opts);
}

function abrirGraficoAnoAssist(idCard, a, tituloCard){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const grupos = gruposAssist(mt);
  if(!grupos || !grupos[idCard]) return;
  const card = ASSIST_CARDS.find(c => c.id === idCard);
  const linhas = grupos[idCard].filter(l => l.valores[a] != null);
  if(!linhas.length || a >= NT) return;
  const fmt = linhas[0].fmt, pct = fmt === "pct";
  const W = 660, rh = 40, mEsq = 200, H = linhas.length * rh + 12;
  const max = Math.max(...linhas.map(l => l.valores[a]), pct ? 100 : 1);
  let s = `<svg class="graf" viewBox="0 0 ${W} ${H}">`;
  linhas.forEach((l, i) => {
    const v = l.valores[a], y = 8 + i * rh;
    const w = (W - mEsq - 84) * v / max;
    s += `<text x="${mEsq - 8}" y="${y + 17}" text-anchor="end" font-size="12.5" fill="#1D3229">${esc(String(l.rot).length > 26 ? String(l.rot).slice(0,25) + "…" : l.rot)}</text>`;
    s += `<rect x="${mEsq}" y="${y + 5}" width="${Math.max(w, 2).toFixed(1)}" height="${rh - 16}" rx="6" fill="#279261"/>`;
    s += `<text x="${(mEsq + Math.max(w, 2) + 8).toFixed(1)}" y="${y + 17}" font-size="12.5" font-weight="800" fill="#1D3229">${fmtAssist(v, fmt)}</text>`;
  });
  s += "</svg>";
  const fonte = card && card.fonte === "SIH" ? "SIH/SUS" : "SINASC";
  document.getElementById("mgTitulo").textContent = (tituloCard || "Distribuição") + " · " + ANOS[a];
  document.getElementById("mgSub").textContent = mt.nome + " - " + mt.uf + " · Fonte: " + fonte + ", dados sujeitos a revisão.";
  document.getElementById("mgConteudo").innerHTML = s;
  document.getElementById("modalGrafico").hidden = false;
}

function abrirDossie(cnes){
  estado.cnes = cnes;
  document.getElementById("selUnidade").value = cnes;
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

/* NV do Brasil por ano: soma dos totais das 27 UFs (cada maternidade carrega o total da sua UF) */
let _nvBrasil = null;
function nvBrasilAno(a){
  if(!_nvBrasil){
    const porUF = {};
    MAT.forEach(m => { porUF[m.uf] = m.blocos.nv_territorio[4][1]; });
    const series = Object.values(porUF);
    _nvBrasil = series[0].map((_, i) => series.reduce((s, v) => s + (v[i] || 0), 0));
  }
  return _nvBrasil[a] || null;
}

function desenhaDossie(){
  const mt = MAT.find(m => m.cnes === estado.cnes) || MAT[0];
  const el = document.getElementById("dossieConteudo");
  const t = mt.territorio;
  el.innerHTML = `
  <div class="dossie-topo">
    <div>
      <p class="eyebrow" style="color:#A5D6A7">${esc(t.uf)} · ${esc(mt.regiao)}</p>
      <h2 style="color:#FFF">${esc(mt.nome)}</h2>
      <div class="meta">
        <span>CNES ${mt.cnes}</span><span>${esc(t.municipio)} · ${mt.uf}</span>
        <span>Região de saúde: ${esc(t.regiao_saude)}</span><span>${esc(t.macro)}</span>
        <span>${esc(rotuloConjuntos(mt))}</span>
        ${mt.partosAIH ? `<span>${fmtInt(mt.partosAIH)} partos/ano (SIH 2025)</span>` : ""}
      </div>
    </div>
    <div style="text-align:right">
      <div class="num-grande mono" style="color:#FFF">${fmtInt(valorUnidade(mt, indPorId("nv"), NT-1))}</div>
      <div style="font-size:.75rem; letter-spacing:.1em; text-transform:uppercase; color:#A5D6A7; font-weight:700">Nascidos vivos ${ANOS[NT-1]}</div>
      ${(() => {
        const nvU = mt.blocos.nv_territorio[0][1][NT-1];
        const nvUF = mt.blocos.nv_territorio[4][1][NT-1];
        const nvBR = nvBrasilAno(NT-1);
        if(nvU == null || !nvUF || !nvBR) return "";
        const pUF = fmtPct(100 * nvU / nvUF);
        const pBR = (100 * nvU / nvBR).toLocaleString("pt-BR", {minimumFractionDigits:2, maximumFractionDigits:2}) + "%";
        return `<div style="font-size:.8rem; color:#D7EBDD; margin-top:.35rem">representa <b>${pUF}</b> dos nascimentos de ${mt.uf} e <b>${pBR}</b> do Brasil</div>`;
      })()}
    </div>
  </div>
  <div class="dossie-cards">
    <div class="card full">${cardCnesHTML(mt)}</div>
    ${cardHabilitacoesHTML(mt) ? `<div class="card full">${cardHabilitacoesHTML(mt)}</div>` : ""}
    <div class="card full"><h3>Nascidos vivos ocorridos, ${ANOS[0]} a ${ANOS[NT-1]}</h3><div id="dNV"></div><p class="fonte">${FONTE_SINASC}</p></div>
    <div class="full">
      <p class="eyebrow titulo-linha" style="margin:.4rem 0 .2rem">Abrangência territorial: da região à unidade</p>
      <div class="filtros-grid filtros-topo" style="margin-bottom:.9rem">
        <label class="filtro"><span>Recorte</span>
          <select id="selRecorteDos">
            <option value="nv">Todos os nascidos vivos</option>
            <option value="p1500">Menores de 1500 g</option>
          </select></label>
        <label class="filtro"><span>Perspectiva</span>
          <select id="selPerspDos">
            <option value="res">Local de residência</option>
            <option value="oco">Local de ocorrência</option>
            <option value="origem">Origem das gestantes (região e UF)</option>
          </select></label>
      </div>
      <div id="dTerr"></div>
    </div>
    <div class="card"><h3>Pré-natal: número de consultas</h3>${tabelaBloco(mt, "prenatal")}<p class="fonte">${FONTE_SINASC}</p></div>
    <div class="card">${cardTrimestreHTML(mt)}</div>
    <div class="card"><h3>Peso ao nascer</h3>${tabelaBloco(mt, "peso")}<p class="fonte">${FONTE_SINASC}</p></div>
    <div class="card"><h3>Idade gestacional</h3>${tabelaBloco(mt, "gestacao")}<p class="fonte">${FONTE_SINASC}</p></div>
    <div class="card"><h3>Via de nascimento</h3>${tabelaBloco(mt, "via")}<p class="fonte">${FONTE_SINASC}</p></div>
    <div class="card"><h3>Assistência ao parto vaginal</h3>${tabelaBloco(mt, "assistencia")}<p class="fonte">${FONTE_SINASC} Somente partos vaginais. Meta: ≥50% por enfermeira/obstetriz.</p></div>
    <div class="card"><h3>Apgar no 5º minuto</h3>${tabelaBloco(mt, "apgar")}<p class="fonte">${FONTE_SINASC} Somente ≥2500 g e sem anomalias congênitas.</p></div>
    <div class="card"><h3>Grupos de Robson: nascidos vivos</h3>${tabelaBloco(mt, "robson_n")}<p class="fonte">${FONTE_SINASC}</p></div>
    <div class="card full"><h3>Taxa de cesárea segundo grupo de Robson</h3>
      ${tabelaBloco(mt, "robson_taxa", {pct:true, metaCol:true, metas:{"Grupo 1":10,"Grupo 2":35,"Grupo 3":3,"Grupo 4":15}})}
      <p class="fonte">${FONTE_SINASC} Metas: G1 ≤10% · G2 ≤35% · G3 ≤3% · G4 ≤15% (verde = na meta, vermelho = acima).</p></div>
    ${assistenciaisHTML(mt)}
  </div>`;

  grafBarras("dNV", ANOS, ANOS.map((_, a) => mt.blocos.nv_territorio[0][1][a]));

  // bloco de abrangência territorial dentro do dossiê
  const rTer = () => { document.getElementById("dTerr").innerHTML = montaTerritorioHTML(mt, dosRec, dosPersp); };
  const sRD = document.getElementById("selRecorteDos");
  sRD.value = dosRec;
  sRD.addEventListener("change", () => { dosRec = sRD.value; rTer(); });
  const sPD = document.getElementById("selPerspDos");
  sPD.value = dosPersp;
  sPD.addEventListener("change", () => { dosPersp = sPD.value; rTer(); });
  rTer();
}

/* ============================================================
   COMPARADOR
   ============================================================ */
const CORES_COMP = ["#279261","#0A213D","#D68910","#C0392B"];
const COR_MEDIA = "#5E716A";
const MEDIA_ROT = {estrategica:"Estratégicas", ebserh:"EBSERH", qualineo:"QUALINEO"};
let anoComp = NT - 1;
let grupoComp = "estrategica";   // grupo escolhido no filtro do comparador — só se compara dentro dele
/* média do grupo: pseudo-coluna "media:<grupo>" — a unidade é comparada com o próprio grupo */
function unidadesDoGrupo(g){ return MAT.filter(m => (m.conjuntos || ["estrategica"]).includes(g)); }
function entradaComp(c){
  if(String(c).startsWith("media:")){
    const g = String(c).slice(6), lst = unidadesDoGrupo(g);
    return {media:true, cnes:c, grupo:g, lista:lst, nome:"Média · " + (MEDIA_ROT[g] || g), sub:lst.length + " unidades · agregado"};
  }
  return MAT.find(m => m.cnes === c);
}
/* valor de uma coluna do comparador: unidade real ou média agregada do grupo */
function valorEntrada(e, ind, a){
  if(!e.media) return valorUnidade(e, ind, a);
  if(ind.tipo === "num"){   // volume: média por unidade com dado no ano
    const com = e.lista.map(m => ind.num(m, a)).filter(v => v != null);
    return com.length ? com.reduce((s, v) => s + v, 0) / com.length : null;
  }
  return agrega(e.lista, ind, a);   // taxa agregada: soma num ÷ soma den (Robson ponderado pelo nº de partos)
}
function coresComp(lst){
  let k = 0;
  return lst.map(e => e && e.media ? COR_MEDIA : CORES_COMP[k++ % CORES_COMP.length]);
}
function desenhaChipsComp(){
  const el = document.getElementById("compChips");
  const lst = estado.comparar.map(entradaComp);
  const cores = coresComp(lst);
  el.innerHTML = lst.map((m, i) => {
    return `<span class="chip" style="border-color:${cores[i]}; color:${cores[i]}">
      ${esc(m.nome.length > 34 ? m.nome.slice(0,33) + "…" : m.nome)}
      <button aria-label="remover" onclick="removeComp('${m.cnes}')">✕</button></span>`;
  }).join("");
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
  const rotAno = a >= NT ? "Acumulado 2019-2025" : ANOS[a];
  const linhas = INDS.map(ind => {
    const vals = lst.map(m => valorEntrada(m, ind, a));
    const ok = vals.filter((v, j) => v != null && !lst[j].media);
    let melhor = null;
    if(ok.length && ind.sentido !== "neutro"){
      melhor = ind.sentido === "menor" ? Math.min(...ok) : Math.max(...ok);
    }
    const tds = vals.map((v, j) => {
      const destaque = melhor != null && !lst[j].media && v === melhor ? "melhor" : "";
      return `<td class="mono ${destaque}">${ind.tipo === "num" ? fmtInt(v) : fmtPct(v)}</td>`;
    }).join("");
    return `<tr><td>${esc(ind.rot)}${ind.meta != null ? ` <span class="suave">(meta ${ind.sentido === "menor" ? "≤" : "≥"}${ind.meta}%)</span>` : ""}</td>${tds}</tr>`;
  }).join("");
  el.innerHTML = `
  <div class="card comp-grid">
    <h3>Indicadores · ${rotAno} <span class="chip">melhor posição destacada</span></h3>
    <div class="tab-wrap"><table class="comp">
      <thead><tr><th>Indicador</th>${lst.map((m, i) => `<th style="color:${cores[i]}">${esc(m.nome.length > 26 ? m.nome.slice(0,25) + "…" : m.nome)}<br><span class="suave" style="font-weight:400">${m.media ? m.sub : m.uf}</span></th>`).join("")}</tr></thead>
      <tbody>${linhas}</tbody></table></div>
    <p class="fonte">“Melhor” considera o sentido de cada indicador (menor cesárea é melhor; mais pré-natal é melhor). Indicadores de perfil (peso, prematuridade) não têm destaque.${temMedia ? " A média do grupo é a taxa agregada das unidades do grupo — soma dos numeradores ÷ soma dos denominadores (Robson ponderado pelo nº de partos; no volume de nascidos vivos, média por unidade) — e não participa do destaque. Detalhes na Metodologia." : ""}</p>
  </div>
  <div class="grid-2" style="margin-top:1.1rem">
    <div class="card"><h3 style="display:flex; justify-content:space-between; align-items:center; gap:.6rem">Série comparada <select id="selIndComp"></select></h3><div id="grafComp"></div></div>
    <div class="card"><h3>Nascidos vivos · ${rotAno}</h3><div id="grafCompNV"></div></div>
  </div>`;
  const sel = document.getElementById("selIndComp");
  sel.innerHTML = INDS.filter(i => i.tipo !== "num").map(i => `<option value="${i.id}">${esc(i.curto)}</option>`).join("");
  sel.value = "ces";
  sel.addEventListener("change", desenhaGrafComp);
  desenhaGrafComp();
  grafRanking("grafCompNV", lst.map((m, i) => ({nome:m.nome, v:valorEntrada(m, indPorId("nv"), a), cor:cores[i]})), {});
  function desenhaGrafComp(){
    const ind = indPorId(sel.value);
    grafLinhas("grafComp",
      lst.map((m, i) => ({nome:m.nome, cor:cores[i], vals:ANOS.map((_, k) => valorEntrada(m, ind, k)), dash:m.media})),
      {pct:true, meta:ind.meta, legenda:true});
  }
}

/* ============================================================
   EVOLUÇÃO — a mesma unidade comparada entre anos
   ============================================================ */
let evoCnes = MAT[0].cnes;
let anosEvoSel = new Set([NT - 2, NT - 1]);   // seleção inicial: 2024 e 2025

function sparkline(vals, sentido){
  const ok = vals.map((v, i) => [i, v]).filter(p => p[1] != null);
  if(ok.length < 2) return "";
  const W = 110, H = 26, m = 3;
  const xs = ok.map(p => p[0]), ys = ok.map(p => p[1]);
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
  const linhas = INDS.map(ind => {
    const serie = ANOS.map((_, i) => valorUnidade(mt, ind, i));
    const tds = anos.map(a => `<td class="mono">${ind.tipo === "num" ? fmtInt(serie[a]) : fmtPct(serie[a])}</td>`).join("");
    const v0 = serie[a0], v1 = serie[a1];
    let varTxt = "—", cls = "var-neutra";
    if(v0 != null && v1 != null){
      if(ind.tipo === "num"){
        const d = v0 ? (v1 - v0) / v0 * 100 : null;
        varTxt = d == null ? "—" : (d >= 0 ? "▲ +" : "▼ ") + d.toLocaleString("pt-BR", {maximumFractionDigits:1}) + "%";
      } else {
        const d = v1 - v0;
        varTxt = (d >= 0 ? "▲ +" : "▼ ") + d.toLocaleString("pt-BR", {maximumFractionDigits:1}) + " p.p.";
        if(ind.sentido === "maior") cls = d >= 0 ? "var-ok" : "var-ruim";
        if(ind.sentido === "menor") cls = d <= 0 ? "var-ok" : "var-ruim";
      }
    }
    return `<tr><td>${esc(ind.rot)}${ind.meta != null ? ` <span class="suave">(meta ${ind.sentido === "menor" ? "≤" : "≥"}${ind.meta}%)</span>` : ""}</td>
      ${tds}<td class="${cls} var-click" data-ind="${ind.id}" title="Ver o gráfico da tendência" style="white-space:nowrap">${varTxt}</td><td>${sparkline(serie, ind.sentido)}</td></tr>`;
  }).join("");
  el.innerHTML = `
  <div class="card comp-grid">
    <h3>${esc(mt.nome)} · ${mt.uf} <span class="chip">variação de ${ANOS[a0]} a ${ANOS[a1]}</span></h3>
    <div class="tab-wrap"><table class="comp">
      <thead><tr><th>Indicador</th>${anos.map(a => `<th>${ANOS[a]}</th>`).join("")}<th>Variação</th><th>Tendência 2019-2025</th></tr></thead>
      <tbody>${linhas}</tbody></table></div>
    <p class="fonte">Variação em pontos percentuais entre o primeiro e o último ano marcados (nascidos vivos: variação relativa em %). Verde = evoluiu no sentido desejado do indicador; vermelho = piorou; sem cor = indicador de perfil, sem julgamento. A tendência mostra a série completa de 2019 a 2025. ${FONTE_SINASC}</p>
  </div>`;
}

/* ============================================================
   PÁGINA DE METODOLOGIA (como as fichas do painel de partos)
   ============================================================ */
const CALCULOS = {
  nv:{n:"Soma dos nascidos vivos ocorridos na unidade no ano (contagem simples).", d:"Não se aplica: é um número absoluto, não uma taxa."},
  shareUF:{n:"Nascidos vivos ocorridos nas maternidades estratégicas da seleção.", d:"Nascidos vivos totais da UF (com mais de uma unidade na seleção, o total da UF é contado uma única vez)."},
  resRS:{n:"Nascidos vivos da unidade cuja mãe reside na região de saúde da própria unidade.", d:"Nascidos vivos ocorridos na unidade."},
  pn7:{n:"Nascidos vivos cujas mães fizeram 7 ou mais consultas de pré-natal.", d:"Nascidos vivos totais, excluídos os registros com número de consultas ignorado."},
  tri1:{n:"Nascidos vivos com pré-natal iniciado no primeiro trimestre.", d:"Nascidos vivos com ao menos uma consulta de pré-natal, excluídos os registros com trimestre ignorado.",
    obs:"Atenção: a linha \"% Primeiro Trimestre\" da tabela do dossiê segue a apresentação e usa denominador diferente (inclui os ignorados) — veja a ficha própria abaixo."},
  ces:{n:"Partos cesáreos.", d:"Nascidos vivos totais, excluídos os registros com via de nascimento ignorada."},
  enf:{n:"Partos vaginais assistidos por enfermeira ou obstetriz.", d:"Partos vaginais, excluídos os registros com profissional ignorado."},
  p2500:{n:"Nascidos vivos com menos de 2500 g.", d:"Nascidos vivos com peso ao nascer informado."},
  p1500:{n:"Nascidos vivos com menos de 1500 g.", d:"Nascidos vivos com peso ao nascer informado."},
  prem:{n:"Nascidos vivos com menos de 37 semanas de gestação.", d:"Nascidos vivos com idade gestacional informada."},
  asf:{n:"Nascidos vivos com Apgar de 0 a 6 no 5º minuto.", d:"Nascidos vivos com Apgar informado, considerando somente os com 2500 g ou mais e sem anomalias congênitas (os demais não entram nem no numerador nem no denominador)."},
  rg1:{n:"Partos cesáreos do grupo 1 de Robson.", d:"Nascidos vivos do grupo 1 de Robson."},
  rg2:{n:"Partos cesáreos do grupo 2 de Robson.", d:"Nascidos vivos do grupo 2 de Robson."},
  rg3:{n:"Partos cesáreos do grupo 3 de Robson.", d:"Nascidos vivos do grupo 3 de Robson."},
  rg4:{n:"Partos cesáreos do grupo 4 de Robson.", d:"Nascidos vivos do grupo 4 de Robson."},
  rg5:{n:"Partos cesáreos do grupo 5 de Robson.", d:"Nascidos vivos do grupo 5 de Robson."}
};

/* cálculos que não são indicadores do mapa, mas aparecem no painel */
const FICHAS_EXTRAS = [
  {rot:"% Residentes no município / região de saúde / macro / UF (dossiê, perspectiva Local de residência)",
   desc:"Dos bebês que nascem na maternidade, quantos têm mãe moradora de cada nível territorial da unidade.",
   n:"Nascidos vivos ocorridos na maternidade cuja mãe reside no nível territorial (município, região de saúde, macro ou UF da unidade).",
   d:"Nascidos vivos ocorridos na maternidade.",
   fonte:"Ministério da Saúde - SINASC, 2019 a 2025. Também calculado para os nascidos vivos <1500 g."},
  {rot:"% Município / região de saúde / macro / UF (dossiê, perspectiva Local de ocorrência)",
   desc:"De todos os nascimentos que acontecem em cada território, quantos ocorrem dentro da maternidade.",
   n:"Nascidos vivos ocorridos na maternidade.",
   d:"Nascidos vivos ocorridos no território (município, região de saúde, macro ou UF).",
   fonte:"Ministério da Saúde - SINASC, 2019 a 2025. Também calculado para os nascidos vivos <1500 g."},
  {rot:"% Primeiro Trimestre (tabela de trimestre do dossiê)",
   desc:"Linha percentual da tabela de trimestre de início de pré-natal, no formato da apresentação.",
   n:"Nascidos vivos com pré-natal iniciado no primeiro trimestre.",
   d:"Total de nascidos vivos com ao menos uma consulta, incluindo os registros com trimestre ignorado (por isso pode diferir do indicador \"% com pré-natal iniciado no 1º trimestre\" dos mapas, que exclui os ignorados).",
   fonte:"Ministério da Saúde - SINASC, 2019 a 2025."},
  {rot:"% de NV ocorridos no território de residência (Comparativo entre anos)",
   desc:"Retenção territorial de nascimentos: das mães residentes em cada território, quantas pariram dentro do próprio território. Considera todos os nascimentos, não apenas maternidades estratégicas. Nos níveis macrorregião e UF, o percentual agrega os nascidos na própria região de saúde (recorte todos) ou na própria macro (recorte <1500 g), seguindo a semântica das planilhas oficiais.",
   n:"Nascidos vivos de mães residentes que ocorreram no próprio território de residência (nível região de saúde; agregado nos níveis macro e UF).",
   d:"Nascidos vivos de mães residentes no território, independentemente de onde ocorreu o parto.",
   fonte:"Ministério da Saúde - SINASC, microdados públicos (OpenDataSUS), série 2019-2025, com 2025 preliminar. Ambos os recortes (todos e <1500 g) por região de saúde, macro e UF. Extração própria validada contra as planilhas NV por Região e NV por Macro (2019 e 2024): diferenças médias de 0,1 a 0,4 ponto percentual."},
  {rot:"Participação da unidade nos nascimentos da UF e do Brasil (topo do dossiê)",
   desc:"Peso relativo da maternidade no total de nascimentos do seu estado e do país, no ano mais recente.",
   n:"Nascidos vivos ocorridos na unidade em 2025.",
   d:"Nascidos vivos totais da UF (SINASC) ou do Brasil — este obtido pela soma dos totais das 27 UFs.",
   fonte:"Ministério da Saúde - SINASC, 2025."},
  {rot:"Média do grupo (comparador)",
   desc:"Coluna de referência do comparador de unidades: a maternidade é comparada com a média do seu próprio grupo — maternidades estratégicas, unidades EBSERH ou QUALINEO 2026/2027. Nos indicadores percentuais a média é a taxa agregada do grupo (soma dos numeradores dividida pela soma dos denominadores de todas as unidades do grupo, com as mesmas exclusões de ignorados de cada indicador), a mesma regra de agregação usada nos mapas e no panorama; nos grupos de Robson, a taxa agregada é ponderada pelo número de partos de cada unidade no grupo. No volume de nascidos vivos, mostra-se a média por unidade (total do grupo dividido pelo número de unidades com dado no ano). Unidades que pertencem a mais de um grupo contam na média de todos os grupos a que pertencem. A média do grupo não participa do destaque de melhor posição.",
   n:"Soma dos numeradores do indicador nas unidades do grupo com dado no ano.",
   d:"Soma dos denominadores correspondentes nas mesmas unidades.",
   fonte:"Ministério da Saúde - SINASC, 2019 a 2025."}
];

let _metodoPronta = false;
function desenhaMetodologia(){
  if(_metodoPronta) return;
  _metodoPronta = true;
  const fontes = [
    ["SINASC", "Sistema de Informações sobre Nascidos Vivos, Ministério da Saúde. Base de todos os indicadores de nascimento: série 2019 a 2025, extraída por estabelecimento (CNES) e por território de residência e ocorrência. Dados sujeitos a revisão."],
    ["CNES", "Cadastro Nacional dos Estabelecimentos de Saúde do Brasil. A ficha de cadastro vem da API oficial de Dados Abertos do Ministério da Saúde e as habilitações ativas do serviço do próprio site do CNES, com atualização automática semestral (1º de junho e 1º de dezembro)."],
    ["SIH/AIH", "Sistema de Informações Hospitalares do SUS. Origem do volume anual de partos por estabelecimento e dos pontos de contexto do mapa de unidades (estabelecimentos com 480 ou mais partos/ano, produção de 2025)."],
    ["Malhas territoriais", "Limites de estados, macrorregiões de saúde (121) e regiões de saúde (439) compactados em SVG a partir das malhas oficiais utilizadas nos projetos de regionalização."],
    ["Comparativo entre anos", "Microdados públicos do SINASC (OpenDataSUS), série 2019-2025, processados por território de residência e ocorrência: todos os nascidos vivos e <1500 g, por região de saúde, macro e UF. Nos níveis macro e UF, o percentual agrega os nascidos na própria região de saúde (todos) ou na própria macro (<1500 g), como nas planilhas oficiais. 2025 preliminar. Extração validada contra as planilhas NV por Região e NV por Macro (2019 e 2024)."],
    ["Localização das unidades", "Coordenadas geográficas (latitude e longitude) de cada estabelecimento, georreferenciadas a partir do cadastro CNES."]
  ];
  const fichaHTML = (rot, desc, n, d, meta, obs, fonte) => `
    <div class="card">
      <h3>${esc(rot)}</h3>
      <p class="suave" style="font-size:.88rem; margin-top:.4rem">${esc(desc)}</p>
      <p style="font-size:.88rem; margin-top:.5rem"><b>Numerador:</b> ${esc(n)}</p>
      <p style="font-size:.88rem"><b>Denominador:</b> ${esc(d)}</p>
      ${meta ? `<p style="font-size:.88rem"><b>Meta:</b> ${meta}</p>` : ""}
      ${obs ? `<p style="font-size:.84rem; margin-top:.35rem; color:var(--ambar)"><b>Observação:</b> ${esc(obs)}</p>` : ""}
      <p class="fonte">Fonte: ${esc(fonte)} · dados sujeitos a revisão.</p>
    </div>`;
  const fichas = INDS.map(ind => {
    const c = CALCULOS[ind.id] || {n:"—", d:"—"};
    const meta = ind.meta != null ? `${ind.sentido === "menor" ? "≤" : "≥"} ${ind.meta}%` : null;
    return fichaHTML(ind.rot, ind.desc, c.n, c.d, meta, c.obs, "Ministério da Saúde - SINASC, 2019 a 2025");
  }).join("");
  const extras = FICHAS_EXTRAS.map(f => fichaHTML(f.rot, f.desc, f.n, f.d, null, null, f.fonte)).join("");
  document.getElementById("metodoConteudo").innerHTML = `
    <div class="sec-head" style="margin-top:.7rem">
      <p class="eyebrow">Metodologia</p>
      <h2>De onde vem cada número</h2>
      <p style="max-width:none">As bases oficiais utilizadas no painel e, abaixo, a ficha de cálculo de cada indicador.</p>
    </div>
    <div class="grid-3">
      ${fontes.map(f => `<div class="card"><h3>${f[0]}</h3><p class="suave" style="font-size:.88rem; margin-top:.5rem">${f[1]}</p></div>`).join("")}
    </div>
    <h3 class="titulo-linha" style="margin:1.6rem 0 .7rem">Fichas dos indicadores das maternidades estratégicas</h3>
    <div class="grid-2">${fichas}</div>
    <h3 class="titulo-linha" style="margin:1.6rem 0 .7rem">Demais cálculos do painel</h3>
    <div class="grid-2">${extras}</div>
    <div class="card" style="margin-top:1.4rem">
      <h3>Agregações e faixas de cores</h3>
      <p class="suave" style="font-size:.9rem; margin-top:.5rem">
        Ao agregar territórios, somam-se numeradores e denominadores das maternidades da seleção; a taxa de cesárea por grupo de Robson é ponderada pelo número de nascidos vivos do grupo em cada unidade.
        Nos mapas, os indicadores usam quintis calculados sobre os territórios visíveis no recorte atual, em escala de verdes (mais escuro = maior), com as faixas de valores exibidas na legenda.
        A taxa de cesárea usa faixas fixas ancoradas na meta de 35% (azul = na meta ou abaixo; vermelho = acima).
        A retenção no território de residência usa as faixas fixas &gt;95 · 90-95 · 75-89 · 50-74 · &lt;50.
        Territórios em cinza não possuem maternidade estratégica ou não têm dados na planilha.
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
/* seletor com um optgroup por grupo (comparador); a UF entra no rótulo de cada opção */
const GRUPO_ROT_PLURAL = {estrategica:"Maternidades estratégicas", ebserh:"Unidades EBSERH", qualineo:"QUALINEO 2026/2027"};
function opcaoUnidadesPorGrupo(sel){
  sel.innerHTML = ORDEM_CONJ.map(g => {
    const lst = MAT.filter(m => conjuntoPrincipal(m) === g)
      .sort((a, b) => a.uf.localeCompare(b.uf) || a.nome.localeCompare(b.nome));
    if(!lst.length) return "";
    return `<optgroup label="${GRUPO_ROT_PLURAL[g]} (${lst.length})">` +
      lst.map(m => `<option value="${m.cnes}">${m.uf} · ${esc(m.nome)}</option>`).join("") +
      `</optgroup>`;
  }).join("");
}
function sincronizaSelecao(){
  desenhaPainelSelecao();
}
function inicia(){
  // hero
  document.getElementById("statMats").textContent = MAT.length;
  document.getElementById("statUFs").textContent = new Set(MAT.map(m => m.uf)).size;
  const nvTotal = agrega(MAT, indPorId("nv"), NT-1);
  document.getElementById("statNV").textContent = fmtInt(nvTotal);

  // nav — trilho lateral de ícones
  const ICO = p => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg>`;
  const TRILHO = [
    {alvo:"inicio", rot:"Início", ico:ICO('<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>')},
    {alvo:"secMapa", rot:"Mapa do Brasil", ico:ICO('<path d="M9 20l-6-2V4l6 2 6-2 6 2v14l-6-2-6 2z"/><path d="M9 6v14M15 4v14"/>')},
    {alvo:"secUnidades", rot:"Mapa de unidades", ico:ICO('<path d="M12 21s-7-5.3-7-11a7 7 0 0 1 14 0c0 5.7-7 11-7 11z"/><circle cx="12" cy="10" r="2.5"/>')},
    {alvo:"secDossie", rot:"Dossiê da unidade", ico:ICO('<path d="M5 21V8l7-4 7 4v13"/><path d="M9.5 21v-4.5h5V21"/><path d="M12 8v3.5M10.25 9.75h3.5"/><path d="M4 21h16"/>')},
    {alvo:"secComparar", rot:"Comparar unidades", ico:ICO('<path d="M6 3v18M18 3v18"/><path d="M6 8h5M13 8h5M6 13h5M13 13h5"/>')},
    {alvo:"secComparativo", rot:"Comparativo entre anos", ico:ICO('<rect x="3" y="5" width="7.5" height="14" rx="1.5"/><rect x="13.5" y="5" width="7.5" height="14" rx="1.5"/>')},
    {alvo:"__metodo", rot:"Metodologia", ico:ICO('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01"/><path d="M11 12h1v4h1"/>')}
  ];
  const trilho = document.getElementById("trilho");
  trilho.innerHTML = TRILHO.map(t =>
    `<button data-alvo="${t.alvo}" data-rotulo="${t.rot}" aria-label="${t.rot}">${t.ico}</button>`).join("");
  trilho.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      if(b.dataset.alvo === "__metodo"){ abrirMetodo(); return; }
      document.getElementById(b.dataset.alvo).scrollIntoView({behavior:"smooth"});
    });
  });
  const secs = [...document.querySelectorAll("section[id]"), document.getElementById("inicio")];
  const spy = new IntersectionObserver(es => {
    es.forEach(e => {
      if(e.isIntersecting){
        trilho.querySelectorAll("button").forEach(b =>
          b.classList.toggle("ativo", b.dataset.alvo === e.target.id));
      }
    });
  }, {rootMargin:"-40% 0px -55% 0px"});
  secs.forEach(s => spy.observe(s));

  // botão metodologia do hero abre a página própria
  document.getElementById("btnMetodologia").addEventListener("click", abrirMetodo);
  document.getElementById("btnVoltarMetodo").addEventListener("click", () => fecharMetodo());

  // mapa svg — filtros em lista suspensa
  const sNM = document.getElementById("selNivelMapa");
  sNM.addEventListener("change", () => { estado.nivel = sNM.value; desenhaMapa(); });

  const sRM = document.getElementById("selRegiaoMapa");
  sRM.addEventListener("change", () => {
    estado.regiao = sRM.value || null;
    estado.uf = null;
    sincronizaFiltrosMapa();
    if(!estado.regiao) animaViewBox(vbHome);
    desenhaMapa();
    sincronizaSelecao();
  });

  const sUM = document.getElementById("selUFMapa");
  preencheUFMapa();
  sUM.addEventListener("change", () => {
    estado.uf = sUM.value || null;
    if(estado.uf){
      // mantém coerência: região do estado escolhido
      estado.regiao = Object.keys(REGIAO_UFS).find(r => REGIAO_UFS[r].includes(estado.uf)) || null;
    }
    sincronizaFiltrosMapa();
    if(!estado.uf && !estado.regiao) animaViewBox(vbHome);
    desenhaMapa();
    sincronizaSelecao();
  });

  // eixo temático e indicador como listas de botões com ícone (como no painel de partos)
  const ICO_EIXO = {
    geral:ICO('<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>'),
    prenatal:ICO('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 11h18"/>'),
    parto:ICO('<path d="M12 20s-6.6-4.3-6.6-9.1A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 6.6 3.5C18.6 15.7 12 20 12 20z"/><path d="M8.8 12h1.7l1-1.8 1.4 3 1-1.2h1.5"/>'),
    rn:ICO('<circle cx="12" cy="7" r="3.2"/><path d="M6.5 21c.6-4 2.6-6.5 5.5-6.5s4.9 2.5 5.5 6.5"/>'),
    robson:ICO('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18M9 9v11M15 9v11"/>')
  };
  const listaEixos = document.getElementById("listaEixosMapa");
  const listaInds = document.getElementById("listaIndsMapa");
  listaInds.classList.add("pills-ind");
  const desenhaPillsEixo = () => {
    // via de nascimento fica no mapa de unidades (popup dos pontos), não no coroplético
    listaEixos.innerHTML = EIXOS.filter(e => e.id !== "parto").map(e =>
      `<button data-eixo="${e.id}" class="${e.id === estado.eixoMapa ? "ativo" : ""}">${ICO_EIXO[e.id] || ""}<span>${e.rot}</span></button>`).join("");
    listaEixos.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      estado.eixoMapa = b.dataset.eixo;
      const primeiro = INDS.find(i => i.eixo === estado.eixoMapa);
      estado.indMapa = primeiro ? primeiro.id : estado.indMapa;
      desenhaPillsEixo(); desenhaPillsInd(); desenhaMapa();
    }));
  };
  const desenhaPillsInd = () => {
    listaInds.innerHTML = INDS.filter(i => i.eixo === estado.eixoMapa).map(i =>
      `<button data-ind="${i.id}" class="${i.id === estado.indMapa ? "ativo" : ""}"><span>${esc(i.curto)}</span></button>`).join("");
    listaInds.querySelectorAll("button").forEach(b => b.addEventListener("click", () => {
      estado.indMapa = b.dataset.ind;
      desenhaPillsInd(); desenhaMapa();
    }));
  };
  desenhaPillsEixo(); desenhaPillsInd();
  const sAM = document.getElementById("selAnoMapa");
  sAM.innerHTML = ANOS.map((a, i) => `<option value="${i}" ${i === NT-1 ? "selected" : ""}>${a}</option>`).join("") + `<option value="${NT}">Acumulado 2019–2025</option>`;
  sAM.addEventListener("change", () => { estado.anoMapa = +sAM.value; desenhaMapa(); });
  document.getElementById("btnResetMapa").addEventListener("click", limparSelecaoMapa);

  // comparativo 2019 x 2024 — filtros compartilhados pelos dois mapas
  const sRC = document.getElementById("selRegiaoComp");
  const sUC = document.getElementById("selUFComp");
  const sNC = document.getElementById("selNivelComp");
  const preencheUFComp = () => {
    const ufs = compSel.regiao ? [...(REGIAO_UFS[compSel.regiao] || [])].sort() : Object.keys(UF_NOME).sort();
    sUC.innerHTML = `<option value="">${compSel.regiao ? "Toda a região " + compSel.regiao : "Todo o Brasil"}</option>` +
      ufs.map(u => `<option value="${u}">${UF_NOME[u]}</option>`).join("");
    sUC.value = compSel.uf || "";
  };
  sRC.addEventListener("change", () => {
    compSel.regiao = sRC.value || null; compSel.uf = null;
    preencheUFComp(); desenhaComparativo();
  });
  sUC.addEventListener("change", () => {
    compSel.uf = sUC.value || null;
    if(compSel.uf) compSel.regiao = Object.keys(REGIAO_UFS).find(r => REGIAO_UFS[r].includes(compSel.uf)) || null;
    sRC.value = compSel.regiao || "";
    preencheUFComp(); desenhaComparativo();
  });
  sNC.addEventListener("change", () => { compSel.nivel = sNC.value; desenhaComparativo(); });
  const sRecC = document.getElementById("selRecorteComp");
  sRecC.addEventListener("change", () => { compSel.recorte = sRecC.value; desenhaComparativo(); });
  // seletores de ano dos dois mapas (série completa dos microdados; 2025 preliminar)
  if(typeof COMP !== "undefined"){
    const rotAno = a => (COMP.preliminar || []).includes(a) ? a + " · preliminar" : a;
    const ops = COMP.anos.map(a => `<option value="${a}">${rotAno(a)}</option>`).join("");
    const sAA = document.getElementById("selAnoCompA");
    const sAB = document.getElementById("selAnoCompB");
    sAA.innerHTML = ops; sAA.value = "2019";
    sAB.innerHTML = ops; sAB.value = "2024";
    sAA.addEventListener("change", desenhaComparativo);
    sAB.addEventListener("change", desenhaComparativo);
  }
  preencheUFComp();
  desenhaComparativo();

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

  // dossiê — um seletor por conjunto + página sobreposta
  const sU = document.getElementById("selUnidade");
  opcaoUnidades(sU, "estrategica");
  sU.value = estado.cnes;
  sU.addEventListener("change", () => { estado.cnes = sU.value; });
  document.getElementById("btnAbrirDossie").addEventListener("click", () => abrirDossie(sU.value));
  [["Ebserh", "ebserh", "nEbserh"], ["Qualineo", "qualineo", "nQualineo"]].forEach(([sufixo, conj, elN]) => {
    const s = document.getElementById("selUnidade" + sufixo);
    if(!s) return;
    opcaoUnidades(s, conj);
    document.getElementById("btnAbrirDossie" + sufixo).addEventListener("click", () => abrirDossie(s.value));
    const n = document.getElementById(elN);
    if(n) n.textContent = `(${MAT.filter(m => conjuntoPrincipal(m) === conj).length})`;
  });
  const nEstr = document.getElementById("nEstr");
  if(nEstr) nEstr.textContent = `(${MAT.filter(m => conjuntoPrincipal(m) === "estrategica").length})`;
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
      estado.comparar = [];          // trocar de grupo zera a comparação: só se compara dentro do grupo
      desenhaChipsComp(); desenhaComparador();
    });
  });
  document.getElementById("btnAddComp").addEventListener("click", () => addComp(sC.value));
  document.getElementById("btnAddMedia").addEventListener("click", addMediaGrupo);
  const sAC = document.getElementById("selAnoComp");
  sAC.innerHTML = ANOS.map((a, i) => `<option value="${i}" ${i === NT-1 ? "selected" : ""}>${a}</option>`).join("") + `<option value="${NT}">Acumulado 2019-2025</option>`;
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
  anosBox.innerHTML = ANOS.map((a, i) =>
    `<button class="chip chip-ano ${anosEvoSel.has(i) ? "ativo" : ""}" data-a="${i}">${a}</button>`).join("");
  anosBox.querySelectorAll("button").forEach(b => {
    b.addEventListener("click", () => {
      const i = +b.dataset.a;
      if(anosEvoSel.has(i)){
        if(anosEvoSel.size <= 2) return;          // mínimo de dois anos
        anosEvoSel.delete(i); b.classList.remove("ativo");
      } else {
        anosEvoSel.add(i); b.classList.add("ativo");
      }
      desenhaEvolucao();
    });
  });

  // mapa de unidades: card abre/fecha — Leaflet só inicializa quando abrir
  const detUn = document.getElementById("detUnidades");
  detUn.addEventListener("toggle", () => {
    if(!detUn.open) return;
    if(!leaf) iniciaLeaflet();
    else setTimeout(() => leaf.invalidateSize(), 60);
  });

  desenhaMapa();
  desenhaChipsComp();
  desenhaComparador();
}
document.addEventListener("DOMContentLoaded", inicia);
if(document.readyState !== "loading") inicia();
