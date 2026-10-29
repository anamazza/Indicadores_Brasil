# Conferência da lista oficial de maternidades por grupo com os painéis · 29/10/2026

Planilhas conferidas: `LISTA_MATERNIDADES_POR_GRUPO_09092026.xlsx` e `LISTA_MATERNIDADES_POR_GRUPO_09092026_1.xlsx`
(enviadas pela coordenação em 29/10/2026). A aba `Planilha1` das duas é idêntica: 115 códigos CNES, sem duplicatas,
mesmos nomes, UF e tipo de apoio. Elas só diferem nas abas de tabela dinâmica (`Planilha2` conta municípios por
estabelecimento; `Planilha3` conta estabelecimentos por tipo de apoio). A lista foi guardada em
`habilitacoes/lista_oficial_2026-09-09.csv` e passou a ser a fonte dos grupos do Painel de Habilitações.

## Composição da lista oficial

| Tipo de apoio | Estabelecimentos |
|---|---|
| APOIADA/QUALINEO | 48 |
| QUALINEO | 37 |
| EBSERH | 24 |
| APOIADA | 3 |
| APOIADA/EXTRA | 2 |
| APOIADA/EBSERH/QUALINEO | 1 |
| Total | 115 |

Por grupo (uma unidade conta em cada grupo a que pertence): apoiadas 54 (inclui as duas APOIADA/EXTRA), EBSERH 25,
QUALINEO 86. A tabela dinâmica da planilha `_1` mostra QUALINEO 85 porque não soma a unidade APOIADA/EBSERH/QUALINEO
(Maternidade Escola Assis Chateaubriand, CE).

## Resultado por painel

| Painel | Unidades | Da lista ausentes no painel | No painel e fora da lista | Grupos divergentes |
|---|---|---|---|---|
| Nascimentos | 118 | 3 | 6 | 53 |
| Internação | 119 | 1 | 5 | 0 |
| Mortalidade | 120 | 0 | 5 | 0 |
| Habilitações | 122 | 0 | 7 | 0 |

### Internação e Mortalidade

Grupos iguais aos da lista em todas as unidades. Fora da lista, só os anexos já documentados na apostila
(Carmosina Coutinho/MA, Santa Casa de Sobral/CE, Santa Casa de Franca/SP, e, na Internação, Claudionor Couto
Roriz/RO; na Mortalidade, Hospital do Rocio/PR e Iauaretê/AM), todos marcados como anexo. A Internação usa o código
2025507 (hospital adulto) para o Hospital das Clínicas da FAMEMA, enquanto a lista traz o 2025523 (unidade
materno-infantil); a Mortalidade trata os dois como um complexo. Não é erro, mas o 2025507 está marcado como oficial na
Internação sem constar da lista.

### Habilitações

Os 115 códigos da lista estão no painel, com os grupos lidos da própria lista (60 apoiadas, 25 EBSERH e 87 QUALINEO,
contando os anexos). As 7 unidades fora da lista aparecem como anexo: os seis anexos acima e o código 2025507 da FAMEMA
(segundo código do complexo). Nenhuma divergência de UF.

### Nascimentos

O painel mantém a composição de grupos de agosto de 2026 (registrado na apostila, seção 3.1), por isso diverge da lista:

- 3 unidades da lista não estão no painel: Hospital das Clínicas HCFAMEMA (2025523, o painel usa o 2025507), CISAM
  (2711613, PE) e Hospital da Mulher do Recife (7958838, PE).
- 6 unidades fora da lista sem marca de anexo: FAMEMA 2025507, Carmosina Coutinho, Claudionor Couto Roriz, Santa Casa
  de Franca, Iauaretê e Santa Casa de Sobral.
- 53 unidades com grupos diferentes: 49 apoiadas que na lista são APOIADA/QUALINEO e no painel só apoiadas (a
  Assis Chateaubriand é APOIADA/EBSERH/QUALINEO na lista e apoiada/EBSERH no painel), e 4 unidades que o painel marca
  como apoiadas e a lista não (Maternidade Cândida Vargas e Nossa Senhora de Lourdes, só QUALINEO; Maternidade Escola
  Januário Cicco e Climério de Oliveira, só EBSERH).

Consequência: no Painel de Nascimentos, a média do grupo QUALINEO é calculada com 35 unidades, e não com 86, e as
quatro unidades acima entram na média das apoiadas sem constar da lista. Alinhar o painel à lista exige rodar o
`build_dados.py` da pasta de trabalho `Painel_2026_Novo` com a lista oficial e remontar; é decisão da coordenação,
porque muda as médias de grupo publicadas.
