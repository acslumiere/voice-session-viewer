'use client';
import { useState } from 'react';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// ️ REPLACE ONLY THIS CONFIG BLOCK ️
const firebaseConfig = {
  apiKey: "AIzaSyB05T6rdLqrnbub4v94BhbEFCssh6Zu_qI", // Use THIS key
  authDomain: "voice-intake-ai.firebaseapp.com",
  projectId: "voice-intake-ai",
  storageBucket: "voice-intake-ai.firebasestorage.app",
  messagingSenderId: "277135179085", // Fix this
  appId: "1:277135179085:web:05a74bec51372e0a7c0b04", // Add colon (:) after "085"
};
// ️ END OF CONFIG BLOCK ️

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export default function TestPage() {
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);

  const runTests = async () => {
    setLoading(true);
    try {
      // Test 1: Anonymous Auth
      const userCredential = await signInAnonymously(auth);
      setResult(prev => `${prev}Auth Success! User ID: ${userCredential.user.uid}\n`);

      // Test 2: Firestore Write
      await setDoc(doc(db, "tests", "test-doc"), {
        timestamp: new Date().toISOString()
      });
      setResult(prev => `${prev}Firestore Write Successful!\n`);

    } catch (error) {
      setResult(`Error: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1>Firebase Tests</h1>
      <button 
        onClick={runTests} 
        disabled={loading}
        style={{ padding: '8px 16px', backgroundColor: loading ? 'gray' : 'blue', color: 'white' }}
      >
        {loading ? "Testing..." : "Run Tests"}
      </button>
      <pre>{result}</pre>
    </div>
  );
}