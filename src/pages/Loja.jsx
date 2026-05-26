import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import ComentarioTelegram from '../components/ComentarioTelegram';
import './Loja.css';

export default function Loja() {
  // Campos do Cliente (agora preenchidos só no final da compra)
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');

  const [produtosCatalogo, setProdutosCatalogo] = useState([]);
  const [carrinho, setCarrinho] = useState({});
  
  // Controle da nova janelinha de finalizar compra
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  
  const [configLoja, setConfigLoja] = useState({ whatsapp: '', instagram: '', fotos: [], telegramToken: '', telegramChatId: '' });

  useEffect(() => {
    const q = query(collection(db, "produtos"), where("ativoNoCatalogo", "==", true));
    const unsubscribeProdutos = onSnapshot(q, (snapshot) => {
      setProdutosCatalogo(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubscribeConfig = onSnapshot(doc(db, "configuracoes", "loja"), (docSnap) => {
      if (docSnap.exists()) {
        setConfigLoja(docSnap.data());
      }
    });

    return () => { unsubscribeProdutos(); unsubscribeConfig(); };
  }, []);

  const mudarQuantidade = (produtoId, alteracao, estoqueDisponivel) => {
    setCarrinho(prev => {
      const atual = prev[produtoId] || 0;
      const nova = atual + alteracao;
      if (nova < 0) return prev;
      if (nova > estoqueDisponivel) {
        alert("Ops! Você atingiu o limite do nosso estoque para esse sabor.");
        return prev;
      }
      return { ...prev, [produtoId]: nova };
    });
  };

  const calcularTotal = () => {
    let total = 0;
    let qtd = 0;
    produtosCatalogo.forEach(p => {
      const quantidade = carrinho[p.id] || 0;
      total += quantidade * (p.precoVenda || 0);
      qtd += quantidade;
    });
    return { total, qtd };
  };

  const abrirCheckout = () => {
    const { qtd } = calcularTotal();
    if (qtd === 0) return alert("Selecione alguma trufa antes de finalizar!");
    setIsCheckoutOpen(true); // Abre a janelinha pedindo os dados
  };

  const finalizarPedido = async (e) => {
    e.preventDefault();
    if (!nome.trim() || !telefone || telefone.length < 8) {
      return alert("Por favor, preencha seu nome e um WhatsApp válido!");
    }

    setEnviandoPedido(true);
    const { total, qtd } = calcularTotal();

    try {
      // 1. O sistema procura silenciosamente se esse cliente já comprou antes
      const q = query(collection(db, "clientes"), where("telefone", "==", telefone));
      const resultado = await getDocs(q);

      let idFinalCliente;

      if (!resultado.empty) {
        // Cliente já existe: Pega o ID e soma as trufas novas
        const dadosCliente = resultado.docs[0];
        idFinalCliente = dadosCliente.id;
        const trufasCompradasAteHoje = dadosCliente.data().trufasCompradas || 0;

        await updateDoc(doc(db, "clientes", idFinalCliente), {
          trufasCompradas: trufasCompradasAteHoje + qtd
        });
      } else {
        // Cliente novo: Cria o cadastro automaticamente
        const docRef = await addDoc(collection(db, "clientes"), {
          nome: nome,
          telefone: telefone,
          trufasCompradas: qtd,
          dataCadastro: new Date().toISOString()
        });
        idFinalCliente = docRef.id;
      }

      // 2. Prepara os itens do carrinho
      const itensDoPedido = produtosCatalogo
        .filter(p => carrinho[p.id] > 0)
        .map(p => ({
          produtoId: p.id,
          nome: p.nome,
          quantidade: carrinho[p.id],
          precoVenda: p.precoVenda
        }));

      // 3. Salva a encomenda no sistema
      await addDoc(collection(db, "pedidos"), {
        clienteId: idFinalCliente,
        clienteNome: nome,
        itens: itensDoPedido,
        totalTrufas: qtd,
        valorTotal: total,
        status: 'pendente',
        dataPedido: new Date().toISOString()
      });

      alert("Encomenda enviada com sucesso! Muito obrigado(a) pela preferência! 🎉");
      
      // Limpa tudo e volta pra loja
      setCarrinho({});
      setIsCheckoutOpen(false);
      setTelefone('');
      setNome('');
    } catch (erro) {
      alert("Erro ao enviar encomenda. Tente de novo.");
    } finally {
      setEnviandoPedido(false);
    }
  };

  const totais = calcularTotal();
  const temCarrinhoAtivo = totais.qtd > 0;

  const linkWhatsapp = configLoja.whatsapp ? `https://wa.me/55${configLoja.whatsapp.replace(/\D/g, '')}` : '#';
  const arrobaInsta = configLoja.instagram ? configLoja.instagram.replace('@', '') : '';
  const linkInstagram = `https://instagram.com/${arrobaInsta}`;

  return (
    <div className="loja-wrapper">
      <div className="loja-container">
        
        <div className="loja-header">
          <h1>🍫 Trufas da Anna</h1>
          <p>Faça sua encomenda rapidinho!</p>

          {/* REDES SOCIAIS */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '15px' }}>
            {configLoja.instagram && (
              <a href={linkInstagram} target="_blank" rel="noreferrer" style={{ background: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', color: 'white', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                📸 {configLoja.instagram}
              </a>
            )}
            {configLoja.whatsapp && (
              <a href={linkWhatsapp} target="_blank" rel="noreferrer" style={{ background: '#25D366', color: 'white', padding: '6px 12px', borderRadius: '20px', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
                💬 Dúvidas?
              </a>
            )}
          </div>
        </div>

        {/* ================= VITRINE DE FOTOS ANIMADA ================= */}
        {configLoja.fotos && configLoja.fotos.length > 0 && (
          <div className="vitrine-container">
            <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '10px', paddingLeft: '5px' }}>Nossas Delícias 📸</h3>
            
            <div className="vitrine-track">
              {configLoja.fotos.map((foto, idx) => (
                <img key={idx} src={foto} alt="Trufa" />
              ))}
              {configLoja.fotos.map((foto, idx) => (
                <img key={`clone-${idx}`} src={foto} alt="Trufa Clone" />
              ))}
            </div>
          </div>
        )}

        {/* ================= CATÁLOGO DIRETO ================= */}
        <div style={{ marginBottom: '20px', padding: '15px', background: '#dcfce7', borderRadius: '12px', color: '#166534' }}>
          <strong>Ficou com vontade?</strong> Escolha seus sabores favoritos abaixo:
        </div>

        {produtosCatalogo.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            O catálogo está vazio no momento.
          </div>
        ) : (
          produtosCatalogo.map(p => {
            const estoqueAtual = p.estoque || 0;
            const estaEsgotado = estoqueAtual === 0;
            
            return (
              <div key={p.id} className="trufa-card" style={{ opacity: estaEsgotado ? 0.6 : 1 }}>
                <div className="trufa-info">
                  <h3>{p.nome}</h3>
                  <p>R$ {(p.precoVenda || 0).toFixed(2).replace('.', ',')}</p>
                  
                  {estaEsgotado ? (
                    <span style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 'bold' }}>Esgotado 😢</span>
                  ) : estoqueAtual < 15 ? (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>🔥 Aproveite, restam apenas {estoqueAtual} unid!</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Disponível em estoque</span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button className="contador-btn" onClick={() => mudarQuantidade(p.id, -1, estoqueAtual)} disabled={estaEsgotado}>-</button>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{carrinho[p.id] || 0}</span>
                  <button className="contador-btn" onClick={() => mudarQuantidade(p.id, 1, estoqueAtual)} disabled={estaEsgotado}>+</button>
                </div>
              </div>
            )
          })
        )}

      </div>

      {/* BARRA INFERIOR DE FINALIZAR */}
      {temCarrinhoAtivo && (
        <div className="carrinho-bar">
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{totais.qtd} trufas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>
              R$ {totais.total.toFixed(2).replace('.', ',')}
            </div>
          </div>
          <button className="loja-btn" style={{ width: 'auto', padding: '12px 25px' }} onClick={abrirCheckout}>
            Fazer Encomenda 🚀
          </button>
        </div>
      )}

      {/* ================= POP-UP DE CHECKOUT (Para celular) ================= */}
      {isCheckoutOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', 
          justifyContent: 'center', alignItems: 'flex-end', zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={() => setIsCheckoutOpen(false)}>
          
          {/* Caixa que sobe debaixo pra cima */}
          <div style={{
            background: 'white', width: '100%', maxWidth: '500px',
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '25px', paddingBottom: '40px', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
          }} onClick={e => e.stopPropagation()}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>Quase lá! 📝</h2>
              <button onClick={() => setIsCheckoutOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}>✖</button>
            </div>

            <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
              Deixe seus dados para identificarmos a sua encomenda.
            </p>

            <form onSubmit={finalizarPedido}>
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Como você se chama?</label>
                <input 
                  type="text" required value={nome} onChange={(e) => setNome(e.target.value)}
                  placeholder="Seu Nome e Sobrenome"
                  style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontWeight: 'bold', color: '#475569', marginBottom: '8px', fontSize: '0.9rem' }}>Seu WhatsApp</label>
                <input 
                  type="tel" required value={telefone} onChange={(e) => setTelefone(e.target.value)}
                  placeholder="(53) 99999-9999"
                  style={{ width: '100%', padding: '12px 15px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', boxSizing: 'border-box' }}
                />
              </div>

              <button type="submit" disabled={enviandoPedido} style={{
                width: '100%', padding: '15px', borderRadius: '10px', border: 'none',
                backgroundColor: '#ec4899', color: 'white', fontWeight: 'bold', fontSize: '1.1rem',
                cursor: enviandoPedido ? 'not-allowed' : 'pointer', opacity: enviandoPedido ? 0.7 : 1
              }}>
                {enviandoPedido ? 'Enviando Pedido...' : 'Confirmar Encomenda ✨'}
              </button>
            </form>

          </div>
        </div>
      )}

      {/* COMPONENTE DO TELEGRAM */}
      <ComentarioTelegram 
        telegramToken={configLoja.telegramToken} 
        telegramChatId={configLoja.telegramChatId} 
        nomeCliente={nome}
        subido={temCarrinhoAtivo} 
      />

    </div>
  );
}