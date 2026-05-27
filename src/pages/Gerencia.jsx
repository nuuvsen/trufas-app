import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
// 👇 Importação do nosso Bot adicionada aqui!
import GerenciaBot from '../components/GerenciaBot'; 
import './Produtos.css'; 

export default function Gerencia() {
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  
  // ================= NOVOS CAMPOS: TELEGRAM =================
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  
  // Lista de fotos e Upload
  const [fotos, setFotos] = useState([]);
  const [arquivoSelecionado, setArquivoSelecionado] = useState(null);
  const [fazendoUpload, setFazendoUpload] = useState(false);

  useEffect(() => {
    const carregarConfiguracoes = async () => {
      const docRef = doc(db, "configuracoes", "loja");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const dados = docSnap.data();
        setWhatsapp(dados.whatsapp || '');
        setInstagram(dados.instagram || '');
        setFotos(dados.fotos || []);
        
        // Carrega os dados do Telegram salvos
        setTelegramToken(dados.telegramToken || '');
        setTelegramChatId(dados.telegramChatId || '');
      }
    };
    carregarConfiguracoes();
  }, []);

  const salvarConfiguracoes = async (e) => {
    if (e) e.preventDefault();
    try {
      // Usamos { merge: true } para atualizar apenas esses campos sem apagar o resto
      await setDoc(doc(db, "configuracoes", "loja"), {
        whatsapp,
        instagram,
        telegramToken,
        telegramChatId
      }, { merge: true });
      
      alert("Configurações atualizadas com sucesso! 🚀");
    } catch (erro) {
      alert("Erro ao salvar configurações.");
    }
  };

  // ================= UPLOAD 100% GRATUITO (API ImgBB) =================
  const fazerUploadDaFoto = async () => {
    if (!arquivoSelecionado) return alert("Selecione uma foto primeiro!");
    
    setFazendoUpload(true);
    
    try {
      const formData = new FormData();
      formData.append("image", arquivoSelecionado);
      
      const API_KEY = "f172041aaa9358b02a0ed5e94e90960b"; 

      const resposta = await fetch(`https://api.imgbb.com/1/upload?key=${API_KEY}`, {
        method: "POST",
        body: formData
      });
      
      const dados = await resposta.json();

      if (dados.success) {
        const linkPublico = dados.data.url;
        
        const novaListaDeFotos = [...fotos, linkPublico];
        setFotos(novaListaDeFotos);
        
        // Salva SOMENTE as fotos (o { merge: true } protege o whatsapp e telegram)
        await setDoc(doc(db, "configuracoes", "loja"), {
          fotos: novaListaDeFotos
        }, { merge: true });

        setArquivoSelecionado(null);
        document.getElementById('input-foto').value = ''; 
        alert("Foto enviada com sucesso! 📸");
      } else {
        alert("Falha ao processar a imagem no servidor.");
      }

    } catch (erro) {
      console.error(erro);
      alert("Erro ao enviar a foto. Verifique a internet.");
    } finally {
      setFazendoUpload(false);
    }
  };

  const removerFoto = (indexParaRemover) => {
    const confirmacao = window.confirm("Remover esta foto da vitrine?");
    if (confirmacao) {
      const novaLista = fotos.filter((_, index) => index !== indexParaRemover);
      setFotos(novaLista);
      
      // Atualiza apenas a lista de fotos no banco
      setDoc(doc(db, "configuracoes", "loja"), { 
        fotos: novaLista 
      }, { merge: true });
    }
  };

  return (
    <div className="produtos-container">
      <h1 className="header-title">⚙️ Gerenciar Loja do Cliente</h1>

      {/* ================= CARTÃO: BOT DO WHATSAPP (NOVO!) ================= */}
      <div className="card" style={{ borderLeft: '4px solid #10b981', paddingBottom: '0' }}>
         {/* Renderiza o nosso painel do Bot aqui dentro! */}
         <GerenciaBot />
      </div>

      {/* ================= CARTÃO: REDES SOCIAIS ================= */}
      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>Redes Sociais & Contato</h2>
        <form onSubmit={salvarConfiguracoes} className="form-grid">
          <div className="input-group" style={{ flex: '1' }}>
            <label>WhatsApp (Somente números)</label>
            <input 
              className="modern-input" 
              type="text" 
              value={whatsapp} 
              onChange={(e) => setWhatsapp(e.target.value)} 
              placeholder="Ex: 53999999999" 
            />
          </div>
          <div className="input-group" style={{ flex: '1' }}>
            <label>Usuário do Instagram</label>
            <input 
              className="modern-input" 
              type="text" 
              value={instagram} 
              onChange={(e) => setInstagram(e.target.value)} 
              placeholder="Ex: @trufasdaanna" 
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              💾 Salvar Redes Sociais
            </button>
          </div>
        </form>
      </div>

      {/* ================= CARTÃO: AUTOMAÇÃO TELEGRAM ================= */}
      <div className="card" style={{ borderLeft: '4px solid #3b82f6' }}>
        <h2 style={{ marginBottom: '10px', color: '#0f172a' }}>🤖 Automação do Telegram</h2>
        <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
          Configure seu Bot do Telegram para receber alertas de comentários dos clientes em tempo real.
        </p>
        
        <form onSubmit={salvarConfiguracoes} className="form-grid">
          <div className="input-group" style={{ flex: '1' }}>
            <label>Token do Bot (BotFather)</label>
            <input 
              className="modern-input" 
              type="text" 
              value={telegramToken} 
              onChange={(e) => setTelegramToken(e.target.value)} 
              placeholder="Ex: 123456:ABC-DEF1234ghIkl-zyx..." 
            />
          </div>
          <div className="input-group" style={{ flex: '1' }}>
            <label>Chat ID</label>
            <input 
              className="modern-input" 
              type="text" 
              value={telegramChatId} 
              onChange={(e) => setTelegramChatId(e.target.value)} 
              placeholder="Ex: 123456789" 
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <button type="submit" className="btn btn-primary" style={{ width: '100%', backgroundColor: '#3b82f6' }}>
              💾 Salvar Configurações do Bot
            </button>
          </div>
        </form>
      </div>

      {/* ================= CARTÃO: VITRINE DE FOTOS ================= */}
      <div className="card">
        <h2 style={{ marginBottom: '20px', color: '#0f172a' }}>🖼️ Vitrine de Fotos</h2>
        <p style={{ color: '#64748b', marginBottom: '20px' }}>
          Selecione uma foto do seu celular ou computador. As fotos serão processadas gratuitamente e exibidas na loja!
        </p>

        {/* ÁREA DE SELECIONAR FOTO */}
        <div className="form-grid" style={{ marginBottom: '20px', alignItems: 'center' }}>
          <div className="input-group" style={{ flex: '3' }}>
            <input 
              id="input-foto"
              className="modern-input" 
              type="file" 
              accept="image/*" 
              onChange={(e) => setArquivoSelecionado(e.target.files[0])} 
              style={{ padding: '8px' }}
            />
          </div>
          
          <button 
            className="btn btn-success" 
            onClick={fazerUploadDaFoto} 
            disabled={!arquivoSelecionado || fazendoUpload}
            style={{ height: '45px', opacity: fazendoUpload ? 0.7 : 1 }}
          >
            {fazendoUpload ? '⏳ Enviando...' : '⬆️ Enviar Foto'}
          </button>
        </div>

        {/* Galeria de Fotos Adicionadas */}
        {fotos.length > 0 ? (
          <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap', marginTop: '20px' }}>
            {fotos.map((foto, index) => (
              <div key={index} style={{ position: 'relative', width: '150px', height: '150px', borderRadius: '12px', overflow: 'hidden', border: '2px solid #e2e8f0' }}>
                <img src={foto} alt={`Vitrine ${index}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <button 
                  onClick={() => removerFoto(index)}
                  style={{ position: 'absolute', top: '5px', right: '5px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: '25px', height: '25px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  X
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: '#94a3b8', padding: '20px' }}>Sua vitrine está vazia.</p>
        )}
      </div>

    </div>
  );
}