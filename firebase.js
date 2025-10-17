
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyBo8VuMP2r8zhCgdntPKXy0_jgSGecTDzE",
  authDomain: "qr-order-system-b2993.firebaseapp.com",
  projectId: "qr-order-system-b2993",
  storageBucket: "qr-order-system-b2993.appspot.com",
  messagingSenderId: "349306459617",
  appId: "1:349306459617:web:51e471d2a9538f9107eea0",
  measurementId: "G-NB68E6CX0K"
};

const app = initializeApp(firebaseConfig);


export const auth = getAuth(app);
export const db = getFirestore(app);
