import { initializeApp } from "firebase/app";
// import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBMD7m2ntHUTAtyW7Lhy8UfFD0k6_rZF-g",
  authDomain: "chat-application-95a4d.firebaseapp.com",
  databaseURL:
    "https://chat-application-95a4d-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "chat-application-95a4d",
  storageBucket: "chat-application-95a4d.appspot.com",
  messagingSenderId: "207439619368",
  appId: "1:207439619368:web:61e95597a5871477da1c1d",
  measurementId: "G-MT6REL92WJ",
};

const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const realtimeDB = getDatabase(app);
