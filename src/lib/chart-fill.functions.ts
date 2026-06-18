/**
 * Per-chart "fill missing data" AI helper.
 *
 * When a dashboard chart has no underlying data, the user can click
 * "Analyse with AI" to get a short, plain-English explanation of:
 *   - why the chart might be empty (likely data-quality reasons),
 *   - what other metrics suggest about the same dimension,
 *   - a realistic estimated breakdown when the AI can infer one from
 *     adjacent data, clearly marked as ESTIMATED.
 *
 * Uses Google Gemini's FREE TIER directly (gemini-2.5-flash). Requires
 * GOOGLE_API_KEY in the runtime env. If absent, returns
 * `{ available: false }` and the UI hides the button.
 */
import { createServerFn } from "@tanstack/react-start";

interface ChartFillInput {
  chartTitle: string;
  expectedDimension: string; // e.g. "business unit", "source"
  summary: Record<string, unknown>;
}

interface ChartFillResult {
  available: boolean;
  analysis?: string;
  estimate?: { label: string; value: number }[];
  error?: string;
}

const PROMPT = `You are a senior talent-acquisition analyst helping a recruiting team
interpret an empty chart on their dashboard.

You will receive:
  - the chart title,
  - the dimension it tries to break down,
  - a JSON snapshot of the rest of the dashboard data.

Respond as STRICT JSON with two keys:
  "analysis": a 2-4 sentence plain-English explanation of why this chart is
              probably empty and what the surrounding data implies about the
              same dimension. Do not mention any person by name.
  "estimate": an array of up to 6 {"label": string, "value": number} objects
              representing a REASONABLE estimated breakdown for the missing
              chart, derived ONLY from patterns visible in the JSON snapshot.
              If no defensible estimate is possible, return an empty array.

Output JSON only, no markdown fences, no commentary.`;

export const analyseMissingChart = createServerFn({ method: "POST" })
  .inputValidator((input: unknown): ChartFillInput => {
    if (
      !input ||
      typeof input !== "object" ||
      !("chartTitle" in input) ||
      !("expectedDimension" in input) ||
      !("summary" in input)
    ) {
      throw new Error("chartTitle, expectedDimension and summary are required");
    }
    return input as ChartFillInput;
  })
  .handler(async ({ data }): Promise<ChartFillResult> => {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) return { available: false };

    const userText = `Chart title: ${data.chartTitle}
Dimension: ${data.expectedDimension}

JSON snapshot:
${JSON.stringify(data.summary, null, 2)}`;

    const body = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${PROMPT}\n\n${userText}` }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 500,
        responseMimeType: "application/json",
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
      const raw =
        json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? "").join("").trim() ?? "";
      if (!raw) return { available: true, error: "Gemini returned an empty response." };

      try {
        const parsed = JSON.parse(raw);
        const analysis = typeof parsed.analysis === "string" ? parsed.analysis : "";
        const estimate = Array.isArray(parsed.estimate)
          ? parsed.estimate
              .filter((x: any) => x && typeof x.label === "string" && typeof x.value === "number")
              .slice(0, 6)
          : [];
        return { available: true, analysis, estimate };
      } catch {
        // Model returned non-JSON despite responseMimeType: fall back to plain text
        return { available: true, analysis: raw, estimate: [] };
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      return { available: true, error: `Network error: ${message}` };
    }
  });
