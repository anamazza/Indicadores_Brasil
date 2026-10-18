// Apostila dos Dicionários de Dados · versão 1.2 (18/10/2026: 1º semestre de 2026 nos painéis; v1.1 revisada pela banca de 11/10/2026).
// Uso: node gera_apostila_v2.js <pasta_fontes_json> <logo_png> <faixa_png> <saida.docx>
const fs = require("fs");
const path = require("path");
const L = require("./apostila_lib.js");
const { C, P, H1, H2, H3, item, numerado, nota, quebra, espaco, link, destaque, tabelaL, imagem, documento, sumario, salvar } = L;

const [FONTES, LOGO, FAIXA, SAIDA] = process.argv.slice(2);
const ler = (n) => JSON.parse(fs.readFileSync(path.join(FONTES, n), "utf8"));
const AIH = ler("DICIONARIO_INDICADORES_AIH_versao_final_2026-09-10.json");
const MORT = ler("DICIONARIO_INDICADORES_MORTALIDADE_20260911.json");
const COMP = ler("Metodologia_Media_do_Grupo_Comparador_NV2026.json");
const NV = ler("painel_nv_metodologia.json");
const PM = ler("painel_mort_metodologia.json");

const SITE = "https://anamazza.github.io/Indicadores_Brasil/";
const b = (t) => ({ t, bold: true });

// linhas de uma tabela extraída do Word -> [{secao, linhas:[[ind, desc, regra]]}]
function secoesDicionario(tabelaJson) {
  const saida = [];
  for (const l of tabelaJson.linhas.slice(1)) {
    const cels = l.map((c) => c.filter((p) => p && p.trim()));
    const ehSecao = cels.length === 1 || (cels.slice(1).every((c) => c.length === 0) && cels[0].length === 1);
    if (ehSecao) { saida.push({ secao: cels[0][0], linhas: [] }); continue; }
    if (!saida.length) saida.push({ secao: "", linhas: [] });
    saida[saida.length - 1].linhas.push([cels[0], cels[1], cels[2]]);
  }
  return saida;
}
const titulo = (s) => s.charAt(0) + s.slice(1).toLowerCase().replace("sócio-demográfico", "sociodemográfico").replace("(sinasc)", "(SINASC)").replace("(sim e sinasc)", "(SIM e SINASC)").replace("(sim-dofet e sinasc)", "(SIM-DOFET e SINASC)").replace("(sim-dofet, sim-do e sinasc)", "(SIM-DOFET, SIM-DO e SINASC)").replace("(sim-do e sinasc)", "(SIM-DO e SINASC)");
const DIC = [2500, 2800, 4338];

// ================================================================= capa
const capa = [];
const faixa = imagem(FAIXA, 640, 74, { titulo: "Faixa decorativa", descricao: "Elemento decorativo, sem conteúdo informativo.", nome: "faixa" }, { spacing: { after: 240 } });
if (faixa) capa.push(faixa);
const logos = imagem(LOGO, 480, 41, { titulo: "Marcas institucionais", descricao: "Marcas do Instituto Nacional de Saúde da Mulher, da Criança e do Adolescente Fernandes Figueira (IFF), da Fiocruz, do SUS e do Ministério da Saúde.", nome: "logos" }, { spacing: { before: 120, after: 600 } });
if (logos) capa.push(logos);
capa.push(P([{ t: "Painéis de Indicadores · Maternidades Estratégicas · 2019 a 2025 e 1º semestre de 2026", bold: true, color: C.limaTexto, size: 22, characterSpacing: 20 }], { spacing: { after: 240 } }));
capa.push(P([{ t: "Apostila dos Dicionários de Dados", bold: true, color: C.indigo, size: 56 }], { spacing: { after: 160, line: 240 } }));
capa.push(P([{ t: "Painéis de Nascimentos, Internação e Mortalidade das Maternidades Estratégicas", color: C.esmeralda, size: 30 }], { spacing: { after: 480, line: 276 } }));
capa.push(P([{ t: "Qualificação do Modelo de Gestão em Maternidades Estratégicas na Rede de Atenção à Saúde Materna e Neonatal", size: 24 }], { spacing: { after: 80 } }));
capa.push(P([{ t: "Coordenação de Ações Nacionais e de Cooperação em Saúde da Mulher, da Criança e do Adolescente", size: 24 }], { spacing: { after: 80 } }));
capa.push(P([{ t: "Instituto Nacional de Saúde da Mulher, da Criança e do Adolescente Fernandes Figueira (IFF/Fiocruz)", size: 24 }], { spacing: { after: 80 } }));
capa.push(P([{ t: "Ministério da Saúde", size: 24 }], { spacing: { after: 600 } }));
capa.push(P([{ t: "Versão 1.2 · Rio de Janeiro, 18 de outubro de 2026", bold: true, color: C.verdeTexto, size: 24 }], { spacing: { after: 80 } }));
capa.push(P([{ t: "Documento de trabalho da equipe. Reproduz os dicionários e as páginas de metodologia aprovados em cada projeto (seção 1.4), com as regras em vigor nos painéis publicados em ", color: C.suave, size: 20 }, link(SITE, SITE, 20), { t: ". Dados: bases públicas do Ministério da Saúde (SINASC, SIH/SUS, SIM e CNES), 2019 a 2025 e 1º semestre de 2026, sujeitos a revisão.", color: C.suave, size: 20 }], { spacing: { after: 0 } }));
capa.push(quebra());

// ================================================================= 1. apresentação
const s1 = [
  H1("1. Apresentação"),
  H2("1.1 O que é esta apostila"),
  P("Esta apostila reúne, em um único documento, as definições e as regras de cálculo dos indicadores dos três painéis das maternidades estratégicas, tal como registradas nos dicionários aprovados e nas páginas de metodologia dos painéis. Os painéis são: Nascimentos, com dados do Sistema de Informações sobre Nascidos Vivos (SINASC); Internação, com dados do Sistema de Informações Hospitalares do Sistema Único de Saúde (SIH/SUS); e Mortalidade, com dados do Sistema de Informações sobre Mortalidade (SIM)."),
  P("Ela foi escrita para toda a equipe, em linguagem direta. O objetivo é que qualquer pessoa consiga responder a uma pergunta frequente: de onde vem cada número do painel e da apresentação. As siglas são explicadas na primeira vez em que aparecem e estão reunidas no glossário (seção 8)."),
  P("O conteúdo reproduz os documentos aprovados em cada projeto. Nada foi criado fora deles. Quando um dicionário registra uma decisão da coordenação, a data da decisão aparece junto da regra. A apostila deve ser atualizada sempre que um dos documentos de origem mudar (seção 1.5). Os registros de auditoria, validação e revisão dos painéis ficam em documentos próprios e não fazem parte deste dicionário."),
  H2("1.2 Como usar"),
  P("Cada indicador aparece com três informações: o que mede, como é calculado (as variáveis das bases e os códigos usados) e a fonte dos dados. Os códigos de diagnóstico seguem a Classificação Internacional de Doenças, 10ª revisão (CID-10). Os códigos de procedimento e de ato profissional (os atos registrados em cada internação) seguem a Tabela de Procedimentos, Medicamentos e Órteses, Próteses e Materiais Especiais do SUS (SIGTAP). Os códigos de leito seguem o Cadastro Nacional de Estabelecimentos de Saúde (CNES). Nomes em letras maiúsculas, como PROC_REA e IDADEMAE, são os nomes dos campos nos arquivos do Departamento de Informática do SUS (DATASUS). Quando a regra tem limitações conhecidas, elas estão registradas na mesma linha."),
  P("Um termo aparece em quase todas as regras: registros ignorados. São os registros em que o campo está em branco ou preenchido com o código de \"ignorado\" (por exemplo, 9, 99 ou 9999). Salvo indicação em contrário, eles ficam fora do numerador e do denominador do indicador."),
  destaque([b("Exemplo de leitura de um indicador. "), "\"% de cesárea\" de uma maternidade em 2025: o numerador é o número de partos cesáreos; o denominador é o número de nascidos vivos com via de nascimento informada (os registros com via ignorada ficam fora). Se a unidade teve 640 cesarianas em 1.000 nascidos vivos com via informada, o indicador é 64,0%. É um indicador do tipo \"quanto menor, melhor\". No comparador do Painel de Nascimentos, a unidade é comparada com a taxa agregada do seu grupo: se o grupo teve 57,2%, a unidade aparece 6,8 pontos percentuais acima da média do grupo. Nas taxas por mil ou por cem mil (como a razão de mortalidade materna), vale ler sempre o número absoluto junto com a taxa, porque em unidades com poucos nascidos vivos um único óbito produz valores altos."]),
  P("A seção 2 descreve as bases de dados. A seção 3 explica quais unidades entram nos painéis e como funciona a comparação com a média do grupo. As seções 4, 5 e 6 são os dicionários de cada painel. A seção 7 reúne as notas comuns aos três painéis. A seção 8 é o glossário e a seção 9, as referências."),
  H2("1.3 Como os painéis estão organizados"),
  P("Os três painéis têm a mesma estrutura. Os termos abaixo aparecem ao longo da apostila com o significado que têm na tela dos painéis."),
  ...tabelaL("Partes e termos dos painéis", [2400, 7238], ["Termo", "O que é"], [
    ["Mapa do Brasil", "Mapa coroplético por unidade da federação (UF), macrorregião ou região de saúde, com filtros e faixas de cor recalculadas por recorte; existe nos painéis de Nascimentos e de Mortalidade."],
    ["Mapa de unidades", "Mapa com um ponto por maternidade, colorido por grupo, com filtros, busca e pontos de contexto (estabelecimentos com 480 ou mais partos por ano, segundo o SIH/SUS de 2025)."],
    ["Botão Página principal", "Único botão de navegação no alto de cada painel; volta à página principal dos painéis."],
    ["Dossiê da unidade", "Página de detalhe de cada maternidade: ficha de cadastro CNES, habilitações ativas (serviços que o SUS autoriza o estabelecimento a realizar) e todas as tabelas da apresentação, com gráficos ao clicar nos anos e nos rótulos; permite baixar em PDF."],
    ["Blocos e quadros", "As tabelas do dossiê (chamadas blocos) e os quadros de perfil da mãe (chamados cards no código do painel)."],
    ["Comparador", "Tela que compara de duas a quatro unidades do mesmo grupo, por ano, com uma coluna de referência do grupo (seção 3.2), e a mesma unidade entre anos (variação e tendência)."],
    ["Destaque de melhor posição", "Realce que o comparador dá à unidade com o melhor resultado em cada indicador que tem direção definida (quanto maior ou quanto menor, melhor)."],
    ["Comparativo entre anos", "Dois mapas lado a lado do mesmo indicador, com faixas de cor comuns (Nascimentos e Mortalidade)."],
    ["Metodologia", "Página própria de cada painel com as fontes oficiais e a ficha de numerador e denominador de cada cálculo. É de lá que vêm as fichas reproduzidas nesta apostila."],
    ["Seletores e filtros", "Listas em que o usuário escolhe grupo, unidade, ano e território."],
  ]),
  H2("1.4 Documentos de origem"),
  P("Os documentos abaixo são a base desta apostila e continuam sendo a referência oficial de cada projeto."),
  ...tabelaL("Documentos de origem da apostila", [2900, 1900, 1500, 3338], ["Documento", "Projeto", "Data ou versão", "O que contém"], [
    ["Dicionário da planilha de indicadores de internação (AIH, Autorização de Internação Hospitalar), grupo de maternidades, versão final", "Internação", "10/09/2026", "Regras de todos os indicadores de internação e dos blocos de perfil da mãe (SINASC), com as decisões da coordenação de 30/08/2026 a 09/09/2026. Corresponde ao que foi aplicado no recálculo das planilhas (retabulação) de 09/09/2026."],
    ["Dicionário da planilha de indicadores de mortalidade, grupo de maternidades", "Mortalidade", "11/09/2026", "Regras dos indicadores de mortalidade materna, fetal, perinatal e neonatal aplicadas no recálculo de 11/09/2026, com notas metodológicas."],
    ["Página \"Metodologia\" do Painel de Nascimentos (Painel NV 2026)", "Nascimentos", "painel publicado", "Ficha de numerador e denominador de cada indicador dos mapas e do comparador e dos demais cálculos do painel."],
    ["Página \"Metodologia\" do Painel de Mortalidade", "Mortalidade", "painel publicado", "Fichas dos 38 indicadores dos mapas e do comparador e dos cálculos do dossiê."],
    ["Nota metodológica: comparação da unidade com a média do seu grupo", "Nascimentos", "agosto de 2026", "Regra da média do grupo no comparador do Painel de Nascimentos e lista dos numeradores e denominadores somados."],
    ["Documentação (arquivos README) dos painéis, das rotinas de extração e do repositório Indicadores_Brasil", "os três", "agosto a outubro de 2026", "Datas de extração, listas de unidades, unidades acrescentadas e fluxo de publicação."],
    ["Carimbos de atualização de cada painel (arquivo atualizacao.json)", "os três", "11/10/2026", "Data de montagem, data dos dados, data da ficha CNES e número de unidades de cada painel."],
    ["Programas de extração do SINASC (pasta Extracao_SINASC)", "Nascimentos", "agosto e setembro de 2026", "Regras de categorização das tabelas do dossiê (variáveis e faixas) e das linhas de percentual dos decks."],
  ]),
  H2("1.5 Controle de versões"),
  ...tabelaL("Histórico de versões da apostila", [1200, 1800, 4238, 2400], ["Versão", "Data", "O que mudou", "Responsável"], [
    ["1.0", "11/10/2026", "Primeira versão, compilada a partir dos documentos da seção 1.4.", "Coordenação (equipe dos painéis)"],
    ["1.2", "18/10/2026", "Período parcial: os painéis passaram a trazer a coluna \"1º sem. 2026\" (janeiro a junho de 2026, dados preliminares). Atualizados o período na capa e na seção 2, a nota de dados preliminares e a tabela da seção 7.2, e acrescentada a nota \"Período parcial\" na seção 7.1. Nenhuma regra de cálculo mudou.", "Coordenação (equipe dos painéis)"],
    ["1.1", "11/10/2026", "Revisão: correções nos textos de ligação, novas seções 1.3, 4.5, 4.6, 5.1 e 6.2, glossário e referências ampliados, identidade visual e acessibilidade ajustadas. O material de auditoria e validação passou ao parecer da revisão, fora deste dicionário.", "Coordenação (equipe dos painéis)"],
  ]),
  P("Responsável pela atualização: a coordenação, por meio da equipe dos painéis, sempre que um documento de origem for alterado. Contato: pela coordenação, no IFF/Fiocruz."),
];

// ================================================================= 2. fontes de dados
const s2 = [
  H1("2. Fontes de dados"),
  P("Todos os indicadores vêm de bases públicas do Ministério da Saúde: SINASC, SIH/SUS, SIM e CNES. A tabela resume o que cada base registra, como ela chega aos painéis e a situação dos dados. Os arquivos do DATASUS são obtidos no seu servidor de arquivos (FTP) ou no OpenDataSUS, o portal de dados abertos do Ministério da Saúde."),
  ...tabelaL("Bases de dados dos painéis", [1500, 2700, 3400, 2038], ["Base", "O que registra", "Como chega aos painéis", "Período e situação"], [
    ["SINASC", "Sistema de Informações sobre Nascidos Vivos. Cada nascido vivo é registrado a partir da Declaração de Nascido Vivo (DN).", ["Microdados (registros individuais, um por nascimento) publicados no OpenDataSUS, em um arquivo por ano.", "No Painel de Nascimentos, as séries por unidade vêm das planilhas de indicadores da coordenação, complementadas por extração própria dos microdados (2025 das unidades EBSERH e unidades acrescentadas); o comparativo territorial vem de extração própria por município de residência e de ocorrência.", "No Painel de Mortalidade, o SINASC fornece os nascidos vivos usados como denominador. No Painel de Internação, fornece três indicadores calculados na DN: parto vaginal após cesariana, trabalho de parto induzido e condições potencialmente ameaçadoras à vida do recém-nascido. Os quadros de perfil da mãe estão no Painel de Nascimentos (seção 4.4)."], ["2019 a 2025 e 1º semestre de 2026 (nascidos de janeiro a junho de 2026, do arquivo preliminar de 2026 do OpenDataSUS, extraídos em 18/10/2026). No Painel de Nascimentos e no de Internação, 2025 é preliminar; no Painel de Mortalidade, 2024 e 2025 recebem a marca de preliminar (seção 7.3).", "Dados sujeitos a revisão."]],
    ["SIH/SUS", "Sistema de Informações Hospitalares do SUS. A Autorização de Internação Hospitalar (AIH) registra cada internação financiada pelo SUS.", ["Arquivos públicos da AIH reduzida (RD, um registro por internação) e de serviços profissionais (SP, um registro por procedimento ou ato realizado na internação), no FTP do DATASUS, por unidade da federação (UF) e por competência.", "Competência é o mês em que a internação foi processada e paga, que pode ser meses depois da alta; por isso os arquivos de 2026 são necessários para completar 2024 e 2025. O ano de referência de cada internação é o da data de internação."], ["Competências de janeiro de 2019 a junho de 2026 para as colunas de 2019 a 2025; para o 1º semestre de 2026 (internações de janeiro a junho de 2026), competências até agosto de 2026.", "2025 sujeito a acréscimos nas próximas competências."]],
    ["CNES", "Cadastro Nacional de Estabelecimentos de Saúde: ficha de cadastro, habilitações e leitos de cada estabelecimento.", ["A ficha de cadastro vem do serviço de acesso automatizado (API) de Dados Abertos do Ministério da Saúde; as habilitações ativas vêm do portal do CNES na internet.", "Os leitos usados nas taxas de ocupação vêm dos arquivos LT, que informam os leitos de cada estabelecimento mês a mês."], ["Ficha e habilitações atualizadas automaticamente em 1º de junho e 1º de dezembro, com disparo manual quando necessário; última atualização em 11/10/2026 (carimbo de cada painel)."]],
    ["SIM", "Sistema de Informações sobre Mortalidade: Declarações de Óbito (DO) e Declarações de Óbito Fetal (DOFET).", ["Arquivos DO<UF><ano>.dbc (um por estado e ano; por exemplo, DORJ2023.dbc) e DOFET<aa>.dbc (arquivo nacional, ano com dois dígitos; por exemplo, DOFET23.dbc), no FTP do DATASUS.", "Todas as UFs são lidas, porque o óbito é contado na unidade onde ocorreu, independentemente da residência."], ["2019 a 2025; extração em 10 e 11/09/2026 e, para as unidades acrescentadas, em 23/09/2026. 1º semestre de 2026: óbitos de janeiro a junho de 2026, dos arquivos preliminares de 2026 (28/09/2026), extraídos em 18/10/2026.", "2024, 2025 e o 1º semestre de 2026 tratados como preliminares no painel (seção 7.2)."]],
    ["Base territorial e malhas", "Limites de estados, das 121 macrorregiões de saúde e das 439 regiões de saúde, e a tabela município → região de saúde → macrorregião.", ["Os mapas usam malhas oficiais dos projetos de regionalização, compactadas para a tela.", "As linhas de território das tabelas usam a base territorial do DATASUS (versão de junho de 2026). A regionalização é a vigente, idêntica, nos territórios examinados, nas seis versões testadas entre 2023 e junho de 2026."], ["Usadas nos mapas e nas linhas de território das tabelas."]],
  ]),
];

// ================================================================= 3. unidades e grupos
const tabGruposAgo = COMP.find((b) => b.tipo === "tabela" && b.linhas.length === 4);
const s3 = [
  H1("3. Unidades e grupos"),
  H2("3.1 Os três grupos de maternidades"),
  P("Cada unidade dos painéis pertence a pelo menos um de três grupos: maternidades estratégicas (rotuladas \"apoiadas\" na lista oficial e nos painéis de Internação e de Mortalidade), unidades da Empresa Brasileira de Serviços Hospitalares (EBSERH) e maternidades do QUALINEO, ciclo 2026/2027. Algumas unidades pertencem a dois ou três grupos, por exemplo, hospitais universitários da EBSERH que também são maternidades estratégicas."),
  P("Nos painéis de Internação e de Mortalidade, as unidades e os grupos seguem, desde 9 de setembro de 2026, a lista oficial de maternidades por grupo (planilha \"LISTA MATERNIDADES POR GRUPO_09092026\"), com 115 estabelecimentos (códigos CNES distintos). Uma unidade classificada como \"apoiada/QUALINEO\" conta nos dois grupos. O Painel de Nascimentos mantém a composição de grupos definida em agosto de 2026; por isso, a média do grupo de uma mesma unidade pode diferir entre os painéis."),
  ...tabelaL("Unidades por grupo em cada painel, em 11 de outubro de 2026 (uma unidade pode contar em mais de um grupo)", [3200, 2146, 2146, 2146], ["Grupo", "Painel de Nascimentos", "Painel de Internação", "Painel de Mortalidade"], [
    ["Maternidades estratégicas (apoiadas)", "63", "58", "59"],
    ["Unidades EBSERH", "25", "25", "25"],
    ["QUALINEO 2026/2027", "35", "86", "86"],
    ["Total de unidades no painel", "118", "119", "120"],
  ], { tamanho: 20 }),
  nota("Fonte: dados publicados dos painéis (arquivo dados.json de cada um) e carimbos de atualização de 11/10/2026. Em agosto de 2026, a nota metodológica do comparador do Painel de Nascimentos registrava 60 maternidades estratégicas, 25 unidades EBSERH e 35 do QUALINEO no cálculo da média (60, 22 e 33 nos seletores, porque cada unidade aparece uma única vez no seletor). A planilha oficial de referência da extração do SINASC tem 59 maternidades."),
  P("As unidades pedidas pela coordenação depois da lista oficial entram nos painéis com as mesmas regras. Quando não constam da lista oficial, aparecem identificadas como acrescentadas (\"anexo\"). Em 11 de outubro de 2026, a situação era a seguinte:"),
  item([b("Painel de Internação (119 unidades): "), "anexos Maternidade Carmosina Coutinho (Caxias/MA, CNES 2453665), Santa Casa de Misericórdia de Sobral (CE, CNES 3021114), Santa Casa de Franca (SP, CNES 2705982) e Hospital Dr. Claudionor Couto Roriz (RO, CNES 2495279). O CISAM e o Hospital da Mulher do Recife (PE), acrescentados em 12 de setembro de 2026, constam da lista oficial e não são anexo."]),
  item([b("Painel de Mortalidade (120 unidades): "), "anexos Carmosina Coutinho, Santa Casa de Sobral e Santa Casa de Franca (acrescentadas em 23 de setembro de 2026), Hospital do Rocio (PR, CNES 0013846) e Unidade Hospitalar de Iauaretê (AM, CNES 2717387)."]),
  item([b("Painel de Nascimentos (118 unidades): "), "sem marcação de anexo; as unidades acrescentadas em setembro entram nos grupos definidos em agosto."]),
  P("Hospital das Clínicas da Faculdade de Medicina de Marília (FAMEMA), Marília/SP: no Painel de Mortalidade, os CNES 2025507 (hospital adulto) e 2025523 (unidade materno-infantil) são tratados como um único complexo, com os óbitos dos dois códigos e os nascidos vivos do 2025523 (dicionário de 11/09/2026). Nos painéis de Nascimentos e de Internação, a unidade aparece pelo CNES 2025507."),
  H2("3.2 A coluna de referência do comparador em cada painel"),
  P("A coluna de referência do comparador é calculada de forma diferente em cada painel. É importante explicar isso à equipe, porque a mesma unidade pode ter referências diferentes conforme o painel."),
  H3("Painel de Nascimentos: taxa agregada do grupo"),
  P("As regras abaixo são as da nota metodológica de agosto de 2026 e valem para todos os anos de 2019 a 2025 e para o acumulado do período."),
  item([b("Indicadores percentuais: "), "a média não é a média aritmética das taxas das unidades. É a taxa agregada do grupo: soma dos numeradores de todas as unidades do grupo com dados no ano, dividida pela soma dos denominadores, multiplicada por 100. Cada indicador usa o mesmo numerador e o mesmo denominador da ficha individual da unidade, com as mesmas exclusões de registros ignorados."]),
  item([b("Grupos de Robson: "), "a taxa de cesárea de cada grupo de Robson soma as cesáreas do grupo em todas as unidades e divide pela soma dos nascidos vivos daquele grupo de Robson (na ficha do painel, \"número de partos\" significa nascidos vivos do grupo). É a mesma lógica de soma de numeradores e denominadores."]),
  item([b("Volume de nascidos vivos: "), "por ser um número absoluto, usa a média por unidade: total de nascidos vivos do grupo dividido pelo número de unidades com dados no ano."]),
  item([b("Só o próprio grupo: "), "o filtro impede comparar unidades de grupos diferentes ou uma unidade com a média de outro grupo. Unidade sem dados no ano fica fora da média daquele ano. Unidade que pertence a mais de um grupo conta na média de todos eles."]),
  item([b("A coluna da média é só referência: "), "não participa do destaque de melhor posição, que compara apenas as unidades entre si."]),
  P("Exemplo da nota: em 2025, as 25 unidades do grupo EBSERH com dados somaram 28.638 partos cesáreos em 50.084 nascidos vivos com via de nascimento informada, o que resulta em 57,2% de cesárea para o grupo. Uma unidade com 64,4% aparece 7,2 pontos percentuais acima da média do seu grupo."),
  H3("Painel de Internação: média simples das unidades"),
  P("No Painel de Internação, a referência é a média simples dos indicadores das unidades do grupo com dados no ano, porque as planilhas de internação trazem só os indicadores calculados, sem numeradores e denominadores. O destaque marca o maior valor nos indicadores de boas práticas (AMIU, acompanhante, parto vaginal após cesariana e analgesia) e o menor nos indicadores de morbidade (casos de morbidade materna grave e condições potencialmente ameaçadoras à vida). Fonte: página \"Metodologia\" do Painel de Internação."),
  H3("Painel de Mortalidade: agregado do grupo"),
  P("No Painel de Mortalidade, a coluna chama-se \"Agregado do grupo\": é a taxa agregada do grupo (soma dos óbitos dividida pela soma dos denominadores) e, nos números absolutos, a média por unidade. A coluna não participa do destaque de melhor posição. Fonte: página \"Metodologia\" do Painel de Mortalidade."),
];

// ================================================================= 4. nascimentos
const sentidoTexto = (i) => (i.sentido === "menor" ? "Quanto menor, melhor." : i.sentido === "maior" ? "Quanto maior, melhor." : "Sem direção definida: não entra no destaque de melhor posição.");
const metaTexto = (i) => (i.meta ? `Valor de referência do painel: ${i.sentido === "menor" ? "até" : "pelo menos"} ${i.meta}%.` : "");
const linhasIndsNV = NV.inds.map((i) => {
  const c = NV.calculos[i.id] || { n: "—", d: "—" };
  return [i.rot, i.desc, c.n, c.d, [sentidoTexto(i), metaTexto(i), c.obs ? "Observação: ver a ficha \"% Primeiro Trimestre\" na seção 4.3." : ""].filter(Boolean)];
});
const linhasExtrasNV = NV.extras.map((f) => [f.rot, f.desc, f.n, f.d, f.fonte.replace(" - ", " – ")]);
const secoesPerfil = secoesDicionario(AIH.find((b) => b.tipo === "tabela")).filter((s) => s.secao && s.secao.startsWith("PERFIL"));
const s4 = [
  H1("4. Dicionário do Painel de Nascimentos (SINASC)"),
  P("O Painel de Nascimentos (chamado Painel NV 2026, de nascidos vivos) traz, desde 29 de setembro de 2026, somente os indicadores de nascimentos: os blocos de indicadores de nascidos vivos e os quadros de perfil da mãe. Os indicadores de internação passaram ao Painel de Internação (seção 5). Todos os indicadores desta seção vêm do SINASC, série 2019 a 2025, com 2025 preliminar."),
  P("Convenções: a fonte de todos os indicadores é o SINASC; nomes em letras maiúsculas são campos da Declaração de Nascido Vivo nos arquivos do DATASUS; salvo indicação em contrário, os registros ignorados ficam fora do numerador e do denominador."),
  H2("4.1 Bases usadas pelo painel"),
  P("Além das bases descritas na seção 2, a página \"Metodologia\" do painel registra três usos específicos:"),
  ...tabelaL("Usos específicos de bases no Painel de Nascimentos", [2200, 7438], ["Base", "Uso no painel"], NV.fontes.filter(([b]) => ["SIH/AIH", "Malhas territoriais", "Comparativo entre anos", "Localização das unidades"].includes(b)).map(([b, d]) => [b, d])),
  H2("4.2 Indicadores dos mapas e do comparador"),
  P("As fichas abaixo são as mesmas da página \"Metodologia\" do painel. Nos mapas, ao agregar territórios, somam-se os numeradores e os denominadores das maternidades da seleção; a taxa de cesárea por grupo de Robson é ponderada pelo número de nascidos vivos do grupo em cada unidade."),
  ...tabelaL("Indicadores dos mapas e do comparador do Painel de Nascimentos", [1800, 2100, 1900, 1900, 1938], ["Indicador", "O que mede", "Numerador", "Denominador", "Direção, referência e observações"], linhasIndsNV),
  nota("Fonte: Ministério da Saúde, SINASC, 2019 a 2025; dados sujeitos a revisão. Fichas da página \"Metodologia\" do Painel de Nascimentos. A coluna \"Direção, referência e observações\" foi montada a partir do campo de direção de cada ficha (maior, menor ou neutro) e dos valores de referência do painel; indicadores sem direção não entram no destaque de melhor posição do comparador. Os valores de referência dos grupos de Robson são comentados na seção 4.6."),
  H2("4.3 Demais cálculos do painel"),
  P("Esta seção reúne os cálculos que não são indicadores do mapa, mas aparecem no dossiê da unidade, no comparativo entre anos e no comparador."),
  ...tabelaL("Demais cálculos do Painel de Nascimentos", [2000, 2100, 1800, 1800, 1938], ["Cálculo", "O que mede", "Numerador", "Denominador", "Fonte"], linhasExtrasNV),
  H2("4.4 Perfil da mãe (quadros do dossiê)"),
  P("Os quadros de perfil da mãe seguem as regras das seções de perfil do dicionário de indicadores de internação (versão final de 10/09/2026), reproduzidas abaixo. O painel mostra sete quadros: idade, raça/cor, escolaridade, situação conjugal, cesarianas anteriores, tipo de gestação e pré-natal adequado à idade gestacional. A linha de gestações anteriores consta do dicionário e da planilha de indicadores, mas não está entre os sete quadros do painel."),
  ...secoesPerfil.flatMap((s) => [H3(titulo(s.secao)), ...tabelaL(`${titulo(s.secao)}: indicadores e regras`, DIC, ["Indicador", "O que mede", "Variáveis e regra"], s.linhas)]),
  nota("Fonte: Dicionário da planilha de indicadores AIH, grupo de maternidades, versão final de 10/09/2026, seções \"Perfil sócio-demográfico (SINASC)\" e \"Perfil obstétrico (SINASC)\" (grafia original do dicionário)."),
  H2("4.5 Tabelas do dossiê (blocos de nascidos vivos)"),
  P("As tabelas do dossiê reproduzem a apresentação de cada maternidade. As categorias de cada tabela são as mesmas da planilha oficial de indicadores e estão registradas nos programas de extração do SINASC (pasta Extracao_SINASC, programa 2_tabelas_unidades.py). A tabela abaixo resume a variável do SINASC e as categorias de cada bloco."),
  ...tabelaL("Variáveis e categorias das tabelas do dossiê de nascimentos", [2300, 2000, 5338], ["Tabela do dossiê", "Variável do SINASC", "Categorias (como na planilha oficial)"], [
    ["Nascidos vivos e território (ocorrência e residência)", "CODESTAB, CODMUNNASC, CODMUNRES", "Totais por município, região de saúde, macrorregião e UF de ocorrência e de residência, para todos os nascidos vivos e para os de menos de 1.500 g (fichas na seção 4.3)."],
    ["Residência da mãe por região do país e UF", "CODMUNRES", "Região Norte, Nordeste, Sudeste, Sul e Centro-Oeste; UF de residência."],
    ["Consultas de pré-natal", "CONSULTAS", "Nenhuma; 1 a 3 consultas; 4 a 6 consultas; 7 e mais consultas; Ignorado."],
    ["Trimestre de início do pré-natal", "MESPRENAT (mês de início, 01 a 09)", "Primeiro trimestre (meses 1 a 3); Segundo (4 a 6); Terceiro (7 em diante); Ignorado (99 ou em branco)."],
    ["Peso ao nascer", "PESO (gramas)", "0 a 999 g; 1.000 a 1.499 g; 1.500 a 2.499 g; 2.500 a 2.999 g; 3.000 a 3.999 g; 4.000 g e mais; peso inválido ou em branco não entra na tabela."],
    ["Idade gestacional", "GESTACAO (faixas)", "Menos de 22 semanas; 22 a 27; 28 a 31; 32 a 36; 37 a 41; 42 e mais; \"N Inf\" (não informada)."],
    ["Via de nascimento", "PARTO", "Parto vaginal (1); Cesárea (2); Ignorado (demais valores)."],
    ["Assistência ao parto vaginal", "TPNASCASSI, entre os partos vaginais", "Médico (1); Enfermeira ou obstetriz (2); Parteira (3); Outros (4); Ignorado (demais valores)."],
    ["Apgar no 5º minuto", "APGAR5, entre nascidos com 2.500 g ou mais e sem anomalia congênita (IDANOMAL diferente de 1)", "0 a 3; 4 a 6; 7 a 10; \"Ign\" (código 99); \"N Inf\" (em branco)."],
    ["Grupos de Robson (número de nascidos vivos e taxa de cesárea por grupo)", "TPROBSON e PARTO", "Grupo 1 a Grupo 10 (códigos 01 a 10); Não classificados (demais valores; nos registros das unidades, o código 11); Total (seção 4.6)."],
  ]),
  P([b("Linhas de percentual nos decks. "), "Nas apresentações (decks), as linhas de percentual das tabelas de pré-natal, peso, idade gestacional, via de nascimento e assistência ao parto são calculadas sobre o total da tabela, incluindo os registros ignorados; a linha \"% Primeiro Trimestre\" usa o total da tabela de trimestre, incluindo os ignorados (programa bloco_lib.py, função pct). Os indicadores dos mapas e do comparador (seção 4.2) excluem os ignorados do denominador. Por isso um mesmo indicador pode diferir alguns décimos entre o deck e o mapa."]),
  H2("4.6 Grupos de Robson"),
  P("A classificação de Robson separa todas as mulheres que dão à luz em dez grupos, mutuamente exclusivos e que cobrem todos os casos, com base em paridade, cesárea anterior, início do trabalho de parto, apresentação fetal, número de fetos e idade gestacional. A Organização Mundial da Saúde (OMS) a recomenda como instrumento padrão para avaliar, monitorar e comparar taxas de cesárea. As definições abaixo são as da versão em português da Declaração da OMS sobre Taxas de Cesáreas (2015, Quadro 1)."),
  ...tabelaL("Grupos de Robson: definições da OMS (2015) e valores de referência do manual de implementação da OMS (2017)", [1200, 4600, 3838], ["Grupo", "Definição (OMS, 2015)", "Referência de taxa de cesárea (OMS, 2017, Tabela 8)"], [
    ["Grupo 1", "Nulíparas com feto único, cefálico, 37 semanas ou mais, em trabalho de parto espontâneo.", "Taxas abaixo de 10% são alcançáveis. O painel usa até 10%."],
    ["Grupo 2", "Nulíparas com feto único, cefálico, 37 semanas ou mais, cujo parto é induzido ou que são submetidas à cesárea antes do início do trabalho de parto.", "Consistentemente em torno de 20% a 35%. O painel usa até 35%."],
    ["Grupo 3", "Multíparas sem cesárea anterior, com feto único, cefálico, 37 semanas ou mais, em trabalho de parto espontâneo.", "Normalmente não mais que 3,0%. O painel usa até 3%."],
    ["Grupo 4", "Multíparas sem cesárea anterior, com feto único, cefálico, 37 semanas ou mais, cujo parto é induzido ou que são submetidas à cesárea antes do início do trabalho de parto.", "Raramente deve ser maior que 15%. O painel usa até 15%."],
    ["Grupo 5", "Todas as multíparas com pelo menos uma cesárea anterior, com feto único, cefálico, 37 semanas ou mais.", "Taxas de 50% a 60% são consideradas apropriadas, desde que com bons desfechos maternos e perinatais. O painel não fixa referência."],
    ["Grupo 6", "Todas as nulíparas com feto único em apresentação pélvica.", "Sem referência de taxa na Tabela 8."],
    ["Grupo 7", "Todas as multíparas com feto único em apresentação pélvica, incluindo aquelas com cesárea(s) anterior(es).", "Sem referência de taxa na Tabela 8."],
    ["Grupo 8", "Todas as mulheres com gestação múltipla, incluindo aquelas com cesárea(s) anterior(es).", "Em geral em torno de 60%. O tamanho do grupo costuma ser de 1,5% a 2%."],
    ["Grupo 9", "Todas as gestantes com feto em situação transversa ou oblíqua, incluindo aquelas com cesárea(s) anterior(es).", "Deve ser 100% por convenção; o tamanho do grupo deve ser menor que 1%."],
    ["Grupo 10", "Todas as gestantes com feto único e cefálico, com menos de 37 semanas, incluindo aquelas com cesárea(s) anterior(es).", "Em geral em torno de 30%; o tamanho do grupo costuma ser menor que 5% em populações de risco habitual."],
  ]),
  P("O manual da OMS acrescenta que os grupos 1, 2 e 5, somados, costumam responder por cerca de dois terços de todas as cesáreas de um hospital, e que a tabela de Robson deve registrar à parte os casos não classificáveis. Os valores de referência dos grupos 1 a 4 usados no painel coincidem com os limites superiores do manual; o painel os apresenta como \"meta\"."),
  P([b("Como o SINASC classifica. "), "O campo TPROBSON da Declaração de Nascido Vivo é o \"código do Grupo de Robson, gerado pelo sistema\" (Estrutura do SINASC, OpenDataSUS, versão de 22/02/2024). O documento oficial não lista os valores. Nos registros das unidades dos painéis (2024 e 2025), aparecem os códigos 01 a 10 e 11; a extração trata 01 a 10 como os grupos e os demais valores como \"Não classificados\", que é a linha correspondente aos casos não classificáveis da tabela da OMS."]),
  P([b("Duas observações de leitura. "), "Primeira: o SINASC registra nascidos vivos, não mulheres; na gestação múltipla (grupo 8), cada nascido vivo conta uma vez, enquanto a tabela da OMS conta mulheres. Segunda: no grupo 9 (situação transversa ou oblíqua), a OMS espera 100% de cesárea por convenção; valores diferentes de 100% em unidades com poucos casos indicam registro de via de parto a conferir."]),
];

// ================================================================= 5. internação
const secoesAIH = secoesDicionario(AIH.find((b) => b.tipo === "tabela")).filter((s) => !(s.secao && s.secao.startsWith("PERFIL")));
const s5 = [
  H1("5. Dicionário do Painel de Internação (SIH/SUS)"),
  P("As regras desta seção são as do Dicionário da planilha de indicadores AIH, grupo de maternidades, versão final de 10/09/2026. Essa versão consolida as decisões da coordenação de 30 de agosto a 9 de setembro de 2026, registradas nos comentários ao documento de sugestões de melhoria e nas mensagens da equipe. Ela substitui a versão de 2 de setembro de 2026 e a revisão comentada de 7 de setembro de 2026. É a versão aplicada na retabulação de 9 de setembro de 2026 (planilhas \"regras aprovadas 2026-09-09\" e apresentações de setembro de 2026)."),
  P("Convenções: SIH-RD é o arquivo da AIH reduzida (um registro por internação) e SIH-SP é o arquivo de serviços profissionais (um registro por procedimento ou ato realizado na internação). Nomes em letras maiúsculas, como PROC_REA e DIAG_PRINC, são os nomes dos campos nos arquivos do DATASUS. O \"universo obstétrico\" é definido na primeira linha da tabela e serve de denominador para vários indicadores. PROC_REA é o procedimento realizado; DIAG_PRINC, DIAG_SECUN (preenchido até 2014) e DIAGSEC1 a DIAGSEC9 são os campos de diagnóstico; COBRANCA é o motivo de saída da AIH."),
  ...secoesAIH.flatMap((s) => [H3(titulo(s.secao)), ...tabelaL(`${titulo(s.secao)}: indicadores e regras`, DIC, ["Indicador", "O que mede", "Variáveis e regra"], s.linhas)]),
  nota("Fonte: Dicionário da planilha de indicadores AIH, grupo de maternidades, versão final de 10/09/2026. As seções de perfil da mãe desse dicionário estão na seção 4.4. As duas linhas chamadas \"Taxa de Ocupação\" referem-se, na ordem, aos leitos obstétricos (CODLEITO 10 e 43) e aos leitos de UTI neonatal (CODLEITO 81 e 82). A observação sobre a ausência de AIH de longa permanência refere-se às 114 unidades da retabulação de 9 de setembro de 2026."),
  H2("5.1 Comparador e destaques"),
  P("No comparador do Painel de Internação, a média do grupo é a média simples das unidades do grupo com dados no ano, e o destaque segue a regra descrita na seção 3.2. Os valores publicados são os das 114 unidades da retabulação de 9 de setembro de 2026 mais as unidades acrescentadas depois (Pernambuco em 12 de setembro; Maranhão, Ceará e São Paulo em 23 de setembro de 2026)."),
];

// ================================================================= 6. mortalidade
const secoesMort = secoesDicionario(MORT.find((b) => b.tipo === "tabela"));
const parsMort = MORT.filter((b) => b.tipo === "p").map((b) => b.texto);
const referenciasMort = (parsMort.find((t) => t.startsWith("Referências:")) || "").replace(/^Referências:\s*/, "");
const notasMort = parsMort.filter((t) => /^[1-4]\. /.test(t));
const calcMort = (i) => PM.calculos[i.id] || (i.alias && PM.calculos[i.alias]) || { n: "—", d: "—" };
const eixoNome = { geral: "Visão geral", materna: "Mortalidade materna", fetal: "Mortalidade fetal", perinatal: "Mortalidade perinatal", neonatal: "Mortalidade neonatal" };
const linhasIndsMort = PM.inds.map((i) => { const c = calcMort(i); return [i.rot, i.desc, c.n, c.d, [i.fonte || "", c.obs || "", sentidoTexto(i)].filter(Boolean)]; });
const s6 = [
  H1("6. Dicionário do Painel de Mortalidade (SIM)"),
  P("As regras desta seção são as do Dicionário da planilha de indicadores de mortalidade, grupo de maternidades, versão de 11/09/2026. O dicionário descreve os indicadores das planilhas de validação (uma aba por estabelecimento) e das apresentações por maternidade. As regras são as aplicadas no recálculo de 11 de setembro de 2026: óbito materno pela definição do Ministério da Saúde; Lista Brasileira de Causas de Mortes Evitáveis por Intervenções do SUS (LBE), na versão de tabulação para menores de 5 anos do DATASUS e da Secretaria de Vigilância em Saúde (SVS); e recuperação da idade neonatal pelo campo IDADE da Declaração de Óbito."),
  P("Convenções: SIM-DO é o arquivo das declarações de óbito e SIM-DOFET, o das declarações de óbito fetal; nomes em letras maiúsculas são campos desses arquivos e da Declaração de Nascido Vivo; CODESTAB é o código CNES do estabelecimento de ocorrência e CAUSABAS é a causa básica do óbito. Referências citadas pelo dicionário: " + referenciasMort),
  ...secoesMort.flatMap((s) => [H3(titulo(s.secao)), ...tabelaL(`${titulo(s.secao)}: indicadores e regras`, DIC, ["Indicador", "O que mede", "Variáveis e regra"], s.linhas)]),
  nota("Fonte: Dicionário da planilha de indicadores de mortalidade, grupo de maternidades, versão de 11/09/2026. Observação da apostila: a linha \"Unidade de análise e ano de referência\" descreve os arquivos de 2024 como definitivos e a linha \"Situação dos dados\" trata 2024 como preliminar; o painel aplica a segunda. Na regra de óbito fetal, ficam fora também os registros em que um campo é ignorado e o outro está abaixo do limite, porque nenhuma das duas condições (22 semanas ou mais, ou 500 g ou mais) é atendida."),
  H2("6.1 Notas metodológicas do dicionário"),
  ...notasMort.map((t) => numerado(t.replace(/^[1-4]\.\s*/, ""))),
  H2("6.2 Indicadores dos mapas e do comparador"),
  P("O Painel de Mortalidade tem 38 indicadores de mapa e comparador, em cinco blocos (visão geral, materna, fetal, perinatal e neonatal), derivados das tabelas do dicionário, mas com denominadores próprios. As fichas abaixo são as da página \"Metodologia\" do painel. Nas tabelas do dossiê, os percentuais de peso e de momento do óbito incluem a categoria \"Ignorado\" (o total soma 100%); nos mapas e no comparador, os ignorados ficam fora do denominador."),
  ...Object.keys(eixoNome).flatMap((eixo) => {
    const linhas = linhasIndsMort.filter((_, k) => PM.inds[k].eixo === eixo);
    return linhas.length ? [H3(eixoNome[eixo]), ...tabelaL(`Indicadores do bloco \"${eixoNome[eixo]}\" (mapas e comparador)`, [1800, 2000, 2000, 1900, 1938], ["Indicador", "O que mede", "Numerador", "Denominador", "Fonte, direção e observações"], linhas)] : [];
  }),
  H3("Demais cálculos do painel"),
  ...tabelaL("Demais cálculos do Painel de Mortalidade", [2000, 2300, 1800, 1800, 1738], ["Cálculo", "O que mede", "Numerador", "Denominador", "Fonte"], PM.extras.map((f) => [f.rot, f.desc, f.n || "—", f.d || "—", f.fonte || "—"])),
];

// ================================================================= 7. notas comuns, histórico e pendências
const s7 = [
  H1("7. Notas comuns aos três painéis"),
  H2("7.1 Notas gerais"),
  item([b("Dados preliminares. "), "Os anos mais recentes são preliminares: SINASC 2025 nos painéis de Nascimentos e de Internação, e 2024 e 2025 no Painel de Mortalidade; SIM 2024 e 2025; SIH 2025 sujeito a acréscimos; e, nos três painéis, o 1º semestre de 2026. Os totais podem mudar nas próximas versões dos arquivos do DATASUS. Painéis e apresentações trazem a nota \"dados sujeitos a revisão\"."]),
  item([b("Período parcial (1º semestre de 2026). "), "Desde 18 de outubro de 2026 os painéis trazem a coluna \"1º sem. 2026\": nascidos vivos de janeiro a junho de 2026 (data de nascimento), óbitos de janeiro a junho (data do óbito) e internações de janeiro a junho (data de internação), calculados com as mesmas regras das colunas de 2019 a 2025, a partir dos arquivos preliminares de 2026. Por ser um semestre, a coluna não entra na coluna Total (acumulado), que continua 2019 a 2025, nem nas linhas de tendência; os seletores de ano abrem no último ano completo; e os números absolutos do semestre (nascidos vivos, internações, óbitos) não são comparáveis com anos completos, enquanto percentuais, taxas e tempos médios são. No Painel de Internação, a coluna usa as AIH apresentadas até a competência de agosto de 2026: medido em 2025, esse recorte já continha de 97,5% a 99,6% das internações do semestre, conforme a UF, e o restante entra nas competências seguintes. A página \"Metodologia\" de cada painel registra a fonte, a data da extração e as unidades sem registro no período."]),
  item([b("Ocorrência e residência. "), "Nascimentos e óbitos são atribuídos ao estabelecimento onde ocorreram. A Declaração de Óbito não informa o estabelecimento de nascimento; por isso as taxas neonatais e perinatais de maternidades de referência incluem recém-nascidos transferidos de outros serviços, e a razão de mortalidade materna tem a mesma limitação para gestantes e puérperas transferidas. Os indicadores medem o que ocorreu na unidade, não o risco da população atendida. No Painel de Nascimentos, o dossiê mostra as duas perspectivas, local de residência e local de ocorrência (seção 4.3)."]),
  item([b("Datas de referência. "), "Internações: ano da data de internação. Óbitos: ano da data do óbito. Nascidos vivos: ano da data de nascimento."]),
  item([b("Regras aprovadas. "), "Internação e perfil da mãe: decisões da coordenação de 30 de agosto a 9 de setembro de 2026, retabulação de 9 de setembro de 2026. Mortalidade: recálculo de 11 de setembro de 2026. Nascimentos: fichas da página \"Metodologia\" do painel e nota do comparador de agosto de 2026."]),
  item([b("Limitações de registro no SIH. "), "A diária de acompanhante registra diárias faturadas, não a presença durante o trabalho de parto. O registro de transfusão e o de histerectomia no SIH ficam em torno de 50% e 36%, respectivamente (Domingues et al., 2024). Partos em centro de parto normal faturados pelo código comum de parto não são captados."]),
  item([b("Classificações próprias. "), "Os grupos de causas dos óbitos fetais, perinatais e neonatais e os grupos de causas maternas diretas e indiretas seguem faixas de CID-10 definidas no projeto de mortalidade e devem ser citados como classificação própria."]),
  item([b("Atualização dos painéis. "), "A ficha CNES e as habilitações são atualizadas automaticamente em 1º de junho e 1º de dezembro. A página principal dos painéis mostra, sob o botão de cada painel, a data da última atualização dos dados e, na nota de fontes, a data da ficha CNES."]),
  item([b("Rodapé das apresentações de internação. "), "O modelo original citava o SIM como fonte; a fonte dos indicadores de internação é o SIH/SUS."]),
  H2("7.2 Situação dos anos preliminares, por base e painel"),
  ...tabelaL("Anos e períodos tratados como preliminares em cada painel (18/10/2026)", [2000, 2546, 2546, 2546], ["Base", "Painel de Nascimentos", "Painel de Internação", "Painel de Mortalidade"], [
    ["SINASC", "2025 e 1º sem. 2026", "2025 e 1º sem. 2026 (linhas do SINASC)", "2024, 2025 e 1º sem. 2026 (marca aplicada à tabela inteira do painel)"],
    ["SIH/SUS", "—", "2025 (sujeito a acréscimos) e 1º sem. 2026 (competências até agosto de 2026)", "—"],
    ["SIM", "—", "—", "2024, 2025 e 1º sem. 2026"],
  ], { tamanho: 20 }),
  nota("Fonte: carimbos e dados publicados de cada painel. No OpenDataSUS, em 11/10/2026, o arquivo do SINASC de 2024 constava com atualização de 8 de maio de 2026 sem a marca de preliminar, o de 2025 como preliminar (31 de agosto de 2026) e o de 2026 como segunda prévia (2 de outubro de 2026)."),
];

// ================================================================= 8. glossário
const glossario = [
  ["AIH", "Autorização de Internação Hospitalar: registro de cada internação financiada pelo SUS (base do SIH/SUS)."],
  ["AMIU", "Aspiração manual intrauterina; procedimento SIGTAP 0409060070."],
  ["ANS e QUALISS", "Agência Nacional de Saúde Suplementar e seu Programa de Qualificação dos Prestadores de Serviços de Saúde, citado na ficha de taxa de ocupação (E-EFI-02)."],
  ["Apgar", "Escore de vitalidade do recém-nascido; o painel usa o Apgar do 5º minuto (campo APGAR5)."],
  ["API", "Serviço de acesso automatizado a dados pela internet (do inglês application programming interface)."],
  ["Apoiadas", "Rótulo das maternidades estratégicas na lista oficial e nos painéis de Internação e de Mortalidade."],
  ["CAUSABAS", "Causa básica do óbito, código CID-10, na Declaração de Óbito."],
  ["CID-10", "Classificação Internacional de Doenças, 10ª revisão. Códigos de diagnóstico e de causa básica de óbito."],
  ["CNES", "Cadastro Nacional de Estabelecimentos de Saúde. O código CNES de 7 dígitos identifica cada unidade."],
  ["COBRANCA", "Campo da AIH com o motivo de saída ou permanência (1x alta, 2x permanência, 3x transferência, 4x óbito, 51 encerramento administrativo, 6x desfechos de parto)."],
  ["CODESTAB", "Código CNES do estabelecimento de ocorrência, nas declarações de nascido vivo e de óbito."],
  ["CODLEITO e QT_EXIST", "Código do tipo de leito e quantidade de leitos existentes, nos arquivos de leitos (LT) do CNES."],
  ["Competência", "Mês em que a internação foi processada e paga pelo SUS; pode ser posterior ao mês da alta."],
  ["Comparador", "Tela do painel que compara unidades do mesmo grupo e a mesma unidade entre anos (seção 1.3)."],
  ["CPAV", "Condições potencialmente ameaçadoras à vida (morbidade materna grave pelo critério do OOBr; morbidade neonatal grave por critérios pragmáticos)."],
  ["CPN", "Centro de Parto Normal; procedimento SIGTAP 0310010055."],
  ["DATASUS", "Departamento de Informática do SUS, do Ministério da Saúde, que publica as bases usadas nos painéis."],
  ["Deck", "Apresentação de indicadores de cada maternidade (arquivo de slides)."],
  ["DIAR_ACOM", "Número de diárias de acompanhante registradas na AIH."],
  ["DIAS_PERM", "Dias de permanência da internação: data de saída menos data de internação (DT_SAIDA − DT_INTER)."],
  ["DN", "Declaração de Nascido Vivo, documento de origem do SINASC."],
  ["DO e DOFET", "Declaração de Óbito e Declaração de Óbito Fetal, documentos de origem do SIM."],
  ["Dossiê", "Página de detalhe de cada maternidade no painel (seção 1.3)."],
  ["EBSERH", "Empresa Brasileira de Serviços Hospitalares; grupo dos hospitais universitários federais do painel."],
  ["FTP", "Servidor de arquivos do DATASUS na internet (do inglês file transfer protocol)."],
  ["Habilitações", "Serviços que o SUS autoriza o estabelecimento a realizar, registrados no CNES."],
  ["ICD-PM", "Classificação da OMS para causas de óbitos perinatais (CID-PM), citada no dicionário de mortalidade."],
  ["IDB", "Indicadores e Dados Básicos para a Saúde, da Rede Interagencial de Informações para a Saúde (RIPSA), publicados pelo DATASUS; fichas C.1.1, C.1.2, C.3 e C.5."],
  ["IDENT", "Campo da AIH que identifica o tipo de AIH (5 = longa permanência)."],
  ["Ignorado", "Registro com o campo em branco ou com código de \"ignorado\" (9, 99, 9999); fica fora do numerador e do denominador, salvo indicação em contrário."],
  ["LBE", "Lista Brasileira de Causas de Mortes Evitáveis por Intervenções do SUS, na versão de tabulação para menores de 5 anos do DATASUS/SVS."],
  ["LT", "Arquivos de leitos do CNES, por estabelecimento e mês."],
  ["MARCA_UTI", "Campo da AIH com o tipo de UTI usado (81 e 82 = UTI neonatal tipos II e III)."],
  ["Microdados", "Registros individuais de uma base (um por nascimento, internação ou óbito), publicados sem identificação pessoal."],
  ["MMG", "Morbidade materna grave."],
  ["MS", "Ministério da Saúde."],
  ["NV", "Nascidos vivos."],
  ["OMS", "Organização Mundial da Saúde."],
  ["OOBr", "Observatório Obstétrico Brasileiro."],
  ["OpenDataSUS", "Portal de dados abertos do Ministério da Saúde."],
  ["OPM", "Órteses, próteses e materiais especiais (na SIGTAP)."],
  ["PROC_REA", "Procedimento realizado, registrado na AIH (código SIGTAP)."],
  ["QUALINEO", "Nos painéis, grupo das maternidades participantes do ciclo 2026/2027 do QUALINEO, do Ministério da Saúde."],
  ["RD e SP", "Arquivos do SIH/SUS: AIH reduzida (RD, um registro por internação) e serviços profissionais (SP, um registro por procedimento ou ato)."],
  ["Regionalização", "Divisão do território em regiões e macrorregiões de saúde, conforme a base territorial do DATASUS."],
  ["Retabulação", "Recálculo das planilhas de indicadores com um novo conjunto de regras."],
  ["RMM", "Razão de mortalidade materna: óbitos maternos por 100.000 nascidos vivos."],
  ["Robson", "Classificação de Robson, em dez grupos, para analisar a taxa de cesárea (seção 4.6)."],
  ["SDR", "Síndrome do desconforto respiratório do recém-nascido (CID-10 P22.0)."],
  ["SIGTAP", "Sistema de Gerenciamento da Tabela de Procedimentos, Medicamentos e OPM do SUS."],
  ["SIH/SUS", "Sistema de Informações Hospitalares do SUS."],
  ["SIM", "Sistema de Informações sobre Mortalidade."],
  ["SINASC", "Sistema de Informações sobre Nascidos Vivos."],
  ["SP_ATOPROF", "Ato profissional registrado no arquivo de serviços profissionais (SIH-SP), código SIGTAP."],
  ["SUS", "Sistema Único de Saúde."],
  ["SVS", "Secretaria de Vigilância em Saúde, do Ministério da Saúde."],
  ["TabNet e TabWin", "Ferramentas de tabulação do DATASUS, na internet e em programa para computador."],
  ["TMP", "Tempo médio de permanência."],
  ["TPROBSON", "Campo do SINASC com o código do grupo de Robson, gerado pelo sistema (seção 4.6)."],
  ["UF", "Unidade da federação (estado ou Distrito Federal)."],
  ["Universo obstétrico", "Internações de mulheres de 10 a 59 anos com diagnóstico O00 a O99 em qualquer campo de diagnóstico da AIH (seção 5)."],
  ["UTI_MES_TO", "Total de diárias de UTI registradas na AIH."],
  ["UTIN", "Unidade de terapia intensiva neonatal (leitos CNES 81 e 82, tipos II e III; o leito 80, tipo I, só na regra transitória de 5 de setembro de 2026; MARCA_UTI 81 e 82 na AIH)."],
  ["VBAC", "Parto vaginal após cesariana (do inglês vaginal birth after cesarean)."],
].sort((a, b) => a[0].localeCompare(b[0], "pt-BR"));
const s8 = [H1("8. Glossário de siglas e termos"), ...tabelaL("Siglas e termos usados na apostila", [2200, 7438], ["Sigla ou termo", "Significado"], glossario, { tamanho: 20 })];

// ================================================================= 9. referências
const refBases = [
  ["Ministério da Saúde. SINASC: microdados públicos, um arquivo por ano, no OpenDataSUS. ", link("dadosabertos.saude.gov.br/dataset/sistema-de-informacao-sobre-nascidos-vivos-sinasc", "https://dadosabertos.saude.gov.br/dataset/sistema-de-informacao-sobre-nascidos-vivos-sinasc"), ". Acesso em 11 out. 2026."],
  ["Ministério da Saúde. SINASC: estrutura dos arquivos (dicionário de campos), versão de 22 fev. 2024. ", link("diaad.s3.sa-east-1.amazonaws.com/sinasc/SINASC+-+Estrutura.pdf", "https://diaad.s3.sa-east-1.amazonaws.com/sinasc/SINASC+-+Estrutura.pdf"), ". Acesso em 11 out. 2026."],
  ["Ministério da Saúde. SIH/SUS: arquivos RD e SP, competências de 01/2019 a 06/2026 (colunas de 2019 a 2025) e até 08/2026 (1º semestre de 2026). FTP do DATASUS, pasta dissemin/publicos/SIHSUS/200801_/Dados. Acesso em set. e out. 2026."],
  ["Ministério da Saúde. SIM: arquivos DO (pastas SIM/CID10/DORES e SIM/PRELIM/DORES) e DOFET (SIM/CID10/DOFET e SIM/PRELIM/DOFET), 2019 a 2025 e preliminares de 2026. FTP do DATASUS. Extração em 10, 11 e 23 set. 2026 e, para 2026, em 18 out. 2026."],
  ["Ministério da Saúde. CNES: ficha de estabelecimento pela API de Dados Abertos (apidadosabertos.saude.gov.br/cnes/estabelecimentos), habilitações pelo portal cnes.datasus.gov.br e arquivos de leitos (LT) no FTP do DATASUS (CNES/200508_/Dados/LT). Atualização em 11 out. 2026."],
  ["Ministério da Saúde. Base territorial do DATASUS (município, região de saúde e macrorregião), versão de jun. 2026, e malhas das regiões e macrorregiões de saúde."],
];
const refNormas = [
  "Lei nº 11.108, de 2005 (direito a acompanhante no parto); Portaria GM/MS nº 2.418/2005 (cobrança das despesas com acompanhante na AIH); Portaria GM/MS nº 1.459/2011, art. 7º.",
  "Portaria GM/MS nº 11/2015, art. 51 (Centro de Parto Normal); Portaria SAES/MS nº 1.549/2024 (laqueadura tubária na internação do parto normal, vigente desde a competência 04/2024).",
  "Portaria GM/MS nº 930/2012 e Portaria GM/MS nº 2.862/2023 (UTI neonatal); Portaria SAES/MS nº 2.902/2025 (reclassificação dos leitos de UTI neonatal tipo I).",
  "Portaria SAS/MS nº 312/2002 (estatísticas hospitalares; taxa de ocupação); Portaria SAS/MS nº 719/2007 e Portaria SAS/MS nº 384/2010 (motivos de saída da AIH); Manual Técnico Operacional do SIH/SUS (2017), item 6.3.",
  "Portaria SVS/MS nº 116/2009 (declaração de óbito fetal).",
  "Lei nº 9.504, de 1997, art. 73, VI, b (condutas vedadas no período eleitoral; identidade visual desta apostila); Decreto nº 8.777, de 2016 (política de dados abertos).",
];
const refTecnicos = [
  ["Rede Interagencial de Informações para a Saúde (RIPSA); DATASUS. Indicadores e Dados Básicos (IDB), capítulo C, Mortalidade: fichas C.1.1, C.1.2, C.3 e Anexo I, e C.5. ", link("tabnet.datasus.gov.br/tabdata/livroidb/2ed/CapituloC.pdf", "http://tabnet.datasus.gov.br/tabdata/livroidb/2ed/CapituloC.pdf"), "."],
  ["DATASUS; Secretaria de Vigilância em Saúde. Óbitos por causas evitáveis de 0 a 4 anos: notas técnicas e Lista de Tabulação de Causas Evitáveis de menores de 5 anos (Malta et al., 2007, atualizada em 2010). ", link("tabnet.datasus.gov.br/cgi/sim/Obitos_Evitaveis_0_a_4_anos.pdf", "http://tabnet.datasus.gov.br/cgi/sim/Obitos_Evitaveis_0_a_4_anos.pdf"), "."],
  ["Ministério da Saúde. Guia de Vigilância Epidemiológica do Óbito Materno. Brasília, 2009."],
  ["Ministério da Saúde. Norma Técnica de Atenção Humanizada ao Abortamento. Brasília, 2014."],
  ["Ministério da Saúde. SIGTAP: Tabela de Procedimentos, Medicamentos e OPM do SUS."],
  ["DATASUS. Nota técnica sobre o campo DIAS_PERM do SIH/SUS (inclui dias de UTI), citada no dicionário de indicadores AIH."],
  ["DATASUS; Secretaria de Vigilância em Saúde. Dicionários de variáveis do SIM e do SINASC e Manual de preenchimento da Declaração de Nascido Vivo."],
  ["Organização Mundial da Saúde. Recomendações sobre cuidados pré-natais para uma experiência positiva na gravidez. 2016."],
  ["Organização Mundial da Saúde. CID-10, volume 2 (limites para as estatísticas perinatais) e ICD-PM (classificação de óbitos perinatais)."],
  ["Organização Mundial da Saúde. Declaração da OMS sobre Taxas de Cesáreas (WHO/RHR/15.02), 2015, versão em português; Quadro 1, classificação de Robson. Cópia hospedada no ProQualis/Fiocruz: ", link("proqualis.fiocruz.br/sites/proqualis.fiocruz.br/files/WHO_RHR_15.02_por.pdf", "https://proqualis.fiocruz.br/sites/proqualis.fiocruz.br/files/WHO_RHR_15.02_por.pdf"), ". Acesso em 11 out. 2026."],
  ["World Health Organization. Robson Classification: Implementation Manual. Geneva: WHO, 2017. ISBN 978-92-4-151319-7; Tabela 8 (valores de referência por grupo). ", link("who.int/publications/i/item/9789241513197", "https://www.who.int/publications/i/item/9789241513197"), ". Acesso em 11 out. 2026."],
  ["Observatório Obstétrico Brasileiro (OOBr). Painel de Vigilância da Saúde Materna (condições potencialmente ameaçadoras à vida no SIH/SUS) e painel Óbitos de Gestantes e Puérperas (regra de óbito materno). Código-fonte: ", link("github.com/observatorioobstetrico/painel-obitos-grav-puerp", "https://github.com/observatorioobstetrico/painel-obitos-grav-puerp"), "."],
  ["Agência Nacional de Saúde Suplementar. Programa QUALISS, ficha técnica E-EFI-02 (taxa de ocupação)."],
  ["Livro Verde 2026, capítulo 3: fichas de qualificação de indicadores hospitalares. DOI ", link("10.5281/zenodo.18273581", "https://doi.org/10.5281/zenodo.18273581"), "."],
];
const refArtigos = [
  "Domingues et al., 2024 (morbidade materna grave e limitações de registro no SIH; base do critério do OOBr).",
  "Nakamura-Pereira et al., 2013 (limitações de registro no SIH).",
  "Jacobs e Boing, 2021 (interrupção da gestação prevista em lei no SIH).",
  "Pileggi et al., 2010; Silva et al., 2014; Kale et al., 2017 (critérios pragmáticos de morbidade neonatal grave).",
  "Malta et al., 2007 e 2010 (Lista Brasileira de Causas de Mortes Evitáveis).",
];
const refProjeto = [
  "Dicionário da planilha de indicadores AIH, grupo de maternidades, versão final de 10 de setembro de 2026 (Projeto Apresentações Internação).",
  "Dicionário da planilha de indicadores de mortalidade, grupo de maternidades, versão de 11 de setembro de 2026 (Mortalidade Indicadores).",
  "Nota metodológica: comparação da unidade com a média do seu grupo, Painel NV 2026, agosto de 2026.",
  ["Páginas \"Metodologia\" dos painéis de Nascimentos, Internação e Mortalidade, publicadas em ", link(SITE, SITE), ", e documentação do repositório Indicadores_Brasil (GitHub)."],
];
const s9 = [
  H1("9. Referências"),
  P("As referências estão agrupadas por tipo. As citações de artigos científicos reproduzem a forma usada nos dicionários de origem (autor e ano)."),
  H2("9.1 Bases de dados e sistemas"), ...refBases.map((r) => item(r)),
  H2("9.2 Normas"), ...refNormas.map((r) => item(r)),
  H2("9.3 Documentos técnicos oficiais"), ...refTecnicos.map((r) => item(r)),
  H2("9.4 Artigos científicos citados nos dicionários"), ...refArtigos.map((r) => item(r)),
  H2("9.5 Documentos do projeto"), ...refProjeto.map((r) => item(r)),
];

// ================================================================= documento
const doc = documento({
  titulo: "Apostila dos Dicionários de Dados · Painéis das Maternidades Estratégicas",
  descricao: "Definições e regras de cálculo dos indicadores dos painéis de nascimentos, internação e mortalidade, 2019 a 2025. Versão 1.1, 11 de outubro de 2026.",
  criador: "Coordenação de Ações Nacionais e de Cooperação em Saúde da Mulher, da Criança e do Adolescente · IFF/Fiocruz · Ministério da Saúde",
  textoCabecalho: "Apostila dos Dicionários de Dados · Painéis das Maternidades Estratégicas · IFF/Fiocruz · Ministério da Saúde",
  textoRodape: "SINASC, SIH/SUS, SIM e CNES, 2019 a 2025 · dados sujeitos a revisão · versão 1.1, 11 de outubro de 2026",
  filhos: [...capa, ...sumario(), ...s1, ...s2, ...s3, ...s4, ...s5, ...s6, ...s7, ...s8, ...s9],
});
salvar(doc, SAIDA);
