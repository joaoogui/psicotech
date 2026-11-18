@echo off
cd /d "%~dp0"
echo Iniciando PsicoTech...
echo Abra http://localhost:3000 no navegador.
echo Mantenha esta janela aberta enquanto usar o sistema.
if exist "C:\Users\Alunos\Downloads\node22\node.exe" (
    "C:\Users\Alunos\Downloads\node22\node.exe" --env-file-if-exists=.env server.mjs
) else (
    node --env-file-if-exists=.env server.mjs
)
pause
