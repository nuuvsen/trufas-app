import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import './Produtos.css'; // Como usamos este CSS, os cards já vão funcionar perfeitamente!

export default function Catalogo() {
  const [produtos, setProdutos] = useState([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "produtos"), (snapshot) => {
      setProdutos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, []);

  // Função que liga/desliga a trufa na loja do cliente
  const toggleCatalogo = async (id, statusAtual) => {
    await updateDoc(doc(db, "produtos", id), {
      ativoNoCatalogo: !statusAtual
    });
  };

  return (
    <div className="produtos-container">
      
      {/* Cabeçalho ajustado para não espremer no celular */}
      <div className="header-container" style={{ flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <h1 className="header-title">📖 Catálogo</h1>
        <a href="/loja" target="_blank" className="btn btn-primary" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px' }}>
          👁️ Ver Loja 
        </a>
      </div>
      
      {/* Cartão de Informação */}
      <div className="card" style={{ marginBottom: '15px' }}>
        <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
          Selecione quais trufas os clientes podem ver e encomendar pelo link público da sua loja.
        </p>
      </div>

      {/* Lista de Produtos (Versão Mobile/Cards) */}
      <div className="lista-produtos">
        {produtos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Nenhum produto cadastrado para o catálogo.
          </div>
        ) : (
          produtos.map((p) => (
            <div className="produto-card" key={p.id}>
              
              <div className="produto-header" style={{ alignItems: 'center' }}>
                <h3 className="produto-nome">{p.nome}</h3>
                
                {/* Botão de Ativar/Desativar no topo do cartão */}
                <button 
                  onClick={() => toggleCatalogo(p.id, p.ativoNoCatalogo)}
                  className={`btn ${p.ativoNoCatalogo ? 'btn-success' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  {p.ativoNoCatalogo ? '✅ Na Loja' : '❌ Oculto'}
                </button>
              </div>

              <div className="produto-body">
                <div className="valores-grid">
                  <div>
                    <span className="label-min">Preço de Venda</span>
                    <div className="valor-venda" style={{ fontSize: '1rem' }}>
                      R$ {(p.precoVenda || 0).toFixed(2).replace('.', ',')}
                    </div>
                  </div>
                </div>

                <div className="estoque-section">
                  <span className="label-min" style={{marginRight: '10px', marginBottom: '0'}}>Estoque:</span>
                  <strong style={{ color: '#0f172a', fontSize: '1.1rem' }}>{p.estoque} un.</strong>
                </div>
              </div>

            </div>
          ))
        )}
      </div>

    </div>
  );
}