import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// Configurações do Firebase obtidas do firebase-applet-config.json
const firebaseConfig = {
  apiKey: "AIzaSyCGDj7whsToZkJBJ-QTUW7Qy-ZPI3pW9z4",
  authDomain: "googly-citadel-npnh2.firebaseapp.com",
  projectId: "googly-citadel-npnh2",
  storageBucket: "googly-citadel-npnh2.firebasestorage.app",
  messagingSenderId: "766218403244",
  appId: "1:766218403244:web:12f74f29415ceaccad4e09"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore usando o databaseId específico configurado no ambiente
export const db = getFirestore(app, "ai-studio-feeddemdiaearqui-2e8fb27f-0031-41d8-ab09-25a86da149b6");

