import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';
import './Loja.css';

export default function Loja() {
  const [etapa, setEtapa] = useState(1);
  const [telefone, setTelefone] = useState('');
  const [nome, setNome] = useState('');
  const [clienteId, setClienteId] = useState(null);
  const [trufasCompradasAteHoje, setTrufasCompradasAteHoje] = useState(0);

  const [produtosCatalogo, setProdutosCatalogo] = useState([]);
  const [carrinho, setCarrinho] = useState({});
  
  const [configLoja, setConfigLoja] = useState({ whatsapp: '', instagram: '', fotos: [] });

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

  const verificarTelefone = async (e) => {
    e.preventDefault();
    if (telefone.length < 8) return alert("Digite um telefone válido!");

    const q = query(collection(db, "clientes"), where("telefone", "==", telefone));
    const resultado = await getDocs(q);

    if (!resultado.empty) {
      const dadosCliente = resultado.docs[0];
      setNome(dadosCliente.data().nome);
      setClienteId(dadosCliente.id);
      setTrufasCompradasAteHoje(dadosCliente.data().trufasCompradas || 0);
      setEtapa(3);
    } else {
      setEtapa(2); 
    }
  };

  const iniciarCompraNovoCliente = (e) => {
    e.preventDefault();
    if (nome.trim() === '') return alert("Digite seu nome!");
    setEtapa(3);
  };

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

  const finalizarPedido = async () => {
    const { total, qtd } = calcularTotal();
    if (qtd === 0) return alert("Selecione alguma trufa!");

    let idFinalCliente = clienteId;

    try {
      if (!idFinalCliente) {
        const docRef = await addDoc(collection(db, "clientes"), {
          nome: nome,
          telefone: telefone,
          trufasCompradas: qtd,
          dataCadastro: new Date().toISOString()
        });
        idFinalCliente = docRef.id;
      } else {
        await updateDoc(doc(db, "clientes", idFinalCliente), {
          trufasCompradas: trufasCompradasAteHoje + qtd
        });
      }

      const itensDoPedido = produtosCatalogo
        .filter(p => carrinho[p.id] > 0)
        .map(p => ({
          produtoId: p.id,
          nome: p.nome,
          quantidade: carrinho[p.id],
          precoVenda: p.precoVenda
        }));

      await addDoc(collection(db, "pedidos"), {
        clienteId: idFinalCliente,
        clienteNome: nome,
        itens: itensDoPedido,
        totalTrufas: qtd,
        valorTotal: total,
        status: 'pendente',
        dataPedido: new Date().toISOString()
      });

      alert("Encomenda enviada com sucesso! Obrigado(a)!");
      setCarrinho({});
      setEtapa(1);
      setTelefone('');
      setNome('');
    } catch (erro) {
      alert("Erro ao enviar encomenda. Tente de novo.");
    }
  };

  const totais = calcularTotal();

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
              {/* Mostramos as fotos a primeira vez */}
              {configLoja.fotos.map((foto, idx) => (
                <img key={idx} src={foto} alt="Trufa" />
              ))}
              {/* DUPLICAMOS as fotos para o loop ser infinito e sem pulos */}
              {configLoja.fotos.map((foto, idx) => (
                <img key={`clone-${idx}`} src={foto} alt="Trufa Clone" />
              ))}
            </div>
          </div>
        )}

        {/* Telas de Login/Nome/Compras ... */}
        {etapa === 1 && (
          <form className="login-box" onSubmit={verificarTelefone}>
            <h3>Qual o seu número?</h3>
            <p style={{ color: '#64748b', marginBottom: '15px', fontSize: '0.9rem' }}>Usamos seu número para identificar você.</p>
            <input className="loja-input" type="tel" placeholder="Ex: (53) 99999-9999" value={telefone} onChange={(e) => setTelefone(e.target.value)} required />
            <button className="loja-btn" type="submit">Entrar no Cardápio</button>
          </form>
        )}

        {etapa === 2 && (
          <form className="login-box" onSubmit={iniciarCompraNovoCliente}>
            <h3>Você é novo por aqui! 🎉</h3>
            <p style={{ color: '#64748b', marginBottom: '15px', fontSize: '0.9rem' }}>Como podemos te chamar?</p>
            <input className="loja-input" type="text" placeholder="Seu Nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
            <button className="loja-btn" type="submit">Ver Trufas</button>
          </form>
        )}

        {etapa === 3 && (
          <div>
            <div style={{ marginBottom: '20px', padding: '15px', background: '#dcfce7', borderRadius: '12px', color: '#166534' }}>
              <strong>Olá, {nome}!</strong> Que bom ter você aqui. Escolha seus sabores:
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
        )}

      </div>

      {/* BARRA INFERIOR DE FINALIZAR */}
      {etapa === 3 && totais.qtd > 0 && (
        <div className="carrinho-bar">
          <div>
            <div style={{ color: '#64748b', fontSize: '0.9rem' }}>{totais.qtd} trufas</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#0f172a' }}>
              R$ {totais.total.toFixed(2).replace('.', ',')}
            </div>
          </div>
          <button className="loja-btn" style={{ width: 'auto', padding: '12px 25px' }} onClick={finalizarPedido}>
            Fazer Encomenda 🚀
          </button>
        </div>
      )}
    </div>
  );
}