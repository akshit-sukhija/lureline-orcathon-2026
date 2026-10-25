import process from 'node:process';
import { GoogleGenAI } from '@google/genai';

const ALLOWED_MODELS = new Set([
  'gemini-3.8-flash',
  'gemini-3.1-flash-lite',
  'gemini-4-argon',
]);

const SYSTEM_INSTRUCTION = `You are the Lureline AI Evidence Explainer for a synthetic cyber-deception investigation workbench.
Use only the structured synthetic scenario results provided. Never invent events, connections, alerts, rules, actor attribution, or compromise claims.
The deterministic detection and reconstruction engines are authoritative. Never present an unresolved gap as a confirmed connection.
Structure the response into four concise sections:
1. Why each decoy alert fired, including exact supporting event ID and rule ID, or clearly state that no alerts fired.
2. Network connections with direct evidence, citing supporting event IDs and topology route IDs.
3. Unconfirmed connections and reasons, citing unresolved gap IDs and invalid or missing transitions.
4. Synthetic-data and evidence limitations.
Clearly state that all records are synthetic demonstration data.`;

type ChatMessage = { role?: unknown; text?: unknown };

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return Response.json({ ok: false, error: 'Method not allowed. Use POST.' }, { status: 405 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY') {
      return Response.json({
        ok: false,
        source: 'fallback_required',
        error: 'GEMINI_API_KEY is not configured in the server environment. Use the deterministic explanation fallback.',
      });
    }

    try {
      const rawBody = await request.text();
      if (rawBody.length > 512 * 1024) {
        return Response.json({ ok: false, error: 'Request body is too large.' }, { status: 413 });
      }

      let body: {
        reportPayload?: unknown;
        messages?: unknown;
        model?: unknown;
      };
      try {
        body = JSON.parse(rawBody) as typeof body;
      } catch {
        return Response.json({ ok: false, error: 'Request body must be valid JSON.' }, { status: 400 });
      }

      if (!body.reportPayload || typeof body.reportPayload !== 'object' || Array.isArray(body.reportPayload)) {
        return Response.json({ ok: false, error: 'Missing structured investigation reportPayload.' }, { status: 400 });
      }

      const requestedModel = typeof body.model === 'string' ? body.model : 'gemini-3.8-flash';
      const selectedModel = ALLOWED_MODELS.has(requestedModel) ? requestedModel : 'gemini-3.8-flash';
      const messages = Array.isArray(body.messages) ? (body.messages as ChatMessage[]).slice(-8) : [];
      const conversationHistory = messages
        .filter((message) => typeof message?.text === 'string' && message.text.trim().length > 0)
        .map((message) => ({
          role: message.role === 'model' ? 'model' : 'user',
          parts: [{ text: (message.text as string).slice(0, 4000) }],
        }));

      const contextPreamble = `Authoritative Computed Investigation JSON (Synthetic Only):\n${JSON.stringify(body.reportPayload, null, 2)}`;
      const contents = conversationHistory.length
        ? [
            {
              role: 'user',
              parts: [{ text: `${contextPreamble}\n\nExplain this investigation strictly using the computed facts above.` }],
            },
            ...conversationHistory,
          ]
        : `${contextPreamble}\n\nExplain this investigation strictly using the computed facts above.`;

      const ai = new GoogleGenAI({ apiKey });
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      try {
        const response = await Promise.race([
          ai.models.generateContent({
            model: selectedModel,
            contents,
            config: { systemInstruction: SYSTEM_INSTRUCTION, temperature: 0.1 },
          }),
          new Promise<never>((_resolve, reject) => {
            timeoutId = setTimeout(() => reject(new Error('Gemini request timed out. Use the deterministic explanation fallback.')), 8000);
          }),
        ]);
        const explanation = response.text?.trim();
        if (!explanation) {
          return Response.json({ ok: false, source: 'fallback_required', error: 'Gemini returned an empty response.' });
        }
        return Response.json({ ok: true, source: 'gemini', model: selectedModel, explanation });
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gemini request failed.';
      return Response.json({ ok: false, source: 'fallback_required', error: message });
    }
  },
};
