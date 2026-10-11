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

Cada painel é um HTML único e autocontido (`index.html`), com botões no cabeçalho para os outros painéis e
o botão **Início**, que volta à página principal. Os repositórios antigos (Indicadores_NV e
Indicadores_mortalidade-2026) foram substituídos por este em 11/10/2026 e hoje só redirecionam para cá.

## Estrutura

```
index.html               página principal (gerada)         pagina_inicial.html  fonte da página principal
montar_pagina.py         monta index.html                  foto_hero.jpg, logos_institucionais.png
nascimentos/             Painel NV 2026: fontes (painel_base.html, painel_app.js), dados gerados
                         (dados_nv2026.js, cnes_dados.json, comparativo_nv.js), scripts e index.html
internacao/              Painel de Internação 2026: mesma organização (dados_internacao.js)
mortalidade/             Painel de Mortalidade 2026: mesma organização (dados_mortalidade.js)
```

Cada pasta de painel tem o seu `README.md` com o conteúdo, as fontes e os scripts de atualização.

## Onde se trabalha e como se publica

As pastas de trabalho dos painéis continuam junto dos projetos de extração de dados, porque os scripts
de dados leem as pastas vizinhas (`Extracao_SINASC`, `Extracao_SIH`, `Pipeline_Python`):

| Painel | Pasta de trabalho (OneDrive/Documentos) |
|---|---|
| Nascimentos | `Pojeto Apresentações NV_2026/Painel_2026_Novo` |
| Internação | `Projeto Apresentações Internação/Painel_Internacao` |
| Mortalidade | `Mortalidade Indicadores/Painel_Mortalidade` |

O `montar_painel.py` de cada pasta de trabalho gera o `index.html` e, ao final, **espelha a pasta inteira**
na subpasta correspondente deste repositório (clone em `Documentos/Página principal`), copiando fontes,
dados e saídas e apagando o que deixou de existir. Por isso, edite os painéis nas pastas de trabalho, não
aqui: o próximo espelhamento sobrescreve a subpasta.

Fluxo de atualização de um painel:

1. Na pasta de trabalho, rodar os scripts de dados (`build_dados.py`, `atualizar_cnes.py` etc., ver o README do painel).
2. Rodar `py montar_painel.py` (gera o painel e espelha aqui).
3. Neste repositório: `git add -A`, commit e push. O GitHub Pages publica em um ou dois minutos.

Página principal:

1. Editar `pagina_inicial.html` (textos, endereços, botões; a foto é `foto_hero.jpg`).
2. Rodar `py montar_pagina.py`.
3. Commit + push.

### Acrescentar um painel

Criar a pasta de trabalho do novo painel nos moldes dos existentes (fontes + `montar_painel.py` que espelha
para uma nova subpasta aqui, por exemplo `novo_painel/`) e, em `pagina_inicial.html`, dentro de
`<nav class="paineis">`, copiar um bloco `<a class="painel">` apontando para
`https://anamazza.github.io/Indicadores_Brasil/novo_painel/`. Os botões se acomodam sozinhos em fileiras.

## Licença

O código (HTML, CSS, JavaScript e scripts Python) está sob a licença [Apache 2.0](LICENSE).
As logos e os nomes do IFF, da Fiocruz, do SUS e do Ministério da Saúde são marcas das respectivas
instituições e não estão cobertos pela licença. Os indicadores exibidos vêm de bases públicas do DATASUS
(SINASC, SIH/SUS, SIM e CNES); 2024 e 2025 são dados preliminares, sujeitos a revisão.
