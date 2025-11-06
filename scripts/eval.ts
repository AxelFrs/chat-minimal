/* scripts/eval.ts
   Mini éval: envoie une liste de prompts à /api/chat (REAL ou FAKE)
   et imprime un CSV sur la sortie standard.
*/
import { performance } from 'node:perf_hooks';

type Row = {
  model: string;
  mode: 'FAKE' | 'REAL';
  prompt: string;
  ms: number;
  chars_out: number;
  preview: string;
};

const prompts = [
  'Donne-moi une fun fact en une phrase.',
  'Explique le concept de surapprentissage en deux phrases.',
  "Résume: L’IA aide les devs à créer des outils plus vite."
];

const MODE: 'FAKE' | 'REAL' = process.env.USE_FAKE_MISTRAL === '1' ? 'FAKE' : 'REAL';
const MODEL = process.env.MISTRAL_MODEL || 'mistral-small-latest';
const BASE = process.env.BASE_URL || 'http://localhost:3000'; // au cas où on déploie

async function ask(prompt: string): Promise<{ text: string; ms: number }> {
  const t0 = performance.now();
  // Ici on utilise le mode NON-stream pour simplicité de mesure
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message: prompt })
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status}: ${txt}`);
  }
  const data = await res.json();
  const text = String(data?.reply?.content ?? '');
  const ms = performance.now() - t0;
  return { text, ms };
}

function toCsv(rows: Row[]): string {
  const esc = (s: string) =>
    '"' + s.replaceAll('"', '""').replaceAll('\n', ' ').replaceAll('\r', ' ') + '"';
  const header = ['model', 'mode', 'prompt', 'ms', 'chars_out', 'preview'].join(',');
  const lines = rows.map(r =>
    [r.model, r.mode, r.prompt, r.ms.toFixed(0), String(r.chars_out), r.preview]
      .map(esc)
      .join(',')
  );
  return [header, ...lines].join('\n');
}

async function main() {
  const rows: Row[] = [];
  for (const p of prompts) {
    const { text, ms } = await ask(p);
    rows.push({
      model: MODEL,
      mode: MODE,
      prompt: p,
      ms,
      chars_out: text.length,
      preview: text.slice(0, 120)
    });
  }
  console.log(toCsv(rows));
}

main().catch((e) => {
  console.error('Eval failed:', e?.message ?? e);
  process.exit(1);
});
