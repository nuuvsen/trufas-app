#!/bin/bash

# Exibe uma mensagem de início
echo "🍫 Iniciando o envio das trufas (código) para o GitHub..."

# Verifica se o repositório remoto já está configurado
git remote -v | grep -w "origin" > /dev/null 2>&1
if [ $? != 0 ]; then
    echo "🔗 A ligar ao repositório remoto..."
    git remote add origin https://github.com/nuuvsen/trufas-app.git
fi

# 1. Adiciona todas as alterações
echo "📦 A preparar os ficheiros (git add .)..."
git add .

# 2. Pede uma mensagem para o commit
echo "✍️  Escreve a mensagem das tuas alterações (ou prime ENTER para usar a data/hora):"
read mensagem

if [ -z "$mensagem" ]
then
    mensagem="Atualização do App Trufa - $(date +'%d/%m/%Y %H:%M')"
fi

# 3. Faz o commit
echo "💾 A guardar as alterações (git commit)..."
git commit -m "$mensagem"

# 4. Envia para o GitHub
echo "🚀 A enviar para o GitHub (git push)..."
git push -u origin main

echo ""
echo "✨ Sucesso! O teu App Trufa está atualizado no GitHub! 🍫📱"
echo "=========================================================="

# 5. MANTÉM A JANELA ABERTA
echo "Pressiona a tecla ENTER para fechar esta janela..."
read