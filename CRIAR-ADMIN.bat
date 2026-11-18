@echo off
cd /d "%~dp0"
if exist "C:\Users\Alunos\Downloads\node22\node.exe" (
    "C:\Users\Alunos\Downloads\node22\node.exe" admin-wizard.mjs
) else (
    node admin-wizard.mjs
)
pause
