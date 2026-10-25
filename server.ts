import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_MODELS = new Set([
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
]);

const SYSTEM_INSTRUCTION = `You are the Lureline AI Evidence Explainer for a synthetic cyber-deception investigation workbench.
Follow these strict rules:
1. Use ONLY the structured synthetic scenario results provided in the request JSON. Never invent events, node connections, alerts, rules, actor attribution, or compromise claims.
2. Keep the deterministic detection and reconstruction engines authoritative. Never claim an unconfirmed gap is a confirmed connection.
3. Explicitly structure your explanation into four concise sections:
   - Why each decoy alert fired (including exact supporting event ID and detection rule ID, or state if 0 alerts fired).
   - Which network connections have direct supporting evidence (citing event IDs and topology route IDs).
   - Which connections remain unconfirmed and why (citing unresolved gap IDs and missing/invalid transitions).
   - The investigation's synthetic-data and evidence limitations.
4. State clearly that all records are synthetic demonstration data.`;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '512kb' }));

  app.post('/api/explain', async (req, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
        res.status(200).json({
          ok: false,
          source: 'fallback_required',
          error:
            'GEMINI_API_KEY is not configured on the server; using deterministic explanation fallback.',
        });
        return;
      }

      const {
        reportPayload,
        messages = [],
        model: requestedModel = 'gemini-3.8-flash',
      } = req.body ?? {};

      if (!reportPayload || typeof reportPayload !== 'object') {
        res.status(400).json({
          ok: false,
          error: 'Missing structured investigation reportPayload.',
        });
        return;
      }

      const selectedModel = ALLOWED_MODELS.has(requestedModel)
        ? requestedModel
        : 'gemini-3.8-flash';

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      const conversationHistory = Array.isArray(messages)
        ? messages
            .filter(
              (m: { role?: string; text?: string }) =>
                m && typeof m.text === 'string' && m.text.trim() !== ''
            )
            .map((m: { role?: string; text: string }) => ({
              role: m.role === 'model' ? 'model' : 'user',
              parts: [{ text: m.text }],
            }))
        : [];

      const contextPreamble = `Authoritative Computed Investigation JSON (Synthetic Only):\n${JSON.stringify(
        reportPayload,
        null,
        2
      )}`;

      const contents =
        conversationHistory.length > 0
          ? [
              {
                role: 'user',
                parts: [
                  {
                    text: `${contextPreamble}\n\nExplain this investigation strictly using the computed facts above.`,
                  },
                ],
              },
              ...conversationHistory,
            ]
          : `${contextPreamble}\n\nExplain this investigation strictly using the computed facts above.`;

      const response = await Promise.race([
        ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.1,
          },
        }),
        new Promise<never>((_resolve, reject) =>
          setTimeout(
            () =>
              reject(
                new Error(
                  'Gemini network request timed out in sandbox; using deterministic fallback.'
                )
              ),
            2000
          )
        ),
      ]);

      const text = response.text?.trim();
      if (!text) {
        res.status(200).json({
          ok: false,
          source: 'fallback_required',
          error: 'Empty response from Gemini model.',
        });
        return;
      }

      res.json({
        ok: true,
        source: 'gemini',
        model: selectedModel,
        explanation: text,
      });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Gemini request failed.';
      res.status(200).json({
        ok: false,
        source: 'fallback_required',
        error: message,
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Lureline server listening on http://0.0.0.0:${port}`);
  });
}

startServer();
