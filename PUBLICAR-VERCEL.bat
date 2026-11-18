@echo off
title Publicar PsicoTech na Vercel
cls
echo ========================================================
echo   PUBLICANDO PSICOTECH DIRETAMENTE NA VERCEL
echo ========================================================
echo.
echo [1/2] Fazendo login na Vercel...
echo Escolha 'GitHub' ou 'Email' e pressione Enter.
echo.
call npx --yes vercel login
echo.
echo ========================================================
echo [2/2] Enviando os arquivos atualizados para a Vercel...
echo ========================================================
echo.
call npx --yes vercel --prod
echo.
if errorlevel 1 (
    echo.
    echo [AVISO] Houve um problema ao publicar.
    echo Se voce nao conseguiu autorizar, tente novamente.
) else (
    echo.
    echo ========================================================
    echo [SUCESSO] Site publicado e atualizado na Vercel!
    echo Acesse: https://psicotech-psi.vercel.app
    echo ========================================================
)
echo.
pause