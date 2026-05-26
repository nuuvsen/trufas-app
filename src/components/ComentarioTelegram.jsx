import { useState } from 'react';

export default function ComentarioTelegram({ telegramToken, telegramChatId, nomeCliente, subido }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviadoComSucesso, setEnviadoComSucesso] = useState(false); // NOVO ESTADO AQUI!

  const enviarComentario = async (e) => {
    e.preventDefault();
    if (!mensagem.trim()) return;

    if (!telegramToken || !telegramChatId) {
      alert("A loja ainda não configurou o sistema de mensagens. Tente novamente mais tarde!");
      return;
    }

    setEnviando(true);
    try {
      const texto = `💬 *Novo Comentário na Loja*\n\n*Cliente:* ${nomeCliente || 'Visitante'}\n*Mensagem:* ${mensagem}`;
      const url = `https://api.telegram.org/bot${telegramToken}/sendMessage`;
      
      const resposta = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: telegramChatId,
          text: texto,
          parse_mode: 'Markdown'
        })
      });

      if (resposta.ok) {
        // Se deu tudo certo, em vez de fechar, mostramos a tela de sucesso!
        setEnviadoComSucesso(true); 
      } else {
        alert("Erro ao enviar. Tente novamente mais tarde.");
      }
    } catch (erro) {
      alert("Erro de conexão. Verifique sua internet.");
    }
    setEnviando(false);
  };

  // Função para fechar a caixinha inteira e resetar os estados
  const fecharCaixa = () => {
    setIsOpen(false);
    setTimeout(() => {
      setEnviadoComSucesso(false);
      setMensagem('');
    }, 300); // Aguarda a animação de fechar antes de limpar tudo
  };

  const posicaoBottom = subido ? '100px' : '20px';

  return (
    <>
      {/* Botão Flutuante (FAB) */}
      <button 
        onClick={() => isOpen ? fecharCaixa() : setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: posicaoBottom,
          right: '20px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '50%',
          width: '55px',
          height: '55px',
          fontSize: '26px',
          boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          cursor: 'pointer',
          zIndex: 999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'bottom 0.3s ease'
        }}
        title="Deixe um comentário"
      >
        {isOpen ? '✖' : '💬'}
      </button>

      {/* Modal / Caixinha de Comentário */}
      {isOpen && (
        <div style={{
          position: 'fixed', 
          bottom: `calc(${posicaoBottom} + 65px)`, 
          right: '20px',
          backgroundColor: 'white', 
          width: '300px', 
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)', 
          zIndex: 1000, 
          padding: '20px',
          border: '1px solid #e2e8f0',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          
          {enviadoComSucesso ? (
            // ================= TELA DE SUCESSO =================
            <div style={{ textAlign: 'center', padding: '10px 0' }}>
              <div style={{ fontSize: '3rem', marginBottom: '10px' }}>💙</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem', color: '#0f172a' }}>Mensagem Enviada!</h3>
              <p style={{ fontSize: '0.9rem', color: '#64748b', marginBottom: '20px' }}>
                Muito obrigado pelo seu feedback. Isso nos ajuda a melhorar!
              </p>
              <button 
                onClick={fecharCaixa}
                style={{
                  width: '100%', padding: '10px', backgroundColor: '#e2e8f0', color: '#475569',
                  border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'
                }}
              >
                Fechar
              </button>
            </div>
          ) : (
            // ================= TELA DE FORMULÁRIO (PADRÃO) =================
            <>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#0f172a' }}>O que achou?</h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 15px 0' }}>
                Tem alguma sugestão, elogio ou sabor novo que gostaria de ver? Conta pra gente!
              </p>
              
              <form onSubmit={enviarComentario}>
                <textarea 
                  rows="4" 
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Escreva sua mensagem aqui..."
                  style={{
                    width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #cbd5e1',
                    marginBottom: '10px', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box',
                    outline: 'none'
                  }}
                  required
                />
                <button 
                  type="submit" 
                  disabled={enviando}
                  style={{
                    width: '100%', padding: '10px', backgroundColor: '#3b82f6', color: 'white',
                    border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: enviando ? 'not-allowed' : 'pointer',
                    opacity: enviando ? 0.7 : 1
                  }}
                >
                  {enviando ? 'Enviando...' : 'Enviar Mensagem 🚀'}
                </button>
              </form>
            </>
          )}

        </div>
      )}
    </>
  );
}