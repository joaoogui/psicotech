@echo off
title Publicar PsicoTech na Vercel
cls
echo ========================================================
echo   PUBLICANDO PSICOTECH DIRETAMENTE NA VERCEL...
echo ========================================================
echo.
echo Se pedir login, autorize a Vercel na janela do navegador.
echo.
call npx --yes vercel --prod
echo.
if errorlevel 1 (
    echo [AVISO] Houve um problema ao publicar na Vercel.
    echo Verifique se voce autorizou no navegador e tente de novo.
) else (
    echo [SUCESSO] Site publicado e atualizado na Vercel!
    echo Acesse: https://psicotech-psi.vercel.app
)
echo.
pause