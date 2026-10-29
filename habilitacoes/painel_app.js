/* ============================================================
   Painel de Habilitações · Maternidades Estratégicas — app
   Dados: const DADOS (dados_habilitacoes.js, gerado por build_dados.py a partir dos três painéis):
     DADOS.maternidades[] = {cnes, nome, uf, regiao, municipio, grupos[], oficial, paineis[], complexo?, ficha{}, habilitacoes[]}
     habilitação = {co, ds, ini, fim, portaria, dtPortaria, leitos, origem}   (fim "99/9999" = sem prazo final)
     DADOS.tipos[] = catálogo {co, ds, n, leitos}; DADOS.consultaCnes = data da consulta ao CNES.
   Mesma família visual dos painéis de Nascimentos, Internação e Mortalidade.
   ============================================================ */
"use strict";

const MAT = DADOS.maternidades;
const TIPOS = DADOS.tipos;
const DS = Object.fromEntries(TIPOS.map(t => [t.co, t.ds]));
const GRUPOS = DADOS.grupos;                       // {apoiada: rótulo, ebserh: rótulo, qualineo: rótulo}
const GRUPO_CURTO = {apoiada: "Apoiadas", ebserh: "EBSERH", qualineo: "QUALINEO"};
const SEM_PRAZO = "99/9999";
const UF_NOME = {AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",
ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",MS:"Mato Grosso do Sul",MT:"Mato Grosso",
PA:"Pará",PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",
RO:"Rondônia",RR:"Roraima",RS:"Rio Grande do Sul",SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins"};
const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

/* Famílias de habilitações de interesse materno e infantil: colunas padrão da matriz e marcadores dos cartões.
   Cada família reúne um ou mais códigos do CNES; "tipo" rotula o código dentro da família (UTI II/III). */
const FAMILIAS = [
  {id: "hgpar",   rot: "Alto risco (HGPAR)",          codigos: ["1420"]},
  {id: "utin",    rot: "UTI neonatal",                codigos: ["2610", "2611"], tipo: {"2610": "II", "2611": "III"}},
  {id: "ucinco",  rot: "UCINCo",                      codigos: ["2802"]},
  {id: "ucinca",  rot: "UCINCa (Canguru)",            codigos: ["2803"]},
  {id: "utiped",  rot: "UTI pediátrica",              codigos: ["2603", "2606"], tipo: {"2603": "II", "2606": "III"}},
  {id: "utia",    rot: "UTI adulto",                  codigos: ["2601", "2604"], tipo: {"2601": "II", "2604": "III"}},
  {id: "hac",     rot: "Hospital Amigo da Criança",   codigos: ["1416", "1404"]},
  {id: "casa",    rot: "Casa da Gestante, Bebê e Puérpera", codigos: ["1415"]},
  {id: "cpn",     rot: "Centro de Parto Normal",      codigos: ["1418", "1419", "1411", "1412"]},
  {id: "triagem", rot: "Triagem neonatal",            codigos: ["1406", "1407", "1408", "1409"]},
  {id: "laq",     rot: "Laqueadura",                  codigos: ["1901"]},
  {id: "vas",     rot: "Vasectomia",                  codigos: ["1902"]},
];
const CODIGOS_MI = new Set(FAMILIAS.flatMap(f => f.codigos));

/* ---------------- utilidades ---------------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtInt = v => v == null ? "—" : Math.round(v).toLocaleString("pt-BR");
const dataBR = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || "—"); };
const plural = (n, s, p) => `${fmtInt(n)} ${n === 1 ? s : p}`;
const titulo = s => String(s || "").toLowerCase().replace(/(^|[\s(\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(De|Da|Do|Das|Dos|E|Em|Para|Com|Ao|A|O|Na|No)\b/g, w => w.toLowerCase())
  .replace(/\b(Uti|Utin|Ucinco|Ucinca|Hgpar|Sus|Aids|Hiv|Drc|Trs|Snt|Tmo|Cacon|Unacon|Pmae|Cer|Ceo|Cpni|Ppp|Tavi|Avc|Srd|Sdm|Src|Eim|Dr|Ii|Iii|Iv|Hla|Cd4|Cd8|Rna|Ucp|Uco)\b/g, w => w.toUpperCase());
const dsCurta = co => titulo(DS[co] || co).replace(/\s*\*+\.?\s*$/, "").replace(/\.\s*$/, "");
const ativaSemPrazo = h => h.fim === SEM_PRAZO;
const origemRot = o => o === "P" ? "gestor estadual ou municipal" : "Ministério da Saúde";
const fimRot = h => ativaSemPrazo(h) ? "sem prazo final" : `até ${h.fim}`;
const mapaHabs = mt => { const m = new Map(); mt.habilitacoes.forEach(h => { if(!m.has(h.co)) m.set(h.co, []); m.get(h.co).push(h); }); return m; };
MAT.forEach(mt => { mt._habs = mapaHabs(mt); mt._busca = `${mt.nome} ${mt.municipio || ""} ${mt.uf || ""} ${mt.cnes} ${(mt.ficha && mt.ficha.fantasia) || ""}`.toLowerCase(); });
const temCodigo = (mt, co) => mt._habs.has(co);
const temFamilia = (mt, f) => f.codigos.some(co => mt._habs.has(co));
const bolinha = g => `<i class="bolinha bola-${g}" title="${esc(GRUPOS[g])}"></i>`;
const bolinhas = mt => mt.grupos.map(bolinha).join("");
const csvCampo = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function baixarCSV(nome, linhas){
  const txt = "﻿" + linhas.map(l => l.map(csvCampo).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], {type: "text/csv;charset=utf-8"}));
  a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const hoje = () => new Date().toISOString().slice(0, 10);

/* ---------------- estado dos filtros ---------------- */
const F = {grupo: "", regiao: "", uf: "", busca: "", hab: "", modo: "com", foco: "mi", ordem: "uf"};
let colunasExtra = [];          // códigos acrescentados como coluna da matriz
let colunasRemovidas = new Set();  // famílias padrão retiradas pelo usuário

function selecionadas(){
  const q = F.busca.trim().toLowerCase();
  return MAT.filter(mt => {
    if(F.grupo && !mt.grupos.includes(F.grupo)) return false;
    if(F.regiao && mt.regiao !== F.regiao) return false;
    if(F.uf && mt.uf !== F.uf) return false;
    if(q && !mt._busca.includes(q)) return false;
    if(F.hab){ const tem = temCodigo(mt, F.hab); if(F.modo === "com" ? !tem : tem) return false; }
    return true;
  });
}
function ordenar(lista){
  const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");
  if(F.ordem === "nome") return lista.slice().sort(porNome);
  if(F.ordem === "n") return lista.slice().sort((a, b) => b.habilitacoes.length - a.habilitacoes.length || porNome(a, b));
  return lista.slice().sort((a, b) => (a.uf || "").localeCompare(b.uf || "") || porNome(a, b));
}
const descricaoFiltro = () => {
  const partes = [];
  if(F.grupo) partes.push(GRUPOS[F.grupo]);
  if(F.uf) partes.push(UF_NOME[F.uf] || F.uf); else if(F.regiao) partes.push(`região ${F.regiao}`);
  if(F.busca.trim()) partes.push(`"${F.busca.trim()}"`);
  if(F.hab) partes.push(`${F.modo === "com" ? "com" : "sem"} a habilitação ${F.hab} ${dsCurta(F.hab)}`);
  return partes.length ? partes.join(" · ") : "todas as unidades dos três grupos";
};

/* ---------------- cabeçalho e destaques ---------------- */
function montarCabecalho(){
  const consulta = dataBR(DADOS.consultaCnes);
  document.getElementById("heroConsulta").textContent = `consulta ao CNES em ${consulta}`;
  document.getElementById("rodapeConsulta").textContent = `consulta em ${consulta}`;
  const nHabs = MAT.reduce((s, m) => s + m.habilitacoes.length, 0);
  const nPrazo = MAT.reduce((s, m) => s + m.habilitacoes.filter(h => !ativaSemPrazo(h)).length, 0);
  const porGrupo = Object.keys(GRUPOS).map(g => `${MAT.filter(m => m.grupos.includes(g)).length} ${GRUPO_CURTO[g]}`).join(" · ");
  document.getElementById("statUnid").textContent = fmtInt(MAT.length);
  document.getElementById("statUnidSub").textContent = porGrupo;
  document.getElementById("statHabs").textContent = fmtInt(nHabs);
  document.getElementById("statHabsSub").textContent = `${fmtInt(nPrazo)} com competência final definida`;
  document.getElementById("statTipos").textContent = fmtInt(TIPOS.length);
  const utin = FAMILIAS.find(f => f.id === "utin"), hgpar = FAMILIAS.find(f => f.id === "hgpar");
  const comUtin = MAT.filter(m => temFamilia(m, utin));
  const leitosUtin = comUtin.reduce((s, m) => s + utin.codigos.reduce((t, co) => t + (m._habs.get(co) || []).reduce((u, h) => u + (h.leitos || 0), 0), 0), 0);
  document.getElementById("statUtin").textContent = fmtInt(comUtin.length);
  document.getElementById("statUtinSub").textContent = `${fmtInt(leitosUtin)} leitos (tipos II e III)`;
  const comHgpar = MAT.filter(m => temFamilia(m, hgpar));
  document.getElementById("statHgpar").textContent = fmtInt(comHgpar.length);
  document.getElementById("statHgparSub").textContent = `de ${fmtInt(MAT.length)} unidades`;
  // notas
  document.getElementById("notaConsulta").innerHTML = `<b>Data da consulta:</b> ${consulta}. As datas de atualização do cadastro de cada unidade no CNES aparecem na ficha. Habilitações encerradas antes da consulta não constam do serviço e, por isso, não aparecem aqui.`;
  const u = DADOS.unidadesPorPainel || {};
  document.getElementById("notaUnidades").innerHTML = `<b>Unidades:</b> ${fmtInt(MAT.length)} códigos CNES, união das unidades dos painéis de Nascimentos (${fmtInt(u.nascimentos)}), Internação (${fmtInt(u.internacao)}) e Mortalidade (${fmtInt(u.mortalidade)}). Grupos: ${porGrupo}; uma unidade pode contar em mais de um grupo.`;
  const anexos = MAT.filter(m => m.oficial === false);
  document.getElementById("notaAnexos").innerHTML = anexos.length
    ? `<b>Anexos:</b> ${anexos.length} unidades acrescentadas pela coordenação fora da lista oficial (${anexos.map(a => `${a.nome}, ${a.uf}`).join("; ")}) entram com as mesmas regras e aparecem marcadas como "anexo".`
    : "";
  document.getElementById("notaFamilias").innerHTML = FAMILIAS.map(f =>
    `<li><b>${esc(f.rot)}</b>: ${f.codigos.map(co => `${co} ${esc(dsCurta(co))}`).join("; ")}.</li>`).join("");
}

/* ---------------- filtros ---------------- */
function montarFiltros(){
  const selRegiao = document.getElementById("selRegiao"), selUF = document.getElementById("selUF"), selHab = document.getElementById("selHab");
  REGIOES.forEach(r => selRegiao.add(new Option(r, r)));
  const ufs = [...new Set(MAT.map(m => m.uf).filter(Boolean))].sort();
  const preencheUF = () => {
    const atual = selUF.value; selUF.innerHTML = '<option value="">Todos os estados</option>';
    ufs.filter(uf => !F.regiao || MAT.some(m => m.uf === uf && m.regiao === F.regiao)).forEach(uf => selUF.add(new Option(`${UF_NOME[uf] || uf} (${uf})`, uf)));
    selUF.value = [...selUF.options].some(o => o.value === atual) ? atual : ""; F.uf = selUF.value;
  };
  preencheUF();
  const grupoMI = document.createElement("optgroup"); grupoMI.label = "Interesse materno e infantil";
  const grupoTodas = document.createElement("optgroup"); grupoTodas.label = "Todas as habilitações do catálogo (por código)";
  TIPOS.filter(t => CODIGOS_MI.has(t.co)).sort((a, b) => b.n - a.n).forEach(t => grupoMI.appendChild(new Option(`${t.co} · ${dsCurta(t.co)} (${t.n})`, t.co)));
  TIPOS.forEach(t => grupoTodas.appendChild(new Option(`${t.co} · ${dsCurta(t.co)} (${t.n})`, t.co)));
  selHab.appendChild(grupoMI); selHab.appendChild(grupoTodas);
  selRegiao.addEventListener("change", () => { F.regiao = selRegiao.value; preencheUF(); render(); });
  selUF.addEventListener("change", () => { F.uf = selUF.value; render(); });
  selHab.addEventListener("change", () => { F.hab = selHab.value; render(); });
  document.getElementById("busca").addEventListener("input", e => { F.busca = e.target.value; render(); });
  const seg = (id, campo, attr) => {
    const el = document.getElementById(id);
    el.addEventListener("click", e => {
      const b = e.target.closest("button"); if(!b) return;
      el.querySelectorAll("button").forEach(x => x.classList.toggle("ativo", x === b));
      F[campo] = b.dataset[attr]; render();
    });
  };
  seg("segGrupo", "grupo", "grupo"); seg("segModoHab", "modo", "modo"); seg("segFoco", "foco", "foco"); seg("segOrdem", "ordem", "ordem");
  document.getElementById("btnLimpar").addEventListener("click", () => {
    Object.assign(F, {grupo: "", regiao: "", uf: "", busca: "", hab: "", modo: "com"});
    selRegiao.value = ""; preencheUF(); selHab.value = ""; document.getElementById("busca").value = "";
    document.querySelectorAll("#segGrupo button").forEach(b => b.classList.toggle("ativo", b.dataset.grupo === ""));
    document.querySelectorAll("#segModoHab button").forEach(b => b.classList.toggle("ativo", b.dataset.modo === "com"));
    render();
  });
  // coluna extra da matriz
  const selAdd = document.getElementById("selAddCol");
  TIPOS.forEach(t => selAdd.add(new Option(`${t.co} · ${dsCurta(t.co)} (${t.n} unidades)`, t.co)));
  selAdd.addEventListener("change", () => {
    if(selAdd.value && !colunasExtra.includes(selAdd.value)) colunasExtra.push(selAdd.value);
    selAdd.value = ""; render();
  });
  document.getElementById("btnColunasPadrao").addEventListener("click", () => { colunasExtra = []; colunasRemovidas = new Set(); render(); });
  document.getElementById("btnCsvMatriz").addEventListener("click", csvMatriz);
  document.getElementById("btnCsvTudo").addEventListener("click", csvTudo);
  document.getElementById("btnNotas").addEventListener("click", () => document.getElementById("secNotas").scrollIntoView({behavior: "smooth"}));
}
function setHab(co){
  F.hab = co; F.modo = "com";
  document.getElementById("selHab").value = co;
  document.querySelectorAll("#segModoHab button").forEach(b => b.classList.toggle("ativo", b.dataset.modo === "com"));
  render();
}

/* ---------------- panorama: barras ---------------- */
function renderBarras(sel){
  const el = document.getElementById("barras");
  const base = F.hab ? MAT.filter(mt => {       // com uma habilitação filtrada, as barras olham o recorte sem o filtro de habilitação
    if(F.grupo && !mt.grupos.includes(F.grupo)) return false;
    if(F.regiao && mt.regiao !== F.regiao) return false;
    if(F.uf && mt.uf !== F.uf) return false;
    const q = F.busca.trim().toLowerCase(); return !q || mt._busca.includes(q);
  }) : sel;
  const cont = new Map();
  base.forEach(mt => mt._habs.forEach((_, co) => cont.set(co, (cont.get(co) || 0) + 1)));
  let itens = [...cont.entries()].map(([co, n]) => ({co, n}));
  if(F.foco === "mi") itens = itens.filter(i => CODIGOS_MI.has(i.co));
  itens.sort((a, b) => b.n - a.n || a.co.localeCompare(b.co));
  if(F.foco !== "mi") itens = itens.slice(0, 20);
  document.getElementById("barrasSub").textContent = F.foco === "mi"
    ? `Habilitações de interesse materno e infantil presentes em ${plural(base.length, "unidade", "unidades")} (${descricaoFiltroSemHab()}).`
    : `As 20 habilitações mais frequentes entre as ${fmtInt(cont.size)} registradas em ${plural(base.length, "unidade", "unidades")} (${descricaoFiltroSemHab()}).`;
  if(!itens.length){ el.innerHTML = `<p class="suave" style="font-size:.86rem">Nenhuma habilitação neste recorte.</p>`; return; }
  const max = Math.max(...itens.map(i => i.n), 1);
  el.innerHTML = itens.map(i => `<button class="barra ${F.hab === i.co ? "ativa" : ""}" data-co="${i.co}" title="${esc(DS[i.co])} — toque para filtrar as unidades com esta habilitação">
      <span class="rot">${esc(dsCurta(i.co))}<small>${i.co}</small></span>
      <span class="trilha"><i style="width:${(100 * i.n / max).toFixed(1)}%"></i></span>
      <span class="n">${fmtInt(i.n)} <small>${base.length ? Math.round(100 * i.n / base.length) : 0}%</small></span>
    </button>`).join("");
  el.querySelectorAll(".barra").forEach(b => b.addEventListener("click", () => F.hab === b.dataset.co ? setHab("") : setHab(b.dataset.co)));
}
function descricaoFiltroSemHab(){
  const partes = [];
  if(F.grupo) partes.push(GRUPOS[F.grupo]);
  if(F.uf) partes.push(UF_NOME[F.uf] || F.uf); else if(F.regiao) partes.push(`região ${F.regiao}`);
  if(F.busca.trim()) partes.push(`"${F.busca.trim()}"`);
  return partes.length ? partes.join(", ") : "três grupos";
}

/* ---------------- panorama: painel lateral ---------------- */
function renderLateral(sel){
  const el = document.getElementById("painelLateral");
  if(F.hab){
    const co = F.hab;
    const base = MAT.filter(mt => (!F.grupo || mt.grupos.includes(F.grupo)) && (!F.regiao || mt.regiao === F.regiao) && (!F.uf || mt.uf === F.uf));
    const com = base.filter(mt => temCodigo(mt, co)), sem = base.filter(mt => !temCodigo(mt, co));
    const leitos = com.reduce((s, mt) => s + mt._habs.get(co).reduce((t, h) => t + (h.leitos || 0), 0), 0);
    const prazo = com.filter(mt => mt._habs.get(co).some(h => !ativaSemPrazo(h))).length;
    const porGrupo = Object.keys(GRUPOS).map(g => {
      const bg = base.filter(m => m.grupos.includes(g)), cg = bg.filter(m => temCodigo(m, co));
      return bg.length ? `<div class="kpi"><span>${bolinha(g)} ${esc(GRUPOS[g])}</span><span class="v">${cg.length} <small>de ${bg.length}</small></span></div>` : "";
    }).join("");
    const lista = (F.modo === "com" ? com : sem).slice().sort((a, b) => (a.uf || "").localeCompare(b.uf || "") || a.nome.localeCompare(b.nome, "pt-BR"));
    el.innerHTML = `<p class="eyebrow">Habilitação ${esc(co)}</p>
      <h3 style="margin-top:.2rem">${esc(dsCurta(co))}</h3>
      <p class="suave" style="font-size:.78rem; margin-top:.2rem">${esc(DS[co])}</p>
      <div class="num-grande" style="margin-top:.6rem">${fmtInt(com.length)} <span style="font-size:1rem; font-weight:700; color:var(--texto-suave)">de ${fmtInt(base.length)} unidades</span></div>
      <div class="kpi-lista">${porGrupo}
        ${leitos ? `<div class="kpi"><span>Leitos habilitados</span><span class="v">${fmtInt(leitos)}</span></div>` : ""}
        ${prazo ? `<div class="kpi"><span>Com competência final definida</span><span class="v">${fmtInt(prazo)} <small>unidades</small></span></div>` : ""}
        <div class="kpi"><span>Sem a habilitação</span><span class="v">${fmtInt(sem.length)} <small>unidades</small></span></div>
      </div>
      <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">${F.modo === "com" ? "Unidades que têm" : "Unidades que não têm"}</b> (${lista.length}):</p>
      <ul class="lista-unid">${lista.map(mt => `<li>${bolinhas(mt)}<button data-cnes="${mt.cnes}">${esc(mt.nome)}</button><small>${esc(mt.uf)}</small></li>`).join("") || "<li class='suave'>nenhuma</li>"}</ul>`;
  } else {
    const nHabs = sel.reduce((s, m) => s + m.habilitacoes.length, 0);
    const semHab = sel.filter(m => !m.habilitacoes.length);
    const ufs = new Set(sel.map(m => m.uf));
    const porGrupo = Object.keys(GRUPOS).map(g => { const n = sel.filter(m => m.grupos.includes(g)).length; return n ? `<div class="kpi"><span>${bolinha(g)} ${esc(GRUPOS[g])}</span><span class="v">${n}</span></div>` : ""; }).join("");
    const familias = FAMILIAS.map(f => { const n = sel.filter(m => temFamilia(m, f)).length; return `<div class="kpi"><span>${esc(f.rot)}</span><span class="v">${n} <small>${sel.length ? Math.round(100 * n / sel.length) : 0}%</small></span></div>`; }).join("");
    el.innerHTML = `<p class="eyebrow">Seleção atual</p>
      <h3 style="margin-top:.2rem">${esc(descricaoFiltro())}</h3>
      <div class="num-grande" style="margin-top:.6rem">${fmtInt(sel.length)} <span style="font-size:1rem; font-weight:700; color:var(--texto-suave)">unidades · ${plural(ufs.size, "estado", "estados")}</span></div>
      <div class="kpi-lista">${porGrupo}
        <div class="kpi"><span>Habilitações registradas</span><span class="v">${fmtInt(nHabs)} <small>média ${sel.length ? (nHabs / sel.length).toLocaleString("pt-BR", {maximumFractionDigits: 1}) : "—"} por unidade</small></span></div>
        ${semHab.length ? `<div class="kpi"><span>Sem nenhuma habilitação</span><span class="v">${semHab.length} <small>${semHab.map(m => esc(m.nome)).join("; ")}</small></span></div>` : ""}
      </div>
      <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">Cobertura das famílias de interesse materno e infantil</b> (unidades que têm ao menos um código da família):</p>
      <div class="kpi-lista">${familias}</div>`;
  }
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}

/* ---------------- matriz ---------------- */
function colunasMatriz(){
  const cols = FAMILIAS.filter(f => !colunasRemovidas.has(f.id)).map(f => ({id: f.id, rot: f.rot, codigos: f.codigos, tipo: f.tipo, padrao: true}));
  colunasExtra.forEach(co => cols.push({id: "co" + co, rot: dsCurta(co), codigos: [co], extra: true}));
  return cols;
}
function celula(mt, col){
  const habs = col.codigos.flatMap(co => (mt._habs.get(co) || []).map(h => ({...h, _tipo: col.tipo ? col.tipo[co] : null})));
  if(!habs.length) return {html: `<td class="cel nao" title="${esc(mt.nome)}: sem ${esc(col.rot)} no CNES">·</td>`, texto: ""};
  const prazo = habs.some(h => !ativaSemPrazo(h));
  const leitos = habs.reduce((s, h) => s + (h.leitos || 0), 0);
  const tipos = [...new Set(habs.map(h => h._tipo).filter(Boolean))].join("+");
  const tip = habs.map(h => `${h.co} ${h.ds} · desde ${h.ini} · ${fimRot(h)}${h.leitos ? ` · ${h.leitos} leitos` : ""}${h.portaria ? ` · ${h.portaria}` : ""}`).join("\n");
  const texto = [tipos, leitos ? `${leitos} leitos` : "", prazo ? "com prazo" : "sim"].filter(Boolean).join(" ");
  return {html: `<td class="cel ${prazo ? "prazo" : "sim"}" title="${esc(tip)}"><span class="ponto"></span>${tipos ? `<span class="tipo">${tipos}</span>` : ""}${leitos ? `<span class="leitos">${leitos}</span>` : ""}</td>`, texto};
}
function renderMatriz(sel){
  const cols = colunasMatriz(), lista = ordenar(sel), tab = document.getElementById("matriz");
  document.getElementById("btnColunasPadrao").hidden = !(colunasExtra.length || colunasRemovidas.size);
  const th = cols.map(c => `<th title="${esc(c.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}"><span class="th-rot">${esc(c.rot)}</span><span class="th-n">${c.codigos.join(", ")}</span><button class="th-x" data-col="${c.id}" title="Retirar esta coluna" aria-label="Retirar a coluna ${esc(c.rot)}">✕</button></th>`).join("");
  const totais = cols.map(() => 0);
  const linhas = lista.map(mt => {
    const cels = cols.map((c, i) => { const r = celula(mt, c); if(r.texto) totais[i]++; return r.html; }).join("");
    return `<tr><td class="col-unid"><button data-cnes="${mt.cnes}">${esc(mt.nome)}</button><small>${bolinhas(mt)} ${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(mt.uf)} · CNES ${mt.cnes}${mt.oficial === false ? " · anexo" : ""}</small></td>${cels}<td class="col-tot" title="Total de habilitações registradas no CNES">${mt.habilitacoes.length}</td></tr>`;
  }).join("");
  tab.innerHTML = `<thead><tr><th class="col-unid">Unidade (${lista.length})</th>${th}<th title="Total de habilitações registradas">Total de habilitações</th></tr></thead>
    <tbody>${linhas || `<tr><td class="col-unid suave" colspan="${cols.length + 2}">Nenhuma unidade no recorte.</td></tr>`}</tbody>
    <tfoot><tr><td class="col-unid">Unidades com a habilitação</td>${totais.map(t => `<td>${t}${lista.length ? `<br><span style="font-weight:600; color:var(--texto-suave); font-size:.68rem">${Math.round(100 * t / lista.length)}%</span>` : ""}</td>`).join("")}<td></td></tr></tfoot>`;
  tab.querySelectorAll("td.col-unid button").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
  tab.querySelectorAll(".th-x").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.col;
    if(id.startsWith("co")) colunasExtra = colunasExtra.filter(co => "co" + co !== id); else colunasRemovidas.add(id);
    render();
  }));
}
function csvMatriz(){
  const cols = colunasMatriz(), lista = ordenar(selecionadas());
  const cab = ["CNES", "Unidade", "Município", "UF", "Região", "Grupos", "Anexo", ...cols.map(c => `${c.rot} (${c.codigos.join("/")})`), "Total de habilitações"];
  const linhas = lista.map(mt => [mt.cnes, mt.nome, mt.municipio || "", mt.uf, mt.regiao, mt.grupos.map(g => GRUPO_CURTO[g]).join(" + "), mt.oficial === false ? "sim" : "não",
    ...cols.map(c => celula(mt, c).texto || "não"), mt.habilitacoes.length]);
  baixarCSV(`matriz_habilitacoes_${hoje()}.csv`, [[`Painel de Habilitações · consulta ao CNES em ${dataBR(DADOS.consultaCnes)} · recorte: ${descricaoFiltro()}`], cab, ...linhas]);
}
function linhasCsvUnidade(mt){
  return mt.habilitacoes.map(h => [mt.cnes, mt.nome, mt.municipio || "", mt.uf, mt.grupos.map(g => GRUPO_CURTO[g]).join(" + "), h.co, h.ds, h.ini, ativaSemPrazo(h) ? "sem prazo final" : h.fim, h.portaria || "", h.dtPortaria || "", h.leitos || 0, origemRot(h.origem)]);
}
const CAB_HAB = ["CNES", "Unidade", "Município", "UF", "Grupos", "Código", "Habilitação", "Competência inicial", "Competência final", "Portaria", "Data da portaria", "Leitos", "Origem"];
function csvTudo(){
  const lista = ordenar(selecionadas());
  baixarCSV(`habilitacoes_${hoje()}.csv`, [[`Painel de Habilitações · consulta ao CNES em ${dataBR(DADOS.consultaCnes)} · recorte: ${descricaoFiltro()}`], CAB_HAB, ...lista.flatMap(linhasCsvUnidade)]);
}

/* ---------------- cartões das unidades ---------------- */
function renderUnidades(sel){
  const lista = ordenar(sel), el = document.getElementById("gradeUnidades");
  document.getElementById("unidadesResumo").textContent = `${plural(lista.length, "unidade", "unidades")} · ${descricaoFiltro()}`;
  el.innerHTML = lista.map(mt => {
    const n = mt.habilitacoes.length, nPrazo = mt.habilitacoes.filter(h => !ativaSemPrazo(h)).length;
    const tags = FAMILIAS.filter(f => temFamilia(mt, f)).map(f => {
      const habs = f.codigos.flatMap(co => mt._habs.get(co) || []);
      const leitos = habs.reduce((s, h) => s + (h.leitos || 0), 0);
      const tipo = f.tipo ? [...new Set(habs.map(h => f.tipo[h.co]).filter(Boolean))].join("+") : "";
      const prazo = habs.some(h => !ativaSemPrazo(h));
      return `<span class="tag ${prazo ? "prazo" : ""}" title="${esc(habs.map(h => `${h.co} ${h.ds} · desde ${h.ini} · ${fimRot(h)}`).join("\n"))}">${esc(f.rot)}${tipo ? ` ${tipo}` : ""}${leitos ? ` · ${leitos}` : ""}</span>`;
    });
    const outras = mt.habilitacoes.filter(h => !CODIGOS_MI.has(h.co)).length;
    if(outras) tags.push(`<span class="tag mais">+ ${plural(outras, "outra habilitação", "outras habilitações")}</span>`);
    if(!n) tags.push(`<span class="tag nenhuma">nenhuma habilitação registrada no CNES</span>`);
    const alvo = mt.habilitacoes.filter(h => F.hab && h.co === F.hab).map(h => `<span class="tag" style="background:var(--indigo); color:#FFF; border-color:var(--indigo)">${esc(h.co)} ${esc(dsCurta(h.co))}${h.leitos ? ` · ${h.leitos} leitos` : ""}</span>`).join("");
    return `<article class="unidade ${mt.oficial === false ? "anexo" : ""}">
      <div class="u-topo"><div><h3>${esc(mt.nome)}</h3><div class="u-local">${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(UF_NOME[mt.uf] || mt.uf)}</div></div><div class="u-cnes">CNES ${mt.cnes}</div></div>
      <div class="u-grupos">${mt.grupos.map(g => `<span>${bolinha(g)}${esc(GRUPO_CURTO[g])}</span>`).join("")}${mt.oficial === false ? `<span class="chip chip-anexo" style="font-size:.68rem; padding:.1rem .5rem">anexo</span>` : ""}${mt.complexo ? `<span class="chip" style="font-size:.68rem; padding:.1rem .5rem" title="Códigos CNES do complexo: ${mt.complexo.join(" e ")}">complexo</span>` : ""}</div>
      <div class="u-n"><b>${n}</b><span>${n === 1 ? "habilitação registrada" : "habilitações registradas"}${nPrazo ? `, ${nPrazo} com prazo` : ""}</span></div>
      <div class="u-tags">${alvo}${tags.join("")}</div>
      <div class="u-rodape"><small>Cadastro atualizado no CNES em ${dataBR(mt.ficha && mt.ficha.atualizacao)}</small><button class="chip chip-acao" data-cnes="${mt.cnes}">Ver ficha e habilitações →</button></div>
    </article>`;
  }).join("") || `<p class="suave">Nenhuma unidade no recorte.</p>`;
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}

/* ---------------- ficha da unidade (página sobreposta) ---------------- */
let dossieAtual = null;
function abrirDossie(cnes){
  const mt = MAT.find(m => m.cnes === cnes); if(!mt) return;
  dossieAtual = mt;
  const sel = document.getElementById("selUnidadePd");
  if(!sel.options.length) MAT.slice().sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")).forEach(m => sel.add(new Option(`${m.nome} (${m.uf})`, m.cnes)));
  sel.value = cnes;
  const f = mt.ficha || {};
  const gest = {M: "Municipal", E: "Estadual", D: "Dupla"}[f.gestao] || f.gestao || "—";
  const endereco = [f.endereco, f.bairro, f.cep ? `CEP ${f.cep}` : null].filter(Boolean).join(" · ");
  const n = mt.habilitacoes.length, nPrazo = mt.habilitacoes.filter(h => !ativaSemPrazo(h)).length;
  const leitos = mt.habilitacoes.reduce((s, h) => s + (h.leitos || 0), 0);
  const itens = [["Código CNES", mt.cnes + (mt.complexo ? ` (complexo: ${mt.complexo.join(" e ")})` : "")], ["Razão social", f.razao], ["Nome fantasia", f.fantasia], ["CNPJ", f.cnpj],
    ["Esfera administrativa", f.esfera], ["Gestão", gest], ["Endereço", endereco], ["Telefone", f.telefone], ["E-mail", f.email], ["Turno de atendimento", f.turno],
    ["Município / UF", `${mt.municipio || "—"} / ${UF_NOME[mt.uf] || mt.uf}`], ["Região de saúde", mt.regiaoSaude], ["Macrorregião de saúde", mt.macro],
    ["Painéis em que a unidade aparece", (mt.paineis || []).map(p => ({nascimentos: "Nascimentos", internacao: "Internação", mortalidade: "Mortalidade"}[p] || p)).join(", ")]].filter(i => i[1]);
  const habs = mt.habilitacoes.slice().sort((a, b) => (CODIGOS_MI.has(b.co) - CODIGOS_MI.has(a.co)) || a.co.localeCompare(b.co));
  const linhas = habs.map(h => `<tr class="${CODIGOS_MI.has(h.co) ? "destaque" : ""}">
      <td class="c mono">${esc(h.co)}</td><td>${esc(h.ds)}${CODIGOS_MI.has(h.co) ? ` <span class="chip" style="font-size:.66rem; padding:.05rem .45rem; margin-left:.3rem">materno-infantil</span>` : ""}</td>
      <td class="c mono">${esc(h.ini || "—")}</td><td class="c mono">${ativaSemPrazo(h) ? "sem prazo final" : `<span class="pz">até ${esc(h.fim)}</span>`}</td>
      <td style="white-space:normal">${esc(h.portaria || "—")}${h.dtPortaria ? ` <span class="suave">(${esc(h.dtPortaria)})</span>` : ""}</td>
      <td class="r mono">${h.leitos ? h.leitos : "—"}</td><td class="c" style="font-size:.76rem">${esc(origemRot(h.origem))}</td></tr>`).join("");
  document.getElementById("dossieConteudo").innerHTML = `
    <div class="dossie-topo">
      <div>
        <p class="eyebrow" style="color:#C5E3CC">Ficha da unidade · CNES ${esc(mt.cnes)}</p>
        <h2 style="margin-top:.3rem; color:#FFF">${esc(mt.nome)}</h2>
        <div class="meta">
          ${mt.grupos.map(g => `<span>${bolinha(g)}${esc(GRUPOS[g])}</span>`).join("")}
          <span>${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(UF_NOME[mt.uf] || mt.uf)}</span>
          ${mt.oficial === false ? `<span class="anexo">anexo · fora da lista oficial de 09/09/2026</span>` : ""}
        </div>
      </div>
      <div class="kpis-topo">
        <div class="k"><div class="n">${n}</div><div class="t">habilitações</div></div>
        <div class="k"><div class="n">${nPrazo}</div><div class="t">com prazo final</div></div>
        <div class="k"><div class="n">${fmtInt(leitos)}</div><div class="t">leitos habilitados</div></div>
      </div>
    </div>
    <div class="dossie-cards">
      <div class="card"><h3>Ficha de cadastro CNES</h3>
        <div class="cnes-grid">${itens.map(i => `<div class="cnes-item"><span>${esc(i[0])}</span><b>${esc(i[1])}</b></div>`).join("")}</div>
        ${f.estruturas && f.estruturas.length ? `<div class="badges">${f.estruturas.map(e => `<span class="badge-sim">${esc(e)}</span>`).join("")}</div>` : ""}
        <p class="fonte"><b>Última atualização do cadastro no CNES:</b> ${dataBR(f.atualizacao)} · <b>Dados baixados da API oficial em:</b> ${dataBR(DADOS.consultaCnes)}. Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.</p>
      </div>
      <div class="card"><h3>Habilitações registradas no CNES <span class="chip">${n}</span></h3>
        <p class="suave" style="font-size:.82rem; margin-top:.3rem">Ordenadas com as habilitações de interesse materno e infantil primeiro e, depois, por código. "Sem prazo final" corresponde a 99/9999 no CNES; as habilitações com competência final definida estavam vigentes na data da consulta.</p>
        <div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde">
          <thead><tr><th style="text-align:center">Código</th><th>Habilitação</th><th style="text-align:center">Competência inicial</th><th style="text-align:center">Competência final</th><th>Portaria (data)</th><th style="text-align:right">Leitos</th><th style="text-align:center">Origem</th></tr></thead>
          <tbody>${linhas || `<tr><td colspan="7" class="suave">Nenhuma habilitação registrada no CNES para este código na data da consulta.</td></tr>`}</tbody>
        </table></div>
        <p class="fonte"><b>Dados baixados do serviço do CNES em:</b> ${dataBR(DADOS.consultaCnes)} · Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil. Origem: "gestor estadual ou municipal" corresponde ao valor "P" do campo de origem do CNES.</p>
      </div>
    </div>`;
  const pg = document.getElementById("paginaDossie");
  pg.hidden = false; document.body.classList.add("dossie-aberto"); pg.scrollTop = 0;
  if(location.hash !== "#" + cnes) history.replaceState(null, "", "#" + cnes);
}
function fecharDossie(){
  document.getElementById("paginaDossie").hidden = true; document.body.classList.remove("dossie-aberto"); dossieAtual = null;
  if(location.hash) history.replaceState(null, "", location.pathname + location.search);
}
function montarDossie(){
  document.getElementById("btnVoltarDossie").addEventListener("click", fecharDossie);
  document.getElementById("selUnidadePd").addEventListener("change", e => abrirDossie(e.target.value));
  document.getElementById("btnPdfDossie").addEventListener("click", () => window.print());
  document.getElementById("btnCsvUnidade").addEventListener("click", () => { if(dossieAtual) baixarCSV(`habilitacoes_${dossieAtual.cnes}_${hoje()}.csv`, [CAB_HAB, ...linhasCsvUnidade(dossieAtual)]); });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && dossieAtual) fecharDossie(); });
  const h = location.hash.replace("#", ""); if(/^\d{7}$/.test(h) && MAT.some(m => m.cnes === h)) abrirDossie(h);
}

/* ---------------- trilho lateral ---------------- */
const TRILHO = [
  {alvo: "inicio", rot: "Início", ico: '<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>'},
  {alvo: "secPanorama", rot: "Panorama", ico: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-5M12 15V7M16 15v-3"/></svg>'},
  {alvo: "secMatriz", rot: "Matriz de cobertura", ico: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'},
  {alvo: "secUnidades", rot: "Unidades", ico: '<svg viewBox="0 0 24 24"><path d="M3 21V8l9-5 9 5v13"/><path d="M3 21h18"/><path d="M12 10v6M9 13h6"/></svg>'},
  {alvo: "secNotas", rot: "Notas metodológicas", ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>'},
];
function montarTrilho(){
  const trilho = document.getElementById("trilho");
  trilho.innerHTML = TRILHO.map(t => `<button data-alvo="${t.alvo}" data-rotulo="${t.rot}" aria-label="${t.rot}">${t.ico}</button>`).join("");
  trilho.querySelectorAll("button").forEach(b => b.addEventListener("click", () => document.getElementById(b.dataset.alvo).scrollIntoView({behavior: "smooth", block: "start"})));
  const obs = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) trilho.querySelectorAll("button").forEach(b => b.classList.toggle("ativo", b.dataset.alvo === e.target.id)); }), {rootMargin: "-40% 0px -55% 0px"});
  TRILHO.forEach(t => { const el = document.getElementById(t.alvo); if(el) obs.observe(el); });
}

/* ---------------- render ---------------- */
function render(){
  const sel = selecionadas();
  document.getElementById("resumoFiltro").innerHTML = `<span><b>${plural(sel.length, "unidade selecionada", "unidades selecionadas")}</b> · ${esc(descricaoFiltro())}</span>` +
    (F.hab ? `<span class="chip chip-botao" id="chipTiraHab" title="Remover o filtro de habilitação">✕ ${esc(F.hab)} ${esc(dsCurta(F.hab))}</span>` : "");
  const tira = document.getElementById("chipTiraHab"); if(tira) tira.addEventListener("click", () => setHab(""));
  renderBarras(sel); renderLateral(sel); renderMatriz(sel); renderUnidades(sel);
}

montarCabecalho(); montarFiltros(); montarTrilho(); montarDossie(); render();
