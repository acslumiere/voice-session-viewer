'use client';
import { useState } from 'react';
import Link from 'next/link';
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously } from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// ️ Firebase Configuration (keep this exactly as is) ️
const firebaseConfig = {
  apiKey: "AIzaSyB05T6rdLqrnbub4v94BhbEFCssh6Zu_qI",
  authDomain: "voice-intake-ai.firebaseapp.com",
  projectId: "voice-intake-ai",
  storageBucket: "voice-intake-ai.firebasestorage.app",
  messagingSenderId: "277135179085",
  appId: "1:277135179085:web:05a74bec51372e0a7c0b04",
};

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
    <div className="p-4">
      <div className="mb-6">
        <Link 
          href="/"
          className="text-blue-500 hover:underline inline-block mb-4"
        >
          ← Back to Home
        </Link>
        <h1 className="text-2xl font-bold">Firebase Tests</h1>
      </div>

      <button 
        onClick={runTests} 
        disabled={loading}
        className={`px-4 py-2 rounded text-white ${
          loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600'
        }`}
      >
        {loading ? "Testing..." : "Run Tests"}
      </button>

      {result && (
        <pre className="mt-4 p-4 bg-gray-100 rounded whitespace-pre-wrap">
          {result}
        </pre>
      )}
    </div>
  );
}