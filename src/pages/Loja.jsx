import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import ComentarioTelegram from '../components/ComentarioTelegram';
import Pagamento from './Pagamento'; 
import './Loja.css';

export default function Loja() {
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');

  const [produtosCatalogo, setProdutosCatalogo] = useState([]);
  const [carrinho, setCarrinho] = useState({});
  
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [enviandoPedido, setEnviandoPedido] = useState(false);
  
  const [pedidoConcluido, setPedidoConcluido] = useState(false);
  const [passoCheckout, setPassoCheckout] = useState('dados'); 
  
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

 // ==========================================
  // 👁️ OLHEIRO DO PIX (Verifica se o bot aprovou)
  // ==========================================
  useEffect(() => {
    if (isCheckoutOpen && passoCheckout === 'pix') {
      const checarPagamento = async () => {
        try {
          const resposta = await fetch('https://systen.nuuvsen.com.br/api/status-pix');
          const dados = await resposta.json();

          // Se o bot responder que a IA aprovou a imagem...
          if (dados.status === 'aprovado') {
            
            // ❌ APAGUE ESTAS LINHAS:
            // setPassoCheckout('sucesso'); 
            // setCarrinho({}); 
            
            // ✅ ADICIONE ESTA LINHA:
            // Chama a função que salva no Firebase, manda pra tela de sucesso e limpa o carrinho!
            finalizarPedido('pix'); 
            
            setPedidoConcluido(true); 
          }
        } catch (erro) {
          console.log("Aguardando bot responder...");
        }
      };

      const intervalo = setInterval(checarPagamento, 3000);
      return () => clearInterval(intervalo);
    }
  }, [isCheckoutOpen, passoCheckout]);

  const mudarQuantidade = (produtoId, alteracao) => {
    setCarrinho(prev => {
      const atual = prev[produtoId] || 0;
      const nova = atual + alteracao;
      if (nova < 0) return prev;
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
    setPassoCheckout('dados'); 
    setIsCheckoutOpen(true);
  };

  const fecharCheckout = () => {
    setIsCheckoutOpen(false);
    setTimeout(() => {
      setPassoCheckout('dados'); 
    }, 300); 
  };

  const prepararPagamentoPix = async () => {
    setPassoCheckout('pix'); 

    try {
        await fetch('https://systen.nuuvsen.com.br/api/iniciar-pagamento', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                valor: totais.total, 
                nome: nome 
            })
        });
        console.log("🔔 O bot foi acordado e sabe o valor exato que deve cobrar!");
    } catch (error) {
        console.error("❌ Erro ao avisar o servidor:", error);
    }
  };

  const avancarParaPagamento = (e) => {
    e.preventDefault();
    if (!nome.trim() || !telefone || telefone.length < 8) {
      return alert("Por favor, preencha seu nome e um WhatsApp válido!");
    }
    setPassoCheckout('pagamento');
  };

  const finalizarPedido = async (metodoPagamentoEscolhido) => {
    setEnviandoPedido(true);
    const { total, qtd } = calcularTotal();

    try {
      const q = query(collection(db, "clientes"), where("telefone", "==", telefone));
      const resultado = await getDocs(q);

      let idFinalCliente;

      if (!resultado.empty) {
        const dadosCliente = resultado.docs[0];
        idFinalCliente = dadosCliente.id;
        const trufasCompradasAteHoje = dadosCliente.data().trufasCompradas || 0;

        await updateDoc(doc(db, "clientes", idFinalCliente), {
          trufasCompradas: trufasCompradasAteHoje + qtd
        });
      } else {
        const docRef = await addDoc(collection(db, "clientes"), {
          nome: nome,
          telefone: telefone,
          trufasCompradas: qtd,
          dataCadastro: new Date().toISOString()
        });
        idFinalCliente = docRef.id;
      }

      const itensDoPedido = produtosCatalogo
        .filter(p => carrinho[p.id] > 0)
        .map(p => {
          const qtdPedida = carrinho[p.id];
          const estoqueOriginal = p.estoque || 0;
          const qtdEstoque = Math.min(qtdPedida, estoqueOriginal); 
          const qtdEncomenda = qtdPedida > estoqueOriginal ? qtdPedida - estoqueOriginal : 0; 

          return {
            produtoId: p.id,
            nome: p.nome,
            quantidadeTotal: qtdPedida,
            quantidadeEstoque: qtdEstoque,
            quantidadeEncomenda: qtdEncomenda,
            precoVenda: p.precoVenda
          };
        });

      const temEncomenda = itensDoPedido.some(item => item.quantidadeEncomenda > 0);

      await addDoc(collection(db, "pedidos"), {
        clienteId: idFinalCliente,
        clienteNome: nome,
        itens: itensDoPedido,
        totalTrufas: qtd,
        valorTotal: total,
        status: 'pendente',
        formaPagamento: metodoPagamentoEscolhido,
        contemEncomenda: temEncomenda, 
        dataPedido: new Date().toISOString()
      });

      setPassoCheckout('sucesso'); 
      setCarrinho({});
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

        {configLoja.fotos && configLoja.fotos.length > 0 && (
          <div className="vitrine-container">
            <h3 style={{ fontSize: '1rem', color: '#64748b', marginBottom: '10px', paddingLeft: '5px' }}>Nossas Delícias 📸</h3>
            <div className="vitrine-track">
              {configLoja.fotos.map((foto, idx) => <img key={idx} src={foto} alt="Trufa" />)}
              {configLoja.fotos.map((foto, idx) => <img key={`clone-${idx}`} src={foto} alt="Trufa Clone" />)}
            </div>
          </div>
        )}

        <div style={{ marginBottom: '20px', padding: '15px', background: '#dcfce7', borderRadius: '12px', color: '#166534' }}>
          <strong>Ficou com vontade?</strong> Escolha seus sabores favoritos abaixo. <br/>
          <span style={{fontSize: '0.85rem'}}>Se pedir mais do que temos em estoque, nós fazemos sob encomenda para você! 🥰</span>
        </div>

        {produtosCatalogo.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
            O catálogo está vazio no momento.
          </div>
        ) : (
          produtosCatalogo.map(p => {
            const estoqueAtual = p.estoque || 0;
            const estaEsgotado = estoqueAtual === 0;
            const noCarrinho = carrinho[p.id] || 0;
            const excedeuEstoque = noCarrinho > estoqueAtual && estoqueAtual > 0;
            
            return (
              <div key={p.id} className="trufa-card" style={{ opacity: 1 }}>
                <div className="trufa-info">
                  <h3>{p.nome}</h3>
                  <p>R$ {(p.precoVenda || 0).toFixed(2).replace('.', ',')}</p>
                  
                  {estaEsgotado ? (
                    <span style={{ fontSize: '0.8rem', color: '#8b5cf6', fontWeight: 'bold' }}>Somente sob encomenda 📦</span>
                  ) : estoqueAtual < 15 ? (
                    <span style={{ fontSize: '0.8rem', color: '#f59e0b', fontWeight: 'bold' }}>🔥 {estoqueAtual} unid. a pronta-entrega</span>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Disponível para pronta-entrega</span>
                  )}

                  {excedeuEstoque && (
                    <span style={{ display: 'block', marginTop: '4px', fontSize: '0.75rem', color: '#8b5cf6', fontWeight: 'bold' }}>
                      ({noCarrinho - estoqueAtual} unidades entrarão como encomenda)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <button className="contador-btn" onClick={() => mudarQuantidade(p.id, -1)}>-</button>
                  <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{noCarrinho}</span>
                  <button className="contador-btn" onClick={() => mudarQuantidade(p.id, 1)}>+</button>
                </div>
              </div>
            )
          })
        )}
      </div>

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

      {isCheckoutOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.7)', display: 'flex', 
          justifyContent: 'center', alignItems: 'flex-end', zIndex: 1000, backdropFilter: 'blur(4px)'
        }} onClick={fecharCheckout}>
          
          <div style={{
            background: 'white', width: '100%', maxWidth: '500px',
            borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
            padding: '25px', paddingBottom: '40px', boxShadow: '0 -10px 25px rgba(0,0,0,0.1)'
          }} onClick={e => e.stopPropagation()}>
            
            {passoCheckout === 'sucesso' && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div style={{ fontSize: '4rem', marginBottom: '15px' }}>🎉</div>
                <h2 style={{ margin: '0 0 10px 0', color: '#166534', fontSize: '1.8rem' }}>Tudo Certo!</h2>
                <p style={{ color: '#475569', fontSize: '1rem', marginBottom: '25px' }}>
                  Recebemos a sua encomenda e já estamos preparando com muito carinho.
                </p>
                <button onClick={fecharCheckout} style={{
                  width: '100%', padding: '15px', borderRadius: '10px', border: 'none',
                  backgroundColor: '#e2e8f0', color: '#334155', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer'
                }}>
                  Voltar ao Cardápio
                </button>
              </div>
            )}

            {passoCheckout === 'dados' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>Seus Dados 📝</h2>
                  <button onClick={fecharCheckout} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}>✖</button>
                </div>

                <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem' }}>
                  Precisamos identificar o seu pedido.
                </p>

                <form onSubmit={avancarParaPagamento}>
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

                  <button type="submit" style={{
                    width: '100%', padding: '15px', borderRadius: '10px', border: 'none',
                    backgroundColor: '#ec4899', color: 'white', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer'
                  }}>
                    Avançar para Pagamento ➔
                  </button>
                </form>
              </>
            )}

            {passoCheckout === 'pagamento' && (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <button onClick={() => setPassoCheckout('dados')} style={{ background: 'none', border: 'none', fontSize: '1.2rem', color: '#64748b', cursor: 'pointer' }}>⟵ Voltar</button>
                  <h2 style={{ margin: 0, color: '#0f172a', fontSize: '1.3rem' }}>Pagamento 💳</h2>
                  <button onClick={fecharCheckout} style={{ background: 'none', border: 'none', fontSize: '1.5rem', color: '#94a3b8', cursor: 'pointer' }}>✖</button>
                </div>

                <p style={{ color: '#64748b', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center' }}>
                  Como você prefere pagar os <strong>R$ {totais.total.toFixed(2).replace('.', ',')}</strong>?
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <button onClick={prepararPagamentoPix} style={{
                    padding: '15px', borderRadius: '10px', border: '2px solid #10b981', background: '#d1fae5',
                    color: '#047857', fontWeight: 'bold', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between'
                }}>
                    <span>Pagar agora com PIX</span>
                    <span>💠</span>
                  </button>

                  <button onClick={() => finalizarPedido('entrega')} disabled={enviandoPedido} style={{
                    padding: '15px', borderRadius: '10px', border: '2px solid #cbd5e1', background: '#f8fafc',
                    color: '#334155', fontWeight: 'bold', fontSize: '1.1rem', cursor: enviandoPedido ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'space-between'
                  }}>
                    <span>{enviandoPedido ? 'Finalizando...' : 'Pagar na hora da entrega'}</span>
                    <span>🛵</span>
                  </button>
                </div>
              </>
            )}

            {passoCheckout === 'pix' && (
              <Pagamento 
                valorTotal={totais.total} 
                aoConcluir={() => finalizarPedido('pix')} 
                aoVoltar={() => setPassoCheckout('pagamento')}
                enviando={enviandoPedido}
                nomeCliente={nome} 
              />
            )}

          </div>
        </div>
      )}

      <ComentarioTelegram 
        telegramToken={configLoja.telegramToken} 
        telegramChatId={configLoja.telegramChatId} 
        nomeCliente={nome}
        subido={temCarrinhoAtivo} 
      />

    </div>
  );
}