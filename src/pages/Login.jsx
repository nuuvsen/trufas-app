import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const fazerLogin = (e) => {
    e.preventDefault();
    
    // 👇 Defina a sua senha aqui!
    const SENHA_CORRETA = "Anna180622."; 

    if (senha === SENHA_CORRETA) {
      // Salva no navegador que o admin está logado
      localStorage.setItem('Gerenciador', 'sim');
      // Redireciona para a gerência
      navigate('/gerencia');
    } else {
      setErro('Senha incorreta! ❌');
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#f8fafc' }}>
      <div style={{ background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', textAlign: 'center', width: '100%', maxWidth: '400px' }}>
        <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>🔒 Acesso Restrito</h2>
        
        <form onSubmit={fazerLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <input 
            type="password" 
            placeholder="Digite a senha" 
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            style={{ padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1rem' }}
          />
          
          {erro && <p style={{ color: '#ef4444', margin: '0' }}>{erro}</p>}
          
          <button type="submit" style={{ padding: '12px', borderRadius: '8px', border: 'none', background: '#3b82f6', color: 'white', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer' }}>
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}