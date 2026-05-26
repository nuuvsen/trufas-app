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

  // Estados de Interface
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [menuAbertoId, setMenuAbertoId] = useState(null); 

  // ================= ESTADOS DO ASSISTENTE CONTÁBIL (BOT) =================
  const [isContabilOpen, setIsContabilOpen] = useState(false);
  const [etapaContabil, setEtapaContabil] = useState(1); // 1 = Gastos, 2 = Rendimento, 3 = Resultado
  const [ingredientes, setIngredientes] = useState([]);
  const [ingNome, setIngNome] = useState('');
  const [ingValor, setIngValor] = useState('');
  const [rendimento, setRendimento] = useState('');

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
    setMenuAbertoId(null);
  };

  const excluirProduto = async (id) => {
    if (window.confirm("Tem certeza que deseja excluir esta trufa?")) {
      await deleteDoc(doc(db, "produtos", id));
    }
    setMenuAbertoId(null); 
  };

  const alterarEstoqueRapido = async (id, estoqueAtual, alteracao) => {
    const novoEstoque = estoqueAtual + alteracao;
    if (novoEstoque >= 0) {
      await updateDoc(doc(db, "produtos", id), { estoque: novoEstoque });
    }
  };

  const toggleMenu = (id) => {
    setMenuAbertoId(menuAbertoId === id ? null : id);
  };

  // ================= CÁLCULOS DO RELATÓRIO =================
  const totalGasto = produtos.reduce((acc, p) => acc + ((p.custo || 0) * p.estoque), 0);
  const totalFaturado = produtos.reduce((acc, p) => acc + ((p.precoVenda || 0) * p.estoque), 0);
  const lucroTotal = totalFaturado - totalGasto;

  // ================= FUNÇÕES DO ASSISTENTE CONTÁBIL =================
  const adicionarIngrediente = (e) => {
    e.preventDefault();
    if (!ingNome || !ingValor) return;
    setIngredientes([...ingredientes, { nome: ingNome, valor: parseFloat(ingValor) }]);
    setIngNome('');
    setIngValor('');
  };

  const removerIngrediente = (index) => {
    const novaLista = ingredientes.filter((_, i) => i !== index);
    setIngredientes(novaLista);
  };

  const totalIngredientes = ingredientes.reduce((acc, curr) => acc + curr.valor, 0);
  const custoUnitario = totalIngredientes / (parseInt(rendimento) || 1);
  
  const precoSugerido = custoUnitario * 3; 

  const transferirParaFormulario = () => {
    setCusto(custoUnitario.toFixed(2));
    setPrecoVenda(precoSugerido.toFixed(2));
    setIsContabilOpen(false);
  };

  return (
    <div className="produtos-container">
      
      {/* Cabeçalho Ajustado com o novo botão Contábil */}
      <div className="header-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="header-title" style={{ margin: 0 }}>📦 Gestão e Estoque</h1>
        
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button className="btn btn-relatorio" onClick={() => setIsModalOpen(true)}>
            📊 Relatório
          </button>
          
          <button className="btn btn-primary" style={{ backgroundColor: '#8b5cf6' }} onClick={() => { setIsContabilOpen(true); setEtapaContabil(1); setIngredientes([]); setRendimento(''); }}>
            🤖 Assistente Contábil
          </button>
        </div>
      </div>

      {/* Cartão do Formulário */}
      <div className="card">
        <form onSubmit={salvarProduto} className="form-grid">
          <div className="input-group" style={{ flex: '2', minWidth: '100%' }}>
            <label>Sabor da Trufa</label>
            <input className="modern-input" type="text" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Brigadeiro" />
          </div>
          <div className="input-group">
            <label>Custo (R$)</label>
            <input className="modern-input" type="number" step="0.01" value={custo} onChange={(e) => setCusto(e.target.value)} placeholder="0.00" />
          </div>
          <div className="input-group">
            <label>Venda (R$)</label>
            <input className="modern-input" type="number" step="0.01" value={precoVenda} onChange={(e) => setPrecoVenda(e.target.value)} placeholder="0.00" />
          </div>
          <div className="input-group">
            <label>Estoque</label>
            <input className="modern-input" type="number" value={estoque} onChange={(e) => setEstoque(e.target.value)} placeholder="Qtd" />
          </div>
          
          <div style={{ display: 'flex', gap: '10px', width: '100%', marginTop: '10px' }}>
            <button type="submit" className={`btn ${editandoId ? 'btn-primary' : 'btn-success'}`} style={{ flex: 1 }}>
              {editandoId ? 'Atualizar' : 'Adicionar'}
            </button>
            {editandoId && (
              <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={() => { setEditandoId(null); setNome(''); setCusto(''); setPrecoVenda(''); setEstoque(''); }}>
                Cancelar
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Lista de Produtos (Versão Mobile/Cards) */}
      <div className="lista-produtos">
        {produtos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
            Nenhuma trufa cadastrada.
          </div>
        ) : (
          produtos.map((produto) => (
            <div className="produto-card" key={produto.id}>
              
              <div className="produto-header">
                <h3 className="produto-nome">{produto.nome}</h3>
                <button className="btn-opcoes" onClick={() => toggleMenu(produto.id)}>⋮</button>
              </div>

              {/* Menu de Ações Escondido */}
              {menuAbertoId === produto.id && (
                <div className="produto-acoes-menu">
                  <button className="btn btn-warning" onClick={() => prepararEdicao(produto)}>✏️ Editar</button>
                  <button className="btn btn-danger" onClick={() => excluirProduto(produto.id)}>🗑️ Excluir</button>
                </div>
              )}

              <div className="produto-body">
                <div className="valores-grid">
                  <div>
                    <span className="label-min">Custo</span>
                    <div className="valor-custo">R$ {(produto.custo || 0).toFixed(2).replace('.', ',')}</div>
                  </div>
                  <div>
                    <span className="label-min">Venda</span>
                    <div className="valor-venda">R$ {(produto.precoVenda || 0).toFixed(2).replace('.', ',')}</div>
                  </div>
                </div>

                <div className="estoque-section">
                  <span className="label-min" style={{marginRight: '10px'}}>Estoque:</span>
                  <div className="estoque-control">
                    <button className="btn-icon" onClick={() => alterarEstoqueRapido(produto.id, produto.estoque, -1)}>-</button>
                    <span className="estoque-number">{produto.estoque}</span>
                    <button className="btn-icon" onClick={() => alterarEstoqueRapido(produto.id, produto.estoque, +1)}>+</button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ================= MODAL DE RELATÓRIO ================= */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Relatório do Estoque</h2>
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
            <h3 style={{ color: '#0f172a', marginBottom: '15px' }}>Lucro por Sabor</h3>
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Sabor</th>
                    <th>Lucro (Und)</th>
                    <th>Total (Estoque)</th>
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
        </div>
      )}

      {/* ================= MODAL DO ASSISTENTE CONTÁBIL (MOBILE-FRIENDLY) ================= */}
      {isContabilOpen && (
        <div className="modal-overlay" onClick={() => setIsContabilOpen(false)}>
          <div 
            className="modal-content" 
            style={{ 
              width: '95%', 
              maxWidth: '460px', 
              maxHeight: '90vh', 
              overflowY: 'auto', 
              padding: '20px', 
              boxSizing: 'border-box' 
            }} 
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: '15px' }}>
              <h2>🤖 Assistente Contábil</h2>
              <button className="close-btn" onClick={() => setIsContabilOpen(false)}>✖</button>
            </div>

            {/* ETAPA 1: INSERIR GASTOS */}
            {etapaContabil === 1 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px', lineHeight: '1.4' }}>
                  Me conte tudo o que você usou na receita e o valor pago:
                </p>

                {/* Form com quebra inteligente de linha no mobile */}
                <form 
                  onSubmit={adicionarIngrediente} 
                  style={{ 
                    display: 'flex', 
                    gap: '8px', 
                    marginBottom: '15px',
                    alignItems: 'center',
                    width: '100%'
                  }}
                >
                  <input 
                    className="modern-input" 
                    type="text" 
                    placeholder="Item (Ex: Chocolate)" 
                    value={ingNome} 
                    onChange={(e) => setIngNome(e.target.value)} 
                    style={{ flex: '2', minWidth: '110px', height: '42px', padding: '0 10px' }} 
                    required 
                  />
                  <input 
                    className="modern-input" 
                    type="number" 
                    step="0.01" 
                    placeholder="R$" 
                    value={ingValor} 
                    onChange={(e) => setIngValor(e.target.value)} 
                    style={{ width: '75px', height: '42px', padding: '0 5px', textAlign: 'center' }} 
                    required 
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontSize: '1.2rem' }}
                  >
                    +
                  </button>
                </form>

                {/* Lista com tamanho e rolagem fixa para não estourar a tela */}
                <div style={{ maxHeight: '160px', overflowY: 'auto', marginBottom: '15px', border: '1px solid #f1f5f9', borderRadius: '8px', padding: '5px' }}>
                  {ingredientes.length === 0 ? (
                    <p style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem', padding: '15px 0' }}>Nenhum ingrediente adicionado ainda.</p>
                  ) : (
                    ingredientes.map((ing, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', backgroundColor: '#f8fafc', borderRadius: '6px', marginBottom: '6px', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', color: '#334155', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '55%' }}>{ing.nome}</span>
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                          <span style={{ color: '#059669', fontSize: '0.9rem', fontWeight: 'bold' }}>R$ {ing.valor.toFixed(2).replace('.', ',')}</span>
                          <button onClick={() => removerIngrediente(idx)} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem', padding: '5px' }}>✕</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ padding: '12px', backgroundColor: '#f1f5f9', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1rem', marginBottom: '15px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#475569' }}>Total da Receita:</span>
                  <span style={{ color: '#8b5cf6' }}>R$ {totalIngredientes.toFixed(2).replace('.', ',')}</span>
                </div>

                <button 
                  className="btn btn-success" 
                  style={{ width: '100%', padding: '12px', fontSize: '1rem', height: '46px' }} 
                  onClick={() => setEtapaContabil(2)}
                  disabled={ingredientes.length === 0}
                >
                  Continuar ➡️
                </button>
              </div>
            )}

            {/* ETAPA 2: RENDIMENTO */}
            {etapaContabil === 2 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out', textAlign: 'center', padding: '10px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '5px' }}>🤔</div>
                <h3 style={{ color: '#0f172a', marginBottom: '10px', fontSize: '1.15rem' }}>Quantas trufas renderam?</h3>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: '15px', lineHeight: '1.4' }}>
                  Você gastou <strong>R$ {totalIngredientes.toFixed(2).replace('.', ',')}</strong>.<br/>
                  Informe o rendimento total desse lote de produção:
                </p>

                <input 
                  className="modern-input" 
                  type="number" 
                  placeholder="Ex: 30" 
                  value={rendimento} 
                  onChange={(e) => setRendimento(e.target.value)} 
                  style={{ width: '120px', height: '45px', textAlign: 'center', fontSize: '1.3rem', marginBottom: '20px', display: 'block', margin: '0 auto 20px auto' }} 
                />

                <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                  <button className="btn btn-secondary" style={{ flex: 1, height: '44px' }} onClick={() => setEtapaContabil(1)}>Voltar</button>
                  <button className="btn btn-success" style={{ flex: 2, height: '44px' }} onClick={() => setEtapaContabil(3)} disabled={!rendimento || parseInt(rendimento) <= 0}>
                    Calcular Preços 🚀
                  </button>
                </div>
              </div>
            )}

            {/* ETAPA 3: RESULTADOS E MERCADO */}
            {etapaContabil === 3 && (
              <div style={{ animation: 'fadeIn 0.3s ease-in-out' }}>
                <h3 style={{ color: '#0f172a', marginBottom: '15px', textAlign: 'center', fontSize: '1.15rem' }}>Resumo Inteligente 💡</h3>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Custo Total:</span>
                  <strong>R$ {totalIngredientes.toFixed(2).replace('.', ',')}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', borderBottom: '1px solid #f1f5f9', fontSize: '0.9rem' }}>
                  <span style={{ color: '#64748b' }}>Rendimento:</span>
                  <strong>{rendimento} trufas</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '8px', marginTop: '8px', fontSize: '0.95rem' }}>
                  <span style={{ color: '#991b1b', fontWeight: 'bold' }}>Custo por Trufa:</span>
                  <strong style={{ color: '#ef4444' }}>R$ {custoUnitario.toFixed(2).replace('.', ',')}</strong>
                </div>

                <div style={{ marginTop: '15px', padding: '12px', backgroundColor: '#dcfce7', borderRadius: '8px', color: '#166534' }}>
                  <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem' }}>Análise de Mercado 📈</h4>
                  <p style={{ margin: 0, fontSize: '0.82rem', lineHeight: '1.4' }}>
                    Para cobrir ingredientes, embalagem, sua valiosa mão de obra e garantir lucro de reinvestimento, o preço ideal sugerido para venda é de <strong>R$ {precoSugerido.toFixed(2).replace('.', ',')}</strong>.
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '15px' }}>
                  <button className="btn btn-primary" style={{ width: '100%', backgroundColor: '#8b5cf6', height: '45px', fontWeight: 'bold' }} onClick={transferirParaFormulario}>
                    ✨ Usar esses valores no Cadastro
                  </button>
                  <button className="btn btn-secondary" style={{ width: '100%', height: '42px' }} onClick={() => setIsContabilOpen(false)}>Fechar</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
}