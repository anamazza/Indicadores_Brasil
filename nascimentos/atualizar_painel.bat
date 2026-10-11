@echo off
rem Remonta o painel de nascimentos e o espelha no repositorio Indicadores_Brasil.
rem A ficha CNES NAO e mais atualizada aqui: desde 11/10/2026 ela e atualizada na nuvem
rem (GitHub Actions, workflow "Atualizar CNES", 1o jun e 1o dez) e o montar_painel.py resgata o resultado.
rem Depois de rodar: commit + push na pasta "Pagina principal".
cd /d "%~dp0"
py -3.12 montar_painel.py >> atualizacao_cnes.log 2>&1
echo Montagem concluida em %date% %time% >> atualizacao_cnes.log
