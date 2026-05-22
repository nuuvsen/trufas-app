import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import './Produtos.css'; 

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  
  // Campos do Formulário
  const [nome, setNome] = useState('');
  const [custo, setCusto] = useState('');
  const [precoVenda, setPrecoVenda] = useState('');
  const [estoque, setEstoque] = useState('');
  const [editandoId, setEditandoId] = useState(null);

  // Estado do Pop-up (Modal)
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "produtos"), (snapshot) => {
      const listaProdutos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setProdutos(listaProdutos);
    });
    return () => unsubscribe();
  }, []);

  const salvarProduto = async (e) => {
    e.preventDefault();
    if (!nome || !custo || !precoVenda || !estoque) {
      alert("Por favor, preencha todos os campos!");
      return;
    }

    const dadosDoProduto = {
      nome: nome,
      custo: parseFloat(custo),
      precoVenda: parseFloat(precoVenda),
      estoque: parseInt(estoque)
    };

    try {
      if (editandoId) {
        await updateDoc(doc(db, "produtos", editandoId), dadosDoProduto);
      } else {
        await addDoc(collection(db, "produtos"), dadosDoProduto);
      }
      setNome(''); setCusto(''); setPrecoVenda(''); setEstoque(''); setEditandoId(null);
    } catch (erro) {
      alert("Erro ao salvar o produto.");
    }
  };

  const prepararEdicao = (produto) => {
    setNome(produto.nome); 
    setCusto(produto.custo || ''); 
    setPrecoVenda(produto.precoVenda || ''); 
    setEstoque(produto.estoque); 
    setEditandoId(produto.id);
  };

  const excluirProduto = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta trufa?")) {
      await deleteDoc(doc(db, "produtos", id));
    }
  };

  const alterarEstoqueRapido = async (id, estoqueAtual, alteracao) => {
    const novoEstoque = estoqueAtual + alteracao;
    if (novoEstoque >= 0) {
      await updateDoc(doc(db, "produtos", id), { estoque: novoEstoque });
    }
  };

  // ================= CÁLCULOS FINANCEIROS =================
  const totalGasto = produtos.reduce((acc, p) => acc + ((p.custo || 0) * p.estoque), 0);
  const totalFaturado = produtos.reduce((acc, p) => acc + ((p.precoVenda || 0) * p.estoque), 0);
  const lucroTotal = totalFaturado - totalGasto;

  return (
    <div className="produtos-container">
      
      {/* Cabeçalho com o botão do Relatório no Canto Esquerdo */}
      <div className="header-container">
        <button className="btn btn-relatorio" onClick={() => setIsModalOpen(true)}>
          📊 Relatório
        </button>
        <h1 className="header-title">📦 Gestão e Estoque</h1>
      </div>

      {/* Cartão do Formulário */}
      <div className="card">
        <form onSubmit={salvarProduto} className="form-grid">
          <div className="input-group" style={{ flex: '2' }}>
            <label>Sabor da Trufa</label>
            <input className="modern-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Brigadeiro" />
          </div>
          <div className="input-group">
            <label>Custo (R$)</label>
            <input className="modern-input" type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0.00" title="Quanto custou para fazer" />
          </div>
          <div className="input-group">
            <label>Venda (R$)</label>
            <input className="modern-input" type="number" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="0.00" title="Por quanto vai vender"/>
          </div>
          <div className="input-group" style={{ maxWidth: '120px' }}>
            <label>Estoque</label>
            <input className="modern-input" type="number" value={estoque} onChange={(e) => setEstoque(e.target.value)} placeholder="Qtd" />
          </div>
          
          <div style={{ display: 'flex', gap: '10px' }}>
            <button type="submit" className={`btn ${editandoId ? 'btn-primary' : 'btn-success'}`}>
              {editandoId ? 'Atualizar' : 'Adicionar'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-secondary" onClick={() => { setEditandoId(null); setNome(''); setCusto(''); setPrecoVenda(''); setEstoque(''); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Cartão da Lista */}
      <div className="card">
        <div className="table-container">
          <table className="modern-table">
            <thead>
              <tr>
                <th>Produto</th>
                <th>Custo</th>
                <th>Venda</th>
                <th>Estoque</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {produtos.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                    Nenhuma trufa cadastrada.
                  </td>
                </tr>
              ) : (
                produtos.map((produto) => (
                  <tr key={produto.id}>
                    <td><strong>{produto.nome}</strong></td>
                    <td style={{ color: '#e11d48' }}>R$ {(produto.custo || 0).toFixed(2).replace('.', ',')}</td>
                    <td style={{ color: '#059669', fontWeight: 'bold' }}>R$ {(produto.precoVenda || 0).toFixed(2).replace('.', ',')}</td>
                    <td>
                      <div className="estoque-control">
                        <button className="btn-icon" onClick={() => alterarEstoqueRapido(produto.id, produto.estoque, -1)}>-</button>
                        <span className="estoque-number">{produto.estoque}</span>
                        <button className="btn-icon" onClick={() => alterarEstoqueRapido(produto.id, produto.estoque, +1)}>+</button>
                      </div>
                    </td>
                    <td>
                      <div className="actions-group">
                        <button className="btn btn-warning" onClick={() => prepararEdicao(produto)}>Editar</button>
                        <button className="btn btn-danger" onClick={() => excluirProduto(produto.id)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= MODAL DE RELATÓRIO ================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            
            <div className="modal-header">
              <h2>📊 Relatório do Estoque Atual</h2>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>✖</button>
            </div>

            <div className="finance-grid">
              <div className="finance-box box-gasto">
                <h3>Total Gasto</h3>
                <p>R$ {totalGasto.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="finance-box box-faturado">
                <h3>Total Faturado</h3>
                <p>R$ {totalFaturado.toFixed(2).replace('.', ',')}</p>
              </div>
              <div className="finance-box box-lucro">
                <h3>Lucro Limpo</h3>
                <p>R$ {lucroTotal.toFixed(2).replace('.', ',')}</p>
              </div>
            </div>

            <h3 style={{ color: '#0f172a', marginBottom: '15px' }}>Lucro por Sabor (Unidade)</h3>
            <table className="modern-table">
              <thead>
                <tr>
                  <th>Sabor</th>
                  <th>Lucro (Cada)</th>
                  <th>Lucro Total (Estoque)</th>
                </tr>
              </thead>
              <tbody>
                {produtos.map((p) => {
                  const lucroUnidade = (p.precoVenda || 0) - (p.custo || 0);
                  const lucroTotalSabor = lucroUnidade * p.estoque;
                  return (
                    <tr key={p.id}>
                      <td><strong>{p.nome}</strong></td>
                      <td style={{ color: lucroUnidade >= 0 ? '#059669' : '#e11d48' }}>
                        R$ {lucroUnidade.toFixed(2).replace('.', ',')}
                      </td>
                      <td style={{ color: lucroTotalSabor >= 0 ? '#059669' : '#e11d48', fontWeight: 'bold' }}>
                        R$ {lucroTotalSabor.toFixed(2).replace('.', ',')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

          </div>
        </div>
      )}

    </div>
  );
}