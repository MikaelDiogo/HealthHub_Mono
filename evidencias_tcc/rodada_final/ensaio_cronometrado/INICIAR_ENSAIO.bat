@echo off
chcp 65001 >nul
title Ensaio HealthHub - iniciando
echo Iniciando o ensaio (banco de teste, HealthHub e cronometro). Aguarde...
echo.
"C:\Program Files\Git\bin\bash.exe" -l "%~dp0iniciar_ensaio.sh"
echo.
echo Pode minimizar esta janela. Para encerrar tudo, rode PARAR_ENSAIO.bat
pause
