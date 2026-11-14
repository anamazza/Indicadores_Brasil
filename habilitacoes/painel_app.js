/* ============================================================
   Painel de Habilitações · Maternidades Estratégicas — app
   Dados: const DADOS (dados_habilitacoes.js, gerado por build_dados.py):
     DADOS.maternidades[] = unidades acompanhadas (as mesmas dos painéis de Nascimentos, Internação e Mortalidade):
        {cnes, nome, uf, regiao, municipio, lat, lon, grupos[], oficial, paineis[], complexo?, ficha{}, habilitacoes[],
         leitos{código: leitos SUS}, tipo, natureza}; ficha e habilitações da consulta ao CNES (API)
     DADOS.demais[] = demais unidades com leitos obstétricos ou neonatais SUS, em formato compacto (arquivos do CNES no
        DATASUS, uma competência): {c, n, u, m, tp, g, nj, cep, e[], l{}, h[[código, início, fim, portaria, data, leitos]]}
     DADOS.municipios{código: [nome, região de saúde, macrorregião, lat, lon da sede]}, DADOS.tiposEstab, DADOS.esferas
     DADOS.tipos[] = catálogo {co, ds, n, nAcomp, leitos, origem}; DADOS.universo = competência, datas e critério
     habilitação = {co, ds, ini, fim, portaria, dtPortaria, leitos, origem}   (fim "99/9999" = sem prazo final)
   Seções: consulta individual (ficha em página própria), por grupo, por local, mapa, notas.
   Mesma família visual dos painéis de Nascimentos, Internação e Mortalidade.
   ============================================================ */
"use strict";

const ACOMP = DADOS.maternidades;
const UNI = DADOS.universo || null;
const TIPOS = DADOS.tipos;
const DS = Object.fromEntries(TIPOS.map(t => [t.co, t.ds]));
const ORIGEM = Object.fromEntries(TIPOS.map(t => [t.co, t.origem]));
const GRUPOS = DADOS.grupos;                       // {apoiada, ebserh, qualineo} -> rótulo
const GRUPO_CURTO = {apoiada: "Apoiadas", ebserh: "HU Brasil", qualineo: "QUALINEO"};
const ORDEM_GRUPO = ["apoiada", "ebserh", "qualineo"];
const COR_GRUPO = {apoiada: {fundo: "#279261", borda: "#154A4B"}, ebserh: {fundo: "#2471A3", borda: "#103B5E"}, qualineo: {fundo: "#5FB0D9", borda: "#1B6B8F"}};
const COR_DEMAIS = {fundo: "#9AA9B5", borda: "#5F7180"};
const SEM_PRAZO = "99/9999";
const UF_NOME = {AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",
ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",MS:"Mato Grosso do Sul",MT:"Mato Grosso",
PA:"Pará",PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",
RO:"Rondônia",RR:"Roraima",RS:"Rio Grande do Sul",SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins"};
const REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
const REGIAO_UFS = {Norte:["AC","AM","AP","PA","RO","RR","TO"],Nordeste:["AL","BA","CE","MA","PB","PE","PI","RN","SE"],
"Centro-Oeste":["DF","GO","MS","MT"],Sudeste:["ES","MG","RJ","SP"],Sul:["PR","RS","SC"]};
const REGIAO_DA_UF = {}; Object.entries(REGIAO_UFS).forEach(([r, ufs]) => ufs.forEach(u => { REGIAO_DA_UF[u] = r; }));
const TEM_GEO = typeof GEO !== "undefined" && GEO && GEO.niveis;
const NOME_TERR = {rs: {}, macro: {}};
if(TEM_GEO) ["rs", "macro"].forEach(n => GEO.niveis[n].forEach(t => { NOME_TERR[n][t.id] = String(t.nome || "").replace(/\s*-\s*[A-Z]{2}\s*$/, ""); }));

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
const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtInt = v => v == null ? "—" : Math.round(v).toLocaleString("pt-BR");
const dataBR = iso => { const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso || ""); return m ? `${m[3]}/${m[2]}/${m[1]}` : (iso || "—"); };
const compBR = c => { const m = /^(\d{4})-(\d{2})$/.exec(c || ""); return m ? `${m[2]}/${m[1]}` : (c || "—"); };
const mesAno = s => /^\d{6}$/.test(s || "") ? (s === "999999" ? SEM_PRAZO : `${s.slice(4)}/${s.slice(0, 4)}`) : (s || null);
const plural = (n, s, p) => `${fmtInt(n)} ${n === 1 ? s : p}`;
const pct = (n, d) => d ? `${Math.round(100 * n / d)}%` : "—";
const normTxt = s => String(s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const titulo = s => String(s || "").toLowerCase().replace(/(^|[\s(\-/])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
  .replace(/\b(De|Da|Do|Das|Dos|E|Em|Para|Com|Ao|A|O|Na|No)\b/g, w => w.toLowerCase())
  .replace(/\b(Uti|Utin|Ucinco|Ucinca|Hgpar|Sus|Aids|Hiv|Drc|Trs|Snt|Tmo|Cacon|Unacon|Pmae|Cer|Ceo|Cpni|Ppp|Tavi|Avc|Srd|Sdm|Src|Eim|Dr|Ii|Iii|Iv|Hla|Cd4|Cd8|Rna|Ucp|Uco)\b/g, w => w.toUpperCase());
const dsCurta = co => titulo(DS[co] || co).replace(/\s*\*+\.?\s*$/, "").replace(/\.\s*$/, "");
const ativaSemPrazo = h => h.fim === SEM_PRAZO;
const origemRot = o => o === "P" ? "gestor estadual ou municipal" : o === "N" ? "Ministério da Saúde" : "—";
const fimRot = h => ativaSemPrazo(h) ? "sem prazo final" : `até ${h.fim}`;

/* ---------------- unidades: acompanhadas + demais (expandidas do formato compacto) ---------------- */
const COD_OBST = UNI ? Object.keys(UNI.criterio.obstetricos) : ["10", "43"];
const COD_NEO = UNI ? Object.keys(UNI.criterio.neonatais) : ["41", "65", "80", "81", "82", "92", "93"];
const LEITO_ROT = UNI ? {...UNI.criterio.obstetricos, ...UNI.criterio.neonatais} : {};
const ESTRUTURAS = [[0, "Centro obstétrico"], [2, "Centro cirúrgico"], [3, "Atendimento hospitalar"]];      // posições do vetor "e"
const COMPETENCIA = UNI ? compBR(UNI.competencia) : null;
const DEMAIS = (DADOS.demais || []).map(u => {
  const mun = (DADOS.municipios || {})[u.m] || [];
  return {cnes: u.c, nome: u.n || `CNES ${u.c}`, uf: u.u, regiao: REGIAO_DA_UF[u.u] || "", municipio: mun[0] || null, codMun: u.m,
    geo: {rs: mun[1] ?? null, macro: mun[2] ?? null}, lat: mun[3] ?? null, lon: mun[4] ?? null, posMun: true,
    grupos: [], acomp: false, oficial: null, paineis: [],
    tipo: (DADOS.tiposEstab || {})[u.tp] || null, natureza: (DADOS.esferas || {})[u.nj] || null, leitos: u.l || {},
    ficha: {fantasia: u.n, gestao: u.g, cep: u.cep ? String(u.cep).replace(/^(\d{5})(\d{3})$/, "$1-$2") : null,
      estruturas: ESTRUTURAS.filter(([i]) => u.e && u.e[i]).map(x => x[1])},
    habilitacoes: (u.h || []).map(h => ({co: h[0], ds: DS[h[0]] || "", ini: mesAno(h[1]), fim: mesAno(h[2]), portaria: h[3], dtPortaria: h[4], leitos: h[5] || 0, origem: ORIGEM[h[0]] || null}))};
});
/* consulta ao CNES: só a origem "P" vem marcada; as demais habilitações são de portarias do Ministério da Saúde ("N") */
ACOMP.forEach(m => { m.acomp = true; m.leitos = m.leitos || {}; m.habilitacoes.forEach(h => { h.origem = h.origem === "P" ? "P" : "N"; }); });
const MAT = ACOMP.concat(DEMAIS);
const MAT_POR = new Map(MAT.map(m => [m.cnes, m]));
const somaLeitos = (mt, cods) => cods.reduce((s, k) => s + (mt.leitos[k] || 0), 0);
MAT.forEach(mt => {
  mt._habs = new Map(); mt.habilitacoes.forEach(h => { if(!mt._habs.has(h.co)) mt._habs.set(h.co, []); mt._habs.get(h.co).push(h); });
  mt._busca = normTxt(`${mt.nome} ${mt.municipio || ""} ${mt.uf || ""} ${UF_NOME[mt.uf] || ""} ${mt.cnes} ${(mt.complexo || []).join(" ")} ${(mt.ficha && mt.ficha.fantasia) || ""}`);
  mt._grupoCor = ORDEM_GRUPO.find(g => mt.grupos.includes(g)) || null;
  mt._lo = somaLeitos(mt, COD_OBST); mt._ln = somaLeitos(mt, COD_NEO);
});
const temCodigo = (mt, co) => mt._habs.has(co);
const temFamilia = (mt, f) => f.codigos.some(co => mt._habs.has(co));
const corDe = mt => mt._grupoCor ? COR_GRUPO[mt._grupoCor] : COR_DEMAIS;
const bolinha = g => `<i class="bolinha bola-${g}" title="${esc(GRUPOS[g])}"></i>`;
const bolinhas = mt => mt.grupos.map(bolinha).join("");
const gruposTxt = mt => mt.grupos.length ? mt.grupos.map(g => GRUPO_CURTO[g]).join(" + ") : "não acompanhada";
const nomeRS = mt => (mt.geo && NOME_TERR.rs[mt.geo.rs]) || mt.regiaoSaude || null;
const nomeMacro = mt => (mt.geo && NOME_TERR.macro[mt.geo.macro]) || mt.macro || null;
const leitosTxt = mt => `${fmtInt(mt._lo)} obstétricos · ${fmtInt(mt._ln)} neonatais`;
const porUFNome = (a, b) => (a.uf || "").localeCompare(b.uf || "") || a.nome.localeCompare(b.nome, "pt-BR");
const porAcompUFNome = (a, b) => (b.acomp - a.acomp) || porUFNome(a, b);

/* recorte comum às seções: grupo de unidades, região, estado e tipo de leito SUS */
const ESCOPOS = [
  {id: "todas", rot: "Todas as unidades", longo: "todas as unidades com leitos obstétricos ou neonatais SUS"},
  {id: "acomp", rot: "Acompanhadas", longo: "unidades acompanhadas (os três grupos)"},
  {id: "apoiada", rot: "Apoiadas", longo: GRUPOS.apoiada},
  {id: "ebserh", rot: "HU Brasil", longo: GRUPOS.ebserh},
  {id: "qualineo", rot: "QUALINEO", longo: GRUPOS.qualineo},
];
const ESCOPO_POR = Object.fromEntries(ESCOPOS.map(e => [e.id, e]));
const doEscopo = (lista, e) => !e || e === "todas" ? lista : e === "acomp" ? lista.filter(m => m.acomp) : lista.filter(m => m.grupos.includes(e));
const rotEscopo = e => ESCOPO_POR[e || "todas"].longo;
const botoesEscopo = ativo => ESCOPOS.map(e => `<button data-grupo="${e.id}" class="${e.id === ativo ? "ativo" : ""}">${ORDEM_GRUPO.includes(e.id) ? `<i class="bolinha bola-${e.id}"></i>` : ""}${esc(e.rot)}</button>`).join("");
const opcoesEscopo = () => ESCOPOS.map(e => `<option value="${e.id}">${esc(e.longo.charAt(0).toUpperCase() + e.longo.slice(1))}</option>`).join("");
const recorte = o => doEscopo(MAT, o.grupo).filter(m => (!o.regiao || m.regiao === o.regiao) && (!o.uf || m.uf === o.uf) && (!o.leito || (o.leito === "obst" ? m._lo > 0 : m._ln > 0)));
const rotRecorteDe = o => [o.uf ? UF_NOME[o.uf] : o.regiao ? `região ${o.regiao}` : "Brasil", rotEscopo(o.grupo),
  o.leito === "obst" ? "com leitos obstétricos SUS" : o.leito === "neo" ? "com leitos neonatais SUS" : null].filter(Boolean).join(" · ");
const slug = s => normTxt(s).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

const csvCampo = v => { const s = String(v ?? ""); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function baixarCSV(nome, linhas){
  const txt = "\uFEFF" + linhas.map(l => l.map(csvCampo).join(";")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([txt], {type: "text/csv;charset=utf-8"}));
  a.download = nome; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
}
const hoje = () => new Date().toISOString().slice(0, 10);
const fonteTxt = () => `unidades acompanhadas: consulta ao CNES em ${dataBR(DADOS.consultaCnes)}${UNI ? `; demais unidades: arquivos do CNES no DATASUS, competência ${COMPETENCIA}` : ""}`;
const cabecalhoCSV = rec => [`Painel de Habilitações · ${fonteTxt()} · ${rec}`];
const CAB_HAB = ["CNES", "Unidade", "Município", "UF", "Grupos", "Código", "Habilitação", "Competência inicial", "Competência final", "Portaria", "Data da portaria", "Leitos", "Origem"];
const linhasCsvUnidade = mt => mt.habilitacoes.map(h => [h.cnes || mt.cnes, mt.nome, mt.municipio || "", mt.uf, gruposTxt(mt), h.co, h.ds, h.ini, ativaSemPrazo(h) ? "sem prazo final" : h.fim, h.portaria || "", h.dtPortaria || "", h.leitos || 0, origemRot(h.origem)]);
function segmento(id, aoMudar){
  const el = $(id);
  el.addEventListener("click", e => {
    const b = e.target.closest("button"); if(!b) return;
    el.querySelectorAll("button").forEach(x => x.classList.toggle("ativo", x === b));
    aoMudar(b.dataset);
  });
}
function preencheSelectHab(sel){
  const gMI = document.createElement("optgroup"); gMI.label = "Interesse materno e infantil";
  const gTodas = document.createElement("optgroup"); gTodas.label = "Todas as habilitações do catálogo (por código)";
  TIPOS.filter(t => CODIGOS_MI.has(t.co)).sort((a, b) => b.n - a.n).forEach(t => gMI.appendChild(new Option(`${t.co} · ${dsCurta(t.co)} (${fmtInt(t.n)} unidades)`, t.co)));
  TIPOS.forEach(t => gTodas.appendChild(new Option(`${t.co} · ${dsCurta(t.co)} (${fmtInt(t.n)})`, t.co)));
  sel.appendChild(gMI); sel.appendChild(gTodas);
}
/* seletores de região e estado em cascata, sobre um objeto de estado {regiao, uf} */
function cascataRegiaoUF(idRegiao, idUF, estado, aoMudar){
  const sR = $(idRegiao), sU = $(idUF);
  REGIOES.forEach(r => sR.add(new Option(r, r)));
  const ufs = [...new Set(MAT.map(m => m.uf).filter(Boolean))].sort();
  const preenche = () => {
    const atual = sU.value; sU.innerHTML = '<option value="">Todos os estados</option>';
    ufs.filter(uf => !estado.regiao || REGIAO_DA_UF[uf] === estado.regiao).forEach(uf => sU.add(new Option(`${UF_NOME[uf] || uf} (${uf})`, uf)));
    sU.value = [...sU.options].some(o => o.value === atual) ? atual : ""; estado.uf = sU.value;
  };
  preenche();
  sR.addEventListener("change", () => { estado.regiao = sR.value; preenche(); aoMudar(); });
  sU.addEventListener("change", () => { estado.uf = sU.value; aoMudar(); });
}

/* ---------------- cabeçalho, destaques e notas ---------------- */
const porGrupoTxt = () => ORDEM_GRUPO.map(g => `${ACOMP.filter(m => m.grupos.includes(g)).length} ${GRUPO_CURTO[g]}`).join(" · ");
function montarCabecalho(){
  const consulta = dataBR(DADOS.consultaCnes);
  $("heroConsulta").textContent = UNI ? `competência ${COMPETENCIA} e consulta de ${consulta}` : `consulta ao CNES em ${consulta}`;
  $("rodapeConsulta").textContent = UNI ? `competência ${COMPETENCIA} (DATASUS) e consulta de ${consulta}` : `consulta em ${consulta}`;
  const nHabs = MAT.reduce((s, m) => s + m.habilitacoes.length, 0);
  const nPrazo = MAT.reduce((s, m) => s + m.habilitacoes.filter(h => !ativaSemPrazo(h)).length, 0);
  $("statUnid").textContent = fmtInt(MAT.length);
  $("statUnidSub").textContent = `com leitos obstétricos ou neonatais SUS`;
  $("statAcomp").textContent = fmtInt(ACOMP.length);
  $("statAcompSub").textContent = porGrupoTxt();
  $("statHabs").textContent = fmtInt(nHabs);
  $("statHabsSub").textContent = `${fmtInt(nPrazo)} com competência final definida`;
  $("statTipos").textContent = fmtInt(TIPOS.length);
  const utin = FAMILIAS.find(f => f.id === "utin"), hgpar = FAMILIAS.find(f => f.id === "hgpar");
  const comUtin = MAT.filter(m => temFamilia(m, utin));
  const leitosUtin = comUtin.reduce((s, m) => s + utin.codigos.reduce((t, co) => t + (m._habs.get(co) || []).reduce((u, h) => u + (h.leitos || 0), 0), 0), 0);
  $("statUtin").textContent = fmtInt(comUtin.length);
  $("statUtinSub").textContent = `${fmtInt(leitosUtin)} leitos habilitados (tipos II e III)`;
  const comHgpar = MAT.filter(m => temFamilia(m, hgpar));
  $("statHgpar").textContent = fmtInt(comHgpar.length);
  $("statHgparSub").textContent = `${fmtInt(comHgpar.filter(m => m.acomp).length)} entre as acompanhadas`;

  /* notas */
  const p = UNI ? UNI.publicadoNoFTP || {} : {};
  $("notaConsulta").innerHTML = `<b>Datas de referência:</b> ${UNI ? `arquivos do DATASUS da competência ${COMPETENCIA}, publicados em ${dataBR(p.habilitacoes)} e baixados em ${dataBR(UNI.baixadoEm)}; ` : ""}consulta ao CNES das unidades acompanhadas em ${consulta}. As habilitações encerradas antes dessas datas não constam das fontes e, por isso, não aparecem no painel.`;
  if(UNI){
    const c = UNI.contagem, cr = UNI.criterio;
    const lst = o => Object.entries(o).map(([k, v]) => `${k} ${esc(v)}`).join("; ");
    $("notaUniverso").innerHTML = `<b>Unidades do painel:</b> ${fmtInt(c.universo)} estabelecimentos tinham, na competência ${COMPETENCIA}, pelo menos um leito SUS em especialidade obstétrica ou neonatal no CNES: ${fmtInt(c.soObstetricos)} só com leitos obstétricos, ${fmtInt(c.soNeonatais)} só com leitos neonatais e ${fmtInt(c.osDois)} com os dois. Especialidades consideradas, pelo código do CNES: obstétricos (${lst(cr.obstetricos)}); neonatais (${lst(cr.neonatais)}). O número de leitos mostrado em cada unidade é o de leitos SUS dessas especialidades na mesma competência.`;
    const fora = ACOMP.filter(m => !m._lo && !m._ln);
    $("notaUnidades").innerHTML = `<b>Unidades acompanhadas:</b> ${fmtInt(ACOMP.length)} unidades, as mesmas dos painéis de Nascimentos, Internação e Mortalidade (${porGrupoTxt()}; uma unidade pode contar em mais de um grupo). ${fmtInt(ACOMP.length - fora.length)} delas fazem parte do conjunto acima${fora.length ? `; ${fora.map(m => esc(m.nome)).join(" e ")} não ${fora.length === 1 ? "tem" : "têm"} leitos SUS dessas especialidades no cadastro da competência e ${fora.length === 1 ? "permanece" : "permanecem"} no painel por ${fora.length === 1 ? "ser acompanhada" : "serem acompanhadas"}` : ""}. Total do painel: ${fmtInt(MAT.length)} unidades.`;
  } else {
    $("notaUniverso").innerHTML = "";
    $("notaUnidades").innerHTML = `<b>Unidades:</b> ${fmtInt(ACOMP.length)} unidades, as mesmas dos painéis de Nascimentos, Internação e Mortalidade. Grupos: ${porGrupoTxt()}; uma unidade pode contar em mais de um grupo.`;
  }
  const anexos = ACOMP.filter(m => m.oficial === false);
  $("notaAnexos").innerHTML = anexos.length
    ? `<b>Lista oficial e anexos:</b> a lista oficial de 09/09/2026 tem ${fmtInt(DADOS.listaOficialN || 115)} códigos CNES, todos presentes entre as unidades acompanhadas, com os grupos lidos da própria lista. As ${anexos.length} unidades acompanhadas fora dela (${anexos.map(a => `${esc(a.nome)}, ${a.uf}`).join("; ")}) foram acrescentadas pela coordenação aos outros painéis; entram com as mesmas regras e aparecem marcadas como "anexo".` : "";
  $("notaFamilias").innerHTML = FAMILIAS.map(f => `<li><b>${esc(f.rot)}</b>: ${f.codigos.map(co => `${co} ${esc(dsCurta(co))}`).join("; ")}.</li>`).join("");
  $("btnNotas").addEventListener("click", () => $("secNotas").scrollIntoView({behavior: "smooth"}));
}

/* ============================================================
   1. CONSULTA INDIVIDUAL — um seletor por grupo acompanhado, busca em todas as unidades e lista por município
   ============================================================ */
function montarConsulta(){
  const sels = {apoiada: "selUnidadeApoiada", ebserh: "selUnidadeEbserh", qualineo: "selUnidadeQualineo"};
  const ns = {apoiada: "nApoiada", ebserh: "nEbserh", qualineo: "nQualineo"};
  ORDEM_GRUPO.forEach(g => {
    const sel = $(sels[g]);
    const lista = ACOMP.filter(m => m.grupos.includes(g)).sort(porUFNome);
    lista.forEach(m => sel.add(new Option(`${m.uf} · ${m.nome}${m.oficial === false ? " (anexo)" : ""} · ${m.habilitacoes.length} hab.`, m.cnes)));
    $(ns[g]).textContent = `· ${lista.length} unidades`;
    sel.addEventListener("change", () => abrirDossie(sel.value));
  });
  document.querySelectorAll("#secConsulta button[data-sel]").forEach(b => b.addEventListener("click", () => abrirDossie($(b.dataset.sel).value)));
  const busca = $("busca"), res = $("buscaRes"), selUF = $("selUFBusca"), selMun = $("selMunBusca");
  const item = m => `<li><button data-cnes="${m.cnes}">${bolinhas(m)}<span>${esc(m.nome)}</span><small>${esc(m.municipio || "")} · ${esc(m.uf)} · ${m.cnes}</small></button></li>`;
  const mostra = (achados, total) => {
    res.innerHTML = achados.map(item).join("") + (total > achados.length ? `<li class="suave" style="font-size:.8rem">Mostrando ${achados.length} de ${fmtInt(total)} unidades. Acrescente termos à busca ou escolha o município.</li>` : "")
      || `<li class="suave" style="font-size:.84rem">Nenhuma unidade encontrada.</li>`;
    res.querySelectorAll("button").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
  };
  const renderBusca = () => {
    const q = normTxt(busca.value.trim());
    if(q.length < 2){ res.innerHTML = ""; return; }
    selUF.value = ""; preencheMun();
    const termos = q.split(/\s+/);
    const achados = MAT.filter(m => termos.every(t => m._busca.includes(t))).sort(porAcompUFNome);
    mostra(achados.slice(0, 60), achados.length);
  };
  busca.addEventListener("input", renderBusca);
  /* lista por estado e município */
  [...new Set(MAT.map(m => m.uf).filter(Boolean))].sort().forEach(uf => selUF.add(new Option(`${UF_NOME[uf] || uf} (${uf})`, uf)));
  function preencheMun(){
    selMun.innerHTML = '<option value="">escolha o município…</option>'; selMun.disabled = !selUF.value;
    if(!selUF.value) return;
    const cont = new Map(); MAT.filter(m => m.uf === selUF.value && m.municipio).forEach(m => cont.set(m.municipio, (cont.get(m.municipio) || 0) + 1));
    [...cont.entries()].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")).forEach(([nome, n]) => selMun.add(new Option(`${nome} (${n})`, nome)));
  }
  selUF.addEventListener("change", () => { busca.value = ""; res.innerHTML = ""; preencheMun(); });
  selMun.addEventListener("change", () => {
    if(!selMun.value){ res.innerHTML = ""; return; }
    const achados = MAT.filter(m => m.uf === selUF.value && m.municipio === selMun.value).sort(porAcompUFNome);
    mostra(achados, achados.length);
  });
  preencheMun();
}

/* ============================================================
   2. POR GRUPO — barras, detalhe da habilitação e matriz de cobertura
   ============================================================ */
const G = {grupo: "todas", regiao: "", uf: "", leito: "", foco: "mi", hab: "", ordem: "uf", limite: 100, listaCheia: ""};
const LIM_LISTA = 120;
let colunasExtra = [], colunasRemovidas = new Set();
const unidadesGrupo = () => recorte(G);
const rotGrupo = () => rotRecorteDe(G);
const leitosHab = (lista, co) => lista.reduce((s, mt) => s + (mt._habs.get(co) || []).reduce((t, h) => t + (h.leitos || 0), 0), 0);

function renderBarras(){
  const base = unidadesGrupo(), el = $("barras");
  const cont = new Map();
  base.forEach(mt => mt._habs.forEach((_, co) => cont.set(co, (cont.get(co) || 0) + 1)));
  let itens = [...cont.entries()].map(([co, n]) => ({co, n}));
  if(G.foco === "mi") itens = itens.filter(i => CODIGOS_MI.has(i.co));
  itens.sort((a, b) => b.n - a.n || a.co.localeCompare(b.co));
  if(G.foco !== "mi") itens = itens.slice(0, 20);
  $("barrasTitulo").textContent = `Habilitações · ${rotGrupo()}`;
  $("barrasSub").textContent = G.foco === "mi"
    ? `Habilitações de interesse materno e infantil presentes nas ${plural(base.length, "unidade", "unidades")} do recorte. O percentual é sobre o total de unidades do recorte.`
    : `As 20 habilitações mais frequentes entre as ${fmtInt(cont.size)} registradas nas ${plural(base.length, "unidade", "unidades")} do recorte.`;
  if(!itens.length){ el.innerHTML = `<p class="suave" style="font-size:.86rem">Nenhuma habilitação neste recorte.</p>`; return; }
  const max = Math.max(...itens.map(i => i.n), 1);
  el.innerHTML = itens.map(i => `<button class="barra ${G.hab === i.co ? "ativa" : ""}" data-co="${i.co}" title="${esc(DS[i.co])}">
      <span class="rot">${esc(dsCurta(i.co))}<small>${i.co}</small></span>
      <span class="trilha"><i style="width:${(100 * i.n / max).toFixed(1)}%"></i></span>
      <span class="n">${fmtInt(i.n)} <small>${pct(i.n, base.length)}</small></span>
    </button>`).join("");
  el.querySelectorAll(".barra").forEach(b => b.addEventListener("click", () => { G.hab = G.hab === b.dataset.co ? "" : b.dataset.co; G.listaCheia = ""; renderBarras(); renderDetalhe(); }));
}
/* detalhe em largura total, abaixo das barras: resumo do recorte ou, com uma habilitação escolhida, quem tem e quem não tem */
function renderDetalhe(){
  const base = unidadesGrupo(), el = $("painelDetalhe");
  if(G.hab){
    const co = G.hab, com = base.filter(mt => temCodigo(mt, co)), sem = base.filter(mt => !temCodigo(mt, co));
    const leitos = leitosHab(com, co), prazo = com.filter(mt => mt._habs.get(co).some(h => !ativaSemPrazo(h))).length;
    const ufs = [...new Set(base.map(m => m.uf))].sort();
    const porUF = ufs.map(uf => { const b = base.filter(m => m.uf === uf), c = b.filter(m => temCodigo(m, co)); return `<tr><td class="col-uf">${esc(UF_NOME[uf] || uf)} (${uf})</td><td class="cel">${fmtInt(b.length)}</td><td class="cel ${c.length ? "" : "zero"}"><b>${fmtInt(c.length)}</b></td><td class="cel">${pct(c.length, b.length)}</td><td class="cel">${leitos ? fmtInt(leitosHab(c, co)) : "—"}</td></tr>`; }).join("");
    const item = mt => `<li>${bolinhas(mt)}<button data-cnes="${mt.cnes}">${esc(mt.nome)}</button><small>${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(mt.uf)}</small></li>`;
    const lista = (l, chave) => { const ord = l.slice().sort(porAcompUFNome), cheia = G.listaCheia === chave, vis = cheia ? ord : ord.slice(0, LIM_LISTA);
      return `<ul class="lista-unid lista-colunas">${vis.map(item).join("") || "<li class='suave'>nenhuma</li>"}</ul>${ord.length > LIM_LISTA && !cheia ? `<button class="chip chip-botao" data-lista="${chave}" style="margin-top:.6rem">mostrar as ${fmtInt(ord.length)} unidades</button>` : ""}`; };
    el.innerHTML = `<p class="eyebrow">Habilitação ${esc(co)} · ${esc(rotGrupo())}</p>
      <h3 style="margin-top:.2rem">${esc(dsCurta(co))}</h3>
      <p class="suave" style="font-size:.78rem; margin-top:.2rem">${esc(DS[co])}</p>
      <div class="kpis-linha">
        <div class="k"><div class="n">${fmtInt(com.length)}</div><div class="t">unidades com a habilitação · ${pct(com.length, base.length)} das ${fmtInt(base.length)} do recorte</div></div>
        <div class="k"><div class="n">${fmtInt(sem.length)}</div><div class="t">unidades sem a habilitação</div></div>
        ${leitos ? `<div class="k"><div class="n">${fmtInt(leitos)}</div><div class="t">leitos habilitados</div></div>` : ""}
        ${prazo ? `<div class="k"><div class="n">${fmtInt(prazo)}</div><div class="t">unidades com competência final definida</div></div>` : ""}
      </div>
      <div class="acoes-detalhe"><button class="chip chip-botao" id="btnCsvHab">⬇ Baixar a lista de unidades (CSV)</button><button class="chip chip-botao" id="btnTiraHab">✕ limpar a habilitação</button></div>
      <h4 class="sub-detalhe">Por estado</h4>
      <div class="local-wrap" style="max-height:340px"><table class="local"><thead><tr><th class="col-uf">Estado</th><th>Unidades do recorte</th><th>Com a habilitação</th><th>%</th><th>Leitos habilitados</th></tr></thead><tbody>${porUF}</tbody>
        <tfoot><tr><td class="col-uf">Total</td><td>${fmtInt(base.length)}</td><td>${fmtInt(com.length)}</td><td>${pct(com.length, base.length)}</td><td>${leitos ? fmtInt(leitos) : "—"}</td></tr></tfoot></table></div>
      <h4 class="sub-detalhe">Unidades com a habilitação (${fmtInt(com.length)})</h4>${lista(com, "com")}
      <h4 class="sub-detalhe">Unidades sem a habilitação (${fmtInt(sem.length)})</h4>${lista(sem, "sem")}
      <p class="fonte">As unidades acompanhadas aparecem primeiro, com a marca do grupo. Toque no nome para abrir a ficha.</p>`;
    $("btnTiraHab").addEventListener("click", () => { G.hab = ""; G.listaCheia = ""; renderBarras(); renderDetalhe(); });
    $("btnCsvHab").addEventListener("click", () => baixarCSV(`unidades_habilitacao_${co}_${hoje()}.csv`, [cabecalhoCSV(`${co} ${DS[co]} · ${rotGrupo()}`),
      ["CNES", "Unidade", "Município", "UF", "Grupos", "Leitos obstétricos SUS", "Leitos neonatais SUS", "Tem a habilitação", "Leitos habilitados", "Competência inicial", "Competência final"],
      ...base.slice().sort(porUFNome).map(mt => { const hs = mt._habs.get(co) || []; return [mt.cnes, mt.nome, mt.municipio || "", mt.uf, gruposTxt(mt), mt._lo, mt._ln, hs.length ? "sim" : "não", hs.reduce((s, h) => s + (h.leitos || 0), 0), hs.map(h => h.ini).join(" | "), hs.map(h => ativaSemPrazo(h) ? "sem prazo final" : h.fim).join(" | ")]; })]));
    el.querySelectorAll("button[data-lista]").forEach(b => b.addEventListener("click", () => { G.listaCheia = b.dataset.lista; renderDetalhe(); }));
  } else {
    const nHabs = base.reduce((s, m) => s + m.habilitacoes.length, 0), semHab = base.filter(m => !m.habilitacoes.length), ufs = new Set(base.map(m => m.uf));
    const grupos = ORDEM_GRUPO.map(g => `<div class="kpi"><span>${bolinha(g)} ${esc(GRUPOS[g])}</span><span class="v">${fmtInt(base.filter(m => m.grupos.includes(g)).length)}</span></div>`).join("");
    const familias = FAMILIAS.map(f => { const n = base.filter(m => temFamilia(m, f)).length; return `<div class="kpi"><span>${esc(f.rot)}</span><span class="v">${fmtInt(n)} <small>${pct(n, base.length)}</small></span></div>`; }).join("");
    el.innerHTML = `<p class="eyebrow">Resumo do recorte</p>
      <h3 style="margin-top:.2rem">${esc(rotGrupo())}</h3>
      <div class="kpis-linha">
        <div class="k"><div class="n">${fmtInt(base.length)}</div><div class="t">unidades · ${plural(ufs.size, "estado", "estados")}</div></div>
        <div class="k"><div class="n">${fmtInt(base.filter(m => m.acomp).length)}</div><div class="t">acompanhadas</div></div>
        <div class="k"><div class="n">${fmtInt(nHabs)}</div><div class="t">habilitações registradas</div></div>
        <div class="k"><div class="n">${fmtInt(semHab.length)}</div><div class="t">unidades sem nenhuma habilitação</div></div>
        <div class="k"><div class="n">${fmtInt(base.reduce((s, m) => s + m._lo, 0))}</div><div class="t">leitos obstétricos SUS</div></div>
        <div class="k"><div class="n">${fmtInt(base.reduce((s, m) => s + m._ln, 0))}</div><div class="t">leitos neonatais SUS</div></div>
      </div>
      <div class="resumo-colunas">
        <div><h4 class="sub-detalhe">Unidades acompanhadas no recorte, por grupo</h4><div class="kpi-lista">${grupos}</div></div>
        <div><h4 class="sub-detalhe">Unidades com ao menos um código de cada família materno-infantil</h4><div class="kpi-lista duas-colunas">${familias}</div></div>
      </div>
      <p class="fonte">Toque em uma barra, acima, para ver as unidades que têm e as que não têm a habilitação, por estado.</p>`;
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
  if(!habs.length) return {html: `<td class="cel nao">·</td>`, texto: ""};
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
  if(G.ordem === "acomp") return lista.slice().sort(porAcompUFNome);
  return lista.slice().sort(porUFNome);
}
function renderMatriz(){
  const cols = colunasMatriz(), lista = ordenar(unidadesGrupo()), tab = $("matriz");
  const vis = lista.slice(0, G.limite);
  $("matrizTitulo").textContent = `Matriz de cobertura · ${rotGrupo()}`;
  $("btnColunasPadrao").hidden = !(colunasExtra.length || colunasRemovidas.size);
  const th = cols.map(c => `<th title="${esc(c.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}"><span class="th-rot">${esc(c.rot)}</span><span class="th-n">${c.codigos.join(", ")}</span><button class="th-x" data-col="${c.id}" title="Retirar esta coluna" aria-label="Retirar a coluna ${esc(c.rot)}">✕</button></th>`).join("");
  const totais = cols.map(c => lista.filter(mt => c.codigos.some(co => mt._habs.has(co))).length);
  const linhas = vis.map(mt => {
    const cels = cols.map(c => celula(mt, c).html).join("");
    return `<tr><td class="col-unid"><button data-cnes="${mt.cnes}">${esc(mt.nome)}</button><small>${bolinhas(mt)} ${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(mt.uf)} · CNES ${mt.cnes}${mt.oficial === false ? " · anexo" : ""}</small></td><td class="cel num">${mt._lo || "·"}</td><td class="cel num">${mt._ln || "·"}</td>${cels}<td class="col-tot">${mt.habilitacoes.length}</td></tr>`;
  }).join("");
  tab.innerHTML = `<thead><tr><th class="col-unid">Unidade (${fmtInt(lista.length)})</th><th title="Leitos SUS de obstetrícia cirúrgica e clínica no CNES"><span class="th-rot">Leitos obstétricos SUS</span></th><th title="Leitos SUS de neonatologia, UTI neonatal, UCINCo, UCINCa e unidade intermediária neonatal no CNES"><span class="th-rot">Leitos neonatais SUS</span></th>${th}<th title="Total de habilitações registradas">Total de habilitações</th></tr></thead>
    <tbody>${linhas || `<tr><td class="col-unid suave" colspan="${cols.length + 4}">Nenhuma unidade.</td></tr>`}</tbody>
    <tfoot><tr><td class="col-unid">Unidades com a habilitação, no recorte</td><td>${fmtInt(lista.reduce((s, m) => s + m._lo, 0))}<br><span class="rod-sub">leitos</span></td><td>${fmtInt(lista.reduce((s, m) => s + m._ln, 0))}<br><span class="rod-sub">leitos</span></td>${totais.map(t => `<td>${fmtInt(t)}${lista.length ? `<br><span class="rod-sub">${pct(t, lista.length)}</span>` : ""}</td>`).join("")}<td></td></tr></tfoot>`;
  tab.querySelectorAll("td.col-unid button").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
  tab.querySelectorAll(".th-x").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.col;
    if(id.startsWith("co")) colunasExtra = colunasExtra.filter(co => "co" + co !== id); else colunasRemovidas.add(id);
    renderMatriz();
  }));
  const mais = $("btnMaisMatriz"), todas = $("btnTodasMatriz");
  $("matrizResumo").textContent = lista.length > vis.length ? `Mostrando ${fmtInt(vis.length)} de ${fmtInt(lista.length)} unidades. Os totais do rodapé e o CSV consideram todas.` : `${plural(lista.length, "unidade", "unidades")} na matriz.`;
  mais.hidden = todas.hidden = lista.length <= vis.length;
  mais.textContent = `mostrar mais ${Math.min(200, lista.length - vis.length)}`;
  todas.textContent = `mostrar todas as ${fmtInt(lista.length)}`;
}
function csvMatriz(){
  const cols = colunasMatriz(), lista = ordenar(unidadesGrupo());
  const cab = ["CNES", "Unidade", "Município", "UF", "Região", "Grupos", "Anexo", "Leitos obstétricos SUS", "Leitos neonatais SUS", ...cols.map(c => `${c.rot} (${c.codigos.join("/")})`), "Total de habilitações"];
  const linhas = lista.map(mt => [mt.cnes, mt.nome, mt.municipio || "", mt.uf, mt.regiao, gruposTxt(mt), mt.oficial === false ? "sim" : "não", mt._lo, mt._ln, ...cols.map(c => celula(mt, c).texto || "não"), mt.habilitacoes.length]);
  baixarCSV(`matriz_habilitacoes_${slug(rotGrupo())}_${hoje()}.csv`, [cabecalhoCSV(rotGrupo()), cab, ...linhas]);
}
function renderGrupo(){ renderBarras(); renderDetalhe(); renderMatriz(); }
function montarGrupo(){
  $("segGrupo").innerHTML = botoesEscopo(G.grupo);
  const muda = () => { G.hab = ""; G.listaCheia = ""; G.limite = 100; renderGrupo(); };
  segmento("segGrupo", d => { G.grupo = d.grupo; muda(); });
  cascataRegiaoUF("selRegiaoG", "selUFG", G, muda);
  $("selLeitoG").addEventListener("change", e => { G.leito = e.target.value; muda(); });
  segmento("segFoco", d => { G.foco = d.foco; renderBarras(); });
  segmento("segOrdem", d => { G.ordem = d.ordem; renderMatriz(); });
  const selAdd = $("selAddCol");
  TIPOS.forEach(t => selAdd.add(new Option(`${t.co} · ${dsCurta(t.co)} (${fmtInt(t.n)} unidades)`, t.co)));
  selAdd.addEventListener("change", () => { if(selAdd.value && !colunasExtra.includes(selAdd.value)) colunasExtra.push(selAdd.value); selAdd.value = ""; renderMatriz(); });
  $("btnColunasPadrao").addEventListener("click", () => { colunasExtra = []; colunasRemovidas = new Set(); renderMatriz(); });
  $("btnMaisMatriz").addEventListener("click", () => { G.limite += 200; renderMatriz(); });
  $("btnTodasMatriz").addEventListener("click", () => { G.limite = Infinity; renderMatriz(); });
  $("btnCsvMatriz").addEventListener("click", csvMatriz);
  $("btnCsvTudo").addEventListener("click", () => baixarCSV(`habilitacoes_${slug(rotGrupo())}_${hoje()}.csv`, [cabecalhoCSV(rotGrupo()), CAB_HAB, ...ordenar(unidadesGrupo()).flatMap(linhasCsvUnidade)]));
}

/* ============================================================
   3. POR LOCAL — tabela estado (ou região de saúde) × famílias e cartões das unidades
   ============================================================ */
const LOC = {regiao: "", uf: "", grupo: "todas", leito: "", cartoes: 24};
const unidadesLocal = () => recorte(LOC);
const rotLocal = () => rotRecorteDe(LOC);
/* linhas: estados; com um estado escolhido, as regiões de saúde dele */
function linhasLocal(){
  const base = unidadesLocal(), porRS = !!LOC.uf;
  const chave = m => porRS ? String((m.geo || {}).rs ?? "") : m.uf;
  const grupos = new Map(); base.forEach(m => { const k = chave(m); if(!grupos.has(k)) grupos.set(k, []); grupos.get(k).push(m); });
  const linhas = [...grupos.entries()].map(([k, us]) => ({k, nome: porRS ? (NOME_TERR.rs[k] || us[0].regiaoSaude || "Região de saúde não identificada") : `${UF_NOME[k] || k} (${k})`,
    sub: porRS ? "" : us[0].regiao, uf: us[0].uf, regiao: us[0].regiao, n: us.length,
    acomp: us.filter(m => m.acomp).length, fam: FAMILIAS.map(f => us.filter(m => temFamilia(m, f)).length)}))
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return {base, linhas, porRS};
}
function renderLocal(){
  const {base, linhas, porRS} = linhasLocal(), tab = $("tabelaLocal");
  const th = FAMILIAS.map(f => `<th title="${esc(f.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}"><span class="th-rot">${esc(f.rot)}</span></th>`).join("");
  const corpo = linhas.map(l => `<tr><td class="col-uf">${esc(l.nome)}${l.sub ? `<small>${esc(l.sub)}</small>` : ""}</td><td class="cel">${fmtInt(l.n)}</td><td class="cel ${l.acomp ? "" : "zero"}">${fmtInt(l.acomp)}</td>${l.fam.map(n => `<td class="cel ${n ? "" : "zero"}">${n ? `<b>${fmtInt(n)}</b> <small>${pct(n, l.n)}</small>` : "0"}</td>`).join("")}</tr>`).join("");
  const tot = FAMILIAS.map(f => base.filter(m => temFamilia(m, f)).length);
  tab.innerHTML = `<thead><tr><th class="col-uf">${porRS ? `Região de saúde · ${esc(UF_NOME[LOC.uf])}` : "Estado"}</th><th><span class="th-rot">Unidades</span></th><th><span class="th-rot">Acompanhadas</span></th>${th}</tr></thead>
    <tbody>${corpo || `<tr><td class="col-uf suave" colspan="${FAMILIAS.length + 3}">Nenhuma unidade no recorte.</td></tr>`}</tbody>
    <tfoot><tr><td class="col-uf">Total</td><td>${fmtInt(base.length)}</td><td>${fmtInt(base.filter(m => m.acomp).length)}</td>${tot.map(n => `<td>${fmtInt(n)} <small style="font-weight:600; color:var(--texto-suave)">${pct(n, base.length)}</small></td>`).join("")}</tr></tfoot>`;
  $("localTitulo").textContent = `${porRS ? "Por região de saúde" : "Por estado"} · ${rotLocal()}`;
  renderCartoes(base);
}
function csvLocal(){
  const {base, linhas, porRS} = linhasLocal();
  baixarCSV(`habilitacoes_por_${porRS ? "regiao_de_saude" : "estado"}_${hoje()}.csv`, [cabecalhoCSV(rotLocal()), [porRS ? "Região de saúde" : "Estado", "UF", "Região", "Unidades", "Acompanhadas", ...FAMILIAS.map(f => `${f.rot} (${f.codigos.join("/")})`)],
    ...linhas.map(l => [l.nome, l.uf, l.regiao, l.n, l.acomp, ...l.fam]), ["Total", "", "", base.length, base.filter(m => m.acomp).length, ...FAMILIAS.map(f => base.filter(m => temFamilia(m, f)).length)]]);
}
function renderCartoes(sel){
  const todas = sel.slice().sort(porAcompUFNome), el = $("gradeUnidades");
  const lista = todas.slice(0, LOC.cartoes);
  $("unidadesResumo").textContent = `${plural(todas.length, "unidade", "unidades")} · ${rotLocal()}${lista.length < todas.length ? ` · mostrando as ${lista.length} primeiras (acompanhadas na frente)` : ""}`;
  const btn = $("btnMaisCartoes");
  btn.hidden = todas.length <= lista.length;
  btn.textContent = `mostrar mais ${Math.min(48, todas.length - lista.length)} unidades`;
  btn.onclick = () => { LOC.cartoes += 48; renderCartoes(sel); };
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
    return `<article class="unidade ${mt.oficial === false ? "anexo" : ""} ${mt.acomp ? "" : "demais"}">
      <div class="u-topo"><div><h3>${esc(mt.nome)}</h3><div class="u-local">${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(UF_NOME[mt.uf] || mt.uf)}</div></div><div class="u-cnes">CNES ${mt.cnes}</div></div>
      <div class="u-grupos">${mt.grupos.map(g => `<span>${bolinha(g)}${esc(GRUPO_CURTO[g])}</span>`).join("")}${mt.acomp ? "" : `<span>${esc(titulo(mt.tipo || ""))}</span>`}${mt.oficial === false ? `<span class="chip chip-anexo" style="font-size:.68rem; padding:.1rem .5rem">anexo</span>` : ""}${mt.complexo ? `<span class="chip" style="font-size:.68rem; padding:.1rem .5rem" title="Códigos CNES do complexo: ${mt.complexo.join(" e ")}">complexo</span>` : ""}</div>
      <div class="u-n"><b>${n}</b><span>${n === 1 ? "habilitação registrada" : "habilitações registradas"}${nPrazo ? `, ${nPrazo} com prazo` : ""}</span></div>
      <div class="u-leitos">Leitos SUS: ${leitosTxt(mt)}</div>
      <div class="u-tags">${tags.join("")}</div>
      <div class="u-rodape"><small>${mt.acomp ? `Consulta ao CNES em ${dataBR(DADOS.consultaCnes)}` : `DATASUS, competência ${COMPETENCIA}`}</small><button class="chip chip-acao" data-cnes="${mt.cnes}">Ver ficha →</button></div>
    </article>`;
  }).join("") || `<p class="suave">Nenhuma unidade no recorte.</p>`;
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}
function montarLocal(){
  $("segGrupoLocal").innerHTML = botoesEscopo(LOC.grupo);
  const muda = () => { LOC.cartoes = 24; renderLocal(); };
  cascataRegiaoUF("selRegiao", "selUF", LOC, muda);
  segmento("segGrupoLocal", d => { LOC.grupo = d.grupo; muda(); });
  $("selLeitoLocal").addEventListener("change", e => { LOC.leito = e.target.value; muda(); });
  $("btnCsvLocal").addEventListener("click", csvLocal);
}

/* ============================================================
   4. MAPA — malha do Brasil (UF / macro / RS) com filtros Território e Estado em cascata, pills de habilitação, zoom e
   lista do recorte; mapa de unidades (Leaflet) no acordeão, com o mesmo recorte.
   ============================================================ */
const NS = "http://www.w3.org/2000/svg";
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
/* pontos sobre a malha: só as unidades acompanhadas, que têm coordenadas do próprio cadastro */
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
  ACOMP.forEach(mt => {
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
const MP = {regiao: null, uf: null, nivel: "uf", grupo: "todas", hab: null, nomes: true, pontosMalha: false, busca: ""};
let leaf = null, camadaPontos = null, telaCanvas = null, svgEl = null, animId = null;
const vbHome = TEM_GEO ? [0, 0, GEO.W, GEO.H] : null;
const RAMPA_MAPA = ["#D8EEDF", "#A9DBBC", "#6DBF93", "#2F9A68", "#1B5F51"];
/* classes de cor conforme o maior número de unidades em um território do mapa (limites superiores das 4 primeiras) */
const escalaMapa = max => max <= 14 ? [1, 2, 4, 9] : max <= 60 ? [2, 5, 10, 25] : max <= 150 ? [5, 15, 30, 60] : [10, 30, 75, 150];
const classeMapa = (n, esc4) => n <= 0 ? -1 : n <= esc4[0] ? 0 : n <= esc4[1] ? 1 : n <= esc4[2] ? 2 : n <= esc4[3] ? 3 : 4;
const rotClasses = e => [e[0] === 1 ? "1 unidade" : `1 a ${e[0]} unidades`, ...[1, 2, 3].map(i => e[i] === e[i - 1] + 1 ? `${e[i]} unidades` : `${e[i - 1] + 1} a ${e[i]} unidades`), `${e[3] + 1} ou mais`];
const ufDoTerr = (nivel, t) => nivel === "uf" ? t.id : ((/-\s*([A-Z]{2})\s*$/.exec(t.nome || "") || [])[1] || null);
const ufsRecorte = () => MP.uf ? [MP.uf] : MP.regiao ? (REGIAO_UFS[MP.regiao] || []) : null;
const temHabMapa = m => !MP.hab || MP.hab.codigos.some(co => m._habs.has(co));
const rotRecorte = () => MP.uf ? UF_NOME[MP.uf] : MP.regiao ? `Região ${MP.regiao}` : "Brasil";
const rotHabMapa = () => MP.hab ? MP.hab.rot : "Todas as unidades";
/* unidades do recorte: território + grupo (com ou sem a habilitação) */
const unidadesRecorte = () => { const ufs = ufsRecorte(); return doEscopo(MAT, MP.grupo).filter(m => !ufs || ufs.includes(m.uf)); };
const unidadesMapa = () => unidadesRecorte().filter(temHabMapa);

function mostraTipMapa(e, html){
  const tip = $("tipMapa"); tip.innerHTML = html; tip.hidden = false;
  tip.style.left = Math.min(e.clientX + 14, window.innerWidth - 332) + "px";
  tip.style.top = Math.min(e.clientY + 14, window.innerHeight - tip.offsetHeight - 12) + "px";
}
function escondeTipMapa(){ $("tipMapa").hidden = true; }
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
  const box = $("mapaSvg");
  if(!TEM_GEO){ box.innerHTML = `<p class="suave" style="padding:1rem">Malhas não disponíveis nesta montagem.</p>`; return; }
  const lista = unidadesMapa(), terr = GEO.niveis[MP.nivel], ufsVis = ufsRecorte();
  const porTerr = new Map(); lista.forEach(m => { const id = terrId(MP.nivel, m); if(!porTerr.has(id)) porTerr.set(id, []); porTerr.get(id).push(m); });
  const visiveis = terr.filter(t => !ufsVis || ufsVis.includes(ufDoTerr(MP.nivel, t)));
  const esc4 = escalaMapa(Math.max(0, ...visiveis.map(t => (porTerr.get(String(t.id)) || []).length)));
  box.innerHTML = "";
  svgEl = document.createElementNS(NS, "svg"); svgEl.setAttribute("viewBox", vbHome.join(" ")); svgEl.setAttribute("role", "img"); svgEl.setAttribute("aria-label", "Mapa do Brasil");
  const g = document.createElementNS(NS, "g");
  terr.forEach(t => {
    const uf = ufDoTerr(MP.nivel, t), us = porTerr.get(String(t.id)) || [];
    const p = document.createElementNS(NS, "path"); p.setAttribute("d", t.d); p.setAttribute("class", "t"); p.dataset.uf = uf || "";
    if(ufsVis && !ufsVis.includes(uf)) p.style.display = "none";
    const cls = classeMapa(us.length, esc4); p.setAttribute("fill", cls < 0 ? "#E4EBE5" : RAMPA_MAPA[cls]); p.dataset.cls = cls;
    const nome = MP.nivel === "uf" ? UF_NOME[t.id] : t.nome, max = 8, nAc = us.filter(m => m.acomp).length;
    const ord = us.slice().sort(porAcompUFNome);
    const tip = `<div class="tm-titulo">${esc(nome)}</div><div class="tm-valor">${us.length ? plural(us.length, "unidade", "unidades") + (MP.hab ? ` com ${esc(MP.hab.rot)}` : "") + (nAc && nAc < us.length ? ` · ${nAc} ${nAc === 1 ? "acompanhada" : "acompanhadas"}` : "") : (MP.hab ? `Nenhuma unidade com ${esc(MP.hab.rot)}` : "Sem unidade do recorte")}</div>` +
      (us.length ? `<ul>${ord.slice(0, max).map(m => `<li>${esc(m.nome)}</li>`).join("")}${us.length > max ? `<li>+ ${fmtInt(us.length - max)} outras</li>` : ""}</ul>` : "");
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
    svgEl.querySelectorAll("path.t").forEach(p => { if(p.style.display === "none") return; const bb = p.getBBox(); if(bb.width < 14 && bb.height < 14) return; const tx = document.createElementNS(NS, "text"); tx.setAttribute("x", (bb.x + bb.width / 2).toFixed(1)); tx.dataset.cy = (bb.y + bb.height / 2).toFixed(1); tx.setAttribute("text-anchor", "middle"); tx.setAttribute("class", "sigla"); tx.setAttribute("fill", Number(p.dataset.cls) >= 3 ? "#FFFFFF" : "#0A213D"); tx.setAttribute("opacity", ".8"); tx.textContent = p.dataset.uf; g.appendChild(tx); });
  }
  if(MP.pontosMalha){
    const gp = document.createElementNS(NS, "g");
    lista.filter(m => m.acomp && m._xy).sort((a, b) => a._xy[1] - b._xy[1]).forEach(m => {
      const cor = corDe(m);
      const c = document.createElementNS(NS, "circle"); c.setAttribute("cx", m._xy[0].toFixed(1)); c.setAttribute("cy", m._xy[1].toFixed(1)); c.setAttribute("class", "ponto"); c.setAttribute("fill", cor.fundo); c.setAttribute("stroke", cor.borda);
      c.addEventListener("mousemove", e => mostraTipMapa(e, `<div class="tm-titulo">${esc(m.nome)}</div><div>${esc(m.municipio || "")} · ${esc(m.uf)} · CNES ${m.cnes}</div><div class="tm-valor">${m.grupos.map(g => GRUPOS[g]).join(" · ")}</div><div class="tm-sem">${m._ajustado ? "posição aproximada, dentro da região de saúde" : "posição aproximada"}</div>`));
      c.addEventListener("mouseleave", escondeTipMapa); c.addEventListener("click", () => { escondeTipMapa(); abrirDossie(m.cnes); });
      gp.appendChild(c);
      if(MP.nomes){ const tx = document.createElementNS(NS, "text"); tx.setAttribute("class", "rotulo"); tx.dataset.x = m._xy[0].toFixed(1); tx.dataset.y = m._xy[1].toFixed(1); tx.textContent = m.nome.length > 34 ? m.nome.slice(0, 33) + "…" : m.nome; gp.appendChild(tx); }
    });
    svgEl.appendChild(gp);
  }
  if(ufsVis) zoomUFs(ufsVis, false); else ajustaEscalaSvg();
  // legenda
  const nivelRot = {uf: "estado", macro: "macrorregião de saúde", rs: "região de saúde"}[MP.nivel];
  $("tituloLegenda").textContent = `${rotHabMapa()} · unidades por ${nivelRot} · ${rotRecorte()}`;
  const presentes = new Set(visiveis.map(t => classeMapa((porTerr.get(String(t.id)) || []).length, esc4)));
  $("legendaMapa").innerHTML = rotClasses(esc4).map((r, i) => presentes.has(i) ? `<span><i style="background:${RAMPA_MAPA[i]}"></i>${r}</span>` : "").join("") + `<span><i style="background:#E4EBE5"></i>${MP.hab ? "sem unidade com a habilitação" : "sem unidade do recorte"}</span>`;
}
function cliqueUF(uf){
  if(MP.uf === uf){ limparSelecaoMapa(); return; }
  MP.uf = uf; MP.regiao = REGIAO_DA_UF[uf] || null;
  sincronizaFiltrosMapa(); renderMapa();
}
function limparSelecaoMapa(){ MP.uf = null; MP.regiao = null; sincronizaFiltrosMapa(); renderMapa(); }
function preencheUFMapa(){
  const sUM = $("selUFMapa");
  const ufs = MP.regiao ? [...(REGIAO_UFS[MP.regiao] || [])].sort() : Object.keys(UF_NOME).sort();
  sUM.innerHTML = `<option value="">${MP.regiao ? "Toda a região " + MP.regiao : "Todo o Brasil"}</option>` + ufs.map(u => `<option value="${u}">${UF_NOME[u]}</option>`).join("");
  sUM.value = MP.uf || "";
}
function sincronizaFiltrosMapa(){
  preencheUFMapa();
  $("selRegiaoMapa").value = MP.regiao || "";
  $("btnResetMapa").hidden = !(MP.uf || MP.regiao);
}
const LIM_LISTA_MAPA = 60;
function renderPainelSelecao(){
  const el = $("mapaLateral"), base = unidadesRecorte(), com = base.filter(temHabMapa);
  const porGrupo = ORDEM_GRUPO.map(g => { const bg = base.filter(m => m.grupos.includes(g)); if(!bg.length) return ""; const cg = bg.filter(temHabMapa); return `<div class="kpi"><span>${bolinha(g)} ${esc(GRUPOS[g])}</span><span class="v">${cg.length}${MP.hab ? ` <small>de ${bg.length}</small>` : ""}</span></div>`; }).join("");
  const leitos = MP.hab ? com.reduce((s, m) => s + MP.hab.codigos.reduce((t, co) => t + (m._habs.get(co) || []).reduce((u, h) => u + (h.leitos || 0), 0), 0), 0) : 0;
  const lista = com.slice().sort(porAcompUFNome), vis = lista.slice(0, LIM_LISTA_MAPA);
  el.innerHTML = `<p class="eyebrow">${esc(rotRecorte())} · ${esc(ESCOPO_POR[MP.grupo].rot)}</p>
    <h3 style="margin-top:.2rem">${esc(rotHabMapa())}</h3>
    ${MP.hab && MP.hab.codigos.length ? `<p class="suave" style="font-size:.76rem; margin-top:.2rem">${MP.hab.codigos.map(co => `${co} ${esc(dsCurta(co))}`).join("; ")}</p>` : ""}
    <div class="num-grande" style="margin-top:.6rem">${fmtInt(com.length)} <span style="font-size:1rem; font-weight:700; color:var(--texto-suave)">${MP.hab ? `de ${fmtInt(base.length)} unidades` : "unidades"}</span></div>
    <div class="kpi-lista">${porGrupo}${leitos ? `<div class="kpi"><span>Leitos habilitados</span><span class="v">${fmtInt(leitos)}</span></div>` : ""}<div class="kpi"><span>Estados</span><span class="v">${new Set(com.map(m => m.uf)).size}</span></div></div>
    <p class="suave" style="font-size:.8rem; margin-top:.8rem"><b style="color:var(--texto)">Unidades</b>${lista.length > vis.length ? ` (${vis.length} de ${fmtInt(lista.length)}, acompanhadas primeiro)` : ""}:</p>
    <ul class="lista-unid" style="max-height:360px">${vis.map(m => `<li>${bolinhas(m)}<button data-cnes="${m.cnes}">${esc(m.nome)}</button><small>${esc(m.uf)}</small></li>`).join("") || "<li class='suave'>nenhuma</li>"}</ul>
    ${lista.length > vis.length ? `<p class="suave" style="font-size:.74rem; margin-top:.5rem">A lista completa está no CSV do mapa de unidades, abaixo, e na seção Por local.</p>` : ""}`;
  el.querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes)));
}
/* ---- mapa de unidades (Leaflet), no acordeão ---- */
function iniciaLeaflet(){
  if(leaf) return;
  if(typeof L === "undefined"){ $("mapaLeaflet").innerHTML = `<p class="suave" style="padding:1rem">O mapa de unidades precisa de internet para carregar a biblioteca e o fundo (OpenStreetMap).</p>`; return; }
  leaf = L.map("mapaLeaflet", {scrollWheelZoom: true}).setView([-14.5, -52], 4);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>', maxZoom: 18}).addTo(leaf);
  telaCanvas = L.canvas({padding: .4});
  leaf.createPane("acomp").style.zIndex = 450;
  leaf.on("popupopen", e => e.popup.getElement().querySelectorAll("button[data-cnes]").forEach(b => b.addEventListener("click", () => abrirDossie(b.dataset.cnes))));
}
function unidadesLeaflet(){ const q = normTxt(MP.busca.trim()); return unidadesMapa().filter(m => !q || m._busca.includes(q)); }
function desenhaLeaflet(){
  if(!leaf) return;
  if(camadaPontos) leaf.removeLayer(camadaPontos);
  camadaPontos = L.layerGroup(); const pontos = [];
  const vis = unidadesLeaflet();
  /* demais unidades: um marcador por município, na sede, com a lista das unidades */
  const porMun = new Map();
  vis.forEach(m => { if(m.acomp || m.lat == null || m.lon == null) return; if(!porMun.has(m.codMun)) porMun.set(m.codMun, []); porMun.get(m.codMun).push(m); });
  porMun.forEach(us => {
    const m0 = us[0]; pontos.push([m0.lat, m0.lon]);
    const mk = L.circleMarker([m0.lat, m0.lon], {renderer: telaCanvas, radius: us.length > 4 ? 7 : us.length > 1 ? 5.5 : 4, color: COR_DEMAIS.borda, weight: 1, fillColor: COR_DEMAIS.fundo, fillOpacity: .85});
    mk.bindPopup(`<div class="pop-nome">${esc(m0.municipio || "")} · ${esc(m0.uf)}</div><div style="margin:.2rem 0">${plural(us.length, "unidade", "unidades")}${MP.hab ? ` com ${esc(MP.hab.rot)}` : ""} · ponto na sede do município</div>` +
      us.slice().sort(porUFNome).slice(0, 15).map(u => `<button class="pop-btn pop-lista" data-cnes="${u.cnes}">${esc(u.nome)}</button>`).join("") + (us.length > 15 ? `<div>+ ${us.length - 15} outras</div>` : ""), {maxHeight: 280});
    mk.bindTooltip(`${m0.municipio || ""} · ${plural(us.length, "unidade", "unidades")}`, {direction: "right", offset: [6, 0], className: "rotulo-unid", opacity: 1});
    camadaPontos.addLayer(mk);
  });
  /* unidades acompanhadas: coordenadas do cadastro, por cima */
  vis.forEach(m => {
    if(!m.acomp || m.lat == null || m.lon == null) return;
    pontos.push([m.lat, m.lon]);
    const cor = corDe(m);
    const mk = L.circleMarker([m.lat, m.lon], {pane: "acomp", radius: 8, color: cor.borda, weight: 2, fillColor: cor.fundo, fillOpacity: .95});
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
  if($("detUnidades").open){ iniciaLeaflet(); if(leaf){ leaf.invalidateSize(); desenhaLeaflet(); } }
  document.querySelectorAll("#listaHabsMapa button").forEach(b => b.classList.toggle("ativo", (b.dataset.fam || "") === (MP.hab ? MP.hab.id : "")));
}
function montarMapa(){
  // pills: todas + famílias materno-infantis (com nº de unidades)
  const lista = $("listaHabsMapa");
  const pills = [{id: "", rot: "Todas as unidades", codigos: []}, ...FAMILIAS];
  lista.innerHTML = pills.map(f => `<button data-fam="${f.id}" title="${esc(f.codigos.map(co => `${co} ${DS[co] || ""}`).join("\n"))}">${esc(f.rot)}<small>${fmtInt(f.id ? MAT.filter(m => temFamilia(m, f)).length : MAT.length)}</small></button>`).join("");
  lista.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { const f = FAMILIAS.find(x => x.id === b.dataset.fam); MP.hab = f ? {id: f.id, rot: f.rot, codigos: f.codigos} : null; $("selHabMapa").value = ""; renderMapa(); }));
  const sel = $("selHabMapa"); preencheSelectHab(sel);
  sel.addEventListener("change", () => { MP.hab = sel.value ? {id: "co" + sel.value, rot: `${sel.value} ${dsCurta(sel.value)}`, codigos: [sel.value]} : null; renderMapa(); });
  const sRM = $("selRegiaoMapa"), sUM = $("selUFMapa"), sGM = $("selGrupoMapa");
  sGM.innerHTML = opcoesEscopo(); sGM.value = MP.grupo;
  sRM.addEventListener("change", () => { MP.regiao = sRM.value || null; MP.uf = null; sincronizaFiltrosMapa(); renderMapa(); });
  sUM.addEventListener("change", () => { MP.uf = sUM.value || null; if(MP.uf) MP.regiao = REGIAO_DA_UF[MP.uf] || null; sincronizaFiltrosMapa(); renderMapa(); });
  $("selNivelMapa").addEventListener("change", e => { MP.nivel = e.target.value; renderMapa(); });
  sGM.addEventListener("change", e => { MP.grupo = e.target.value; renderMapa(); });
  $("btnResetMapa").addEventListener("click", limparSelecaoMapa);
  $("chkPontosMalha").addEventListener("change", e => { MP.pontosMalha = e.target.checked; renderMapa(); });
  $("chkNomes").addEventListener("change", e => { MP.nomes = e.target.checked; desenhaLeaflet(); });
  $("buscaUnidadeMapa").addEventListener("input", e => { MP.busca = e.target.value; desenhaLeaflet(); });
  $("detUnidades").addEventListener("toggle", e => { if(e.target.open){ iniciaLeaflet(); if(leaf){ setTimeout(() => { leaf.invalidateSize(); desenhaLeaflet(); }, 50); } } });
  $("btnCsvMapa").addEventListener("click", () => {
    const vis = unidadesLeaflet().sort(porUFNome), pos = m => m.acomp ? "cadastro CNES" : "sede do município";
    const linhas = MP.hab ? vis.flatMap(m => MP.hab.codigos.flatMap(co => (m._habs.get(co) || []).map(h => [m.cnes, m.nome, m.municipio || "", m.uf, gruposTxt(m), m.lat, m.lon, pos(m), h.co, h.ds, h.ini, ativaSemPrazo(h) ? "sem prazo final" : h.fim, h.portaria || "", h.leitos || 0])))
      : vis.map(m => [m.cnes, m.nome, m.municipio || "", m.uf, gruposTxt(m), m.lat, m.lon, pos(m), "", "", "", "", "", m.habilitacoes.length]);
    baixarCSV(`mapa_${(MP.hab ? MP.hab.id : "todas")}_${hoje()}.csv`, [cabecalhoCSV(`${rotHabMapa()} · ${rotRecorte()} · ${rotEscopo(MP.grupo)}`), ["CNES", "Unidade", "Município", "UF", "Grupos", "Latitude", "Longitude", "Posição", "Código", "Habilitação", "Competência inicial", "Competência final", "Portaria", "Leitos (ou total de habilitações)"], ...linhas]);
  });
  sincronizaFiltrosMapa();
  encaixaPontos();
  renderMapa();
}

/* ============================================================
   FICHA DA UNIDADE (página sobreposta)
   ============================================================ */
let dossieAtual = null;
function preencheSelDossie(){
  const sel = $("selUnidadePd"); if(sel.options.length) return;
  const porUF = new Map(); MAT.slice().sort(porUFNome).forEach(m => { if(!porUF.has(m.uf)) porUF.set(m.uf, []); porUF.get(m.uf).push(m); });
  porUF.forEach((us, uf) => { const og = document.createElement("optgroup"); og.label = `${UF_NOME[uf] || uf} · ${fmtInt(us.length)}`; us.forEach(m => og.appendChild(new Option(`${m.nome}${m.municipio ? ` · ${m.municipio}` : ""}`, m.cnes))); sel.appendChild(og); });
}
function abrirDossie(cnes){
  const mt = MAT_POR.get(cnes); if(!mt) return;
  dossieAtual = mt;
  preencheSelDossie(); $("selUnidadePd").value = cnes;
  const f = mt.ficha || {};
  const gest = {M: "Municipal", E: "Estadual", D: "Dupla"}[f.gestao] || f.gestao || "—";
  const endereco = [f.endereco, f.bairro, f.cep ? `CEP ${f.cep}` : null].filter(Boolean).join(" · ");
  const n = mt.habilitacoes.length, nPrazo = mt.habilitacoes.filter(h => !ativaSemPrazo(h)).length, leitos = mt.habilitacoes.reduce((s, h) => s + (h.leitos || 0), 0);
  const itens = [["Código CNES", mt.cnes + (mt.complexo ? ` (complexo: ${mt.complexo.join(" e ")})` : "")], ["Razão social", f.razao], ["Nome fantasia", f.fantasia], ["CNPJ", f.cnpj],
    ["Tipo de estabelecimento", mt.tipo ? titulo(mt.tipo) : null], ["Natureza jurídica", mt.natureza], ["Esfera administrativa", f.esfera], ["Gestão", gest], [f.endereco || f.bairro ? "Endereço" : "CEP", f.endereco || f.bairro ? endereco : f.cep], ["Telefone", f.telefone], ["E-mail", f.email], ["Turno de atendimento", f.turno],
    ["Município / UF", `${mt.municipio || "—"} / ${UF_NOME[mt.uf] || mt.uf}`], ["Região de saúde", nomeRS(mt)], ["Macrorregião de saúde", nomeMacro(mt)],
    ["Painéis em que a unidade aparece", (mt.paineis || []).map(p => ({nascimentos: "Nascimentos", internacao: "Internação", mortalidade: "Mortalidade"}[p] || p)).join(", ")]].filter(i => i[1]);
  const codLeitos = [...COD_OBST, ...COD_NEO].filter(k => mt.leitos[k]);
  const habs = mt.habilitacoes.slice().sort((a, b) => (CODIGOS_MI.has(b.co) - CODIGOS_MI.has(a.co)) || a.co.localeCompare(b.co));
  const linhas = habs.map(h => `<tr class="${CODIGOS_MI.has(h.co) ? "destaque" : ""}">
      ${mt.complexo ? `<td class="c mono">${esc(h.cnes || mt.cnes)}</td>` : ""}<td class="c mono">${esc(h.co)}</td><td>${esc(h.ds)}${CODIGOS_MI.has(h.co) ? ` <span class="chip" style="font-size:.66rem; padding:.05rem .45rem; margin-left:.3rem">materno-infantil</span>` : ""}</td>
      <td class="c mono">${esc(h.ini || "—")}</td><td class="c mono">${ativaSemPrazo(h) ? "sem prazo final" : `<span class="pz">até ${esc(h.fim)}</span>`}</td>
      <td style="white-space:normal">${esc(h.portaria || "—")}${h.dtPortaria ? ` <span class="suave">(${esc(h.dtPortaria)})</span>` : ""}</td>
      <td class="r mono">${h.leitos ? h.leitos : "—"}</td><td class="c" style="font-size:.76rem">${esc(origemRot(h.origem))}</td></tr>`).join("");
  const p = UNI ? UNI.publicadoNoFTP || {} : {};
  const fonteCadastro = mt.acomp
    ? `<b>Última atualização do cadastro no CNES:</b> ${dataBR(f.atualizacao)} · <b>Dados baixados da API oficial em:</b> ${dataBR(DADOS.consultaCnes)}${UNI ? ` · tipo de estabelecimento e natureza jurídica: arquivo de cadastro do CNES no DATASUS, competência ${COMPETENCIA}` : ""}. Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.`
    : `<b>Arquivo de cadastro do CNES no DATASUS, competência ${COMPETENCIA}</b> (publicado em ${dataBR(p.cadastro)}). Nome fantasia como consta no cadastro. Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.`;
  const fonteHab = mt.acomp
    ? `<b>Dados baixados do serviço do CNES em:</b> ${dataBR(DADOS.consultaCnes)} · Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil. Origem: "gestor estadual ou municipal" corresponde ao valor "P" do campo de origem do CNES.`
    : `<b>Arquivo de habilitações do CNES no DATASUS, competência ${COMPETENCIA}</b> (publicado em ${dataBR(p.habilitacoes)}): habilitações vigentes na competência. A origem é a registrada para o mesmo código na consulta ao CNES das unidades acompanhadas; "—" quando o código não aparece nelas. Fonte: Ministério da Saúde - Cadastro Nacional dos Estabelecimentos de Saúde do Brasil.`;
  $("dossieConteudo").innerHTML = `
    <div class="dossie-topo">
      <div>
        <p class="eyebrow" style="color:#C5E3CC">Ficha da unidade · CNES ${esc(mt.cnes)}</p>
        <h2 style="margin-top:.3rem; color:#FFF">${esc(mt.nome)}</h2>
        <div class="meta">
          ${mt.grupos.map(g => `<span>${bolinha(g)}${esc(GRUPOS[g])}</span>`).join("")}
          ${mt.acomp ? "" : `<span>unidade não acompanhada pelos três grupos</span>`}
          <span>${esc(mt.municipio || "")}${mt.municipio ? " · " : ""}${esc(UF_NOME[mt.uf] || mt.uf)}</span>
          ${mt.oficial === false ? `<span class="anexo">anexo · fora da lista oficial de 09/09/2026</span>` : ""}
        </div>
      </div>
      <div class="kpis-topo">
        <div class="k"><div class="n">${n}</div><div class="t">habilitações</div></div>
        <div class="k"><div class="n">${nPrazo}</div><div class="t">com prazo final</div></div>
        <div class="k"><div class="n">${fmtInt(leitos)}</div><div class="t">leitos habilitados</div></div>
        <div class="k"><div class="n">${fmtInt(mt._lo)}</div><div class="t">leitos obstétricos SUS</div></div>
        <div class="k"><div class="n">${fmtInt(mt._ln)}</div><div class="t">leitos neonatais SUS</div></div>
      </div>
    </div>
    <div class="dossie-cards">
      <div class="card"><h3>Ficha de cadastro CNES</h3>
        <div class="cnes-grid">${itens.map(i => `<div class="cnes-item"><span>${esc(i[0])}</span><b>${esc(i[1])}</b></div>`).join("")}</div>
        ${f.estruturas && f.estruturas.length ? `<div class="badges">${f.estruturas.map(e => `<span class="badge-sim">${esc(e)}</span>`).join("")}</div>` : ""}
        <p class="fonte">${fonteCadastro}</p>
      </div>
      ${UNI ? `<div class="card"><h3>Leitos SUS obstétricos e neonatais <span class="chip">${fmtInt(mt._lo + mt._ln)}</span></h3>
        ${codLeitos.length ? `<div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde"><thead><tr><th style="text-align:center">Código</th><th>Especialidade do leito</th><th>Grupo</th><th style="text-align:right">Leitos SUS</th></tr></thead>
          <tbody>${codLeitos.map(k => `<tr><td class="c mono">${k}</td><td>${esc(LEITO_ROT[k] || "")}</td><td>${COD_OBST.includes(k) ? "obstétrico" : "neonatal"}</td><td class="r mono">${fmtInt(mt.leitos[k])}</td></tr>`).join("")}</tbody></table></div>`
          : `<p class="suave" style="font-size:.86rem; margin-top:.5rem">Nenhum leito SUS de especialidade obstétrica ou neonatal no cadastro da competência ${COMPETENCIA}.</p>`}
        <p class="fonte"><b>Arquivo de leitos do CNES no DATASUS, competência ${COMPETENCIA}</b> (publicado em ${dataBR(p.leitos)})${mt.complexo ? `, soma dos códigos ${mt.complexo.join(" e ")}` : ""}. São os leitos cadastrados para o SUS em cada especialidade, que não se confundem com os leitos habilitados da tabela abaixo.</p>
      </div>` : ""}
      <div class="card"><h3>Habilitações registradas no CNES <span class="chip">${n}</span></h3>
        <p class="suave" style="font-size:.82rem; margin-top:.3rem">Ordenadas com as habilitações de interesse materno e infantil primeiro e, depois, por código. "Sem prazo final" corresponde a 99/9999 no CNES; as habilitações com competência final definida estavam vigentes na data de referência.</p>
        <div class="tab-wrap" style="margin-top:.7rem"><table class="dados tab-verde">
          <thead><tr>${mt.complexo ? `<th style="text-align:center">CNES do registro</th>` : ""}<th style="text-align:center">Código</th><th>Habilitação</th><th style="text-align:center">Competência inicial</th><th style="text-align:center">Competência final</th><th>Portaria (data)</th><th style="text-align:right">Leitos</th><th style="text-align:center">Origem</th></tr></thead>
          <tbody>${linhas || `<tr><td colspan="${mt.complexo ? 8 : 7}" class="suave">Nenhuma habilitação registrada no CNES para este código na data de referência.</td></tr>`}</tbody>
        </table></div>
        <p class="fonte">${fonteHab}</p>
      </div>
    </div>`;
  const pg = $("paginaDossie");
  pg.hidden = false; document.body.classList.add("dossie-aberto"); pg.scrollTop = 0;
  if(location.hash !== "#" + cnes) history.replaceState(null, "", "#" + cnes);
}
function fecharDossie(){
  $("paginaDossie").hidden = true; document.body.classList.remove("dossie-aberto"); dossieAtual = null;
  if(location.hash) history.replaceState(null, "", location.pathname + location.search);
}
function montarDossie(){
  $("btnVoltarDossie").addEventListener("click", fecharDossie);
  $("selUnidadePd").addEventListener("change", e => abrirDossie(e.target.value));
  $("btnPdfDossie").addEventListener("click", () => window.print());
  $("btnCsvUnidade").addEventListener("click", () => { if(dossieAtual) baixarCSV(`habilitacoes_${dossieAtual.cnes}_${hoje()}.csv`, [CAB_HAB, ...linhasCsvUnidade(dossieAtual)]); });
  document.addEventListener("keydown", e => { if(e.key === "Escape" && dossieAtual) fecharDossie(); });
  const h = location.hash.replace("#", ""); const alvoHash = /^\d{7}$/.test(h) ? MAT.find(m => m.cnes === h || (m.complexo || []).includes(h)) : null; if(alvoHash) abrirDossie(alvoHash.cnes);
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
  const trilho = $("trilho");
  trilho.innerHTML = TRILHO.map(t => `<button data-alvo="${t.alvo}" data-rotulo="${t.rot}" aria-label="${t.rot}">${t.ico}</button>`).join("");
  trilho.querySelectorAll("button").forEach(b => b.addEventListener("click", () => $(b.dataset.alvo).scrollIntoView({behavior: "smooth", block: "start"})));
  const obs = new IntersectionObserver(es => es.forEach(e => { if(e.isIntersecting) trilho.querySelectorAll("button").forEach(b => b.classList.toggle("ativo", b.dataset.alvo === e.target.id)); }), {rootMargin: "-40% 0px -55% 0px"});
  TRILHO.forEach(t => { const el = $(t.alvo); if(el) obs.observe(el); });
}

montarCabecalho(); montarConsulta(); montarGrupo(); montarLocal(); montarMapa(); montarTrilho(); montarDossie();
renderGrupo(); renderLocal();
