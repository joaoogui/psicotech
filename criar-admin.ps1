$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$adminEmail = Read-Host 'E-mail do administrador'
$adminName = Read-Host 'Nome do administrador'
$adminSecret = Read-Host 'Senha (minimo 12 caracteres)' -AsSecureString
$adminSecretPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($adminSecret)
try {
    $env:ADMIN_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($adminSecretPtr)
    & node --env-file-if-exists=.env admin.mjs create $adminEmail $adminName
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($adminSecretPtr)
    Remove-Item Env:ADMIN_PASSWORD -ErrorAction SilentlyContinue
}
