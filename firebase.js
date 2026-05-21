import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCoGi5t-xiObCW52h0lV_Y6nJ1B3oRIr1Q",
  authDomain: "dental-add.firebaseapp.com",
  projectId: "dental-add",
  storageBucket: "dental-add.firebasestorage.app",
  messagingSenderId: "1350878692",
  appId: "1:1350878692:web:1b11da0a68054d9f2bf3f1"
};

const app = initializeApp(firebaseConfig);

const db = getFirestore(app);

console.log("Firebase conectado");

export { db };
