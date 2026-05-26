// src/db.js
import Dexie from 'dexie';

// 1. Criamos o banco de dados com o nome do nosso app
export const db = new Dexie('AppTrufaDB');

// 2. Definimos a "tabela" (store) e quais informações ela vai guardar
db.version(1).stores({
  // ++id significa que o ID será gerado automaticamente (1, 2, 3...)
  vendas: '++id, sabor, quantidade, statusSincronizacao' 
});