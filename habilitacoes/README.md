# Painel de Habilitações · Maternidades Estratégicas

Painel de consulta das habilitações registradas no Cadastro Nacional de Estabelecimentos de Saúde (CNES) para
todas as unidades dos três grupos (maternidades apoiadas, unidades EBSERH e QUALINEO 2026/2027), pedido pela
coordenação em 29/10/2026. Mesma identidade visual dos painéis de Nascimentos, Internação e Mortalidade.

**Publicação:** https://anamazza.github.io/Indicadores_Brasil/habilitacoes/ · **Arquivo final:** `index.html`
(idêntico a `Painel_Habilitacoes_2026.html`), HTML único e autocontido; só o mapa depende da internet (Leaflet e OpenStreetMap, como nos outros painéis).

## O que o painel contém

- **Consulta individual**: um seletor por grupo (apoiadas, EBSERH, QUALINEO) e busca por nome, município, estado
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
  workflow "Atualizar CNES") e consolida a união das unidades (122 códigos CNES em 29/10/2026).
- Grupos pela lista oficial de 09/09/2026, lidos do painel de Mortalidade, depois do de Internação e só então do de
  Nascimentos ("estrategica" vale como "apoiada"). Unidades fora da lista oficial ficam marcadas como anexo.
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
- `build_dados.py` — consolidação das unidades e habilitações dos três painéis (gera `dados_habilitacoes.js`, com as malhas GEO copiadas do painel de Mortalidade e os ids de região de saúde e macrorregião por unidade, e `cnes_dados.json`)
- `ajusta_projecao.js` — ajuste da conversão lat/lon para a malha usada no mapa do Brasil (documentação; só precisa ser rodado se a malha mudar)
- `montar_painel.py` — monta `index.html`, `dados.json` e `atualizacao.json`
- `dados_habilitacoes.js`, `dados.json`, `cnes_dados.json`, `atualizacao.json` — gerados
- `logos_institucionais.png` — imagem embutida na montagem
