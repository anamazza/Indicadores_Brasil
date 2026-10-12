// Biblioteca comum dos documentos Word da família de painéis (apostila e parecer).
// Identidade visual dos painéis com cores ajustadas para contraste mínimo 4,5:1 (eMAG 4.1 / WCAG 1.4.3),
// fonte Calibri (manual de marca da Fiocruz; Manual de Redação da PR, item 5.2), tabelas sem células
// mescladas, legendas e hiperlinks reais (recomendações da banca de 11/10/2026).
const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, ShadingType,
  BorderStyle, AlignmentType, ImageRun, PageBreak, Header, Footer, PageNumber, TableOfContents, LevelFormat,
  TabStopType, VerticalAlign, ExternalHyperlink,
} = require("docx");

const C = {
  // cores da identidade (fundos e detalhes)
  verde: "279261", esmeralda: "1B5F51", profundo: "154A4B", indigo: "0A213D", lima: "7CB342",
  mint: "EDF6EF", mintCard: "F6FBF7", borda: "D8E8DC", secao: "E3EFEA",
  // cores para texto (contraste sobre branco: índigo 16:1, esmeralda 7,5:1, verdeTexto 5,6:1, limaTexto 5,6:1, suave 5,9:1)
  texto: "1D3229", suave: "4E6A5C", verdeTexto: "1E6E49", limaTexto: "4E7A16", link: "0A213D",
};
const FONTE = "Calibri";
const LARG = 9638;                 // largura útil A4 com margens de 2 cm (DXA)
const T = { corpo: 24, tabela: 20, nota: 20, rodape: 18, h1: 36, h2: 28, h3: 24, titulo: 56, sub: 30, kicker: 20 };

// ------------------------------------------------------------------ texto
const run = (t, o = {}) => new TextRun({ text: t, font: FONTE, ...o });
function partes(p) {
  return (Array.isArray(p) ? p : [p]).map((x) => {
    if (typeof x === "string") return run(x);
    if (x instanceof TextRun || x instanceof ExternalHyperlink) return x;
    return run(x.t, x);
  });
}
const P = (p, o = {}) => new Paragraph({ children: partes(p), spacing: { after: 120, line: 276 }, ...o });
const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
const H3 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_3 });
const item = (p) => P(p, { numbering: { reference: "marcadores", level: 0 }, spacing: { after: 80, line: 276 } });
const numerado = (p, ref = "numeros") => P(p, { numbering: { reference: ref, level: 0 }, spacing: { after: 80, line: 276 } });
const nota = (p) => P(partes(p).map((r) => (r instanceof TextRun ? new TextRun({ ...r.options, size: T.nota, color: C.suave, font: FONTE }) : r)), { spacing: { after: 160 } });
const quebra = () => new Paragraph({ children: [new PageBreak()] });
const espaco = () => new Paragraph({ spacing: { after: 160 }, children: [] });
const link = (texto, url, size) => new ExternalHyperlink({ link: url, children: [run(texto, { color: C.link, underline: {}, ...(size ? { size } : {}) })] });
const destaque = (p) => new Paragraph({ children: partes(p), spacing: { after: 160, line: 276 },
  shading: { type: ShadingType.CLEAR, fill: C.mintCard, color: "auto" },
  border: { left: { style: BorderStyle.SINGLE, size: 18, color: C.verde, space: 8 } }, indent: { left: 200 } });

// ------------------------------------------------------------------ tabelas (sem células mescladas, com legenda)
let numTabela = 0;
const legenda = (texto) => new Paragraph({ keepNext: true, spacing: { before: 200, after: 80 },
  children: [run(`Tabela ${++numTabela} – ${texto}`, { bold: true, size: T.tabela, color: C.esmeralda })] });
const borda = { style: BorderStyle.SINGLE, size: 4, color: C.borda };
const BORDAS = { top: borda, bottom: borda, left: borda, right: borda, insideHorizontal: borda, insideVertical: borda };
function celula(conteudo, tam, o = {}) {
  const pars = Array.isArray(conteudo) ? conteudo : [conteudo];
  return pars.map((t) => (t instanceof Paragraph ? t : new Paragraph({
    children: typeof t === "string" ? [run(t, { size: tam, bold: o.bold, color: o.color })] : partes(t).map((r) => r),
    spacing: { after: 60, line: 252 },
  })));
}
function tabela(larguras, cabecalho, linhas, o = {}) {
  const tam = o.tamanho || T.tabela;
  const rows = [new TableRow({ tableHeader: true, children: cabecalho.map((h, i) => new TableCell({
    width: { size: larguras[i], type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, fill: C.esmeralda, color: "auto" },
    margins: { top: 70, bottom: 70, left: 90, right: 90 }, verticalAlign: VerticalAlign.CENTER,
    children: celula(h, tam, { bold: true, color: "FFFFFF" }),
  })) })];
  linhas.forEach((l, k) => {
    const fill = k % 2 === 0 ? "FFFFFF" : C.mintCard;
    rows.push(new TableRow({ cantSplit: !!o.naoDividir, children: l.map((c, i) => new TableCell({
      width: { size: larguras[i], type: WidthType.DXA },
      shading: { type: ShadingType.CLEAR, fill, color: "auto" },
      margins: { top: 60, bottom: 60, left: 90, right: 90 },
      children: celula(c, tam, i === 0 && !o.semNegrito ? { bold: true, color: C.indigo } : {}),
    })) }));
  });
  return new Table({ columnWidths: larguras, width: { size: LARG, type: WidthType.DXA }, borders: BORDAS, rows });
}
// tabela com legenda: devolve [legenda, tabela, espaço]
const tabelaL = (texto, larguras, cabecalho, linhas, o) => [legenda(texto), tabela(larguras, cabecalho, linhas, o), espaco()];

// ------------------------------------------------------------------ imagens
function imagem(caminho, largura, altura, alt, o = {}) {
  if (!fs.existsSync(caminho)) return null;
  const tipo = caminho.toLowerCase().endsWith(".jpg") || caminho.toLowerCase().endsWith(".jpeg") ? "jpg" : "png";
  return new Paragraph({ spacing: o.spacing || { after: 200 }, alignment: o.alinhamento,
    children: [new ImageRun({ type: tipo, data: fs.readFileSync(caminho), transformation: { width: largura, height: altura },
      altText: { title: alt.titulo, description: alt.descricao, name: alt.nome || "imagem" } })] });
}

// ------------------------------------------------------------------ cabeçalho, rodapé, documento
function cabecalho(texto) {
  return new Header({ children: [new Paragraph({ alignment: AlignmentType.RIGHT,
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.verde, space: 4 } },
    children: [run(texto, { size: T.rodape, color: C.suave })] })] });
}
function rodape(texto) {
  return new Footer({ children: [new Paragraph({ tabStops: [{ type: TabStopType.RIGHT, position: LARG }],
    children: [run(texto, { size: T.rodape, color: C.suave }), run("\tPágina ", { size: T.rodape, color: C.suave }),
      new TextRun({ children: [PageNumber.CURRENT], size: T.rodape, color: C.suave, font: FONTE }),
      run(" de ", { size: T.rodape, color: C.suave }),
      new TextRun({ children: [PageNumber.TOTAL_PAGES], size: T.rodape, color: C.suave, font: FONTE })] })] });
}
function documento({ titulo, descricao, criador, textoCabecalho, textoRodape, filhos }) {
  return new Document({
    creator: criador, title: titulo, description: descricao,
    features: { updateFields: true },
    styles: {
      default: { document: { run: { font: FONTE, size: T.corpo, color: C.texto, language: { value: "pt-BR" } } } },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: T.h1, bold: true, color: C.indigo, font: FONTE },
          paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0, border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.verde, space: 4 } } } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: T.h2, bold: true, color: C.verdeTexto, font: FONTE }, paragraph: { spacing: { before: 320, after: 140 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: T.h3, bold: true, color: C.esmeralda, font: FONTE }, paragraph: { spacing: { before: 240, after: 100 }, outlineLevel: 2 } },
      ],
    },
    numbering: { config: [
      { reference: "marcadores", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 300 } }, run: { color: C.verdeTexto } } }] },
      { reference: "numeros", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
        style: { paragraph: { indent: { left: 540, hanging: 360 } } } }] },
    ] },
    sections: [{
      properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } }, titlePage: true },
      headers: { default: cabecalho(textoCabecalho), first: new Header({ children: [] }) },
      footers: { default: rodape(textoRodape), first: new Footer({ children: [] }) },
      children: filhos,
    }],
  });
}
function sumario(titulo = "Sumário") {
  return [P([{ t: titulo, bold: true, color: C.indigo, size: 32 }], { spacing: { after: 200 } }),
    new TableOfContents(titulo, { hyperlink: true, headingStyleRange: "1-2" }), quebra()];
}
async function salvar(doc, saida) {
  const buf = await Packer.toBuffer(doc);
  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, buf);
  console.log("gerado", saida, Math.round(buf.length / 1024), "KB");
}

module.exports = { C, FONTE, LARG, T, run, P, H1, H2, H3, item, numerado, nota, quebra, espaco, link, destaque,
  legenda, tabela, tabelaL, imagem, documento, sumario, salvar, Paragraph, TextRun, AlignmentType };
