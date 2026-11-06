import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Waves } from "lucide-react";

interface TidePoint {
  time: string;
  height: number;
}

interface TideHiLo {
  time: string;
  height: number;
  type: "H" | "L";
}

interface TideData {
  date: string;
  hourly: TidePoint[];
  hilos: TideHiLo[];
}

function parseHour(timeStr: string): number {
  const parts = timeStr.split(" ");
  if (parts.length < 2) return 0;
  const [h, m] = parts[1].split(":").map(Number);
  return h + m / 60;
}

function formatTideTime(timeStr: string): string {
  const parts = timeStr.split(" ");
  if (parts.length < 2) return "";
  const [h, m] = parts[1].split(":").map(Number);
  const ampm = h >= 12 ? "p" : "a";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${hour12}:${m.toString().padStart(2, "0")}${ampm}`;
}

function runTimeToHour(startTime: string): number {
  const [h, m] = startTime.split(":").map(Number);
  return h + (m || 0) / 60;
}

function interpolateHeight(points: TidePoint[], hour: number): number {
  for (let i = 0; i < points.length - 1; i++) {
    const h1 = parseHour(points[i].time);
    const h2 = parseHour(points[i + 1].time);
    if (hour >= h1 && hour <= h2) {
      const t = (hour - h1) / (h2 - h1);
      return points[i].height + t * (points[i + 1].height - points[i].height);
    }
  }
  return points[0].height;
}

function buildCurvePath(pathPoints: { x: number; y: number }[]): string {
  let d = `M ${pathPoints[0].x} ${pathPoints[0].y}`;
  for (let i = 1; i < pathPoints.length; i++) {
    const prev = pathPoints[i - 1];
    const curr = pathPoints[i];
    const cpx1 = prev.x + (curr.x - prev.x) * 0.4;
    const cpx2 = prev.x + (curr.x - prev.x) * 0.6;
    d += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
  }
  return d;
}

function TideChartSVG({ data, runTime, compact }: { data: TideData; runTime: string; compact?: boolean }) {
  const points = data.hourly;
  if (points.length === 0) return null;

  const chartW = compact ? 200 : 320;
  const chartH = compact ? 36 : 64;
  const padTop = compact ? 4 : 12;
  const padBottom = compact ? 4 : 12;
  const gradientId = compact ? "tideFillMini" : "tideFill";

  const minH = Math.min(...points.map((p) => p.height));
  const maxH = Math.max(...points.map((p) => p.height));
  const range = maxH - minH || 1;

  const plotH = chartH - padTop - padBottom;

  function toX(hour: number): number {
    return (hour / 24) * chartW;
  }
  function toY(height: number): number {
    return padTop + plotH - ((height - minH) / range) * plotH;
  }

  const pathPoints = points.map((p) => ({
    x: toX(parseHour(p.time)),
    y: toY(p.height),
  }));

  const d = buildCurvePath(pathPoints);
  const fillD = d + ` L ${pathPoints[pathPoints.length - 1].x} ${padTop + plotH} L ${pathPoints[0].x} ${padTop + plotH} Z`;

  const runHour = runTimeToHour(runTime);
  const runX = toX(runHour);
  const runHeight = interpolateHeight(points, runHour);

  return (
    <svg
      viewBox={`0 0 ${chartW} ${chartH}`}
      className="w-full"
      preserveAspectRatio="xMidYMid meet"
      data-testid={compact ? "tide-chart-mini-svg" : "tide-chart-svg"}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className="[stop-color:hsl(var(--primary))] [stop-opacity:0.15]" />
          <stop offset="100%" className="[stop-color:hsl(var(--primary))] [stop-opacity:0.02]" />
        </linearGradient>
      </defs>

      <path d={fillD} fill={`url(#${gradientId})`} />
      <path d={d} fill="none" className="stroke-primary/50" strokeWidth={compact ? "1" : "1.5"} strokeLinecap="round" />

      <line
        x1={runX}
        y1={padTop - 1}
        x2={runX}
        y2={padTop + plotH + 1}
        className="stroke-primary"
        strokeWidth="1"
        strokeDasharray="2 2"
      />
      <circle cx={runX} cy={toY(runHeight)} r={compact ? 2 : 2.5} className="fill-primary" />

      {!compact && data.hilos.map((hl, i) => {
        const hour = parseHour(hl.time);
        const x = toX(hour);
        const y = toY(hl.height);
        const isHigh = hl.type === "H";
        const labelY = isHigh ? y - 4 : y + 10;

        return (
          <g key={i}>
            <circle cx={x} cy={y} r="2" className="fill-muted-foreground" />
            <text
              x={x}
              y={labelY}
              textAnchor="middle"
              className="fill-muted-foreground text-[7px] font-medium"
            >
              {hl.height.toFixed(1)}ft {formatTideTime(hl.time)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TideChart({ date, runTime }: { date: string; runTime: string }) {
  const { data, isLoading, isError } = useQuery<TideData>({
    queryKey: [`/api/tides?date=${date}`],
  });

  if (isError) return null;

  if (isLoading) {
    return (
      <Card className="p-3 space-y-1.5" data-testid="card-tide-loading">
        <div className="flex items-center gap-1.5">
          <Waves className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tides</span>
        </div>
        <Skeleton className="h-12 w-full" />
      </Card>
    );
  }

  if (!data || data.hourly.length === 0) return null;

  return (
    <Card className="p-3 space-y-1" data-testid="card-tide-chart">
      <div className="flex items-center gap-1.5">
        <Waves className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tides · York Harbor</span>
      </div>
      <TideChartSVG data={data} runTime={runTime} />
    </Card>
  );
}

function TideMicroSVG({ data, runTime, size = "md" }: { data: TideData; runTime: string; size?: "sm" | "md" | "lg" }) {
  const points = data.hourly;
  if (points.length === 0) return null;

  const w = 40;
  const h = 20;
  const pad = 2;

  const minH = Math.min(...points.map((p) => p.height));
  const maxH = Math.max(...points.map((p) => p.height));
  const range = maxH - minH || 1;

  const toX = (hour: number) => (hour / 24) * w;
  const toY = (height: number) => pad + (h - 2 * pad) - ((height - minH) / range) * (h - 2 * pad);

  const pathPoints = points.map((p) => ({
    x: toX(parseHour(p.time)),
    y: toY(p.height),
  }));

  const d = buildCurvePath(pathPoints);
  const fillD = d + ` L ${pathPoints[pathPoints.length - 1].x} ${h} L ${pathPoints[0].x} ${h} Z`;
  const runHour = runTimeToHour(runTime);
  const runX = toX(runHour);

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={`${size === "sm" ? "w-6 h-6" : size === "lg" ? "w-14 h-14" : "w-10 h-10"} shrink-0`}
      preserveAspectRatio="xMidYMid meet"
      data-testid="tide-micro-svg"
    >
      <path d={fillD} className="fill-blue-400/30 dark:fill-blue-500/25" />
      <path d={d} fill="none" className="stroke-foreground/70" strokeWidth="1" strokeLinecap="round" />
      <line
        x1={runX} y1={0} x2={runX} y2={h}
        className="stroke-primary"
        strokeWidth="1"
      />
    </svg>
  );
}

function getTideLabel(height: number, hilos: TideHiLo[]): string {
  if (hilos.length === 0) return "";
  const heights = hilos.map((hl) => hl.height);
  const minTide = Math.min(...heights);
  const maxTide = Math.max(...heights);
  const range = maxTide - minTide;
  if (range === 0) return "mid";
  const pct = (height - minTide) / range;
  if (pct <= 0.2) return "low";
  if (pct <= 0.4) return "low-mid";
  if (pct <= 0.6) return "mid";
  if (pct <= 0.8) return "mid-high";
  return "high";
}

export function TideChartMini({ date, runTime, size = "md" }: { date: string; runTime: string; size?: "sm" | "md" | "lg" }) {
  const { data, isLoading, isError } = useQuery<TideData>({
    queryKey: [`/api/tides?date=${date}`],
  });

  if (isError || isLoading || !data || data.hourly.length === 0) return null;

  const runHour = runTimeToHour(runTime);
  const height = interpolateHeight(data.hourly, runHour);
  const label = getTideLabel(height, data.hilos);

  return (
    <div className="flex items-center gap-1.5" data-testid="tide-mini">
      <TideMicroSVG data={data} runTime={runTime} size={size} />
      <span className={`${size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-[10px]"} text-muted-foreground leading-tight`} data-testid="text-tide-at-run">{label}</span>
    </div>
  );
}

export function TideSparkline({ date, runTime }: { date: string; runTime: string }) {
  const { data, isLoading, isError } = useQuery<TideData>({
    queryKey: [`/api/tides?date=${date}`],
  });

  if (isError || isLoading || !data || data.hourly.length === 0) {
    return <div className="w-28 h-8 rounded bg-muted/40 animate-pulse" data-testid="tide-sparkline-loading" />;
  }

  const points = data.hourly;
  const chartW = 120;
  const chartH = 32;
  const padTop = 3;
  const padBottom = 3;

  const minH = Math.min(...points.map((p) => p.height));
  const maxH = Math.max(...points.map((p) => p.height));
  const range = maxH - minH || 1;
  const plotH = chartH - padTop - padBottom;

  const toX = (hour: number) => (hour / 24) * chartW;
  const toY = (h: number) => padTop + plotH - ((h - minH) / range) * plotH;

  const pathPoints = points.map((p) => ({ x: toX(parseHour(p.time)), y: toY(p.height) }));
  const d = buildCurvePath(pathPoints);
  const fillD = d + ` L ${pathPoints[pathPoints.length - 1].x} ${padTop + plotH} L ${pathPoints[0].x} ${padTop + plotH} Z`;

  const runHour = runTimeToHour(runTime);
  const runX = toX(runHour);
  const runHeight = interpolateHeight(points, runHour);

  return (
    <div className="flex items-center gap-1" data-testid="tide-sparkline">
      <span className="text-[9px] text-muted-foreground/60 leading-none">Low</span>
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-24 h-8 shrink-0"
        preserveAspectRatio="xMidYMid meet"
        data-testid="tide-sparkline-svg"
      >
        <defs>
          <linearGradient id="tideSparkGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(215,28%,17%)" stopOpacity="0.12" />
            <stop offset="100%" stopColor="hsl(215,28%,17%)" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#tideSparkGrad)" />
        <path d={d} fill="none" stroke="hsl(215,28%,30%)" strokeOpacity="0.6" strokeWidth="1.2" strokeLinecap="round" />
        <line
          x1={runX} y1={padTop - 1}
          x2={runX} y2={padTop + plotH + 1}
          stroke="hsl(17,88%,40%)"
          strokeWidth="1.5"
          strokeDasharray="2 2"
        />
        <circle cx={runX} cy={toY(runHeight)} r="2.5" fill="hsl(17,88%,40%)" />
      </svg>
      <span className="text-[9px] text-muted-foreground/60 leading-none">High</span>
    </div>
  );
}
