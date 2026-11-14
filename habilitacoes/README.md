# Painel de Habilitações · Maternidades Estratégicas

Painel de consulta das habilitações registradas no Cadastro Nacional de Estabelecimentos de Saúde (CNES), pedido pela
coordenação em 29/10/2026 para as unidades dos três grupos (Apoiadas, HU Brasil e QUALINEO) e ampliado em 13/11/2026 para **todas as unidades com leitos obstétricos e/ou neonatais SUS**, mantida a
sinalização dos grupos acompanhados. Mesma identidade visual dos painéis de Nascimentos, Internação e Mortalidade.

## Todas as unidades com leitos obstétricos ou neonatais SUS (13/11/2026)

- **Critério**: pelo menos um leito SUS (`QT_SUS > 0`) nas especialidades 10 e 43 (obstetrícia cirúrgica e clínica) ou
  41, 65, 80, 81, 82, 92 e 93 (neonatologia, unidade intermediária neonatal, UTI neonatal I, II e III, UCINCo e
  UCINCa) do arquivo de leitos do CNES. Na competência 09/2026: 3.437 estabelecimentos (2.720 só obstétricos, 65 só
  neonatais, 652 com os dois). Sem o código 41 seriam 3.426.
- **Fonte**: arquivos do CNES no FTP do DATASUS, todos da mesma competência: `LT` (leitos), `HB` (habilitações), `ST`
  (cadastro) e `TAB_CNES.zip` (nome fantasia, descrição das habilitações, tipo de estabelecimento). Território: base
  territorial do DATASUS (município -> região de saúde e macrorregião, as mesmas das malhas) e nomes de município do
  IBGE. Os arquivos brutos (cerca de 150 MB) ficam fora do repositório, em
  `Projeto Apresentações Internação/Extracao_SIH/dados/brutos/cnes_{lt,hb,st,aux}`.
- **Como atualizar** (no computador, quando sair uma competência nova):
  1. `py -3.12 69_baixar_cnes_habilitacoes.py AAMM` na pasta `Extracao_SIH` (baixa só o que falta) e extrair de
     `TAB_CNES.zip`, para `cnes_aux/TAB_CNES_AAMM`, os arquivos `CADGERBR.dbf`, `HABILITA.DBF`, `TP_ESTAB.CNV` e
     `ESFERAJUR.CNV`;
  2. `py -3.12 habilitacoes/build_universo.py AAMM` (grava `universo_cnes.json`, que vai para o repositório);
  3. `py -3.12 habilitacoes/montar_painel.py`.
  Na nuvem, o workflow "Atualizar CNES" só refaz as unidades acompanhadas e reaproveita o `universo_cnes.json`.
- **Dados no painel**: `DADOS.maternidades` continua com as unidades acompanhadas (as mesmas dos outros três painéis,
  ficha e habilitações da consulta ao CNES), agora com `leitos` (leitos SUS por especialidade), `tipo` e `natureza`.
  `DADOS.demais` traz as outras unidades em formato compacto: `c` CNES, `n` nome fantasia, `u` UF, `m` município
  (chave de `DADOS.municipios`), `tp` tipo de estabelecimento (chave de `DADOS.tiposEstab`), `g` gestão, `nj` natureza
  jurídica (chave de `DADOS.esferas`), `cep`, `at` competência da última atualização do registro, `e` estruturas
  (centro obstétrico, centro neonatal, centro cirúrgico, atendimento hospitalar, atendimento ambulatorial), `l` leitos
  SUS por especialidade e `h` habilitações (`[código, início AAAAMM, fim AAAAMM ou 999999, portaria, data, leitos]`).
- **Conferência entre as duas vias** (13/11/2026, unidades acompanhadas): o conjunto de habilitações do arquivo `HB`
  de 09/2026 é igual ao da consulta de 11/10/2026 em 116 das 121 fichas; nas outras cinco a diferença é de data.
  Competências e leitos coincidem nas 2.250 habilitações comparadas. Tipo de estabelecimento, CEP, centro
  obstétrico, centro cirúrgico e atendimento hospitalar coincidem nas 120 unidades; a marca de centro neonatal
  difere em 19 e, por isso, não é mostrada para as demais unidades, assim como o turno de atendimento e a data de
  atualização, cujas tabelas de conversão não puderam ser conferidas.
- **Posição no mapa**: as demais unidades não têm coordenadas nos arquivos utilizados e aparecem na sede do município.

**Publicação:** https://anamazza.github.io/Indicadores_Brasil/habilitacoes/ · **Arquivo final:** `index.html`
(idêntico a `Painel_Habilitacoes_2026.html`), HTML único e autocontido; só o mapa depende da internet (Leaflet e OpenStreetMap, como nos outros painéis).

## O que o painel contém

- **Consulta individual**: um seletor por grupo (Apoiadas, HU Brasil, QUALINEO) e busca por nome, município, estado
  ou CNES; a ficha abre em página própria, com o cadastro CNES e a tabela completa de habilitações (código,
  descrição, competência inicial e final, portaria e data, leitos, origem), PDF pela impressão e CSV. O endereço
  `index.html#<CNES>` abre a ficha direto.
- **Por grupo**: barras das habilitações mais frequentes no grupo escolhido (foco materno-infantil ou as 20 mais
  frequentes); tocar numa barra lista quem tem e quem não tem; matriz de cobertura do grupo (unidades × famílias
  materno-infantis, com leitos e tipo de UTI, colunas adicionais do catálogo) e CSV da matriz e de todas as
  habilitações do grupo.
- **Por local**: tabela estado × famílias materno-infantis (unidades que têm / total do estado), com filtros de
  região, estado e grupo, CSV e cartões das unidades do local.
- **Mapa do Brasil** (modelo do Painel NV): filtros Território e Estado em cascata, detalhe por estados,
  macrorregiões ou regiões de saúde (malhas iguais às dos outros painéis), grupo, pills de habilitação (famílias
  materno-infantis ou qualquer código do catálogo); a cor conta as unidades do território com a habilitação, com
  tooltip, zoom ao tocar num estado e painel de seleção com a lista das unidades. Pontos sobre a malha são opcionais e
  aproximados (`ajusta_projecao.js`, encaixe na própria região de saúde). No acordeão, o mapa de unidades (Leaflet,
  OpenStreetMap, coordenadas do CNES; precisa de internet) com o mesmo recorte, busca, nomes e CSV com coordenadas.
- **Notas metodológicas**: fonte e data, composição da lista (lista oficial de 09/09/2026, anexos, complexo da
  FAMEMA) e como ler cada campo.

## Fonte dos dados e regras

- Não há coleta própria: `build_dados.py` lê, nas pastas vizinhas `nascimentos/`, `internacao/` e `mortalidade/`,
  o `dados.json` (unidades e grupos) e o `cnes_dados.json` (ficha CNES e habilitações, atualizados na nuvem pelo
  workflow "Atualizar CNES") e consolida as unidades. Desde 13/11/2026 os quatro painéis têm as mesmas 120 unidades
  (121 códigos CNES, porque o complexo da FAMEMA tem dois).
- `COMPLEXOS` no `build_dados.py`: códigos CNES que formam uma só unidade. FAMEMA (Marília/SP): 2025523, o código da
  lista oficial, e 2025507. A ficha da unidade reúne as habilitações dos dois códigos e indica, em cada linha, o
  código em que a habilitação está registrada; a busca e o endereço `#CNES` aceitam qualquer um dos dois.
- Grupos pela lista oficial de 09/09/2026, guardada em `lista_oficial_2026-09-09.csv` (115 CNES, planilha
  LISTA_MATERNIDADES_POR_GRUPO_09092026 da coordenação, conferida com os painéis em 29/10/2026, ver
  `relatorios/conferencia_lista_oficial_2026-10-29.md`). Unidades fora da lista ficam marcadas como anexo, com os grupos
  lidos dos painéis (Mortalidade, depois Internação, depois Nascimentos; "estrategica" vale como "apoiada").
- `EXCLUIR` no `build_dados.py`: unidades retiradas só deste painel por decisão da coordenação. Está vazio desde
  13/11/2026: o Hospital do Rocio/PR, retirado daqui em 30/10/2026, saiu também do painel de Mortalidade.
- Ficha e habilitações: a cópia com a data de atualização do cadastro mais recente entre os três painéis.
- Vigência: `dtCompFim` 99/9999 = sem prazo final; outra competência = vigente com prazo (todas as habilitações do
  serviço estavam vigentes na data da consulta; as encerradas não constam). Origem "P" = ato do gestor estadual ou
  municipal (CIB, SES); demais = portaria do Ministério da Saúde. Leitos = `nuLeitos` da habilitação.

## Como atualizar e montar

| O quê | Como |
|---|---|
| Habilitações e ficha CNES | automático na nuvem (workflow "Atualizar CNES", 1º jun e 1º dez, ou disparo manual), que atualiza os três painéis e em seguida roda `python habilitacoes/montar_painel.py` |
| Remontar localmente | na raiz do clone, `py habilitacoes\montar_painel.py` (o `publicar.ps1` já faz isso depois de montar os outros painéis) |
| Mudar as famílias materno-infantis, textos ou estilos | editar `painel_app.js` (constante `FAMILIAS`) e `painel_base.html`, depois remontar |

Não há pasta de trabalho local nem espelhamento: esta pasta é a fonte, editada direto no repositório.

## Estrutura

- `painel_base.html` — estrutura e estilos (fonte editável)
- `painel_app.js` — lógica do painel (fonte editável)
- `lista_oficial_2026-09-09.csv` — lista oficial de maternidades por grupo (fonte dos grupos e da marca de anexo)
- `build_dados.py` — consolidação das unidades e habilitações dos três painéis (gera `dados_habilitacoes.js`, com as malhas GEO copiadas do painel de Mortalidade e os ids de região de saúde e macrorregião por unidade, e `cnes_dados.json`)
- `ajusta_projecao.js` — ajuste da conversão lat/lon para a malha usada no mapa do Brasil (documentação; só precisa ser rodado se a malha mudar)
- `montar_painel.py` — monta `index.html`, `dados.json` e `atualizacao.json`
- `dados_habilitacoes.js`, `dados.json`, `cnes_dados.json`, `atualizacao.json` — gerados
- `logos_institucionais.png` — imagem embutida na montagem
