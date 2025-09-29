import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyCsJ6quYhhokM9iyjJuDuBtMLn9Q51scS0",
    authDomain: "pcm-w-3d110.firebaseapp.com",
    projectId: "pcm-w-3d110",
    storageBucket: "pcm-w-3d110.firebasestorage.app",
    messagingSenderId: "669551189279",
    appId: "1:669551189279:web:0803d371a2c7c52044642a",
    measurementId: "G-N2J316L6KW"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;