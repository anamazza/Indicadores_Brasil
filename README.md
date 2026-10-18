# Indicadores Brasil · Painéis das Maternidades Estratégicas

Repositório único dos painéis de indicadores da Qualificação do Modelo de Gestão em Maternidades
Estratégicas na Rede de Atenção à Saúde Materna e Neonatal — Coordenação de Ações Nacionais e de
Cooperação em Saúde da Mulher, da Criança e do Adolescente (IFF/Fiocruz).

**Site:** https://anamazza.github.io/Indicadores_Brasil/ (GitHub Pages, raiz da branch `main`)

| Página | Endereço | Pasta |
|---|---|---|
| Página principal (um botão por painel) | https://anamazza.github.io/Indicadores_Brasil/ | raiz |
| Nascimentos · Painel NV 2026 (SINASC) | https://anamazza.github.io/Indicadores_Brasil/nascimentos/ | `nascimentos/` |
| Internação (SIH/SUS) | https://anamazza.github.io/Indicadores_Brasil/internacao/ | `internacao/` |
| Mortalidade (SIM) | https://anamazza.github.io/Indicadores_Brasil/mortalidade/ | `mortalidade/` |

Cada painel é um HTML único e autocontido (`index.html`), com um botão no cabeçalho que volta à página
principal (os botões cruzados entre painéis foram retirados em 12/10/2026). Os repositórios antigos (Indicadores_NV e
Indicadores_mortalidade-2026) foram substituídos por este em 11/10/2026 e hoje só redirecionam para cá.

## Estrutura

```
index.html               página principal (gerada)         pagina_inicial.html  fonte da página principal
montar_pagina.py         monta index.html e preenche os carimbos "atualizado em" (lê <painel>/atualizacao.json)
publicar.ps1             um comando: pull, monta os 3 painéis, relatório de diferenças, verifica, commit e push (ou PR)
relatorio_diferencas.py  o que mudou nos dados de cada painel em relação ao publicado (grava em relatorios/)
verificar_site.py        verificação do site (arquivos, tamanhos, links, dados, carimbos); roda no Actions e localmente
monitor/                 verificar_fontes.py (monitor do DATASUS) e estado.json (última consulta às fontes)
.github/workflows/       verificar.yml (a cada push), cnes.yml (CNES na nuvem) e monitor_datasus.yml (mensal)
ESTRATEGIA_ATUALIZACAO.md estratégia de atualização automatizada (camadas, fases, regras)
nascimentos/             Painel NV 2026: fontes (painel_base.html, painel_app.js), dados gerados (dados_nv2026.js,
                         dados.json, cnes_dados.json, comparativo_nv.js), scripts, atualizacao.json e index.html
internacao/              Painel de Internação 2026: mesma organização (dados_internacao.js, dados.json)
mortalidade/             Painel de Mortalidade 2026: mesma organização (dados_mortalidade.js, dados.json)
```

Cada painel também publica os seus indicadores como JSON puro, sem depender do HTML (API estática):
`https://anamazza.github.io/Indicadores_Brasil/nascimentos/dados.json` (e `internacao/dados.json`,
`mortalidade/dados.json`), além da ficha CNES em `cnes_dados.json`.

Cada pasta de painel tem o seu `README.md` com o conteúdo, as fontes e os scripts de atualização.

## Onde se trabalha e como se publica

As pastas de trabalho dos painéis continuam junto dos projetos de extração de dados, porque os scripts
de dados leem as pastas vizinhas (`Extracao_SINASC`, `Extracao_SIH`, `Pipeline_Python`):

| Painel | Pasta de trabalho (OneDrive/Documentos) |
|---|---|
| Nascimentos | `Pojeto Apresentações NV_2026/Painel_2026_Novo` |
| Internação | `Projeto Apresentações Internação/Painel_Internacao` |
| Mortalidade | `Mortalidade Indicadores/Painel_Mortalidade` |

O `montar_painel.py` de cada pasta de trabalho gera o `index.html`, grava o carimbo `atualizacao.json` e, ao
final, **espelha a pasta inteira** na subpasta correspondente deste repositório (clone em
`Documentos/Página principal`), copiando fontes, dados e saídas e apagando o que deixou de existir. Por isso,
edite os painéis nas pastas de trabalho, não aqui: o próximo espelhamento sobrescreve a subpasta.

Fluxo de atualização de um painel:

1. Na pasta de trabalho, rodar os scripts de dados (`build_dados.py` etc., ver o README do painel).
2. Neste repositório, rodar `.\publicar.ps1` (PowerShell). Ele faz `git pull`, roda o `montar_painel.py` dos três
   painéis, gera o relatório de diferenças em `relatorios/`, remonta a página principal, verifica e, se tudo
   passar, faz commit e push. Com `-PullRequest`, publica numa branch `atualizacao-<data>` e mostra o link do
   pull request, para a coordenação validar o relatório antes do merge.

Passo a passo equivalente, à mão: `py montar_painel.py` na pasta de trabalho; aqui `py relatorio_diferencas.py`,
`py montar_pagina.py`, `py verificar_site.py`, `git add -A`, commit e push. O Actions verifica de novo e o GitHub
Pages publica em um ou dois minutos.

Página principal:

1. Editar `pagina_inicial.html` (textos, endereços, botões; a foto é `foto_hero.jpg`).
2. Rodar `py montar_pagina.py`.
3. Commit + push.

## Automação (GitHub Actions)

| Workflow | Quando roda | O que faz |
|---|---|---|
| **Verificar site** (`verificar.yml`) | a cada push na `main`, em pull requests e sob demanda | roda `verificar_site.py`; se falhar, o commit fica marcado em vermelho e o GitHub avisa por e-mail |
| **Atualizar CNES** (`cnes.yml`) | 1º de junho e 1º de dezembro, e sob demanda (aba Actions → Run workflow) | roda `atualizar_cnes.py` e `montar_painel.py` nos três painéis, remonta a página principal, verifica e, se algo mudou e nenhuma ficha ou habilitação se perdeu, faz commit e push |
| **Monitor DATASUS** (`monitor_datasus.yml`) | dia 5 de cada mês, e sob demanda | consulta o SINASC (OpenDataSUS) e o SIM e o SIH (FTP do DATASUS); se houver arquivo novo ou republicado desde a consulta anterior, abre uma issue com o resumo e guarda o estado em `monitor/estado.json` |

Regra para não haver conflito: **a ficha CNES é atualizada só na nuvem.** O `montar_painel.py` de cada pasta de
trabalho começa resgatando o `cnes_dados.json` deste repositório quando ele é mais novo que o local, então
faça `git pull` aqui antes de montar um painel. Em emergência, `py atualizar_cnes.py` continua funcionando na
pasta de trabalho.

Carimbos: cada painel grava `atualizacao.json` (data de montagem, data dos dados, data da ficha CNES e
número de unidades); a página principal mostra "atualizado em" sob cada botão e a data da ficha CNES na
nota de fontes. As próximas fases da estratégia (monitor do DATASUS, um comando por painel com relatório
de diferenças, JSON puro por painel) estão descritas em `ESTRATEGIA_ATUALIZACAO.md`.

### Acrescentar um painel

Criar a pasta de trabalho do novo painel nos moldes dos existentes (fontes + `montar_painel.py` que grava o
carimbo e espelha para uma nova subpasta aqui, por exemplo `novo_painel/`); em `pagina_inicial.html`, dentro
de `<nav class="paineis">`, copiar um bloco `<a class="painel">` apontando para
`https://anamazza.github.io/Indicadores_Brasil/novo_painel/` (com o `<span class="data" data-painel="novo_painel">`);
incluir a pasta em `PAINEIS` no `montar_pagina.py` e no `verificar_site.py`, e no laço do `cnes.yml`.

## Licença

O código (HTML, CSS, JavaScript e scripts Python) está sob a licença [Apache 2.0](LICENSE).
As logos e os nomes do IFF, da Fiocruz, do SUS e do Ministério da Saúde são marcas das respectivas
instituições e não estão cobertos pela licença. Os indicadores exibidos vêm de bases públicas do DATASUS
(SINASC, SIH/SUS, SIM e CNES); 2024 e 2025 são dados preliminares, sujeitos a revisão. Desde 18/10/2026 os painéis de
nascimentos e de mortalidade trazem também o 1º semestre de 2026 (preliminar, período parcial; ver os README de cada painel).
