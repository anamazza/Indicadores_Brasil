@echo off
rem Atualiza a ficha CNES das maternidades e remonta o painel.
rem Agendado para rodar automaticamente a cada 6 meses.
cd /d "%~dp0"
py atualizar_cnes.py >> atualizacao_cnes.log 2>&1
py montar_painel.py >> atualizacao_cnes.log 2>&1
echo Atualizacao concluida em %date% %time% >> atualizacao_cnes.log
