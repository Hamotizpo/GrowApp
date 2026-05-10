import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCVcv0UBFizG28fZpqnd1TZsCHZncMMv3s",
  authDomain: "growsafe-a11f9.firebaseapp.com",
  projectId: "growsafe-a11f9",
  storageBucket: "growsafe-a11f9.firebasestorage.app",
  messagingSenderId: "532779068371",
  appId: "1:532779068371:web:0259eb661e07e0c6b25d26",
  measurementId: "G-K3LFT39WZK"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

