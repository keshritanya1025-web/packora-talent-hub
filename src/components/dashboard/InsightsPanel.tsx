import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { buildInsights, buildAiSummary, type Insight } from "@/lib/insights";
import { generateAiInsights } from "@/lib/ai-insights.functions";

type Row = Record<string, any>;

interface Props {
  candidates: Row[];
  requisitions: Row[];
  interviews: Row[];
  offers: Row[];
}

const TONE_STYLES: Record<Insight["tone"], string> = {
  positive: "border-l-emerald-500 bg-emerald-50/50",
  neutral: "border-l-slate-400 bg-slate-50/50",
  warning: "border-l-amber-500 bg-amber-50/50",
  critical: "border-l-red-500 bg-red-50/50",
};

export function InsightsPanel(props: Props) {
  const insights = useMemo(() => buildInsights(props), [props]);
  const summary = useMemo(() => buildAiSummary(props), [props]);

  const askAi = useServerFn(generateAiInsights);
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAskAi = async () => {
    setLoading(true);
    setError(null);
    setNarrative(null);
    try {
      const res = await askAi({ data: { summary } });
      if (!res.available) {
        setAiUnavailable(true);
      } else if (res.error) {
        setError(res.error);
      } else if (res.narrative) {
        setNarrative(res.narrative);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Insights
          </CardTitle>
          <p className="mt-1 text-xs text-muted-foreground">
            Automatic interpretation of what the numbers above mean.
          </p>
        </div>
        {!aiUnavailable && (
          <Button size="sm" variant="outline" onClick={handleAskAi} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                Thinking…
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-3.5 w-3.5" />
                Ask AI for a deep dive
              </>
            )}
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        <ul className="space-y-2">
          {insights.map((ins, i) => (
            <li
              key={i}
              className={`flex gap-3 rounded-md border-l-4 px-3 py-2 text-sm ${TONE_STYLES[ins.tone]}`}
            >
              <span className="text-base leading-none">{ins.icon}</span>
              <span className="leading-snug text-slate-800">{ins.text}</span>
            </li>
          ))}
        </ul>

        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        {narrative && (
          <div className="rounded-md border border-amber-200 bg-amber-50/60 p-4">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
                AI deep-dive
              </span>
              <Badge variant="outline" className="ml-auto text-[10px]">
                gemini-2.5-flash · free tier
              </Badge>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
              {narrative}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
