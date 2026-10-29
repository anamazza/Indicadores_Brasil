# Painel de Habilitações · Maternidades Estratégicas

Painel de consulta das habilitações registradas no Cadastro Nacional de Estabelecimentos de Saúde (CNES) para
todas as unidades dos três grupos (maternidades apoiadas, unidades EBSERH e QUALINEO 2026/2027), pedido pela
coordenação em 29/10/2026. Mesma identidade visual dos painéis de Nascimentos, Internação e Mortalidade.

**Publicação:** https://anamazza.github.io/Indicadores_Brasil/habilitacoes/ · **Arquivo final:** `index.html`
(idêntico a `Painel_Habilitacoes_2026.html`), HTML único e autocontido, sem bibliotecas externas.

## O que o painel contém

- **Panorama**: filtros válidos para todo o painel (grupo, região, estado, busca por nome, município ou CNES,
  habilitação, "que têm / que não têm"), barras das habilitações mais frequentes (foco materno-infantil ou as 20
  mais frequentes) e painel lateral com a cobertura por grupo da habilitação escolhida e a lista de quem tem ou
  não tem.
- **Matriz de cobertura**: unidades × famílias de habilitações de interesse materno e infantil (alto risco HGPAR,
  UTI neonatal II/III, UCINCo, UCINCa, UTI pediátrica, UTI adulto, Hospital Amigo da Criança, Casa da Gestante,
  Centro de Parto Normal, triagem neonatal, laqueadura, vasectomia), com leitos habilitados na célula, colunas
  adicionais a partir do catálogo completo, totais por coluna e download em CSV.
- **Unidades**: um cartão por maternidade (grupos, total de habilitações, marcadores das famílias) e download de
  todas as habilitações do recorte em CSV (uma linha por habilitação).
- **Ficha da unidade**: página sobreposta com a ficha de cadastro CNES e a tabela completa de habilitações
  (código, descrição, competência inicial e final, portaria e data, leitos, origem), PDF pela impressão e CSV.
  O endereço `index.html#<CNES>` abre a ficha direto.
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
- `build_dados.py` — consolidação das unidades e habilitações dos três painéis (gera `dados_habilitacoes.js` e `cnes_dados.json`)
- `montar_painel.py` — monta `index.html`, `dados.json` e `atualizacao.json`
- `dados_habilitacoes.js`, `dados.json`, `cnes_dados.json`, `atualizacao.json` — gerados
- `logos_institucionais.png` — imagem embutida na montagem
