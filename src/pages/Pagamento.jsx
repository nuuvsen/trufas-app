import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';

// Recebemos 'nomeCliente' e 'telefoneCliente' para mandar pro Bot!
export default function Pagamento({ valorTotal, aoConcluir, aoVoltar, enviando, nomeCliente }) {
  const [copiado, setCopiado] = useState(false);

  // =======================================================
  // ⚠️ DADOS DO SEU PIX E DO SEU BOT DE WHATSAPP:
  // =======================================================
  const SUA_CHAVE_PIX = "annapaula64@gmail.com"; 
  const SEU_NOME = "Anna Trufas"; 
  const SUA_CIDADE = "São José do Norte"; 
  const WHATSAPP_DO_BOT = "53997102442"; // O número que vai rodar o Bot
  // =======================================================

  const gerarPayloadPix = (chavePix, nome, cidade, valor) => {
    const format = (id, val) => `${id}${String(val.length).padStart(2, '0')}${val}`;
    const payload = [
      format('00', '01'),
      format('26', format('00', 'br.gov.bcb.pix') + format('01', chavePix)),
      format('52', '0000'),
      format('53', '986'),
      format('54', valor.toFixed(2)),
      format('58', 'BR'),
      format('59', nome),
      format('60', cidade),
      format('62', format('05', '***')),
    ].join('') + '6304';

    let crc = 0xFFFF;
    for (let i = 0; i < payload.length; i++) {
      crc ^= payload.charCodeAt(i) << 8;
      for (let j = 0; j < 8; j++) {
        if ((crc & 0x8000) !== 0) crc = (crc << 1) ^ 0x1021;
        else crc = crc << 1;
      }
    }
    return payload + (crc & 0xFFFF).toString(16).toUpperCase().padStart(4, '0');
  };

  const pixCopiaECola = gerarPayloadPix(SUA_CHAVE_PIX, SEU_NOME, SUA_CIDADE, valorTotal);

  const copiarCodigo = () => {
    navigator.clipboard.writeText(pixCopiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 3000);
  };

  const finalizarComComprovante = () => {
    aoConcluir();

    // Mensagem formatada para o Bot conseguir extrair os dados facilmente
    const mensagem = `🤖 *NOVO COMPROVANTE*\n*Cliente:* ${nomeCliente || 'Não informado'}\n*Valor:* R$ ${valorTotal.toFixed(2)}\n\nSegue o comprovante da minha encomenda abaixo:`;
    const linkWa = `https://wa.me/55${WHATSAPP_DO_BOT}?text=${encodeURIComponent(mensagem)}`;
    window.open(linkWa, '_blank'); 
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <button onClick={aoVoltar} style={{ background: 'none', border: 'none', fontSize: '1.1rem', color: '#64748b', cursor: 'pointer' }}>⟵ Voltar</button>
        <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>Pagamento PIX 💠</h2>
        <div style={{ width: '60px' }}></div>
      </div>

      <div style={{ textAlign: 'center', padding: '10px 0' }}>
        <p style={{ color: '#475569', marginBottom: '5px' }}>Valor do pedido:</p>
        <h3 style={{ fontSize: '2rem', color: '#10b981', margin: '0 0 20px 0' }}>
          R$ {valorTotal.toFixed(2).replace('.', ',')}
        </h3>
        
        <div style={{ background: 'white', padding: '15px', display: 'inline-block', borderRadius: '15px', border: '2px solid #e2e8f0', marginBottom: '15px' }}>
          <QRCodeSVG value={pixCopiaECola} size={180} />
        </div>

        {/* ⚠️ NOVO: Aviso de confirmação */}
        <div style={{ 
          padding: '12px', backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', 
          borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', fontWeight: 'bold' 
        }}>
          ⚠️ O pedido só será confirmado após o envio e verificação do comprovante!
        </div>

        <button onClick={copiarCodigo} style={{
          width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1',
          backgroundColor: '#f8fafc', color: '#334155', fontWeight: 'bold', fontSize: '1rem', cursor: 'pointer', marginBottom: '15px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
        }}>
          {copiado ? 'Copiado! ✅' : '📄 Copiar Código PIX'}
        </button>

        <button 
          onClick={finalizarComComprovante} 
          disabled={enviando}
          style={{
            width: '100%', padding: '15px', borderRadius: '10px', border: 'none',
            backgroundColor: '#10b981', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: enviando ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
          }}
        >
          {enviando ? 'Confirmando...' : 'Já Paguei! (Enviar Comprovante) 📲'}
        </button>
      </div>
    </div>
  );
}