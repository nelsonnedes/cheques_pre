Write-Host "Atualizando repositório GitHub..." -ForegroundColor Green

# Adiciona todas as alterações
git add .

# Cria um commit com a data e hora atual
$timestamp = Get-Date -Format "dd/MM/yyyy HH:mm:ss"
git commit -m "update: $timestamp"

# Envia as alterações para o GitHub
git push origin main

Write-Host "`nAtualização concluída!" -ForegroundColor Green
Write-Host "Pressione qualquer tecla para continuar..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown") 