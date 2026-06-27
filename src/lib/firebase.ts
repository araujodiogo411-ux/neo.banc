import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Configurações do Firebase obtidas do snippet do usuário
const firebaseConfig = {
  apiKey: "AIzaSyBirKLdI1Ap5z7QgCYzAQDKHMBR0ewoJmM",
  authDomain: "neo-banc.firebaseapp.com",
  projectId: "neo-banc",
  storageBucket: "neo-banc.firebasestorage.app",
  messagingSenderId: "1034604534159",
  appId: "1:1034604534159:web:e41a3179a23c4011d113fa"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore e Auth
export const db = getFirestore(app);
export const auth = getAuth(app);

