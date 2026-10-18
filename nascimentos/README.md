# Painel NV 2026 · Maternidades Estratégicas

Painel interativo da Qualificação do Modelo de Gestão em Maternidades Estratégicas na Rede de
Atenção à Saúde Materna e Neonatal — Coordenação de Ações Nacionais e de Cooperação em Saúde da
Mulher, da Criança e do Adolescente (IFF/Fiocruz).

**Arquivo final:** `index.html` (idêntico a `Painel_NV2026_Novo.html`) — HTML único e autocontido,
pronto para GitHub Pages. Requer internet para os mapas de fundo (Leaflet/CARTO).

## O que o painel contém

- **Mapa do Brasil**: coroplético por UF, macrorregião ou região de saúde, com recorte + zoom,
  filtros em cascata (território → estado), faixas recalculadas por recorte e tooltip com as
  maternidades de cada território.
- **Mapa de unidades**: as 59 maternidades estratégicas (Leaflet), com filtros, busca e pontos de
  contexto (estabelecimentos ≥480 partos/ano, SIH/AIH 2025).
- **Perfil da unidade**: página própria com ficha CNES e habilitações ativas (API oficial),
  todas as tabelas da apresentação (anos clicáveis abrem gráficos) e download em PDF.
- **Comparador**: entre unidades (2 a 4, por ano) e da mesma unidade entre anos (variação e
  tendência; variação clicável abre o gráfico).
- **Comparativo 2019 × 2024**: retenção de nascimentos no território de residência, todos os
  nascimentos (por região de saúde/macro/UF) e <1500 g (por macro/UF), dois mapas lado a lado.
- **Metodologia**: página própria com fontes oficiais e ficha de numerador/denominador de cada cálculo.

## Fontes

SINASC 2019–2025 e 1º semestre de 2026 (preliminar; dados sujeitos a revisão) · CNES (ficha via API de Dados Abertos; habilitações
via serviço do site do CNES) · SIH/AIH 2025 · malhas de macrorregiões e regiões de saúde.

## Como atualizar

| O quê | Como |
|---|---|
| Ficha CNES + habilitações | atualizada **na nuvem** (GitHub Actions, workflow "Atualizar CNES", 1º jun e 1º dez, ou disparo manual na aba Actions do Indicadores_Brasil); o `montar_painel.py` resgata o `cnes_dados.json` do repositório. Só em emergência: `py atualizar_cnes.py` aqui |
| Comparativo 2019×2024 | `py build_comparativo.py "planilha_macro.xlsx" "planilha_regiao.xlsx"` |
| Dados SINASC das unidades | `py build_dados.py` (extrai do painel anterior + coordenadas; a lista `ADICIONAIS` registra as planilhas das unidades acrescentadas depois; `blocos_adicionais.py` monta o bloco de perfil das mães a partir do JSON v3 das planilhas de indicadores, `carregar_v3`, e dos JSON das unidades avulsas, `carregar`; as planilhas xlsx de 31/08 servem só de molde) |

Desde 29/09/2026 este painel traz **só nascimentos**: os 16 blocos do deck de NV e os 7 cards de perfil da mãe
(idade, raça/cor, escolaridade, situação conjugal, cesarianas anteriores, tipo de gestação e pré-natal adequado),
como no deck. Os indicadores de internação (SIH/SUS) estão no **Painel de Internação 2026**
(`Projeto Apresentações Internação/Painel_Internacao`), e o cabeçalho tem botões para os três painéis da família
e, desde 12/10/2026, um único botão no cabeçalho, **Página principal**, que leva à página principal dos painéis
(https://anamazza.github.io/Indicadores_Brasil/). O patch está registrado em `_patch_split_2026-09-29.py`.
| Coluna de período parcial (1º sem. 2026, desde 18/10/2026) | na `Extracao_SINASC`: `py 1_coleta_unidades.py 2026S1`, `py 2_tabelas_unidades.py 2026S1`, `py 10_perfil_sociodemografico.py --periodo 2026S1`, `py 11_perfil_obstetrico_novos.py --periodo 2026S1`; depois `py build_dados.py` aqui (passo 2d chama `coluna_periodo.py`, que insere a coluna antes do Total de cada bloco; o Total continua sendo o acumulado 2019-2025). Validação do conversor: `py coluna_periodo.py 2025` (99,93% das células de 2025 reproduzidas). Para trocar o período (ex.: `2026` inteiro quando o ano fechar), editar `PERIODOS` no `build_dados.py`. No painel, `DADOS.anos` traz 2026 e `DADOS.rotulosAno`/`parciais`/`periodos` explicam o período: rótulo "1º sem. 2026", fora do acumulado e das tendências, padrão dos seletores = último ano completo |
| Remontar o painel | `py montar_painel.py` (gera `Painel_NV2026_Novo.html` e `index.html` e espelha esta pasta na subpasta `nascimentos/` do repositório Indicadores_Brasil) |

**Publicação (desde 11/10/2026):** https://anamazza.github.io/Indicadores_Brasil/nascimentos/ — os três painéis e a página principal estão
reunidos no repositório [Indicadores_Brasil](https://github.com/anamazza/Indicadores_Brasil) (clone em `Documentos/Página principal`).
O `montar_painel.py` espelha esta pasta de trabalho na subpasta `nascimentos/` de lá; publicar = commit + push
daquele repositório. O repositório antigo Indicadores_NV (https://anamazza.github.io/Indicadores_NV/) só
redireciona para os novos endereços.

Atalho local: `atualizar_painel.bat` roda CNES + montagem e registra em `atualizacao_cnes.log`.

## Estrutura

- `painel_base.html` — estrutura e estilos (fonte editável)
- `painel_app.js` — lógica do painel (fonte editável)
- `dados_nv2026.js`, `cnes_dados.json`, `comparativo_nv.js` — dados gerados pelos scripts
- `foto_hero.jpg`, `logos_institucionais.png` — imagens embutidas na montagem
