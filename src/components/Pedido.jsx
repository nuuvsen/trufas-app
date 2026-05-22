import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, doc, onSnapshot } from 'firebase/firestore';

export default function Pedido({ isOpen, onClose }) {
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  
  // Estados para o formulário
  const [clienteSelecionado, setClienteSelecionado] = useState('');
  const [novoClienteNome, setNovoClienteNome] = useState('');
  const [novoClienteTelefone, setNovoClienteTelefone] = useState('');
  
  // Carrinho de trufas do pedido
  const [produtoSelecionado, setProdutoSelecionado] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [carrinho, setCarrinho] = useState([]);

  useEffect(() => {
    if (!isOpen) return;
    
    // Busca clientes e produtos quando abre o modal
    const unsubClientes = onSnapshot(collection(db, "clientes"), (snapshot) => {
      setClientes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    const unsubProdutos = onSnapshot(collection(db, "produtos"), (snapshot) => {
      setProdutos(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { unsubClientes(); unsubProdutos(); };
  }, [isOpen]);

  const adicionarAoCarrinho = () => {
    if (!produtoSelecionado || !quantidade || quantidade <= 0) return;
    
    const produto = produtos.find(p => p.id === produtoSelecionado);
    setCarrinho([...carrinho, { 
      produtoId: produto.id, 
      nome: produto.nome, 
      quantidade: parseInt(quantidade),
      precoVenda: produto.precoVenda || 0
    }]);
    setProdutoSelecionado('');
    setQuantidade('');
  };

  const removerDoCarrinho = (index) => {
    const novoCarrinho = carrinho.filter((_, i) => i !== index);
    setCarrinho(novoCarrinho);
  };

  const finalizarPedido = async () => {
    if (!clienteSelecionado) return alert("Selecione ou crie um cliente!");
    if (carrinho.length === 0) return alert("Adicione trufas ao pedido!");

    let clienteId = clienteSelecionado;
    let clienteNome = '';
    const totalTrufasNoPedido = carrinho.reduce((acc, item) => acc + item.quantidade, 0);
    const valorTotalPedido = carrinho.reduce((acc, item) => acc + (item.quantidade * item.precoVenda), 0);

    try {
      // 1. Lida com o Cliente (Cria novo ou atualiza existente)
      if (clienteSelecionado === 'novo') {
        if (!novoClienteNome) return alert("Digite o nome do novo cliente!");
        const docRef = await addDoc(collection(db, "clientes"), {
          nome: novoClienteNome,
          telefone: novoClienteTelefone || 'Não informado',
          trufasCompradas: totalTrufasNoPedido,
          dataCadastro: new Date().toISOString()
        });
        clienteId = docRef.id;
        clienteNome = novoClienteNome;
      } else {
        const clienteExistente = clientes.find(c => c.id === clienteId);
        clienteNome = clienteExistente.nome;
        await updateDoc(doc(db, "clientes", clienteId), {
          trufasCompradas: (clienteExistente.trufasCompradas || 0) + totalTrufasNoPedido
        });
      }

      // 2. Salva o Pedido
      await addDoc(collection(db, "pedidos"), {
        clienteId,
        clienteNome,
        itens: carrinho,
        totalTrufas: totalTrufasNoPedido,
        valorTotal: valorTotalPedido,
        status: 'pendente',
        dataPedido: new Date().toISOString()
      });

      alert("Pedido salvo com sucesso!");
      // Limpa tudo e fecha
      setClienteSelecionado(''); setNovoClienteNome(''); setNovoClienteTelefone('');
      setCarrinho([]); onClose();

    } catch (erro) {
      alert("Erro ao salvar pedido.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h2>📝 Novo Pedido</h2>
          <button className="close-btn" onClick={onClose}>✖</button>
        </div>

        {/* Seleção de Cliente */}
        <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '8px' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>Cliente</label>
          <select className="modern-input" style={{ width: '100%', marginBottom: '10px' }} value={clienteSelecionado} onChange={e => setClienteSelecionado(e.target.value)}>
            <option value="">-- Selecione o Cliente --</option>
            <option value="novo">✨ + Cadastrar Novo Cliente</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          {clienteSelecionado === 'novo' && (
            <div style={{ display: 'flex', gap: '10px' }}>
              <input className="modern-input" style={{ flex: '2' }} type="text" placeholder="Nome do Cliente" value={novoClienteNome} onChange={e => setNovoClienteNome(e.target.value)} />
              <input className="modern-input" style={{ flex: '1' }} type="text" placeholder="Telefone" value={novoClienteTelefone} onChange={e => setNovoClienteTelefone(e.target.value)} />
            </div>
          )}
        </div>

        {/* Adicionar Trufas */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
          <select className="modern-input" style={{ flex: '2' }} value={produtoSelecionado} onChange={e => setProdutoSelecionado(e.target.value)}>
            <option value="">-- Escolha a Trufa --</option>
            {produtos.map(p => <option key={p.id} value={p.id}>{p.nome} (Em estoque: {p.estoque})</option>)}
          </select>
          <input className="modern-input" style={{ width: '80px' }} type="number" placeholder="Qtd" value={quantidade} onChange={e => setQuantidade(e.target.value)} />
          <button className="btn btn-primary" onClick={adicionarAoCarrinho}>Adicionar</button>
        </div>

        {/* Resumo do Pedido (Carrinho) */}
        {carrinho.length > 0 && (
          <table className="modern-table" style={{ marginBottom: '20px', fontSize: '0.9rem' }}>
            <thead>
              <tr><th>Sabor</th><th>Qtd</th><th>Ação</th></tr>
            </thead>
            <tbody>
              {carrinho.map((item, index) => (
                <tr key={index}>
                  <td>{item.nome}</td>
                  <td>{item.quantidade} un.</td>
                  <td><button className="btn-danger" style={{ padding: '4px 8px', borderRadius: '4px', border: 'none', cursor: 'pointer' }} onClick={() => removerDoCarrinho(index)}>X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <button className="btn btn-success" style={{ width: '100%', fontSize: '1.1rem', padding: '15px' }} onClick={finalizarPedido}>
          ✅ Salvar Encomenda
        </button>
      </div>
    </div>
  );
}