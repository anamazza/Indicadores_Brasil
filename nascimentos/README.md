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
- **Dossiê da unidade**: página própria com ficha CNES e habilitações ativas (API oficial),
  todas as tabelas da apresentação (anos clicáveis abrem gráficos) e download em PDF.
- **Comparador**: entre unidades (2 a 4, por ano) e da mesma unidade entre anos (variação e
  tendência; variação clicável abre o gráfico).
- **Comparativo 2019 × 2024**: retenção de nascimentos no território de residência, todos os
  nascimentos (por região de saúde/macro/UF) e <1500 g (por macro/UF), dois mapas lado a lado.
- **Metodologia**: página própria com fontes oficiais e ficha de numerador/denominador de cada cálculo.

## Fontes

SINASC 2019–2025 (dados sujeitos a revisão) · CNES (ficha via API de Dados Abertos; habilitações
via serviço do site do CNES) · SIH/AIH 2025 · malhas de macrorregiões e regiões de saúde.

## Como atualizar

| O quê | Como |
|---|---|
| Ficha CNES + habilitações | `py atualizar_cnes.py` (agendado no Windows para 1º jun/dez) |
| Comparativo 2019×2024 | `py build_comparativo.py "planilha_macro.xlsx" "planilha_regiao.xlsx"` |
| Dados SINASC das unidades | `py build_dados.py` (extrai do painel anterior + coordenadas; a lista `ADICIONAIS` registra as planilhas das unidades acrescentadas depois; `blocos_adicionais.py` monta o bloco de perfil das mães a partir do JSON v3 das planilhas de indicadores, `carregar_v3`, e dos JSON das unidades avulsas, `carregar`; as planilhas xlsx de 31/08 servem só de molde) |

Desde 29/09/2026 este painel traz **só nascimentos**: os 16 blocos do deck de NV e os 7 cards de perfil da mãe
(idade, raça/cor, escolaridade, situação conjugal, cesarianas anteriores, tipo de gestação e pré-natal adequado),
como no deck. Os indicadores de internação (SIH/SUS) estão no **Painel de Internação 2026**
(`Projeto Apresentações Internação/Painel_Internacao`), e o cabeçalho tem botões para os três painéis da família
(Nascimentos · Internação · Mortalidade) e o botão **Início**, que leva à página principal dos painéis
(https://anamazza.github.io/Indicadores_Brasil/). O patch está registrado em `_patch_split_2026-09-29.py`.
| Remontar o painel | `py montar_painel.py` (gera `Painel_NV2026_Novo.html`, `nascimentos/index.html` e o `index.html` da raiz, que redireciona para a página principal, a partir de `pagina_inicial.html`) |

**Publicação:** o painel de nascimentos fica em `nascimentos/`
(https://anamazza.github.io/Indicadores_NV/nascimentos/) e o Painel de Internação 2026 em `internacao/`
(o `montar_painel.py` do projeto de internação copia o `index.html` dele para cá). Publicar = commit + push
deste repositório. Desde 11/10/2026 a página principal dos painéis, com um botão por painel, está no
repositório [Indicadores_Brasil](https://github.com/anamazza/Indicadores_Brasil) (https://anamazza.github.io/Indicadores_Brasil/);
a raiz deste site (`index.html`, gerado de `pagina_inicial.html`) apenas redireciona para ela.

Atalho local: `atualizar_painel.bat` roda CNES + montagem e registra em `atualizacao_cnes.log`.

## Estrutura

- `painel_base.html` — estrutura e estilos (fonte editável)
- `painel_app.js` — lógica do painel (fonte editável)
- `dados_nv2026.js`, `cnes_dados.json`, `comparativo_nv.js` — dados gerados pelos scripts
- `foto_hero.jpg`, `logos_institucionais.png` — imagens embutidas na montagem
