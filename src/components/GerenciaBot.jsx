import React, { useState, useEffect } from 'react';

export default function GerenciaBot() {
  const [status, setStatus] = useState('carregando');
  const [qrCode, setQrCode] = useState('');

  useEffect(() => {
    const checarStatusBot = async () => {
      try {
        // Pede os dados para o seu servidor Node.js
        const resposta = await fetch('https://api.systen.nuuvsen.com.br/api/status');
        const dados = await resposta.json();
        
        setStatus(dados.status);
        setQrCode(dados.qrCode);
      } catch (error) {
        setStatus('erro_servidor');
      }
    };

    const intervalo = setInterval(checarStatusBot, 3000);
    checarStatusBot();

    return () => clearInterval(intervalo);
  }, []);

  return (
    <div style={{ padding: '30px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h2 style={{ color: '#0f172a', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px' }}>
        🤖 Central do Bot (WhatsApp)
      </h2>

      <div style={{ 
        background: 'white', padding: '20px', borderRadius: '15px', 
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)', textAlign: 'center', marginTop: '20px' 
      }}>
        
        {status === 'carregando' && (
          <p style={{ color: '#64748b' }}>Conectando com o servidor do Bot...</p>
        )}

        {status === 'erro_servidor' && (
          <div style={{ color: '#ef4444' }}>
            <h3>Servidor Desligado ❌</h3>
            <p>O servidor Node.js (na porta 3001) não está rodando.</p>
          </div>
        )}

        {status === 'iniciando' && (
          <div style={{ color: '#f59e0b' }}>
            <h3>Iniciando WhatsApp... ⏳</h3>
            <p>O bot está abrindo o navegador interno, aguarde a geração do QR Code.</p>
          </div>
        )}

        {status === 'qr_ready' && (
          <div>
            <h3 style={{ color: '#3b82f6' }}>Aguardando Leitura 📱</h3>
            <p style={{ color: '#64748b', marginBottom: '15px' }}>
              Abra o WhatsApp no celular da loja, vá em "Aparelhos Conectados" e leia o QR Code abaixo:
            </p>
            {qrCode ? (
              <img src={qrCode} alt="QR Code WhatsApp" style={{ width: '250px', height: '250px', borderRadius: '10px', border: '1px solid #cbd5e1' }} />
            ) : (
              <p>Carregando imagem...</p>
            )}
          </div>
        )}

        {status === 'conectado' && (
          <div style={{ color: '#10b981' }}>
            <h3 style={{ fontSize: '1.5rem' }}>Bot Online e Trabalhando! ✅</h3>
            <p>O WhatsApp está conectado e pronto para receber os comprovantes Pix.</p>
          </div>
        )}

      </div>
    </div>
  );
}