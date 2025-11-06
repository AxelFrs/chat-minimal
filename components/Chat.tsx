'use client';

import { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'mistral-chat-history';

type Msg = { role: 'user' | 'assistant'; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [controller, setController] = useState<AbortController | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [autoscroll, setAutoscroll] = useState(true);

  const [status, setStatus] = useState<{mode:'FAKE'|'REAL', model:string}|null>(null);
    useEffect(() => {
    fetch('/api/chat').then(r=>r.json()).then(d=>{
        setStatus({mode: (d.mode || 'FAKE'), model: d.model || 'mistral-small-latest'});
    }).catch(()=>{});
    }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  useEffect(() => {
    if (autoscroll) {
      endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoscroll]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendStream();
    }
  }

  async function sendStream() {
    const text = input.trim();
    if (!text || loading) return;

    controller?.abort();

    const newController = new AbortController();
    setController(newController);

    const base = [...messages, { role: 'user', content: text } as Msg];
    const assistantIndex = base.length;
    setMessages([...base, { role: 'assistant', content: '' }]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat?stream=1', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        signal: newController.signal,
      });

      if (!res.ok || !res.body) throw new Error('No stream from server');

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let acc = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        acc += decoder.decode(value, { stream: true });

        let parts = acc.split('\n\n');
        acc = parts.pop() || '';

        for (const event of parts) {
          const lines = event.split('\n').map((l) => l.trim());
          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();

            if (payload === '[DONE]') {
              reader.cancel?.().catch(() => {});
              break;
            }

            let toAppend: string | null = null;
            try {
              const j = JSON.parse(payload);
              const c0 = j?.choices?.[0];
              const deltaContent =
                c0?.delta?.content ??
                c0?.message?.content ??
                null;
              if (typeof deltaContent === 'string') toAppend = deltaContent;
              else toAppend = '';
            } catch {
              toAppend = payload;
            }

            if (toAppend != null) {
              setMessages((prev) => {
                const copy = prev.slice();
                const cur = copy[assistantIndex];
                if (!cur || cur.role !== 'assistant') return prev;
                copy[assistantIndex] = { role: 'assistant', content: cur.content + toAppend };
                return copy;
              });
            }
          }
        }
      }
    } catch (e: any) {
    const aborted = e?.name === 'AbortError';
    setMessages((prev) => {
        const copy = prev.slice();
        const cur = copy[assistantIndex];
        if (cur?.role === 'assistant' && cur.content === '') {
        copy.splice(assistantIndex, 1);
        }
        return copy;
    });

    if (!aborted) {

    }

    } finally {
      setLoading(false);
      setController(null);
    }
  }

  function clearChat() {
    if (confirm('Effacer tout l\'historique ?')) {
      setMessages([]);
    }
  }

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col">
        {/* ——— STATUT (FAKE/REAL + modèle) ——— */}
        <div className="mb-3 flex items-center justify-end gap-2">
        {status ? (
            <>
            <span
                className={[
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border",
                status.mode === "REAL"
                    ? "bg-green-500/15 text-green-300 border-green-500/30"
                    : "bg-yellow-500/15 text-yellow-300 border-yellow-500/30",
                ].join(" ")}
                title={status.mode === "REAL" ? "Mode réel (API Mistral)" : "Mode simulé (FAKE)"}
            >
                <span className={"w-1.5 h-1.5 rounded-full " + (status.mode === "REAL" ? "bg-green-400" : "bg-yellow-400")} />
                {status.mode}
            </span>

            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-xs text-slate-300 bg-white/5 border border-white/10">
                {status.model}
            </span>
            </>
        ) : (
            // petit skeleton en attendant la réponse de /api/chat
            <span className="inline-block h-6 w-36 rounded-full bg-white/10 animate-pulse" />
        )}
        </div>
      {/* Zone messages avec glassmorphism */}
      <div
        ref={scrollRef}
        onScroll={() => {
          const el = scrollRef.current;
          if (!el) return;
          const isBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 16;
          setAutoscroll(isBottom);
        }}
        className="flex-1 overflow-y-auto rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-6 mb-4"
      >
        {messages.length === 0 && (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-2xl flex items-center justify-center border border-white/10">
                <svg className="w-8 h-8 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">Commencez une conversation</h3>
              <p className="text-sm text-slate-400">
                Les réponses s'afficheront en temps réel grâce au streaming
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className="flex items-start gap-3 max-w-[85%]">
                {m.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                )}
                
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                      : 'bg-white/10 backdrop-blur-md text-slate-100 border border-white/10'
                  }`}
                >
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                    {loading && m.role === 'assistant' && i === messages.length - 1 && (
                      <span className="inline-block w-1 h-4 ml-1 bg-purple-400 animate-pulse" />
                    )}
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>
      </div>

      {/* Input fixe avec actions */}
      <div className="relative">
        <div className="absolute -top-8 right-0 flex gap-2">
          {messages.length > 0 && (
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-xs rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all"
            >
              <svg className="w-3.5 h-3.5 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Effacer
            </button>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 p-3 shadow-2xl">
          <div className="flex gap-3 items-end">
            <div className="flex-1 relative">
              <input
                className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                placeholder="Écrivez votre message..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={loading}
              />
            </div>

            {loading ? (
              <button
                onClick={() => controller?.abort()}
                className="px-5 py-3 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 transition-all flex items-center gap-2 font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                </svg>
                Stop
              </button>
            ) : (
              <button
                onClick={sendStream}
                disabled={!input.trim()}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center gap-2 font-medium shadow-lg shadow-purple-500/30"
              >
                <span>Envoyer</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </button>
            )}
          </div>

          <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
            <span>Appuyez sur Entrée pour envoyer</span>
            {input.length > 0 && (
              <span className="text-slate-600">{input.length} caractères</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}