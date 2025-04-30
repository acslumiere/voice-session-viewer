// /shared/[sessionId].tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyB05T6rdLqrnbub4v94BhbEFCssh6Zu_qI",
  authDomain: "voice-intake-ai.firebaseapp.com",
  projectId: "voice-intake-ai",
  storageBucket: "voice-intake-ai.appspot.com",
  messagingSenderId: "277135179085",
  appId: "1:277135179085:web:05a74bec51372e0a7c0b04"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

type HistoryEntry = {
  userResponse: string;
  summary: string;
  question: string;
};

export default function SharedSessionView() {
  const rawParams = useParams();
  const sessionId = typeof rawParams === 'object' && rawParams?.sessionId
    ? Array.isArray(rawParams.sessionId)
      ? rawParams.sessionId[0]
      : rawParams.sessionId
    : 'test-session'; // fallback for preview environments

  console.log('SESSION ID:', sessionId);
  if (!sessionId) return <div className="p-6 text-red-600">Missing or invalid session ID.</div>;
  
const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [label, setLabel] = useState('');
  const [tag, setTag] = useState('');
  const [error, setError] = useState(null);
  

  const [includeUser, setIncludeUser] = useState(true);
  const [includeSummary, setIncludeSummary] = useState(true);
  const [includeQuestion, setIncludeQuestion] = useState(true);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const voiceSelectRef = useRef<HTMLSelectElement | null>(null);

  useEffect(() => {
    const handleVoices = () => {
    if (typeof window === 'undefined') return;
    const voicesList = window.speechSynthesis?.getVoices?.();
    if (voicesList?.length > 0) setVoices(voicesList);
  };
  handleVoices();
  let fallback: ReturnType<typeof setTimeout> | undefined;
    if (typeof window !== 'undefined') {
      fallback = setTimeout(() => handleVoices(), 200);
    }
    if (typeof window !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = handleVoices;
    }
    return () => fallback && clearTimeout(fallback);
  }, []);

  useEffect(() => {
    async function fetchSharedSession() {
      try {
        const ref = doc(db, 'sessions', sessionId);
        const snap = await getDoc(ref);
        console.log('SNAPSHOT EXISTS:', snap.exists());
        if (snap.exists()) {
          const data = snap.data();
          console.log('RAW FIRESTORE DATA:', data);
          const rawHistory = data.history;
          console.log('RAW HISTORY VALUE:', rawHistory);
          if (!Array.isArray(rawHistory)) {
            setError("Invalid or missing history data.");
            return;
          }
          setHistory(rawHistory);
          setLabel(data.label || 'Untitled');
          setTag(data.tag || '');
        } else {
          setError('Session not found.');
        }
      } catch (err) {
        setError('Failed to load session.');
      }
    }
    fetchSharedSession();
  }, [sessionId]);

  const getNarrationText = () => {
    return history.filter(h => h && typeof h === 'object').map(h => [
      includeUser ? h.userResponse : null,
      includeSummary ? `Summary: ${h.summary}` : null,
      includeQuestion ? `Follow-up: ${h.question}` : null
    ].filter(Boolean).join('. ')).join('. ');
  };

  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <main className="p-6 max-w-xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🔗 Shared Session</h1>
      <p className="text-gray-700 mb-4">Label: <strong>{label}</strong> {tag && (<span>• Tag: <strong>{tag}</strong></span>)}</p>
      {history.length === 0 ? (
        <p className="text-gray-500">No conversation history found.</p>
      ) : (
        <div className="text-left">
          {history.filter(e => e && typeof e === 'object').map((entry, i) => (
            <div key={i} className="mb-6 border-b pb-4">
              <p><strong>User Response:</strong> {entry.userResponse || '(empty)'}</p>
              <p><strong>Summary:</strong> {entry.summary || '(empty)'}</p>
              <p><strong>Next Question:</strong> {entry.question || '(empty)'}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-6 text-center">
        <div className="mb-4">
          <label htmlFor="voiceSelect" className="block text-sm mb-1 text-gray-700">Select Voice</label>
          <select ref={voiceSelectRef} id="voiceSelect" className="mb-2 p-2 border rounded">
            {voices.length > 0 ? voices.map((v, idx) => (
              <option key={idx} value={v.name}>{v.name} ({v.lang})</option>
            )) : <option disabled>Loading voices...</option>}
          </select>
          <div className="flex justify-center gap-4">
            <label><input type="checkbox" checked={includeUser} onChange={() => {
              const newVal = !includeUser;
              setIncludeUser(newVal);
              // localStorage update removed for SSR safety
            }} /> User</label>
            <label><input type="checkbox" checked={includeSummary} onChange={() => {
              const newVal = !includeSummary;
              setIncludeSummary(newVal);
              // localStorage update removed for SSR safety
            }} /> Summary</label>
            <label><input type="checkbox" checked={includeQuestion} onChange={() => {
              const newVal = !includeQuestion;
              setIncludeQuestion(newVal);
              // localStorage update removed for SSR safety
            }} /> Follow-up</label>
          </div>
        </div>
        <button
          onClick={() => {
            const msg = new SpeechSynthesisUtterance();
            if (typeof window === 'undefined') return;
            const voiceSelect = voiceSelectRef.current;
            const voiceValue = voiceSelect?.value;
            const selectedVoice = voiceValue
              ? speechSynthesis.getVoices().find(v => v.name === voiceValue)
              : null;
            msg.voice = selectedVoice || null;
            msg.rate = 1.05;
            const text = getNarrationText();
            if (!text) return;
            msg.text = text;
            window.speechSynthesis.speak(msg);
          }}
          className="bg-blue-700 text-white px-4 py-2 rounded"
        >
          🔊 Narrate Session
        </button>
      </div>
      <div className="mt-6 text-center space-x-2">
        <button
          onClick={() => {
            window.speechSynthesis.pause();
          }}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          ⏸ Pause
        </button>
        <button
          onClick={() => {
            window.speechSynthesis.resume();
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          ▶️ Resume
        </button>
        <button
          onClick={() => {
            window.speechSynthesis.cancel();
          }}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ⏹ Stop
        </button>
      </div>
    </main>
  );
}
