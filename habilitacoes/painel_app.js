/* ============================================================
   Painel de Habilitações · Maternidades Estratégicas — app
   Dados: const DADOS (dados_habilitacoes.js, gerado por build_dados.py a partir dos três painéis):
     DADOS.maternidades[] = {cnes, nome, uf, regiao, municipio, lat, lon, grupos[], oficial, paineis[], complexo?, ficha{}, habilitacoes[]}
     habilitação = {co, ds, ini, fim, portaria, dtPortaria, leitos, origem}   (fim "99/9999" = sem prazo final)
     DADOS.tipos[] = catálogo {co, ds, n, leitos}; DADOS.consultaCnes = data da consulta ao CNES.
   Seções: consulta individual (ficha em página própria), por grupo, por local, mapa (Leaflet), notas.
   Mesma família visual dos painéis de Nascimentos, Internação e Mortalidade.
   ============================================================ */
"use strict";

const MAT = DADOS.maternidades;
const TIPOS = DADOS.tipos;
const DS = Object.fromEntries(TIPOS.map(t => [t.co, t.ds]));
const GRUPOS = DADOS.grupos;                       // {apoiada, ebserh, qualineo} -> rótulo
const GRUPO_CURTO = {apoiada: "Apoiadas", ebserh: "EBSERH", qualineo: "QUALINEO"};
const ORDEM_GRUPO = ["apoiada", "ebserh", "qualineo"];
const COR_GRUPO = {apoiada: {fundo: "#279261", borda: "#154A4B"}, ebserh: {fundo: "#2471A3", borda: "#103B5E"}, qualineo: {fundo: "#5FB0D9", borda: "#1B6B8F"}};
const SEM_PRAZO = "99/9999";
const UF_NOME = {AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",
ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",MS:"Mato Grosso do Sul",MT:"Mato Grosso",
PA:"Pará",PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",
RO:"Rondônia",RR:"Roraima",RS:"Rio Grande do Sul",SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins"};
const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];

/* Famílias de habilitações de interesse materno e infantil: colunas da matriz e da tabela por local, marcadores dos
   cartões. Cada família reúne um ou mais códigos do CNES; "tipo" rotula o código dentro da família (UTI II/III). */
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
const normTxt = s => String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const titulo = s => String(s || "").toLowerCase().replace(/(^|[\s(\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(De|Da|Do|Das|Dos|E|Em|Para|Com|Ao|A|O|Na|No)\b/g, w => w.toLowerCase())
  .replace(/\b(Uti|Utin|Ucinco|Ucinca|Hgpar|Sus|Aids|Hiv|Drc|Trs|Snt|Tmo|Cacon|Unacon|Pmae|Cer|Ceo|Cpni|Ppp|Tavi|Avc|Srd|Sdm|Src|Eim|Dr|Ii|Iii|Iv|Hla|Cd4|Cd8|Rna|Ucp|Uco)\b/g, w => w.toUpperCase());
const dsCurta = co => titulo(DS[co] || co).replace(/\s*\*+\.?\s*$/, "").replace(/\.\s*$/, "");
const ativaSemPrazo = h => h.fim === SEM_PRAZO;
const origemRot = o => o === "P" ? "gestor estadual ou municipal" : "Ministério da Saúde";
const fimRot = h => ativaSemPrazo(h) ? "sem prazo final" : `até ${h.fim}`;
MAT.forEach(mt => {
  mt._habs = new Map(); mt.habilitacoes.forEach(h => { if(!mt._habs.has(h.co)) mt._habs.set(h.co, []); mt._habs.get(h.co).push(h); });
  mt._busca = normTxt(`${mt.nome} ${mt.municipio || ""} ${mt.uf || ""} ${UF_NOME[mt.uf] || ""} ${mt.cnes} ${(mt.ficha && mt.ficha.fantasia) || ""}`);
  mt._grupoCor = ORDEM_GRUPO.find(g => mt.grupos.includes(g)) || "apoiada";
});
const temCodigo = (mt, co) => mt._habs.has(co);
const temFamilia = (mt, f) => f.codigos.some(co => mt._habs.has(co));
const bolinha = g => `<i class="bolinha bola-${g}" title="${esc(GRUPOS[g])}"></i>`;
const bolinhas = mt => mt.grupos.map(bolinha).join("");
const porUFNome = (a, b) => (a.uf || "").localeCompare(b.uf || "") || a.nome.localeCompare(b.nome, "pt-BR");
const doGrupo = (lista, g) => g ? lista.filter(m => m.grupos.includes(g)) : lista;
const csvCampo = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function baixarCSV(nome, linhas){
  const txt = "﻿" + linhas.map(l => l.map(csvCampo).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], {type: "text/csv;charset=utf-8"}));
  a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const hoje = () => new Date().toISOString().slice(0, 10);
const cabecalhoCSV = recorte => [`Painel de Habilitações · consulta ao CNES em ${dataBR(DADOS.consultaCnes)} · ${recorte}`];
const CAB_HAB = ["CNES", "Unidade", "Município", "UF", "Grupos", "Código", "Habilitação", "Competência inicial", "Competência final", "Portaria", "Data da portaria", "Leitos", "Origem"];
const linhasCsvUnidade = mt => mt.habilitacoes.map(h => [mt.cnes, mt.nome, mt.municipio || "", mt.uf, mt.grupos.map(g => GRUPO_CURTO[g]).join(" + "), h.co, h.ds, h.ini, ativaSemPrazo(h) ? "sem prazo final" : h.fim, h.portaria || "", h.dtPortaria || "", h.leitos || 0, origemRot(h.origem)]);
function segmento(id, aoMudar){
  const el = document.getElementById(id);
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    el.querySelectorAll("button").forEach(x => x.classList.toggle("ativo", x === b));
    aoMudar(b.dataset);
  });
}
function preencheSelectHab(sel){
  const gMI = document.createElement("optgroup"); gMI.label = "Interesse materno e infantil";
  const gTodas = document.createElement("optgroup"); gTodas.label = "Todas as habilitações do catálogo (por código)";
  TIPOS.filter(t => CODIGOS_MI.has(t.co)).sort((a, b) => b.n - a.n).forEach(t => gMI.appendChild(new Option(`${t.co} · ${dsCurta(t.co)} (${t.n} unidades)`, t.co)));
  TIPOS.forEach(t => gTodas.appendChild(new Option(`${t.co} · ${dsCurta(t.co)} (${t.n})`, t.co)));
  sel.appendChild(gMI); sel.appendChild(gTodas);
}

/* ---------------- cabeçalho, destaques e notas ---------------- */
function montarCabecalho(){
  const consulta = dataBR(DADOS.consultaCnes);
  document.getElementById("heroConsulta").textContent = `consulta ao CNES em ${consulta}`;
  document.getElementById("rodapeConsulta").textContent = `consulta em ${consulta}`;
  const nHabs = MAT.reduce((s, m) => s + m.habilitacoes.length, 0);
  const nPrazo = MAT.reduce((s, m) => s + m.habilitacoes.filter(h => !ativaSemPrazo(h)).length, 0);
  const porGrupo = ORDEM_GRUPO.map(g => `${MAT.filter(m => m.grupos.includes(g)).length} ${GRUPO_CURTO[g]}`).join(" · ");
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
  document.getElementById("statHgpar").textContent = fmtInt(MAT.filter(m => temFamilia(m, hgpar)).length);
  document.getElementById("statHgparSub").textContent = `de ${fmtInt(MAT.length)} unidades`;
  document.getElementById("notaConsulta").innerHTML = `<b>Data da consulta:</b> ${consulta}. As datas de atualização do cadastro de cada unidade no CNES aparecem na ficha. Habilitações encerradas antes da consulta não constam do serviço e, por isso, não aparecem aqui.`;
  const u = DADOS.unidadesPorPainel || {};
  document.getElementById("notaUnidades").innerHTML = `<b>Unidades:</b> ${fmtInt(MAT.length)} códigos CNES, união das unidades dos painéis de Nascimentos (${fmtInt(u.nascimentos)}), Internação (${fmtInt(u.internacao)}) e Mortalidade (${fmtInt(u.mortalidade)}). Grupos: ${porGrupo}; uma unidade pode contar em mais de um grupo.`;
  const anexos = MAT.filter(m => m.oficial === false);
  document.getElementById("notaAnexos").innerHTML = anexos.length
    ? `<b>Lista oficial e anexos:</b> a lista oficial de 09/09/2026 tem ${fmtInt(DADOS.listaOficialN || 115)} códigos CNES, todos presentes neste painel, com os grupos lidos da própria lista. As ${anexos.length} unidades fora dela (${anexos.map(a => `${a.nome}, ${a.uf}`).join("; ")}) foram acrescentadas pela coordenação aos outros painéis ou são o segundo código de um complexo; entram com as mesmas regras e aparecem marcadas como "anexo".${Object.keys(DADOS.excluidas || {}).length ? ` Retiradas deste painel a pedido da coordenação: ${Object.values(DADOS.excluidas).map(t => esc(t.split(":")[0])).join("; ")}.` : ""}` : "";
  document.getElementById("notaFamilias").innerHTML = FAMILIAS.map(f => `<li><b>${esc(f.rot)}</b>: ${f.codigos.map(co => `${co} ${esc(dsCurta(co))}`).join("; ")}.</li>`).join("");
  document.getElementById("btnNotas").addEventListener("click", () => document.getElementById("secNotas").scrollIntoView({behavior: "smooth"}));
}

/* ============================================================
   1. CONSULTA INDIVIDUAL — um seletor por grupo + busca; abre a ficha
   ============================================================ */
function montarConsulta(){
  const sels = {apoiada: "selUnidadeApoiada", ebserh: "selUnidadeEbserh", qualineo: "selUnidadeQualineo"};
  const ns = {apoiada: "nApoiada", ebserh: "nEbserh", qualineo: "nQualineo"};
  ORDEM_GRUPO.forEach(g => {
    const sel = document.getElementById(sels[g]);
    const lista = MAT.filter(m => m.grupos.includes(g)).sort(porUFNome);
    lista.forEach(m => sel.add(new Option(`${m.uf} · ${m.nome}${m.oficial === false ? " (anexo)" : ""} · ${m.habilitacoes.length} hab.`, m.cnes)));
    document.getElementById(ns[g]).textContent = `· ${lista.length} unidades`;
    sel.addEventListener("change", () => abrirDossie(sel.value));
  });
  document.querySelectorAll("#secConsulta button[data-sel]").forEach(b => b.addEventListener("click", () => abrirDossie(document.getElementById(b.dataset.sel).value)));
  const busca = document.getElementById("busca"), res = document.getElementById("buscaRes");
  const renderBusca = () => {
    const q = normTxt(busca.value.trim());
    if(q.length < 2){ res.innerHTML = ""; return; }
    const achados = MAT.filter(m => m._busca.includes(q)).sort(porUFNome).slice(0, 40);
    res.innerHTML = achados.map(m => `<li><button data-cnes="${m.cnes}">${bolinhas(m)}<span>${esc(m.nome)}</span><small>${esc(m.municipio || "")} · ${esc(m.uf)} · ${m.cnes}</small></button></li>`).join("")
      || `<li class="suave" style="font-size:.84rem">Nenhuma unidade encontrada.</li>`;
    res.querySelectorAll("button").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
  };
  busca.addEventListener("input", renderBusca);
}

/* ============================================================
   2. POR GRUPO — barras, painel lateral e matriz de cobertura
   ============================================================ */
const G = {grupo: "apoiada", foco: "mi", hab: "", ordem: "uf"};
let colunasExtra = [], colunasRemovidas = new Set();
const unidadesGrupo = () => doGrupo(MAT, G.grupo);
const rotGrupo = () => G.grupo ? GRUPOS[G.grupo] : "os três grupos";

function renderBarras(){
  const base = unidadesGrupo(), el = document.getElementById("barras");
  const cont = new Map();
  base.forEach(mt => mt._habs.forEach((_, co) => cont.set(co, (cont.get(co) || 0) + 1)));
  let itens = [...cont.entries()].map(([co, n]) => ({co, n}));
  if(G.foco === "mi") itens = itens.filter(i => CODIGOS_MI.has(i.co));
  itens.sort((a, b) => b.n - a.n || a.co.localeCompare(b.co));
  if(G.foco !== "mi") itens = itens.slice(0, 20);
  document.getElementById("barrasTitulo").textContent = `Habilitações · ${rotGrupo()}`;
  document.getElementById("barrasSub").textContent = G.foco === "mi"
    ? `Habilitações de interesse materno e infantil presentes nas ${plural(base.length, "unidade", "unidades")} do grupo.`
    : `As 20 habilitações mais frequentes entre as ${fmtInt(cont.size)} registradas nas ${plural(base.length, "unidade", "unidades")} do grupo.`;
  if(!itens.length){ el.innerHTML = `<p class="suave" style="font-size:.86rem">Nenhuma habilitação neste grupo.</p>`; return; }
  const max = Math.max(...itens.map(i => i.n), 1);
  el.innerHTML = itens.map(i => `<button class="barra ${G.hab === i.co ? "ativa" : ""}" data-co="${i.co}" title="${esc(DS[i.co])} — toque para ver quem tem e quem não tem">
      <span class="rot">${esc(dsCurta(i.co))}<small>${i.co}</small></span>
      <span class="trilha"><i style="width:${(100 * i.n / max).toFixed(1)}%"></i></span>
      <span class="n">${fmtInt(i.n)} <small>${Math.round(100 * i.n / base.length)}%</small></span>
    </button>`).join("");
  el.querySelectorAll(".barra").forEach(b => b.addEventListener("click", () => { G.hab = G.hab === b.dataset.co ? "" : b.dataset.co; renderGrupo(); }));
}
function renderLateral(){
  const base = unidadesGrupo(), el = document.getElementById("painelLateral");
  if(G.hab){
    const co = G.hab, com = base.filter(mt => temCodigo(mt, co)), sem = base.filter(mt => !temCodigo(mt, co));
    const leitos = com.reduce((s, mt) => s + mt._habs.get(co).reduce((t, h) => t + (h.leitos || 0), 0), 0);
    const prazo = com.filter(mt => mt._habs.get(co).some(h => !ativaSemPrazo(h))).length;
    const lista = l => l.slice().sort(porUFNome).map(mt => `<li>${bolinhas(mt)}<button data-cnes="${mt.cnes}">${esc(mt.nome)}</button><small>${esc(mt.uf)}</small></li>`).join("") || "<li class='suave'>nenhuma</li>";
    el.innerHTML = `<p class="eyebrow">Habilitação ${esc(co)} · ${esc(rotGrupo())}</p>
      <h3 style="margin-top:.2rem">${esc(dsCurta(co))}</h3>
      <p class="suave" style="font-size:.78rem; margin-top:.2rem">${esc(DS[co])}</p>
      <div class="num-grande" style="margin-top:.6rem">${fmtInt(com.length)} <span style="font-size:1rem; font-weight:700; color:var(--texto-suave)">de ${fmtInt(base.length)} unidades</span></div>
      <div class="kpi-lista">
        ${leitos ? `<div class="kpi"><span>Leitos habilitados</span><span class="v">${fmtInt(leitos)}</span></div>` : ""}
        ${prazo ? `<div class="kpi"><span>Com competência final definida</span><span class="v">${fmtInt(prazo)} <small>unidades</small></span></div>` : ""}
        <div class="kpi"><span>Sem a habilitação</span><span class="v">${fmtInt(sem.length)} <small>unidades</small></span></div>
      </div>
      <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">Têm</b> (${com.length}):</p><ul class="lista-unid">${lista(com)}</ul>
      <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">Não têm</b> (${sem.length}):</p><ul class="lista-unid">${lista(sem)}</ul>
      <button class="chip chip-botao" id="btnTiraHab" style="margin-top:.8rem">✕ limpar a habilitação</button>`;
    document.getElementById("btnTiraHab").addEventListener("click", () => { G.hab = ""; renderGrupo(); });
  } else {
    const nHabs = base.reduce((s, m) => s + m.habilitacoes.length, 0), semHab = base.filter(m => !m.habilitacoes.length), ufs = new Set(base.map(m => m.uf));
    const outros = G.grupo ? ORDEM_GRUPO.filter(g => g !== G.grupo).map(g => { const n = base.filter(m => m.grupos.includes(g)).length; return n ? `<div class="kpi"><span>${bolinha(g)} também em ${esc(GRUPOS[g])}</span><span class="v">${n}</span></div>` : ""; }).join("")
      : ORDEM_GRUPO.map(g => `<div class="kpi"><span>${bolinha(g)} ${esc(GRUPOS[g])}</span><span class="v">${base.filter(m => m.grupos.includes(g)).length}</span></div>`).join("");
    const familias = FAMILIAS.map(f => { const n = base.filter(m => temFamilia(m, f)).length; return `<div class="kpi"><span>${esc(f.rot)}</span><span class="v">${n} <small>${base.length ? Math.round(100 * n / base.length) : 0}%</small></span></div>`; }).join("");
    el.innerHTML = `<p class="eyebrow">Resumo do grupo</p>
      <h3 style="margin-top:.2rem">${esc(rotGrupo())}</h3>
      <div class="num-grande" style="margin-top:.6rem">${fmtInt(base.length)} <span style="font-size:1rem; font-weight:700; color:var(--texto-suave)">unidades · ${plural(ufs.size, "estado", "estados")}</span></div>
      <div class="kpi-lista">${outros}
        <div class="kpi"><span>Habilitações registradas</span><span class="v">${fmtInt(nHabs)} <small>média ${base.length ? (nHabs / base.length).toLocaleString("pt-BR", {maximumFractionDigits: 1}) : "—"} por unidade</small></span></div>
        ${semHab.length ? `<div class="kpi"><span>Sem nenhuma habilitação</span><span class="v">${semHab.length} <small>${semHab.map(m => esc(m.nome)).join("; ")}</small></span></div>` : ""}
      </div>
      <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">Cobertura das famílias materno-infantis</b> (unidades do grupo com ao menos um código da família):</p>
      <div class="kpi-lista">${familias}</div>
      <p class="suave" style="font-size:.78rem; margin-top:.8rem">Toque em uma barra para listar quem tem e quem não tem a habilitação.</p>`;
  }
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}
function colunasMatriz(){
  const cols = FAMILIAS.filter(f => !colunasRemovidas.has(f.id)).map(f => ({id: f.id, rot: f.rot, codigos: f.codigos, tipo: f.tipo}));
  colunasExtra.forEach(co => cols.push({id: "co" + co, rot: dsCurta(co), codigos: [co], extra: true}));
  return cols;
}
function celula(mt, col){
  const habs = col.codigos.flatMap(co => (mt._habs.get(co) || []).map(h => ({...h, _tipo: col.tipo ? col.tipo[co] : null})));
  if(!habs.length) return {html: `<td class="cel nao" title="${esc(mt.nome)}: sem ${esc(col.rot)} no CNES">·</td>`, texto: ""};
  const prazo = habs.some(h => !ativaSemPrazo(h)), leitos = habs.reduce((s, h) => s + (h.leitos || 0), 0);
  const tipos = [...new Set(habs.map(h => h._tipo).filter(Boolean))].join("+");
  const tip = habs.map(h => `${h.co} ${h.ds} · desde ${h.ini} · ${fimRot(h)}${h.leitos ? ` · ${h.leitos} leitos` : ""}${h.portaria ? ` · ${h.portaria}` : ""}`).join("\n");
  return {html: `<td class="cel ${prazo ? "prazo" : "sim"}" title="${esc(tip)}"><span class="ponto"></span>${tipos ? `<span class="tipo">${tipos}</span>` : ""}${leitos ? `<span class="leitos">${leitos}</span>` : ""}</td>`,
    texto: [tipos, leitos ? `${leitos} leitos` : "", prazo ? "com prazo" : "sim"].filter(Boolean).join(" ")};
}
function ordenar(lista){
  const porNome = (a, b) => a.nome.localeCompare(b.nome, "pt-BR");
  if(G.ordem === "nome") return lista.slice().sort(porNome);
  if(G.ordem === "n") return lista.slice().sort((a, b) => b.habilitacoes.length - a.habilitacoes.length || porNome(a, b));
  return lista.slice().sort(porUFNome);
}
function renderMatriz(){
  const cols = colunasMatriz(), lista = ordenar(unidadesGrupo()), tab = document.getElementById("matriz");
  document.getElementById("matrizTitulo").textContent = `Matriz de cobertura · ${rotGrupo()}`;
  document.getElementById("btnColunasPadrao").hidden = !(colunasExtra.length || colunasRemovidas.size);
  const th = cols.map(c => `<th title="${esc(c.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}"><span class="th-rot">${esc(c.rot)}</span><span class="th-n">${c.codigos.join(", ")}</span><button class="th-x" data-col="${c.id}" title="Retirar esta coluna" aria-label="Retirar a coluna ${esc(c.rot)}">✕</button></th>`).join("");
  const totais = cols.map(() => 0);
  const linhas = lista.map(mt => {
    const cels = cols.map((c, i) => { const r = celula(mt, c); if(r.texto) totais[i]++; return r.html; }).join("");
    return `<tr><td class="col-unid"><button data-cnes="${mt.cnes}">${esc(mt.nome)}</button><small>${bolinhas(mt)} ${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(mt.uf)} · CNES ${mt.cnes}${mt.oficial === false ? " · anexo" : ""}</small></td>${cels}<td class="col-tot" title="Total de habilitações registradas no CNES">${mt.habilitacoes.length}</td></tr>`;
  }).join("");
  tab.innerHTML = `<thead><tr><th class="col-unid">Unidade (${lista.length})</th>${th}<th title="Total de habilitações registradas">Total de habilitações</th></tr></thead>
    <tbody>${linhas || `<tr><td class="col-unid suave" colspan="${cols.length + 2}">Nenhuma unidade.</td></tr>`}</tbody>
    <tfoot><tr><td class="col-unid">Unidades com a habilitação</td>${totais.map(t => `<td>${t}${lista.length ? `<br><span style="font-weight:600; color:var(--texto-suave); font-size:.68rem">${Math.round(100 * t / lista.length)}%</span>` : ""}</td>`).join("")}<td></td></tr></tfoot>`;
  tab.querySelectorAll("td.col-unid button").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
  tab.querySelectorAll(".th-x").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.col;
    if(id.startsWith("co")) colunasExtra = colunasExtra.filter(co => "co" + co !== id); else colunasRemovidas.add(id);
    renderMatriz();
  }));
}
function csvMatriz(){
  const cols = colunasMatriz(), lista = ordenar(unidadesGrupo());
  const cab = ["CNES", "Unidade", "Município", "UF", "Região", "Grupos", "Anexo", ...cols.map(c => `${c.rot} (${c.codigos.join("/")})`), "Total de habilitações"];
  const linhas = lista.map(mt => [mt.cnes, mt.nome, mt.municipio || "", mt.uf, mt.regiao, mt.grupos.map(g => GRUPO_CURTO[g]).join(" + "), mt.oficial === false ? "sim" : "não", ...cols.map(c => celula(mt, c).texto || "não"), mt.habilitacoes.length]);
  baixarCSV(`matriz_habilitacoes_${G.grupo || "tres_grupos"}_${hoje()}.csv`, [cabecalhoCSV(rotGrupo()), cab, ...linhas]);
}
function renderGrupo(){ renderBarras(); renderLateral(); renderMatriz(); }
function montarGrupo(){
  segmento("segGrupo", d => { G.grupo = d.grupo; G.hab = ""; renderGrupo(); });
  segmento("segFoco", d => { G.foco = d.foco; renderBarras(); });
  segmento("segOrdem", d => { G.ordem = d.ordem; renderMatriz(); });
  const selAdd = document.getElementById("selAddCol");
  TIPOS.forEach(t => selAdd.add(new Option(`${t.co} · ${dsCurta(t.co)} (${t.n} unidades)`, t.co)));
  selAdd.addEventListener("change", () => { if(selAdd.value && !colunasExtra.includes(selAdd.value)) colunasExtra.push(selAdd.value); selAdd.value = ""; renderMatriz(); });
  document.getElementById("btnColunasPadrao").addEventListener("click", () => { colunasExtra = []; colunasRemovidas = new Set(); renderMatriz(); });
  document.getElementById("btnCsvMatriz").addEventListener("click", csvMatriz);
  document.getElementById("btnCsvTudo").addEventListener("click", () => baixarCSV(`habilitacoes_${G.grupo || "tres_grupos"}_${hoje()}.csv`, [cabecalhoCSV(rotGrupo()), CAB_HAB, ...ordenar(unidadesGrupo()).flatMap(linhasCsvUnidade)]));
}

/* ============================================================
   3. POR LOCAL — tabela UF × famílias e cartões das unidades
   ============================================================ */
const LOC = {regiao: "", uf: "", grupo: ""};
const unidadesLocal = () => doGrupo(MAT, LOC.grupo).filter(m => (!LOC.regiao || m.regiao === LOC.regiao) && (!LOC.uf || m.uf === LOC.uf));
const rotLocal = () => `${LOC.uf ? UF_NOME[LOC.uf] : LOC.regiao ? `região ${LOC.regiao}` : "Brasil"} · ${LOC.grupo ? GRUPOS[LOC.grupo] : "os três grupos"}`;
function linhasLocal(){
  const base = unidadesLocal();
  const ufs = [...new Set(base.map(m => m.uf))].sort();
  return {base, linhas: ufs.map(uf => { const us = base.filter(m => m.uf === uf); return {uf, nome: UF_NOME[uf] || uf, regiao: us[0].regiao, n: us.length, fam: FAMILIAS.map(f => us.filter(m => temFamilia(m, f)).length)}; })};
}
function renderLocal(){
  const {base, linhas} = linhasLocal(), tab = document.getElementById("tabelaLocal");
  const th = FAMILIAS.map(f => `<th title="${esc(f.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}"><span class="th-rot">${esc(f.rot)}</span></th>`).join("");
  const corpo = linhas.map(l => `<tr><td class="col-uf">${esc(l.nome)} (${l.uf})<small>${esc(l.regiao)} · ${plural(l.n, "unidade", "unidades")}</small></td>${l.fam.map(n => `<td class="cel ${n ? "" : "zero"}">${n ? `<b>${n}</b> <small>/ ${l.n}</small>` : "0"}</td>`).join("")}</tr>`).join("");
  const tot = FAMILIAS.map(f => base.filter(m => temFamilia(m, f)).length);
  tab.innerHTML = `<thead><tr><th class="col-uf">Estado</th>${th}</tr></thead>
    <tbody>${corpo || `<tr><td class="col-uf suave" colspan="${FAMILIAS.length + 1}">Nenhuma unidade no recorte.</td></tr>`}</tbody>
    <tfoot><tr><td class="col-uf">Total · ${plural(base.length, "unidade", "unidades")}</td>${tot.map(n => `<td>${n} <small style="font-weight:600; color:var(--texto-suave)">/ ${base.length}</small></td>`).join("")}</tr></tfoot>`;
  renderCartoes(base);
}
function csvLocal(){
  const {base, linhas} = linhasLocal();
  baixarCSV(`habilitacoes_por_estado_${hoje()}.csv`, [cabecalhoCSV(rotLocal()), ["UF", "Estado", "Região", "Unidades", ...FAMILIAS.map(f => `${f.rot} (${f.codigos.join("/")})`)],
    ...linhas.map(l => [l.uf, l.nome, l.regiao, l.n, ...l.fam]), ["Total", "", "", base.length, ...FAMILIAS.map(f => base.filter(m => temFamilia(m, f)).length)]]);
}
const LIMITE_CARTOES = 24;
let mostrarTodosCartoes = false;
function renderCartoes(sel){
  const todas = sel.slice().sort(porUFNome), el = document.getElementById("gradeUnidades");
  const lista = mostrarTodosCartoes ? todas : todas.slice(0, LIMITE_CARTOES);
  document.getElementById("unidadesResumo").textContent = `${plural(todas.length, "unidade", "unidades")} · ${rotLocal()}${lista.length < todas.length ? ` · mostrando as ${lista.length} primeiras` : ""}`;
  const btn = document.getElementById("btnMaisCartoes");
  btn.hidden = todas.length <= LIMITE_CARTOES;
  btn.textContent = mostrarTodosCartoes ? "mostrar menos" : `mostrar todas as ${todas.length} unidades`;
  btn.onclick = () => { mostrarTodosCartoes = !mostrarTodosCartoes; renderCartoes(sel); };
  el.innerHTML = lista.map(mt => {
    const n = mt.habilitacoes.length, nPrazo = mt.habilitacoes.filter(h => !ativaSemPrazo(h)).length;
    const tags = FAMILIAS.filter(f => temFamilia(mt, f)).map(f => {
      const habs = f.codigos.flatMap(co => mt._habs.get(co) || []);
      const leitos = habs.reduce((s, h) => s + (h.leitos || 0), 0);
      const tipo = f.tipo ? [...new Set(habs.map(h => f.tipo[h.co]).filter(Boolean))].join("+") : "";
      return `<span class="tag ${habs.some(h => !ativaSemPrazo(h)) ? "prazo" : ""}" title="${esc(habs.map(h => `${h.co} ${h.ds} · desde ${h.ini} · ${fimRot(h)}`).join("\n"))}">${esc(f.rot)}${tipo ? ` ${tipo}` : ""}${leitos ? ` · ${leitos}` : ""}</span>`;
    });
    const outras = mt.habilitacoes.filter(h => !CODIGOS_MI.has(h.co)).length;
    if(outras) tags.push(`<span class="tag mais">+ ${plural(outras, "outra habilitação", "outras habilitações")}</span>`);
    if(!n) tags.push(`<span class="tag nenhuma">nenhuma habilitação registrada no CNES</span>`);
    return `<article class="unidade ${mt.oficial === false ? "anexo" : ""}">
      <div class="u-topo"><div><h3>${esc(mt.nome)}</h3><div class="u-local">${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(UF_NOME[mt.uf] || mt.uf)}</div></div><div class="u-cnes">CNES ${mt.cnes}</div></div>
      <div class="u-grupos">${mt.grupos.map(g => `<span>${bolinha(g)}${esc(GRUPO_CURTO[g])}</span>`).join("")}${mt.oficial === false ? `<span class="chip chip-anexo" style="font-size:.68rem; padding:.1rem .5rem">anexo</span>` : ""}${mt.complexo ? `<span class="chip" style="font-size:.68rem; padding:.1rem .5rem" title="Códigos CNES do complexo: ${mt.complexo.join(" e ")}">complexo</span>` : ""}</div>
      <div class="u-n"><b>${n}</b><span>${n === 1 ? "habilitação registrada" : "habilitações registradas"}${nPrazo ? `, ${nPrazo} com prazo` : ""}</span></div>
      <div class="u-tags">${tags.join("")}</div>
      <div class="u-rodape"><small>Cadastro atualizado no CNES em ${dataBR(mt.ficha && mt.ficha.atualizacao)}</small><button class="chip chip-acao" data-cnes="${mt.cnes}">Ver ficha →</button></div>
    </article>`;
  }).join("") || `<p class="suave">Nenhuma unidade no recorte.</p>`;
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}
function montarLocal(){
  const selRegiao = document.getElementById("selRegiao"), selUF = document.getElementById("selUF");
  REGIOES.forEach(r => selRegiao.add(new Option(r, r)));
  const ufs = [...new Set(MAT.map(m => m.uf).filter(Boolean))].sort();
  const preencheUF = () => {
    const atual = selUF.value; selUF.innerHTML = '<option value="">Todos os estados</option>';
    ufs.filter(uf => !LOC.regiao || MAT.some(m => m.uf === uf && m.regiao === LOC.regiao)).forEach(uf => selUF.add(new Option(`${UF_NOME[uf] || uf} (${uf})`, uf)));
    selUF.value = [...selUF.options].some(o => o.value === atual) ? atual : ""; LOC.uf = selUF.value;
  };
  preencheUF();
  selRegiao.addEventListener("change", () => { LOC.regiao = selRegiao.value; preencheUF(); mostrarTodosCartoes = false; renderLocal(); });
  selUF.addEventListener("change", () => { LOC.uf = selUF.value; mostrarTodosCartoes = false; renderLocal(); });
  segmento("segGrupoLocal", d => { LOC.grupo = d.grupo; mostrarTodosCartoes = false; renderLocal(); });
  document.getElementById("btnCsvLocal").addEventListener("click", csvLocal);
}

/* ============================================================
   4. MAPA — modelo do Painel NV: malha do Brasil (UF / macro / RS) com filtros Território e Estado em cascata,
   pills de habilitação, zoom e painel de seleção; mapa de unidades (Leaflet) no acordeão, com o mesmo recorte.
   ============================================================ */
const NS = "http://www.w3.org/2000/svg";
const TEM_GEO = typeof GEO !== "undefined" && GEO && GEO.niveis;
const REGIAO_UFS = {Norte:["AC","AM","AP","PA","RO","RR","TO"],Nordeste:["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
"Centro-Oeste":["DF","GO","MS","MT"],Sudeste:["ES","MG","RJ","SP"],Sul:["PR","RS","SC"]};
/* Conversão aproximada lat/lon -> coordenadas da malha (polinômio de grau 3, habilitacoes/ajusta_projecao.js); usada só
   para os pontos opcionais sobre a malha. Depois, cada ponto é encaixado dentro da própria região de saúde. */
const PROJ = {lon0: -54, lat0: -14, deg: 3,
  cx: [389.6693924797041,-25.669375918899323,2.2974764087746746,6.94771717316214,227.5848973996615,10.44407831174322,-15.59958425479866,2.614872436012288,11.203067014348914,-9.255000451100843],
  cy: [384.79217286263037,-206.11315840845927,-1.297115372976244,0.4508034745453812,5.709727699623541,5.132886143071913,2.0589199190583702,3.9090790755116522,2.524876252788176,-5.129157042018251]};
function projeta(lon, lat){
  const u = (lon - PROJ.lon0) / 10, v = (lat - PROJ.lat0) / 10, t = [];
  for(let a = 0; a <= PROJ.deg; a++) for(let b = 0; b <= PROJ.deg - a; b++) t.push(Math.pow(u, a) * Math.pow(v, b));
  return [t.reduce((s, x, k) => s + x * PROJ.cx[k], 0), t.reduce((s, x, k) => s + x * PROJ.cy[k], 0)];
}
const terrId = (nivel, mt) => nivel === "uf" ? mt.uf : String((mt.geo || {})[nivel] ?? "");
function encaixaPontos(){
  if(!TEM_GEO) return 0;
  const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${GEO.W} ${GEO.H}`);
  svg.style.cssText = "position:absolute; width:0; height:0; overflow:hidden"; document.body.appendChild(svg);
  const paths = {};
  ["rs", "macro", "uf"].forEach(n => { paths[n] = {}; GEO.niveis[n].forEach(t => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", t.d); svg.appendChild(p); paths[n][String(t.id)] = p; }); });
  const dentro = (p, xy) => { const pt = svg.createSVGPoint(); pt.x = xy[0]; pt.y = xy[1]; return p.isPointInFill(pt); };
  const interior = p => {
    const pts = [...p.getAttribute("d").matchAll(/(-?\d+\.?\d*),(-?\d+\.?\d*)/g)].map(m => [+m[1], +m[2]]);
    const c = [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
    if(dentro(p, c)) return c;
    const bb = p.getBBox(), b = [bb.x + bb.width / 2, bb.y + bb.height / 2];
    if(dentro(p, b)) return b;
    for(let k = 0; k < pts.length; k += Math.max(1, Math.floor(pts.length / 40))){ const q = [(pts[k][0] * 2 + c[0]) / 3, (pts[k][1] * 2 + c[1]) / 3]; if(dentro(p, q)) return q; }
    return pts[0];
  };
  let ajustados = 0;
  MAT.forEach(mt => {
    if(mt.lat == null || mt.lon == null){ mt._xy = null; return; }
    let xy = projeta(mt.lon, mt.lat), alvo = null;
    for(const n of ["rs", "macro", "uf"]){ const p = paths[n][terrId(n, mt)]; if(p){ alvo = p; break; } }
    if(alvo && !dentro(alvo, xy)){ xy = interior(alvo); ajustados++; mt._ajustado = true; }
    mt._xy = xy;
  });
  svg.remove();
  return ajustados;
}

/* estado do mapa: hab = {rot, codigos} ou null (todas as unidades) */
const MP = {regiao: null, uf: null, nivel: "uf", grupo: "", hab: null, nomes: true, pontosMalha: false, busca: ""};
let leaf = null, camadaPontos = null, svgEl = null, animId = null;
const vbHome = TEM_GEO ? [0, 0, GEO.W, GEO.H] : null;
const RAMPA_MAPA = ["#D8EEDF", "#A9DBBC", "#6DBF93", "#2F9A68", "#1B5F51"];
const classeMapa = n => n <= 0 ? -1 : n === 1 ? 0 : n === 2 ? 1 : n <= 4 ? 2 : n <= 9 ? 3 : 4;
const ROT_CLASSES = ["1 unidade", "2 unidades", "3 a 4 unidades", "5 a 9 unidades", "10 ou mais"];
const ufDoTerr = (nivel, t) => nivel === "uf" ? t.id : ((/-\s*([A-Z]{2})\s*$/.exec(t.nome || "") || [])[1] || null);
const ufsRecorte = () => MP.uf ? [MP.uf] : MP.regiao ? (REGIAO_UFS[MP.regiao] || []) : null;
const temHabMapa = m => !MP.hab || MP.hab.codigos.some(co => m._habs.has(co));
const rotRecorte = () => MP.uf ? UF_NOME[MP.uf] : MP.regiao ? `Região ${MP.regiao}` : "Brasil";
const rotHabMapa = () => MP.hab ? MP.hab.rot : "Todas as unidades";
/* unidades do recorte: território + grupo (com ou sem a habilitação) */
const unidadesRecorte = () => { const ufs = ufsRecorte(); return doGrupo(MAT, MP.grupo).filter(m => !ufs || ufs.includes(m.uf)); };
const unidadesMapa = () => unidadesRecorte().filter(temHabMapa);

function mostraTipMapa(e, html){
  const tip = document.getElementById("tipMapa"); tip.innerHTML = html; tip.hidden = false;
  tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 332) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 12) + "px";
}
function escondeTipMapa(){ document.getElementById("tipMapa").hidden = true; }
function animaViewBox(alvo){
  if(!svgEl) return; cancelAnimationFrame(animId);
  const de = svgEl.getAttribute("viewBox").split(" ").map(Number), t0 = performance.now(), dur = 480;
  const passo = now => { const k = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - k, 3); svgEl.setAttribute("viewBox", de.map((v, i) => v + (alvo[i] - v) * e).map(v => v.toFixed(1)).join(" ")); ajustaEscalaSvg(); if(k < 1) animId = requestAnimationFrame(passo); };
  animId = requestAnimationFrame(passo);
}
function ajustaEscalaSvg(){
  if(!svgEl) return;
  const vbw = Number(svgEl.getAttribute("viewBox").split(" ")[2]), k = vbw / GEO.W;
  svgEl.querySelectorAll("circle.ponto").forEach(c => c.setAttribute("r", (5.2 * k).toFixed(2)));
  svgEl.querySelectorAll("text.rotulo").forEach(t => { t.setAttribute("font-size", (10.5 * k).toFixed(2)); t.setAttribute("x", (Number(t.dataset.x) + 7 * k).toFixed(1)); t.setAttribute("y", (Number(t.dataset.y) + 3.6 * k).toFixed(1)); });
  svgEl.querySelectorAll("text.sigla").forEach(t => { t.setAttribute("font-size", (13 * k).toFixed(2)); t.setAttribute("y", (Number(t.dataset.cy) + 4.5 * k).toFixed(1)); });
}
function zoomUFs(ufs, animar = true){
  if(!svgEl) return;
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, achou = false;
  svgEl.querySelectorAll("path.t").forEach(p => { if(!ufs.includes(p.dataset.uf)) return; const bb = p.getBBox(); x0 = Math.min(x0, bb.x); y0 = Math.min(y0, bb.y); x1 = Math.max(x1, bb.x + bb.width); y1 = Math.max(y1, bb.y + bb.height); achou = true; });
  if(!achou) return;
  const pad = Math.max(x1 - x0, y1 - y0) * 0.12, vb = [x0 - pad, y0 - pad, (x1 - x0) + 2 * pad, (y1 - y0) + 2 * pad];
  if(animar) animaViewBox(vb); else { svgEl.setAttribute("viewBox", vb.map(v => v.toFixed(1)).join(" ")); ajustaEscalaSvg(); }
}
function desenhaMapaSvg(){
  const box = document.getElementById("mapaSvg");
  if(!TEM_GEO){ box.innerHTML = `<p class="suave" style="padding:1rem">Malhas não disponíveis nesta montagem.</p>`; return; }
  const lista = unidadesMapa(), terr = GEO.niveis[MP.nivel], ufsVis = ufsRecorte();
  const porTerr = new Map(); lista.forEach(m => { const id = terrId(MP.nivel, m); if(!porTerr.has(id)) porTerr.set(id, []); porTerr.get(id).push(m); });
  box.innerHTML = "";
  svgEl = document.createElementNS(NS, "svg"); svgEl.setAttribute("viewBox", vbHome.join(" ")); svgEl.setAttribute("role", "img"); svgEl.setAttribute("aria-label", "Mapa do Brasil");
  const g = document.createElementNS(NS, "g");
  terr.forEach(t => {
    const uf = ufDoTerr(MP.nivel, t), us = porTerr.get(String(t.id)) || [];
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", t.d); p.setAttribute("class", "t"); p.dataset.uf = uf || "";
    if(ufsVis && !ufsVis.includes(uf)) p.style.display = "none";
    const cls = classeMapa(us.length); p.setAttribute("fill", cls < 0 ? "#E4EBE5" : RAMPA_MAPA[cls]);
    const nome = MP.nivel === "uf" ? UF_NOME[t.id] : t.nome, max = 8;
    const tip = `<div class="tm-titulo">${esc(nome)}</div><div class="tm-valor">${us.length ? plural(us.length, "unidade", "unidades") + (MP.hab ? ` com ${esc(MP.hab.rot)}` : " do painel") : (MP.hab ? `Nenhuma unidade com ${esc(MP.hab.rot)}` : "Sem unidade do painel")}</div>` +
      (us.length ? `<ul>${us.slice(0, max).map(m => `<li>${esc(m.nome)}</li>`).join("")}${us.length > max ? `<li>+ ${us.length - max} outras</li>` : ""}</ul>` : "");
    p.addEventListener("mousemove", e => mostraTipMapa(e, tip)); p.addEventListener("mouseleave", escondeTipMapa);
    p.addEventListener("click", () => { escondeTipMapa(); if(!uf) return; cliqueUF(uf); });
    g.appendChild(p);
  });
  if(MP.nivel !== "uf"){
    const bordas = ufsVis ? GEO.niveis.uf.filter(t => ufsVis.includes(t.id)).map(t => t.d) : (GEO.bordaUF ? [GEO.bordaUF] : []);
    bordas.forEach(d => { const b = document.createElementNS(NS, "path"); b.setAttribute("d", d); b.setAttribute("fill", "none"); b.setAttribute("stroke", "var(--indigo)"); b.setAttribute("stroke-width", ufsVis ? "1.4" : "1"); b.setAttribute("vector-effect", "non-scaling-stroke"); b.setAttribute("pointer-events", "none"); b.setAttribute("opacity", ".45"); g.appendChild(b); });
  }
  svgEl.appendChild(g); box.appendChild(svgEl);
  if(MP.nivel === "uf"){
    svgEl.querySelectorAll("path.t").forEach(p => { if(p.style.display === "none") return; const bb = p.getBBox(); if(bb.width < 14 && bb.height < 14) return; const tx = document.createElementNS(NS, "text"); tx.setAttribute("x", (bb.x + bb.width / 2).toFixed(1)); tx.dataset.cy = (bb.y + bb.height / 2).toFixed(1); tx.setAttribute("text-anchor", "middle"); tx.setAttribute("class", "sigla"); tx.setAttribute("fill", classeMapa((porTerr.get(p.dataset.uf) || []).length) >= 3 ? "#FFFFFF" : "#0A213D"); tx.setAttribute("opacity", ".8"); tx.textContent = p.dataset.uf; g.appendChild(tx); });
  }
  if(MP.pontosMalha){
    const gp = document.createElementNS(NS, "g");
    lista.filter(m => m._xy).sort((a, b) => a._xy[1] - b._xy[1]).forEach(m => {
      const cor = COR_GRUPO[m._grupoCor];
      const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", m._xy[0].toFixed(1)); c.setAttribute("cy", m._xy[1].toFixed(1)); c.setAttribute("class", "ponto"); c.setAttribute("fill", cor.fundo); c.setAttribute("stroke", cor.borda);
      c.addEventListener("mousemove", e => mostraTipMapa(e, `<div class="tm-titulo">${esc(m.nome)}</div><div>${esc(m.municipio || "")} · ${esc(m.uf)} · CNES ${m.cnes}</div><div class="tm-valor">${m.grupos.map(g => GRUPOS[g]).join(" · ")}</div><div class="tm-sem">toque para abrir a ficha${m._ajustado ? " · posição aproximada, dentro da região de saúde" : " · posição aproximada"}</div>`));
      c.addEventListener("mouseleave", escondeTipMapa); c.addEventListener("click", () => { escondeTipMapa(); abrirDossie(m.cnes); });
      gp.appendChild(c);
      if(MP.nomes){ const tx = document.createElementNS(NS, "text"); tx.setAttribute("class", "rotulo"); tx.dataset.x = m._xy[0].toFixed(1); tx.dataset.y = m._xy[1].toFixed(1); tx.textContent = m.nome.length > 34 ? m.nome.slice(0, 33) + "…" : m.nome; gp.appendChild(tx); }
    });
    svgEl.appendChild(gp);
  }
  if(ufsVis) zoomUFs(ufsVis, false); else ajustaEscalaSvg();
  // legenda
  const nivelRot = {uf: "estado", macro: "macrorregião de saúde", rs: "região de saúde"}[MP.nivel];
  document.getElementById("tituloLegenda").textContent = `${rotHabMapa()} · unidades por ${nivelRot} · ${rotRecorte()}`;
  const presentes = new Set([...porTerr.values()].map(us => classeMapa(us.length)));
  document.getElementById("legendaMapa").innerHTML = ROT_CLASSES.map((r, i) => presentes.has(i) ? `<span><i style="background:${RAMPA_MAPA[i]}"></i>${r}</span>` : "").join("") + `<span><i style="background:#E4EBE5"></i>${MP.hab ? "sem unidade com a habilitação" : "sem unidade do painel"}</span>`;
}
function cliqueUF(uf){
  if(MP.uf === uf){ limparSelecaoMapa(); return; }
  MP.uf = uf; MP.regiao = Object.keys(REGIAO_UFS).find(r => REGIAO_UFS[r].includes(uf)) || null;
  sincronizaFiltrosMapa(); renderMapa();
}
function limparSelecaoMapa(){ MP.uf = null; MP.regiao = null; sincronizaFiltrosMapa(); renderMapa(); }
function preencheUFMapa(){
  const sUM = document.getElementById("selUFMapa");
  const ufs = MP.regiao ? [...(REGIAO_UFS[MP.regiao] || [])].sort() : Object.keys(UF_NOME).sort();
  sUM.innerHTML = `<option value="">${MP.regiao ? "Toda a região " + MP.regiao : "Todo o Brasil"}</option>` + ufs.map(u => `<option value="${u}">${UF_NOME[u]}</option>`).join("");
  sUM.value = MP.uf || "";
}
function sincronizaFiltrosMapa(){
  preencheUFMapa();
  document.getElementById("selRegiaoMapa").value = MP.regiao || "";
  document.getElementById("btnResetMapa").hidden = !(MP.uf || MP.regiao);
}
function renderPainelSelecao(){
  const el = document.getElementById("mapaLateral"), base = unidadesRecorte(), com = base.filter(temHabMapa);
  const porGrupo = ORDEM_GRUPO.map(g => { const bg = base.filter(m => m.grupos.includes(g)); if(!bg.length) return ""; const cg = bg.filter(temHabMapa); return `<div class="kpi"><span>${bolinha(g)} ${esc(GRUPOS[g])}</span><span class="v">${cg.length}${MP.hab ? ` <small>de ${bg.length}</small>` : ""}</span></div>`; }).join("");
  const leitos = MP.hab ? com.reduce((s, m) => s + MP.hab.codigos.reduce((t, co) => t + (m._habs.get(co) || []).reduce((u, h) => u + (h.leitos || 0), 0), 0), 0) : 0;
  const lista = com.slice().sort(porUFNome);
  el.innerHTML = `<p class="eyebrow">${esc(rotRecorte())}${MP.grupo ? ` · ${esc(GRUPO_CURTO[MP.grupo])}` : ""}</p>
    <h3 style="margin-top:.2rem">${esc(rotHabMapa())}</h3>
    ${MP.hab && MP.hab.codigos.length ? `<p class="suave" style="font-size:.76rem; margin-top:.2rem">${MP.hab.codigos.map(co => `${co} ${esc(dsCurta(co))}`).join("; ")}</p>` : ""}
    <div class="num-grande" style="margin-top:.6rem">${fmtInt(com.length)} <span style="font-size:1rem; font-weight:700; color:var(--texto-suave)">${MP.hab ? `de ${fmtInt(base.length)} unidades` : "unidades"}</span></div>
    <div class="kpi-lista">${porGrupo}${leitos ? `<div class="kpi"><span>Leitos habilitados</span><span class="v">${fmtInt(leitos)}</span></div>` : ""}<div class="kpi"><span>Estados</span><span class="v">${new Set(com.map(m => m.uf)).size}</span></div></div>
    <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">Unidades</b> (toque para abrir a ficha):</p>
    <ul class="lista-unid" style="max-height:360px">${lista.map(m => `<li>${bolinhas(m)}<button data-cnes="${m.cnes}">${esc(m.nome)}</button><small>${esc(m.uf)}</small></li>`).join("") || "<li class='suave'>nenhuma</li>"}</ul>`;
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}
/* ---- mapa de unidades (Leaflet), no acordeão ---- */
function iniciaLeaflet(){
  if(leaf) return;
  if(typeof L === "undefined"){ document.getElementById("mapaLeaflet").innerHTML = `<p class="suave" style="padding:1rem">O mapa de unidades precisa de internet para carregar a biblioteca e o fundo (OpenStreetMap).</p>`; return; }
  leaf = L.map("mapaLeaflet", {scrollWheelZoom: true}).setView([-14.5, -52], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18}).addTo(leaf);
  leaf.on("popupopen", e => { const b = e.popup.getElement().querySelector("button[data-cnes]"); if(b) b.addEventListener("click", () => abrirDossie(b.dataset.cnes)); });
}
function unidadesLeaflet(){ const q = normTxt(MP.busca.trim()); return unidadesMapa().filter(m => !q || m._busca.includes(q)); }
function desenhaLeaflet(){
  if(!leaf) return;
  if(camadaPontos) leaf.removeLayer(camadaPontos);
  camadaPontos = L.layerGroup(); const pontos = [];
  unidadesLeaflet().forEach(m => {
    if(m.lat == null || m.lon == null) return;
    pontos.push([m.lat, m.lon]);
    const cor = COR_GRUPO[m._grupoCor];
    const mk = L.circleMarker([m.lat, m.lon], {radius: 8, color: cor.borda, weight: 2, fillColor: cor.fundo, fillOpacity: .95});
    const habs = MP.hab ? MP.hab.codigos.flatMap(co => m._habs.get(co) || []) : [];
    const detalhe = MP.hab ? habs.map(h => `<div><b>${esc(h.co)} ${esc(dsCurta(h.co))}</b>${h.leitos ? ` · ${h.leitos} leitos` : ""}<br><span style="color:#4E6A5C">desde ${esc(h.ini)} · ${esc(fimRot(h))}${h.portaria ? ` · ${esc(h.portaria)}` : ""}</span></div>`).join("") : `<div>${plural(m.habilitacoes.length, "habilitação registrada", "habilitações registradas")}</div>`;
    mk.bindPopup(`<div class="pop-nome">${esc(m.nome)}</div><div>${esc(m.municipio || "")} · ${esc(m.uf)} · CNES ${m.cnes}</div><div style="margin:.2rem 0">${m.grupos.map(g => GRUPOS[g]).join(" · ")}</div>${detalhe}<button class="pop-btn" data-cnes="${m.cnes}">Abrir ficha →</button>`);
    mk.bindTooltip(m.nome, {permanent: MP.nomes, direction: "right", offset: [8, 0], className: "rotulo-unid", opacity: 1});
    camadaPontos.addLayer(mk);
  });
  leaf.addLayer(camadaPontos);
  if(pontos.length) leaf.fitBounds(pontos, {padding: [24, 24], maxZoom: 8});
}
function renderMapa(){
  desenhaMapaSvg(); renderPainelSelecao();
  if(document.getElementById("detUnidades").open){ iniciaLeaflet(); if(leaf){ leaf.invalidateSize(); desenhaLeaflet(); } }
  document.querySelectorAll("#listaHabsMapa button").forEach(b => b.classList.toggle("ativo", (b.dataset.fam || "") === (MP.hab ? MP.hab.id : "")));
}
function montarMapa(){
  // pills: todas + famílias materno-infantis (com nº de unidades)
  const lista = document.getElementById("listaHabsMapa");
  const pills = [{id: "", rot: "Todas as unidades", codigos: []}, ...FAMILIAS];
  lista.innerHTML = pills.map(f => `<button data-fam="${f.id}" title="${esc(f.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}">${esc(f.rot)}<small>${f.id ? MAT.filter(m => temFamilia(m, f)).length : MAT.length}</small></button>`).join("");
  lista.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const f = FAMILIAS.find(x => x.id === b.dataset.fam); MP.hab = f ? {id: f.id, rot: f.rot, codigos: f.codigos} : null; document.getElementById("selHabMapa").value = ""; renderMapa(); }));
  const sel = document.getElementById("selHabMapa"); preencheSelectHab(sel);
  sel.addEventListener("change", () => { MP.hab = sel.value ? {id: "co" + sel.value, rot: `${sel.value} ${dsCurta(sel.value)}`, codigos: [sel.value]} : null; renderMapa(); });
  const sRM = document.getElementById("selRegiaoMapa"), sUM = document.getElementById("selUFMapa");
  sRM.addEventListener("change", () => { MP.regiao = sRM.value || null; MP.uf = null; sincronizaFiltrosMapa(); renderMapa(); });
  sUM.addEventListener("change", () => { MP.uf = sUM.value || null; if(MP.uf) MP.regiao = Object.keys(REGIAO_UFS).find(r => REGIAO_UFS[r].includes(MP.uf)) || null; sincronizaFiltrosMapa(); renderMapa(); });
  document.getElementById("selNivelMapa").addEventListener("change", e => { MP.nivel = e.target.value; renderMapa(); });
  document.getElementById("selGrupoMapa").addEventListener("change", e => { MP.grupo = e.target.value; renderMapa(); });
  document.getElementById("btnResetMapa").addEventListener("click", limparSelecaoMapa);
  document.getElementById("chkPontosMalha").addEventListener("change", e => { MP.pontosMalha = e.target.checked; renderMapa(); });
  document.getElementById("chkNomes").addEventListener("change", e => { MP.nomes = e.target.checked; desenhaLeaflet(); });
  document.getElementById("buscaUnidadeMapa").addEventListener("input", e => { MP.busca = e.target.value; desenhaLeaflet(); });
  document.getElementById("detUnidades").addEventListener("toggle", e => { if(e.target.open){ iniciaLeaflet(); if(leaf){ setTimeout(() => { leaf.invalidateSize(); desenhaLeaflet(); }, 50); } } });
  document.getElementById("btnCsvMapa").addEventListener("click", () => {
    const vis = unidadesLeaflet().sort(porUFNome);
    const linhas = MP.hab ? vis.flatMap(m => MP.hab.codigos.flatMap(co => (m._habs.get(co) || []).map(h => [m.cnes, m.nome, m.municipio || "", m.uf, m.grupos.map(g => GRUPO_CURTO[g]).join(" + "), m.lat, m.lon, h.co, h.ds, h.ini, ativaSemPrazo(h) ? "sem prazo final" : h.fim, h.portaria || "", h.leitos || 0])))
      : vis.map(m => [m.cnes, m.nome, m.municipio || "", m.uf, m.grupos.map(g => GRUPO_CURTO[g]).join(" + "), m.lat, m.lon, "", "", "", "", "", m.habilitacoes.length]);
    baixarCSV(`mapa_${(MP.hab ? MP.hab.id : "todas")}_${hoje()}.csv`, [cabecalhoCSV(`${rotHabMapa()} · ${rotRecorte()}${MP.grupo ? " · " + GRUPOS[MP.grupo] : ""}`), ["CNES", "Unidade", "Município", "UF", "Grupos", "Latitude", "Longitude", "Código", "Habilitação", "Competência inicial", "Competência final", "Portaria", "Leitos (ou total de habilitações)"], ...linhas]);
  });
  sincronizaFiltrosMapa();
  encaixaPontos();
  renderMapa();
}

/* ============================================================
   FICHA DA UNIDADE (página sobreposta)
   ============================================================ */
let dossieAtual = null;
function abrirDossie(cnes){
  const mt = MAT.find(m => m.cnes === cnes); if(!mt) return;
  dossieAtual = mt;
  const sel = document.getElementById("selUnidadePd");
  if(!sel.options.length) MAT.slice().sort(porUFNome).forEach(m => sel.add(new Option(`${m.uf} · ${m.nome}`, m.cnes)));
  sel.value = cnes;
  const f = mt.ficha || {};
  const gest = {M: "Municipal", E: "Estadual", D: "Dupla"}[f.gestao] || f.gestao || "—";
  const endereco = [f.endereco, f.bairro, f.cep ? `CEP ${f.cep}` : null].filter(Boolean).join(" · ");
  const n = mt.habilitacoes.length, nPrazo = mt.habilitacoes.filter(h => !ativaSemPrazo(h)).length, leitos = mt.habilitacoes.reduce((s, h) => s + (h.leitos || 0), 0);
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
  {alvo: "secConsulta", rot: "Consulta individual", ico: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5"/></svg>'},
  {alvo: "secGrupo", rot: "Por grupo", ico: '<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><path d="M8 15v-5M12 15V7M16 15v-3"/></svg>'},
  {alvo: "secLocal", rot: "Por local", ico: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>'},
  {alvo: "secMapa", rot: "Mapa do Brasil e unidades", ico: '<svg viewBox="0 0 24 24"><path d="M12 21s-6-5.3-6-10a6 6 0 0 1 12 0c0 4.7-6 10-6 10z"/><circle cx="12" cy="11" r="2.2"/></svg>'},
  {alvo: "secNotas", rot: "Notas metodológicas", ico: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/></svg>'},
];
function montarTrilho(){
  const trilho = document.getElementById("trilho");
  trilho.innerHTML = TRILHO.map(t => `<button data-alvo="${t.alvo}" data-rotulo="${t.rot}" aria-label="${t.rot}">${t.ico}</button>`).join("");
  trilho.querySelectorAll("button").forEach(b => b.addEventListener("click", () => document.getElementById(b.dataset.alvo).scrollIntoView({behavior: "smooth", block: "start"})));
  const obs = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) trilho.querySelectorAll("button").forEach(b => b.classList.toggle("ativo", b.dataset.alvo === e.target.id)); }), {rootMargin: "-40% 0px -55% 0px"});
  TRILHO.forEach(t => { const el = document.getElementById(t.alvo); if(el) obs.observe(el); });
}

montarCabecalho(); montarConsulta(); montarGrupo(); montarLocal(); montarMapa(); montarTrilho(); montarDossie();
renderGrupo(); renderLocal();
