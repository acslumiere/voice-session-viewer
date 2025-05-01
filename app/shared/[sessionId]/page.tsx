// /shared/[sessionId].tsx
'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState, useRef, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

interface SpeechSynthesisVoice {
  name: string;
  lang: string;
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
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
    : 'test-session';

  if (!sessionId) return <div className="p-6 text-red-600">Missing or invalid session ID.</div>;

  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [label, setLabel] = useState('');
  const [tag, setTag] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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
      setIsLoading(true);
      try {
        const ref = doc(db, 'sessions', sessionId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          const rawHistory = data.history;
          if (!Array.isArray(rawHistory) || !rawHistory.every((item: any) => 
            item && typeof item === 'object' && 
            'userResponse' in item && 
            'summary' in item && 
            'question' in item
          )) {
            setError("Invalid or missing history data.");
            return;
          }
          setHistory(rawHistory as HistoryEntry[]);
          setLabel(data.label || 'Untitled');
          setTag(data.tag || '');
        } else {
          setError('Session not found.');
        }
      } catch (err) {
        setError('Failed to load session.');
      } finally {
        setIsLoading(false);
      }
    }
    fetchSharedSession();
  }, [sessionId]);

  const getNarrationText = useCallback(() => {
    return history.filter(h => h && typeof h === 'object').map(h => [
      includeUser ? h.userResponse : null,
      includeSummary ? `Summary: ${h.summary}` : null,
      includeQuestion ? `Follow-up: ${h.question}` : null
    ].filter(Boolean).join('. ')).join('. ');
  }, [history, includeUser, includeSummary, includeQuestion]);

  useEffect(() => {
    return () => {
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (isLoading) return <div className="p-6">Loading...</div>;
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
            <label><input type="checkbox" checked={includeUser} onChange={() => setIncludeUser(!includeUser)} /> User</label>
            <label><input type="checkbox" checked={includeSummary} onChange={() => setIncludeSummary(!includeSummary)} /> Summary</label>
            <label><input type="checkbox" checked={includeQuestion} onChange={() => setIncludeQuestion(!includeQuestion)} /> Follow-up</label>
          </div>
        </div>
        <button
          aria-label="Narrate session"
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
          aria-label="Pause narration"
          onClick={() => window.speechSynthesis.pause()}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          ⏸ Pause
        </button>
        <button
          aria-label="Resume narration"
          onClick={() => window.speechSynthesis.resume()}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          ▶️ Resume
        </button>
        <button
          aria-label="Stop narration"
          onClick={() => window.speechSynthesis.cancel()}
          className="bg-red-600 text-white px-4 py-2 rounded"
        >
          ⏹ Stop
        </button>
      </div>
    </main>
  );
}