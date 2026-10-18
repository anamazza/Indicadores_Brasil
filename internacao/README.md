# Painel de Internação 2026 · Maternidades Estratégicas

Painel interativo de indicadores de **internação obstétrica e neonatal** (SIH/SUS) das maternidades da
Qualificação do Modelo de Gestão em Maternidades Estratégicas na Rede de Atenção à Saúde Materna e
Neonatal — Coordenação de Ações Nacionais e de Cooperação em Saúde da Mulher, da Criança e do Adolescente
(IFF/Fiocruz). Mesma família e mesma estrutura do [Painel NV 2026](https://anamazza.github.io/Indicadores_Brasil/nascimentos/)
e do [Painel de Mortalidade 2026](https://anamazza.github.io/Indicadores_Brasil/mortalidade/); desde 12/10/2026 o cabeçalho tem um único botão, **Página principal**, que leva à
[página principal dos painéis](https://anamazza.github.io/Indicadores_Brasil/) (repositório Indicadores_Brasil).

**Publicação (desde 11/10/2026):** https://anamazza.github.io/Indicadores_Brasil/internacao/ — `montar_painel.py` espelha esta pasta de
trabalho na subpasta `internacao/` do repositório [Indicadores_Brasil](https://github.com/anamazza/Indicadores_Brasil) (clone em
`Documentos/Página principal`); publicar = commit + push de lá. O endereço antigo
(Indicadores_NV/internacao/) só redireciona para o novo.

**Arquivo final:** `index.html` (idêntico a `Painel_Internacao_2026.html`) — HTML único e autocontido,
pronto para o GitHub Pages. Requer internet só para o mapa de fundo do mapa de unidades (Leaflet/OpenStreetMap).

## O que o painel contém

- **Mapa de unidades** (abertura do painel): as 119 maternidades (Leaflet), coloridas por grupo (apoiadas,
  EBSERH, QUALINEO 2026/2027), com filtros, busca, resumo de 2025 no popup e pontos de contexto
  (estabelecimentos ≥480 partos/ano, SIH/AIH 2025).
- **Perfil da unidade**: página própria com ficha CNES e habilitações ativas (API oficial) e as 15 seções
  da apresentação de indicadores de internação (gera_deck_v4): internações obstétricas, motivos, interrupção
  da gestação prevista em lei, AMIU, acompanhante, Centro de Parto Normal, assistência ao parto, morbidade
  materna grave por causas e por manejo, ocupação e permanência na obstetrícia; internações neonatais, grupos
  de causas, UTI neonatal, morbidade neonatal, ocupação e permanência na UTIN. Anos clicáveis abrem o gráfico
  do ano; rótulos clicáveis abrem a evolução 2019-2025; download em PDF.
- **Comparador**: entre unidades (2 a 4 do mesmo grupo, por ano, com a média simples do grupo como
  referência e o melhor valor destacado nos indicadores com direção) e da mesma unidade entre anos
  (variação e tendência).
- **Metodologia**: página própria com as fontes oficiais e a ficha de cada indicador conforme o dicionário
  final de indicadores de internação (10/09/2026).

Não há mapa coroplético nem comparativo territorial: as planilhas trazem indicadores por estabelecimento,
sem tabulação por região ou macrorregião de saúde.

## Fontes

SIH/SUS 2019–2025 e 1º semestre de 2026 (AIH reduzida e serviços profissionais, competências até junho de 2026 para 2019-2025 e até agosto de 2026 para o semestre; 2025 e 2026 sujeitos a
acréscimos), CNES-LT (leitos-dia), SINASC 2019–2025 (parto vaginal após cesariana, trabalho de parto
induzido e condições potencialmente ameaçadoras à vida) · CNES (ficha via API de Dados Abertos; habilitações
via serviço do site do CNES) · lista oficial de maternidades por grupo de 09/09/2026.

Os valores são os de `../Extracao_SIH/saida/planilhas_corrigidas_v3.json` (114 unidades, regras aprovadas pela
coordenação em 09/09/2026 — as mesmas dos 119 decks de internação, versão para validação) mais as unidades
avulsas pedidas depois (`planilhas_adicionais_pe.json`, 12/09; `planilhas_adicionais_ma_ce_sp.json`, 23/09),
marcadas como anexo quando não constam da lista oficial.

## Como atualizar

| O quê | Como |
|---|---|
| Indicadores (nova rodada das planilhas) | rerodar a esteira em `../Extracao_SIH` (55/56 ou 61) e depois `py build_dados.py` |
| Ficha CNES + habilitações | atualizada **na nuvem** (GitHub Actions, workflow "Atualizar CNES", 1º jun e 1º dez, ou disparo manual na aba Actions do Indicadores_Brasil); o `montar_painel.py` resgata o `cnes_dados.json` do repositório. Só em emergência: `py atualizar_cnes.py` aqui |
| Coluna de período parcial (1º sem. 2026, desde 18/10/2026) | em `../Extracao_SIH`: `py -3.12 63_baixar_2026.py` (RD/SP/LT de 2026), `py -3.12 66_sp_marcas_2026.py` (marcas SP de 2026), `py -3.12 extrai_leitos_periodo.py 2026S1`, `py -3.12 gera_tabula_periodo.py` e `py -3.12 tabula_periodo.py 2026S1` (checkpoint em `saida/tabulacao_2026S1/`; apagar para refazer); no projeto NV, `py 11_perfil_obstetrico_novos.py --periodo 2026S1` (linhas do SINASC); depois `py build_dados.py` aqui (passo 3b). Regressão do tabulador: `tabula_periodo.py 2024 AC SE PE` = 506/506 células da v3. Período parcial: fora das tendências, padrão dos seletores = último ano completo; refazer quando o SIH publicar as competências até 2026-12 |
| Remontar o painel | `py montar_painel.py` (gera `Painel_Internacao_2026.html` e `index.html` e espelha esta pasta na subpasta `internacao/` do repositório Indicadores_Brasil) |
| Estrutura/estilo da página | editar `painel_base.html` (ou regerar do painel de mortalidade com `_gera_base.py`) |

`build_dados.py` lê, somente para leitura, o painel NV local (`Pojeto Apresentações NV_2026/Painel_2026_Novo`):
coordenadas, território, nomes, pontos de contexto e fichas CNES das unidades em comum; as duas unidades de
PE que só existem aqui e no painel de mortalidade (CISAM, Hospital da Mulher do Recife) usam a ficha copiada
do painel de mortalidade. O dicionário de indicadores é lido do Word final de 10/09/2026 e embutido
(`const DICIONARIO`).

## Estrutura

- `painel_base.html` — estrutura e estilos (fonte editável; gerado por `_gera_base.py` a partir do painel de mortalidade)
- `painel_app.js` — lógica do painel (fonte editável)
- `build_dados.py`, `atualizar_cnes.py`, `montar_painel.py` — scripts de dados e montagem
- `dados_internacao.js`, `cnes_dados.json` — dados gerados pelos scripts
- `logos_institucionais.png` — logos embutidos na montagem
