import React from 'react';
import { Navigate } from 'react-router-dom';

export default function RotaProtegida({ children }) {
  // 👇 Agora ele procura exatamente pela chave 'Gerenciador' que você definiu no Login
  const estaLogado = localStorage.getItem('Gerenciador') === 'sim';

  if (!estaLogado) {
    // Se não tiver a chave, redireciona para a tela de login
    return <Navigate to="/login" replace />;
  }

  // Se tiver a chave, permite o acesso!
  return children;
}