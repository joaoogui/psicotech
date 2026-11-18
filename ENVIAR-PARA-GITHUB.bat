@echo off
chcp 65001 >nul
title Enviar PsicoTech para o GitHub
echo ========================================================
echo   ENVIANDO CODIGO COMPLETO E ATUALIZADO PARA O GITHUB...
echo ========================================================
echo.
git push -u origin main --force
echo.
if %ERRORLEVEL% EQU 0 (
    echo [SUCESSO] Repositório atualizado com sucesso!
    echo Todos os arquivos antigos foram substituídos pela versão limpa e funcionando.
    echo A Vercel começará a publicar o site agora mesmo em: https://psicotech-psi.vercel.app
) else (
    echo [AVISO] Houve um problema ao enviar para o GitHub.
    echo Se uma janela de login do GitHub apareceu, conclua o login no navegador e tente novamente.
)
echo.
pause
