# Indicadores Brasil · Página principal dos painéis

Página de entrada dos painéis de indicadores da Qualificação do Modelo de Gestão em Maternidades
Estratégicas na Rede de Atenção à Saúde Materna e Neonatal — Coordenação de Ações Nacionais e de
Cooperação em Saúde da Mulher, da Criança e do Adolescente (IFF/Fiocruz).

**Site:** https://anamazza.github.io/Indicadores_Brasil/

A página é um hero com foto de fundo e um botão redondo por painel. Hoje dá acesso aos três painéis
da família, cada um publicado no seu próprio repositório:

| Painel | Endereço publicado | Repositório |
|---|---|---|
| Nascimentos (Painel NV 2026, SINASC) | https://anamazza.github.io/Indicadores_NV/nascimentos/ | [Indicadores_NV](https://github.com/anamazza/Indicadores_NV) |
| Internação (SIH/SUS) | https://anamazza.github.io/Indicadores_NV/internacao/ | subpasta `internacao/` de [Indicadores_NV](https://github.com/anamazza/Indicadores_NV) |
| Mortalidade (SIM) | https://anamazza.github.io/Indicadores_mortalidade-2026/ | [Indicadores_mortalidade-2026](https://github.com/anamazza/Indicadores_mortalidade-2026) |

O botão **Início** no cabeçalho de cada painel volta para esta página.

## Estrutura

- `pagina_inicial.html` — fonte editável (estrutura, textos e estilos da página)
- `foto_hero.jpg` — foto de fundo do hero (trocar o arquivo para mudar a foto; 1800 px de largura bastam)
- `logos_institucionais.png` — logos embutidas na montagem
- `montar_pagina.py` — gera o `index.html` a partir da fonte, com a foto e as logos em base64
- `index.html` — arquivo final, único e autocontido, publicado pelo GitHub Pages

## Como atualizar

1. Editar `pagina_inicial.html` (textos, endereços dos painéis, botões).
2. Rodar `py montar_pagina.py`.
3. Commit + push deste repositório; o GitHub Pages publica a raiz da branch `main`.

### Acrescentar um painel

Em `pagina_inicial.html`, dentro de `<nav class="paineis">`, copie um bloco `<a class="painel">` e troque
o endereço (`href`), o ícone (SVG de 24×24 com traço) e o rótulo (`<span class="rotulo">`, com a fonte
em `<span class="sub">`). Os botões se acomodam sozinhos em fileiras; não há limite de quantidade.
