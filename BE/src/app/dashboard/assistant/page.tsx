// app/dashboard/assistant/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';

interface Message { id: string; role: 'user' | 'assistant'; content: string; timestamp: Date; }
interface Account { account_id: string; name: string; type: string; subtype: string; mask: string; balances: { available: number | null; current: number | null; limit: number | null; iso_currency_code: string }; }
interface Transaction { transaction_id: string; account_id: string; amount: number; date: string; name: string; merchant_name: string | null; category: string[]; personal_finance_category?: { confidence_level: string; detailed: string; primary: string }; pending: boolean; }

function FormattedMessage({ text }: { text: string }) {
  const lines = text.split('\n'); const elements: React.ReactNode[] = []; let key = 0;
  for (const line of lines) {
    const t = line.trim();
    if (!t) { elements.push(<div key={key++} className="h-1.5" />); continue; }
    const hm = t.match(/^#{1,3}\s*\d*\.?\s*(.+)/);
    if (hm) { elements.push(<p key={key++} className="text-[15px] font-semibold text-gray-900 mt-3 mb-1">{parseBold(hm[1])}</p>); continue; }
    const nm = t.match(/^(\d+)\.\s+(.+)/);
    if (nm) { elements.push(<div key={key++} className="flex items-start gap-2 mt-2 mb-0.5"><span className="flex items-center justify-center w-5 h-5 rounded-full bg-green-100 text-green-700 text-[11px] font-bold shrink-0 mt-0.5">{nm[1]}</span><p className="text-[14px] font-medium text-gray-800 leading-relaxed">{parseBold(nm[2])}</p></div>); continue; }
    if (t.startsWith('- ') || t.startsWith('• ')) { elements.push(<div key={key++} className="flex items-start gap-2 ml-1 my-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-[7px]" /><p className="text-[14px] text-gray-700 leading-relaxed">{parseBold(t.slice(2))}</p></div>); continue; }
    elements.push(<p key={key++} className="text-[14px] text-gray-700 leading-relaxed">{parseBold(t)}</p>);
  }
  return <div>{elements}</div>;
}

function parseBold(text: string): React.ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((p, i) => i % 2 === 1 ? <span key={i} className="font-semibold text-gray-900">{p}</span> : <span key={i}>{p}</span>);
}

export default function AssistantPage() {
  const [messages, setMessages] = useState<Message[]>([{
    id: '1', role: 'assistant',
    content: 'Hello! I\'m your BankEasy assistant. I can see your accounts and transactions, so feel free to ask me anything — like "What did I spend this month?" or "Explain my last charge." You can type or use the microphone button to speak. How can I help you today?',
    timestamp: new Date()
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const loadingRef = useRef(false);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => { loadingRef.current = loading; }, [loading]);

  const fetchFinancialData = useCallback(async () => {
    const at = localStorage.getItem('plaid_access_token');
    if (!at) { setDataLoading(false); return; }
    try {
      const [aR, tR] = await Promise.all([
        fetch('/api/accounts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: at }) }),
        fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access_token: at }) }),
      ]);
      if (aR.ok) { const d = await aR.json(); setAccounts(d.accounts || []); }
      if (tR.ok) { const d = await tR.json(); setTransactions(d.transactions || []); }
      setDataLoaded(true);
    } catch (err) { console.error('Error fetching financial data:', err); }
    finally { setDataLoading(false); }
  }, []);

  useEffect(() => { fetchFinancialData(); }, [fetchFinancialData]);
  useEffect(() => { if (typeof window !== 'undefined' && localStorage.getItem('voiceEnabled') === 'true') setVoiceEnabled(true); }, []);
  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages, loading]);
  useEffect(() => { if (voiceError) { const t = setTimeout(() => setVoiceError(null), 8000); return () => clearTimeout(t); } }, [voiceError]);

  // ── Send text message ──
  const doSend = useCallback(async (text: string) => {
    if (!text.trim() || loadingRef.current) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() }]);
    setInput(''); if (textareaRef.current) textareaRef.current.style.height = '48px';
    setLoading(true);
    try {
      const res = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'chat', prompt: text, financialContext: dataLoaded ? { accounts, transactions } : undefined }) });
      const content = res.ok ? (await res.json()).text : 'I\'m sorry, I\'m having trouble right now. Please try again in a moment.';
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content, timestamp: new Date() }]);
      if (voiceEnabled) speakText(content);
    } catch { setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'I\'m sorry, I\'m having trouble right now. Please try again in a moment.', timestamp: new Date() }]); }
    finally { setLoading(false); }
  }, [dataLoaded, accounts, transactions, voiceEnabled]);

  const sendMessage = () => doSend(input);

  // ── Send audio message via Gemini ──
  const sendAudio = useCallback(async (audioBlob: Blob) => {
    if (loadingRef.current) return;

    // Add a voice message placeholder
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: '🎤 Voice message', timestamp: new Date() }]);
    setLoading(true);

    try {
      // Convert blob to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '')
      );

      const mimeType = audioBlob.type || 'audio/webm';

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'voice-chat',
          audioData: base64,
          audioMimeType: mimeType,
          financialContext: dataLoaded ? { accounts, transactions } : undefined,
        }),
      });

      const content = res.ok
        ? (await res.json()).text
        : 'I\'m sorry, I couldn\'t process your voice message. Please try again or type your question.';

      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content, timestamp: new Date() }]);
      if (voiceEnabled) speakText(content);
    } catch (err) {
      console.error('Voice send error:', err);
      setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: 'I\'m sorry, I couldn\'t process your voice message. Please try again or type your question.', timestamp: new Date() }]);
    } finally {
      setLoading(false);
    }
  }, [dataLoaded, accounts, transactions, voiceEnabled]);

  // ── Recording with MediaRecorder ──
  const startRecording = useCallback(async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];

      // Try webm first, fall back to mp4/ogg
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : 'audio/ogg';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        streamRef.current = null;

        // Build the audio blob and send
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType.split(';')[0] });
        audioChunksRef.current = [];

        if (audioBlob.size > 0) {
          sendAudio(audioBlob);
        }
      };

      recorder.start(250); // collect in 250ms chunks
      setIsRecording(true);
      setRecordingDuration(0);

      // Duration timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err: any) {
      console.error('Mic error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setVoiceError('Microphone access was denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setVoiceError('No microphone found. Please connect a microphone and try again.');
      } else {
        setVoiceError('Could not access microphone. Please check your device settings.');
      }
    }
  }, [sendAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingDuration(0);
  }, []);

  const toggleRecording = () => isRecording ? stopRecording() : startRecording();

  // Format seconds as m:ss
  const formatDuration = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, '0')}`;

  // ── TTS ──
  const speakText = (text: string) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; u.pitch = 1; u.volume = 1;
    u.onstart = () => setIsSpeaking(true); u.onend = () => setIsSpeaking(false); u.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(u);
  };

  const toggleVoiceResponses = () => { const n = !voiceEnabled; setVoiceEnabled(n); localStorage.setItem('voiceEnabled', n.toString()); if (!n && isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); } };
  const handleKeyDown = (e: React.KeyboardEvent) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } };
  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setInput(e.target.value); e.target.style.height = '48px'; e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px'; };

  const suggestions = [
    { icon: '💳', text: 'What are my recent transactions?' },
    { icon: '📊', text: 'How much did I spend this month?' },
    { icon: '💰', text: 'What is my current balance?' },
    { icon: '⏳', text: 'Are there any pending charges?' },
    { icon: '📈', text: 'What are my biggest expenses?' },
  ];
  const totalBalance = accounts.reduce((s, a) => s + (a.balances.current || 0), 0);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-3xl mx-auto px-4 py-6 flex flex-col" style={{ height: 'calc(100vh - 80px)' }}>

        <div className="flex items-center justify-between mb-4">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>Dashboard
          </Link>
          <button onClick={toggleVoiceResponses} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${voiceEnabled ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
            {voiceEnabled ? 'Voice On' : 'Voice Off'}
          </button>
        </div>

        {/* Header card */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-5 mb-4 text-white shadow-lg shadow-green-600/20">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
            </div>
            <div><h1 className="text-lg font-bold leading-tight">Financial Assistant</h1><p className="text-green-100 text-xs">Powered by AI — here to help you understand your money</p></div>
          </div>
          {dataLoading ? (
            <div className="flex items-center gap-2 text-green-200 text-xs"><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Loading your accounts...</div>
          ) : dataLoaded && accounts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-xs font-medium"><span className="w-1.5 h-1.5 rounded-full bg-green-300" />{accounts.length} Account{accounts.length > 1 ? 's' : ''}</span>
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-xs font-medium">{transactions.length} Transactions</span>
              <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur px-2.5 py-1 rounded-full text-xs font-medium">Total: ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
          ) : <p className="text-green-200 text-xs">No accounts connected — connect via Dashboard to get personalized help</p>}
        </div>

        {/* Chat area */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0 mb-0.5"><svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div>}
                <div className={`relative max-w-[75%] px-4 py-3 ${msg.role === 'user' ? 'bg-green-600 text-white rounded-2xl rounded-br-md' : 'bg-gray-50 border border-gray-100 text-gray-800 rounded-2xl rounded-bl-md'}`}>
                  {msg.role === 'assistant' ? <FormattedMessage text={msg.content} /> : <p className="text-[14px] whitespace-pre-wrap leading-relaxed">{msg.content}</p>}
                  <div className={`flex items-center gap-2 mt-1.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <span className={`text-[11px] ${msg.role === 'user' ? 'text-green-200' : 'text-gray-400'}`}>{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    {msg.role === 'assistant' && voiceEnabled && <button onClick={() => speakText(msg.content)} className="text-gray-400 hover:text-green-600 transition-colors" title="Read aloud"><svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>}
                  </div>
                </div>
                {msg.role === 'user' && <div className="w-7 h-7 rounded-full bg-green-600 flex items-center justify-center shrink-0 mb-0.5"><svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div>}
              </div>
            ))}

            {loading && <div className="flex items-end gap-2"><div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center shrink-0"><svg className="w-3.5 h-3.5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg></div><div className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl rounded-bl-md"><div className="flex space-x-1.5"><div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} /></div></div></div>}
            {isSpeaking && <div className="flex justify-center"><div className="bg-green-50 text-green-700 border border-green-200 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5"><svg className="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>Speaking...</div></div>}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggestions */}
          {messages.length === 1 && (
            <div className="px-4 pb-3">
              <p className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wider">Suggestions</p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((q, i) => <button key={i} onClick={() => doSend(q.text)} className="inline-flex items-center gap-1.5 text-sm bg-gray-50 border border-gray-200 text-gray-700 px-3 py-1.5 rounded-full hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all"><span>{q.icon}</span>{q.text}</button>)}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-gray-100 p-3 bg-gray-50/50">
            {/* Voice error banner */}
            {voiceError && (
              <div className="mb-2 flex items-start gap-2.5 py-2.5 px-3 bg-amber-50 border border-amber-200 rounded-xl">
                <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
                <p className="text-xs text-amber-800 leading-relaxed flex-1">{voiceError}</p>
                <button onClick={() => setVoiceError(null)} className="text-amber-400 hover:text-amber-600 shrink-0"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
              </div>
            )}

            {/* Recording indicator */}
            {isRecording && (
              <div className="mb-2 flex items-center justify-center gap-3 py-2.5 bg-red-50 border border-red-200 rounded-xl">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-sm font-medium text-red-600">Recording {formatDuration(recordingDuration)}</span>
                <button onClick={stopRecording} className="ml-1 px-3 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-full transition-colors">
                  Stop & Send
                </button>
              </div>
            )}

            <div className="flex items-end gap-2">
              {/* Mic button */}
              <button
                onClick={toggleRecording}
                disabled={loading}
                className={`shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all disabled:opacity-40 ${
                  isRecording
                    ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse'
                    : 'bg-white border border-gray-200 text-gray-400 hover:text-green-600 hover:border-green-300'
                }`}
                title={isRecording ? 'Stop & send recording' : 'Record voice message'}
              >
                {isRecording ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
                )}
              </button>

              {/* Text input */}
              <div className="flex-1">
                <textarea ref={textareaRef} value={input} onChange={handleTextareaInput} onKeyDown={handleKeyDown}
                  placeholder={isRecording ? 'Recording...' : 'Ask about your finances...'} disabled={isRecording}
                  className="w-full resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all disabled:bg-gray-100 disabled:text-gray-500"
                  rows={1} style={{ height: '48px', maxHeight: '140px' }} />
              </div>

              {/* Send button */}
              <button onClick={sendMessage} disabled={!input.trim() || loading || isRecording}
                className="shrink-0 w-10 h-10 rounded-xl bg-green-600 text-white flex items-center justify-center hover:bg-green-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm hover:shadow-md disabled:shadow-none">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-gray-400 mt-3">AI-powered assistant — always verify important decisions with your bank or financial advisor</p>
      </div>
    </main>
  );
}
