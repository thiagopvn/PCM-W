import { auth } from './firebase.js';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Erro ao registrar usuário:', error);
        return { success: false, error: error.message };
    }
}

export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { success: true, user: userCredential.user };
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        return { success: false, error: error.message };
    }
}

export function observeAuthState(callback) {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
}

export function getCurrentUser() {
    return auth.currentUser;
}

export function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.href = '/src/login/login.html';
        return false;
    }
    return true;
}

export function requireAuthAsync() {
    return new Promise((resolve) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe();
            if (!user) {
                window.location.href = '/src/login/login.html';
                resolve(false);
            } else {
                resolve(true);
            }
        });
    });
}