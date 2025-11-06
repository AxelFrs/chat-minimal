// app/api/chat/route.ts
import { NextResponse } from 'next/server';

export const runtime = 'edge';

type Msg = { role: 'user' | 'assistant' | 'system'; content: string };
type Body = { message?: string; messages?: Msg[] };

function isFake() {
  return process.env.USE_FAKE_MISTRAL === '1';
}
function modelName() {
  return process.env.MISTRAL_MODEL || 'mistral-small-latest';
}

function normalizeMessages(body: Body): Msg[] {
  const single = (body.message ?? '').trim();
  if (Array.isArray(body.messages) && body.messages.length > 0) return body.messages;
  if (single) return [{ role: 'user', content: single }];
  return [];
}

// ---------- Helpers streaming ----------
const encoder = new TextEncoder();
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fakeStreamController(text: string, controller: ReadableStreamDefaultController) {
  const chunks = (text || `FAKE[${modelName()}] → dis-moi quelque chose 🙂`)
    .match(/.{1,10}/g) || []; // petits morceaux (~10 chars)

  // Envoie “data: …\n\n” (format proche SSE lisible côté client)
  for (const c of chunks) {
    controller.enqueue(encoder.encode(`data: ${c}\n\n`));
    await sleep(80);
  }
  controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
  controller.close();
}

// ---------- Handlers ----------
export async function GET(req: Request) {
  // petite route santé
  const url = new URL(req.url);
  const stream = url.searchParams.get('stream') === '1';

  if (!stream) {
    return NextResponse.json({
      ok: true,
      endpoint: '/api/chat',
      mode: isFake() ? 'FAKE' : 'REAL',
      model: modelName()
    });
  }

  // GET + stream=1 → on renvoie un flux factice
  const readable = new ReadableStream({
    start(controller) {
      fakeStreamController(`FAKE[${modelName()}] → (GET) flux de test`, controller);
    }
  });

  return new Response(readable, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive'
    }
  });
}

export async function POST(req: Request) {
  const url = new URL(req.url);
  const wantsStream = url.searchParams.get('stream') === '1';

  const body = (await req.json().catch(() => ({}))) as Body;
  const msgs = normalizeMessages(body);

  // --- MODE STREAM ---
  if (wantsStream) {
    // FAKE streaming (aucune clé nécessaire)
    if (isFake()) {
      const last = msgs.at(-1)?.content ?? '';
      const text =
        last ? `FAKE[${modelName()}] → tu as dit « ${last} »` : `FAKE[${modelName()}] → …`;
      const readable = new ReadableStream({
        start(controller) {
          fakeStreamController(text, controller);
        }
      });
      return new Response(readable, {
        headers: {
          'content-type': 'text/event-stream; charset=utf-8',
          'cache-control': 'no-cache, no-transform',
          connection: 'keep-alive'
        }
      });
    }

    // REAL streaming → on proxy le flux du fournisseur tel quel
    const apiKey = process.env.MISTRAL_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing MISTRAL_API_KEY (or enable USE_FAKE_MISTRAL=1)' },
        { status: 400 }
      );
    }

    const payload = {
      model: modelName(),
      messages: msgs,
      temperature: 0.2,
      max_tokens: 256,
      // IMPORTANT : on demande un flux au fournisseur
      stream: true
    };

    const upstream = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    });

    if (!upstream.ok || !upstream.body) {
      const text = await upstream.text().catch(() => '');
      return NextResponse.json(
        { error: `Mistral API error (stream): ${upstream.status} ${text}` },
        { status: 500 }
      );
    }

    // On renvoie le flux tel quel au client
    return new Response(upstream.body, {
      headers: {
        // La plupart des APIs de streaming utilisent SSE
        'content-type':
          upstream.headers.get('content-type') ||
          'text/event-stream; charset=utf-8',
        'cache-control': 'no-cache, no-transform',
        connection: 'keep-alive'
      }
    });
  }

  // --- MODE NON-STREAM (réponse entière) ---
  if (isFake()) {
    const last = msgs.at(-1)?.content ?? '';
    const echoed = last
      ? `FAKE[${modelName()}] → tu as dit « ${last} »`
      : `FAKE[${modelName()}] → dis-moi quelque chose 🙂`;
    return NextResponse.json({
      reply: { role: 'assistant', content: echoed }
    });
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Missing MISTRAL_API_KEY (or enable USE_FAKE_MISTRAL=1)' },
      { status: 400 }
    );
  }

  const payload = {
    model: modelName(),
    messages: msgs,
    temperature: 0.2,
    max_tokens: 256
  };

  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload),
    cache: 'no-store'
  });

  if (!res.ok) {
    const text = await res.text();
    return NextResponse.json(
      { error: `Mistral API error: ${res.status} ${text}` },
      { status: 500 }
    );
  }

  const data = await res.json();
  const content: string | undefined = data?.choices?.[0]?.message?.content;

  return NextResponse.json({
    reply: { role: 'assistant', content: content ?? '(réponse vide)' }
  });
}
