#!/bin/bash

# Script de automação para Commit e Push no GitHub
# Repositório: Gest-o-de-finan-as

set -e

echo "================================================="
echo "   🚀 Preparando Commit e Deploy para o GitHub"
echo "================================================="

# 1. Adicionar todos os arquivos modificados
echo "📦 Adicionando arquivos..."
git add .

# 2. Criar mensagem de commit detalhada
COMMIT_MSG="fix(security): lock admin panel strictly to master credentials and prevent new users from getting admin access"

echo "📝 Criando commit: '$COMMIT_MSG'"
git commit -m "$COMMIT_MSG" || {
  echo "⚠️ Nenhum arquivo novo para commit ou já está atualizado."
}

# 3. Detectar branch atual
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
if [ -z "$CURRENT_BRANCH" ]; then
  CURRENT_BRANCH="main"
fi

# 4. Enviar para o GitHub
echo "🌐 Enviando alterações para o GitHub na branch $CURRENT_BRANCH..."
git push origin "$CURRENT_BRANCH" || git push origin master || git push

echo "================================================="
echo "   ✅ Alterações enviadas com sucesso!"
echo "   ⚡ O Cloudflare Pages iniciará o build agora."
echo "================================================="
