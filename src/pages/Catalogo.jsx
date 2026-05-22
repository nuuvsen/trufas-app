import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import './Produtos.css'; // Usamos o mesmo visual bonito dos produtos

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h1 className="header-title">📖 Gerenciar Catálogo</h1>
        <a href="/loja" target="_blank" className="btn btn-primary" style={{ textDecoration: 'none' }}>
          👁️ Ver Loja dos Clientes
        </a>
      </div>
      
      <div className="card">
        <p style={{ marginBottom: '20px', color: '#64748b' }}>
          Selecione quais trufas os clientes podem ver e encomendar pelo link público.
        </p>

        <table className="modern-table">
          <thead>
            <tr>
              <th>Sabor</th>
              <th>Estoque Atual</th>
              <th>Preço de Venda</th>
              <th>Visível na Loja?</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p) => (
              <tr key={p.id}>
                <td><strong>{p.nome}</strong></td>
                <td>{p.estoque} un.</td>
                <td>R$ {(p.precoVenda || 0).toFixed(2).replace('.', ',')}</td>
                <td>
                  <button 
                    onClick={() => toggleCatalogo(p.id, p.ativoNoCatalogo)}
                    className={`btn ${p.ativoNoCatalogo ? 'btn-success' : 'btn-secondary'}`}
                  >
                    {p.ativoNoCatalogo ? '✅ Na Loja' : '❌ Oculto'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}