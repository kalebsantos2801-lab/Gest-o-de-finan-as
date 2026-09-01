@echo off
REM Script de automacao para Commit e Push no GitHub (Windows)
REM Repositorio: Gest-o-de-finan-as

echo =================================================
echo    Preparando Commit e Deploy para o GitHub
echo =================================================

echo [1/3] Adicionando arquivos...
git add .

echo [2/3] Criando commit...
git commit -m "fix(security): lock admin panel strictly to master credentials and prevent new users from getting admin access"

echo [3/3] Enviando para o GitHub...
git push origin main || git push origin master || git push

echo =================================================
echo    Alteracoes enviadas com sucesso!
echo    O Cloudflare Pages iniciara o build automaticamente.
echo =================================================
pause
