/**
 * Optional AI deep-dive on dashboard data.
 *
 * Calls Google Gemini's FREE TIER directly (gemini-2.5-flash, 15 req/min,
 * 1M tokens/day at no charge). Bypasses Lovable AI Gateway, so this does
 * NOT consume Lovable credits.
 *
 * Requires GOOGLE_API_KEY in the runtime env (set in Render → Environment).
 * If absent, the server function returns `{ available: false }` and the
 * UI hides the button.
 */
import { createServerFn } from "@tanstack/react-start";

type Summary = Record<string, unknown>;

interface AiInsightsInput {
  summary: Summary;
}

interface AiInsightsResult {
  available: boolean;
  narrative?: string;
  error?: string;
}

const PROMPT_PREAMBLE = `You are a senior talent-acquisition analyst.
Given the JSON snapshot of a recruiting dashboard below, write a concise
4–6 sentence interpretation in plain English. Highlight what is going well,
what looks risky, and one concrete action the team should take next.
Do not list raw numbers verbatim — synthesise them into insight. Do not
mention any individual person by name. Output prose only, no markdown
headers, no bullets.`;

export const generateAiInsights = createServerFn({ method: "POST" })
  .inputValidator((input: unknown): AiInsightsInput => {
    if (!input || typeof input !== "object" || !("summary" in input)) {
      throw new Error("summary is required");
    }
    return input as AiInsightsInput;
  })
  .handler(async ({ data }): Promise<AiInsightsResult> => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return { available: false };
    }

    const body = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${PROMPT_PREAMBLE}\n\nJSON:\n${JSON.stringify(data.summary, null, 2)}` },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 400,
      },
    };

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );
      if (!res.ok) {
        const errText = await res.text();
        return { available: true, error: `Gemini API ${res.status}: ${errText.slice(0, 200)}` };
      }
      const json = (await res.json()) as any;
      const narrative =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("").trim() ??
        "";
      if (!narrative) {
        return { available: true, error: "Gemini returned an empty response." };
      }
      return { available: true, narrative };
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { available: true, error: `Network error: ${message}` };
    }
  });
