import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { analyseMissingChart } from "@/lib/chart-fill.functions";

interface Props {
  chartTitle: string;
  expectedDimension: string;
  summary: Record<string, unknown>;
}

/**
 * Shown inside a ChartCard when the chart has no data.
 * Lets the user ask the AI to estimate a plausible breakdown from the
 * surrounding dashboard data, and explains why the chart is empty.
 *
 * Hides itself if GOOGLE_API_KEY is not set on the server.
 */
export function EmptyChartAi({ chartTitle, expectedDimension, summary }: Props) {
  const ask = useServerFn(analyseMissingChart);
  const [loading, setLoading] = useState(false);
  const [aiUnavailable, setAiUnavailable] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [estimate, setEstimate] = useState<{ label: string; value: number }[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);
    setEstimate(null);
    try {
      const res = await ask({ data: { chartTitle, expectedDimension, summary } });
      if (!res.available) setAiUnavailable(true);
      else if (res.error) setError(res.error);
      else {
        setAnalysis(res.analysis ?? "");
        setEstimate(res.estimate ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  if (analysis !== null) {
    return (
      <div className="flex h-[300px] flex-col gap-3 overflow-auto rounded-md border border-amber-200 bg-amber-50/40 p-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-600" />
          <span className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            AI estimate
          </span>
          <Badge variant="outline" className="ml-auto text-[10px]">estimated</Badge>
        </div>
        {analysis && <p className="text-xs leading-relaxed text-slate-800">{analysis}</p>}
        {estimate && estimate.length > 0 && (
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={estimate}>
              <CartesianGrid strokeDasharray="3 3" stroke="#fde68a" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
        <Button size="sm" variant="ghost" className="self-start text-xs" onClick={() => setAnalysis(null)}>
          Hide AI estimate
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
      <span>No data available for this view</span>
      {!aiUnavailable && (
        <Button size="sm" variant="outline" onClick={run} disabled={loading}>
          {loading ? (
            <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Analysing…</>
          ) : (
            <><Sparkles className="mr-2 h-3.5 w-3.5" />Analyse &amp; estimate with AI</>
          )}
        </Button>
      )}
      {error && <p className="max-w-xs text-center text-xs text-red-600">{error}</p>}
    </div>
  );
}
