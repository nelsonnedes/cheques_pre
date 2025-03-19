@echo off
echo Atualizando repositório GitHub...

git add .
git commit -m "update: %date% %time%"
git push origin main

echo Atualização concluída!
pause 