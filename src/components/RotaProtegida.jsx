import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RotaProtegida({ children }) {
  // Verifica se o admin fez login e a chave está salva no navegador
  const estaLogado = localStorage.getItem('Gerenciador') === 'sim';

  if (!estaLogado) {
    // Se não estiver logado, chuta o usuário de volta para o /login
    return <Navigate to="/login" replace />;
  }

  // Se estiver logado, renderiza a tela normalmente (gerência, catálogo, etc)
  return children;
}