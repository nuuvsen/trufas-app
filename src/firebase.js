import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Configuração do seu aplicativo Web do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyB8q5bhUiGpyJ-rEGx_RohVguOvM1Njnbg",
  authDomain: "app-trufas-4f814.firebaseapp.com",
  projectId: "app-trufas-4f814",
  storageBucket: "app-trufas-4f814.firebasestorage.app",
  messagingSenderId: "758183362772",
  appId: "1:758183362772:web:e57c8824709020ce1dbb41",
  measurementId: "G-RCEN94H8XK"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Banco de Dados (Firestore) e exporta para usar nas páginas
export const db = getFirestore(app);