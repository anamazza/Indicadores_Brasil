# Fontes e scripts da Apostila dos Dicionários de Dados e do parecer da banca

A apostila (`../Apostila_Dicionarios_de_Dados_Paineis_Maternidades.docx`, versão 1.1) e o parecer da banca
(`../Parecer_banca_Apostila_Dicionarios_2026-10-11.docx`) são gerados a partir dos documentos aprovados nos
projetos, sem redigitação: as tabelas dos dicionários e as fichas dos painéis entram como foram escritas.

| Arquivo | O que é |
|---|---|
| `apostila_lib.js` | identidade visual comum (cores com contraste 4,5:1, Calibri, tabelas sem células mescladas, legendas, hiperlinks, cabeçalho e rodapé) |
| `gera_apostila_v2.js` | monta a apostila (versão 1.4 de 18/10/2026: "dossiê" passou a "perfil da unidade"; 1.3 sem a seção de documentos de origem; 1.2 = período 2019-2025 e 1º semestre de 2026; 1.1 revisada pela banca de 11/10/2026) |
| `gera_parecer.js` | monta o parecer da banca |
| `docx_para_html.py` | gera a versão de leitura `../apostila/apostila.html` a partir do .docx (sem Word); o PDF sai dela com o Edge: `msedge --headless=new --no-pdf-header-footer --print-to-pdf=saida.pdf file:///caminho-sem-acentos/apostila.html` |
| `extrai_fichas_painel.py` | extrai as fichas da página Metodologia de um painel (`painel_app.js`) para JSON (INDS, CALCULOS, FICHAS_EXTRAS, fontes) |
| `fontes/DICIONARIO_INDICADORES_AIH_versao_final_2026-09-10.json` | tabela e parágrafos do Dicionário AIH (Projeto Apresentações Internação), extraídos do Word |
| `fontes/DICIONARIO_INDICADORES_MORTALIDADE_20260911.json` | idem, Dicionário de Mortalidade (Mortalidade Indicadores) |
| `fontes/Metodologia_Media_do_Grupo_Comparador_NV2026.json` | idem, nota metodológica do grupo comparador (Projeto NV 2026) |
| `fontes/painel_nv_metodologia.json` e `fontes/painel_mort_metodologia.json` | fichas das páginas Metodologia dos painéis de nascimentos e de mortalidade |
| `imagens/` | faixa da capa e faixa de marcas dos painéis em preto (IFF, Fiocruz, SUS, Ministério da Saúde; sem Governo do Brasil até 25/10/2026) |

## Para atualizar a apostila quando um dicionário mudar

1. Extrair de novo o Word alterado para JSON (parágrafos e tabelas, célula a célula, com `{"tipo":"p"|"tabela", ...}`;
   o trecho usado lê `word/document.xml` com `zipfile` e `xml.etree`).
2. Se um painel mudou: `py -I extrai_fichas_painel.py <pasta_de_trabalho>/painel_app.js fontes/painel_<x>_metodologia.json`.
3. Instalar a biblioteca uma vez (`npm install docx`) e rodar
   `node gera_apostila_v2.js fontes imagens/logos_iff_fiocruz_sus_ms.png imagens/faixa_capa.png ../Apostila_Dicionarios_de_Dados_Paineis_Maternidades.docx`.
4. Abrir no Word e atualizar os campos (sumário e numeração), ou deixar que o Word pergunte ao abrir.
   Depois gerar a versão de leitura e o PDF: `py -I docx_para_html.py ../apostila/<arquivo>.docx ../apostila` e o comando do Edge acima;
   copiar também o .docx para `../apostila/`.
5. Registrar a nova versão na seção 1.4 da apostila (controle de versões) e revisar os textos de ligação em
   `gera_apostila_v2.js`: são os únicos trechos escritos para a apostila; tudo o mais vem dos documentos de origem.
6. Após 26/10/2026 (fim do período de defeso eleitoral), trocar a faixa de marcas pela completa, conforme o manual da
   Secom vigente.
