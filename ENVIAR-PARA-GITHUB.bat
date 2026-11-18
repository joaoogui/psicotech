@echo off
title Enviar PsicoTech para o GitHub
cls
echo ========================================================
echo   ENVIANDO CODIGO PARA O GITHUB...
echo ========================================================
echo.
git push -u origin main --force
echo.
if errorlevel 1 (
    echo [AVISO] O envio falhou ou precisa de login no GitHub.
    echo Se uma janela de login abriu, autorize e tente novamente.
) else (
    echo [SUCESSO] Repositorio atualizado com sucesso!
    echo A Vercel vai publicar as alteracoes agora.
)
echo.
pause
