import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RunnerAvatar, RunnerAvatarStack } from "@/components/runner-avatar";
import { formatRunDate, formatTime, formatShortDate, isDateTomorrow, isDateToday, formatCheckinDate, getRunTitle } from "@/lib/dates";
import { getStoredName, setStoredName } from "@/lib/identity";
import { getStoredRole } from "@/lib/permissions";
import { AppNavMenu } from "@/components/app-nav-menu";
import { getWeatherForDate, getWeatherForHour, windDirToCompass, getWeatherSpritePos, HUMIDITY_SPRITE, type WeatherData } from "@/lib/weather";
import { TideSparkline } from "@/components/tide-chart";
import { WeatherSprite } from "@/components/weather-sprite";
import { Calendar, ArrowRight, ChevronDown, Check, LogOut } from "lucide-react";
import { UiSprite, UI_ICON, PERSON_ICONS } from "@/components/ui-sprite";
import type { RunWithDetails } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

const GRANITE = "hsl(215,18%,24%)";

const RANDOM_PERSON_CX = PERSON_ICONS[Math.floor(Math.random() * PERSON_ICONS.length)];

function EmptyRunners() {
  return (
    <div className="flex items-center gap-2" data-testid="no-runners">
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
        style={{ border: "2px dashed hsl(215 16% 47% / 0.4)" }}
      >
        <UiSprite cx={RANDOM_PERSON_CX} size={22} />
      </div>
      <span className="text-xs text-muted-foreground/60">No runners yet</span>
    </div>
  );
}

function WeatherBadgeCompact({ date, weather, startTime }: { date: string; weather: WeatherData | undefined; startTime: string }) {
  const daily = getWeatherForDate(weather, date);
  const hourly = getWeatherForHour(weather, date, startTime);
  if (!daily) return null;
  const spritePos = getWeatherSpritePos(hourly?.code ?? daily.code);
  const temp = hourly?.temp ?? daily.high;
  const wind = hourly?.windSpeed ?? daily.windSpeed;
  const windDir = hourly?.windDir ?? daily.windDir;
  const precip = hourly?.precipChance ?? daily.precipChance;
  const humidity = hourly?.humidity;
  return (
    <span className="flex items-center gap-1 text-xs flex-wrap text-muted-foreground" data-testid={`weather-compact-${date}`}>
      <WeatherSprite row={spritePos[0]} col={spritePos[1]} size={18} />
      <span>{temp}°</span>
      <span className="opacity-30">·</span>
      <WeatherSprite row={2} col={6} size={16} />
      <span>{wind} mph {windDirToCompass(windDir)}</span>
      {humidity != null && (
        <>
          <span className="opacity-30">·</span>
          <WeatherSprite row={HUMIDITY_SPRITE[0]} col={HUMIDITY_SPRITE[1]} size={16} />
          <span>{humidity}%</span>
        </>
      )}
      {precip != null && (
        <>
          <span className="opacity-30">·</span>
          <span>{precip}%</span>
        </>
      )}
    </span>
  );
}

function NextRunCard({ run, weather }: { run: RunWithDetails; weather: WeatherData | undefined }) {
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [nameInput, setNameInput] = useState(getStoredName());
  const [showNameInput, setShowNameInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<"running" | "skipping" | null>(null);

  const storedName = getStoredName();
  const runners = run.checkins.filter(c => c.status === "running");
  const skippers = run.checkins.filter(c => c.status === "skipping");

  const isRunning = !!storedName && runners.some(c => c.runnerName.toLowerCase() === storedName.toLowerCase());
  const isSkipping = !!storedName && skippers.some(c => c.runnerName.toLowerCase() === storedName.toLowerCase());

  const dateObj = parseISO(run.date);
  const dayLabel = getRunTitle(run);
  const fullDate = format(dateObj, "EEEE, MMMM d");
  const dayLabel2 = formatCheckinDate(run.date);

  const daily = getWeatherForDate(weather, run.date);
  const hourly = getWeatherForHour(weather, run.date, run.startTime);
  const temp = hourly?.temp ?? daily?.high;
  const weatherCode = hourly?.code ?? daily?.code;
  const windSpeed = hourly?.windSpeed ?? daily?.windSpeed;
  const windDir = hourly?.windDir ?? daily?.windDir;
  const precip = hourly?.precipChance ?? daily?.precipChance;
  const humidity = hourly?.humidity;

  const checkinMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", `/api/runs/${run.id}/checkin`, { runnerName: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      setShowNameInput(false);
      setPendingAction(null);
      toast({
        title: `You're in for ${dayLabel2}!`,
        description: `See you at ${run.location} · ${formatTime(run.startTime)}!`,
        variant: "success" as any,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (name: string) => {
      await apiRequest("POST", `/api/runs/${run.id}/skip`, { runnerName: name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      setShowNameInput(false);
      setPendingAction(null);
      toast({
        title: `Marked as skipping for ${dayLabel2}`,
        description: "We'll miss you — catch you at the next one!",
        variant: "info" as any,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to mark skipping", description: err.message, variant: "destructive" });
    },
  });

  const bailMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/runs/${run.id}/cancel-checkin`, { runnerName: storedName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({
        title: "Bailing? All good!",
        description: `Removed from ${dayLabel2}'s run. We'll see you next time!`,
        variant: "info" as any,
      });
    },
  });

  function handleAction(action: "running" | "skipping") {
    const name = getStoredName();
    if (name) {
      setStoredName(name);
      if (action === "running") checkinMutation.mutate(name);
      else skipMutation.mutate(name);
    } else {
      setPendingAction(action);
      setShowNameInput(true);
    }
  }

  function submitName() {
    const trimmed = nameInput.trim();
    if (!trimmed || !pendingAction) return;
    setStoredName(trimmed);
    if (pendingAction === "running") checkinMutation.mutate(trimmed);
    else skipMutation.mutate(trimmed);
  }

  if (run.cancelled) {
    return (
      <Card className="p-5 space-y-3 cursor-pointer hover-elevate" onClick={() => navigate(`/run/${run.id}`)} data-testid="card-next-run">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next Run</p>
        <h2 className="text-[32px] font-bold font-serif leading-tight" data-testid="text-next-run-date">{dayLabel}</h2>
        <p className="text-sm text-muted-foreground">{fullDate}</p>
        <Badge variant="destructive">Cancelled</Badge>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden" data-testid="card-next-run">
      <div
        className="p-5 space-y-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => navigate(`/run/${run.id}`)}
      >
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-[32px] font-bold font-serif leading-tight" data-testid="text-next-run-date">
              {dayLabel}
            </h2>
            {run.isCustom && (
              <div className="flex items-center gap-1.5 mt-1">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#64748b] text-white" data-testid="badge-custom">custom</span>
                {run.createdBy && <span className="text-xs text-muted-foreground">by {run.createdBy}</span>}
              </div>
            )}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-muted-foreground mt-1">
              <span className="flex items-center gap-1.5">
                {fullDate}
                <span className="opacity-30">·</span>
                <UiSprite cx={UI_ICON.clock} size={14} />
                {formatTime(run.startTime)}
              </span>
              <span className="flex items-center gap-1.5">
                <UiSprite cx={UI_ICON.location} size={14} />
                {run.location}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          {(weatherCode != null || windSpeed != null) ? (
            <div className="flex items-center gap-3 flex-wrap text-sm text-muted-foreground">
              {weatherCode != null && temp != null && (
                <span className="flex items-center gap-1.5" data-testid={`weather-${run.date}`}>
                  <WeatherSprite row={getWeatherSpritePos(weatherCode)[0]} col={getWeatherSpritePos(weatherCode)[1]} size={22} />
                  <span className="font-medium">{temp}°F</span>
                </span>
              )}
              {humidity != null && (
                <span className="flex items-center gap-1">
                  <WeatherSprite row={HUMIDITY_SPRITE[0]} col={HUMIDITY_SPRITE[1]} size={20} />
                  {humidity}%
                </span>
              )}
              {windSpeed != null && windDir != null && (
                <span className="flex items-center gap-1" data-testid={`wind-${run.date}`}>
                  <WeatherSprite row={2} col={6} size={20} />
                  {windSpeed} mph {windDirToCompass(windDir)}
                </span>
              )}
              {precip != null && (
                <span data-testid={`precip-${run.date}`}>{precip}%</span>
              )}
            </div>
          ) : <div />}
          <TideSparkline date={run.date} runTime={run.startTime} />
        </div>

        <div className="border-t border-border pt-3 flex items-center justify-between gap-4">
          {runners.length > 0 || skippers.length > 0 ? (
            <>
              <div className="flex items-center gap-2 min-w-0">
                {runners.length > 0 ? (
                  <div className="flex items-center gap-2" data-testid="runners-section">
                    <RunnerAvatarStack names={runners.map(c => c.runnerName)} max={3} />
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {runners.length} Running
                    </span>
                  </div>
                ) : (
                  <EmptyRunners />
                )}
              </div>
              {skippers.length > 0 && (
                <div className="flex items-center gap-2" data-testid="skippers-section">
                  <RunnerAvatarStack names={skippers.map(c => c.runnerName)} max={3} muted />
                  <span className="text-xs text-muted-foreground/60 whitespace-nowrap">
                    {skippers.length} Skipping
                  </span>
                </div>
              )}
            </>
          ) : (
            <EmptyRunners />
          )}
        </div>
      </div>

      <div className="px-5 pb-5 space-y-3">
        {showNameInput && (
          <div className="flex gap-2">
            <Input
              placeholder="Your name"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitName()}
              className="border-0 border-b rounded-none bg-transparent focus-visible:ring-0 focus-visible:border-foreground placeholder:text-muted-foreground/50"
              autoFocus
              data-testid="input-quick-name"
            />
            <Button size="sm" onClick={submitName} disabled={!nameInput.trim()} data-testid="button-confirm-name">
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        )}

        <div className="flex gap-2" data-testid="action-buttons">
          {isRunning ? (
            <>
              <Button
                className="flex-1 bg-green-700 hover:bg-green-800 text-white border-green-700"
                disabled
                data-testid="button-you-are-in"
              >
                <Check className="w-4 h-4 mr-1.5" />
                You're In!
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-primary border-primary hover:bg-primary/5"
                onClick={() => bailMutation.mutate()}
                disabled={bailMutation.isPending}
                data-testid="button-bail"
              >
                <LogOut className="w-4 h-4 mr-1.5" />
                Bail
              </Button>
            </>
          ) : isSkipping ? (
            <>
              <Button
                className="flex-1"
                onClick={() => handleAction("running")}
                disabled={checkinMutation.isPending}
                data-testid="button-im-running"
              >
                I'm Running
              </Button>
              <Button
                variant="outline"
                className="flex-1 text-muted-foreground border-muted-foreground/30 opacity-60"
                disabled
                data-testid="button-skipping-active"
              >
                Skipping
              </Button>
            </>
          ) : (
            <>
              <Button
                className="flex-1"
                onClick={() => handleAction("running")}
                disabled={checkinMutation.isPending}
                data-testid="button-im-running"
              >
                I'm Running
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleAction("skipping")}
                disabled={skipMutation.isPending}
                data-testid="button-im-skipping"
              >
                I'm Skipping
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );
}

function EmptyNextRun() {
  return (
    <Card className="p-6 text-center space-y-3" data-testid="card-no-run">
      <Calendar className="w-10 h-10 mx-auto text-muted-foreground" />
      <div>
        <h2 className="text-lg font-semibold font-serif">No upcoming run</h2>
        <p className="text-sm text-muted-foreground mt-1">Check back later or create a weekend run.</p>
      </div>
    </Card>
  );
}

function UpcomingRunRow({ run, weather, isAdmin }: { run: RunWithDetails; weather: WeatherData | undefined; isAdmin?: boolean }) {
  const [, navigate] = useLocation();
  const dateObj = parseISO(run.date);
  const dayAbbr = format(dateObj, "EEE");
  const dayNum = format(dateObj, "d");
  const runners = run.checkins.filter(c => c.status === "running");
  const skippers = run.checkins.filter(c => c.status === "skipping");
  const rowTitle = getRunTitle(run);

  return (
    <div
      className={`flex items-center gap-2 py-3 px-4 hover-elevate rounded-md cursor-pointer${run.hidden ? " opacity-50" : ""}`}
      onClick={() => navigate(`/run/${run.id}`)}
      data-testid={`row-upcoming-${run.id}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="flex flex-col items-center justify-center w-10 h-10 rounded-md bg-muted shrink-0">
          <span className="text-[10px] font-semibold uppercase leading-none">{dayAbbr}</span>
          <span className="text-base font-bold leading-tight">{dayNum}</span>
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium truncate">{rowTitle}</p>
            {run.hidden && isAdmin && (
              <span className="inline-flex items-center px-1.5 rounded-full text-[11px] font-normal bg-muted-foreground/30 text-foreground leading-5" data-testid={`badge-hidden-${run.id}`}>
                hidden
              </span>
            )}
            {run.isCustom && (
              <>
                <span className="inline-flex items-center px-1.5 rounded-full text-[11px] font-medium bg-[#64748b] text-white leading-5" data-testid={`badge-custom-${run.id}`}>custom</span>
                {run.createdBy && <span className="text-[11px] text-muted-foreground">by {run.createdBy}</span>}
              </>
            )}
            <WeatherBadgeCompact date={run.date} weather={weather} startTime={run.startTime} />
          </div>
          <p className="text-xs text-muted-foreground">
            {formatTime(run.startTime)} · {run.location}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
        {run.cancelled ? (
          <Badge variant="destructive" className="text-xs no-default-hover-elevate no-default-active-elevate">Cancelled</Badge>
        ) : runners.length > 0 ? (
          <div className="flex items-center gap-2">
            <RunnerAvatarStack names={runners.map(c => c.runnerName)} max={3} />
            {skippers.length > 0 && (
              <RunnerAvatarStack names={skippers.map(c => c.runnerName)} max={2} muted />
            )}
          </div>
        ) : skippers.length > 0 ? (
          <RunnerAvatarStack names={skippers.map(c => c.runnerName)} max={3} muted />
        ) : (
          <span className="text-xs text-muted-foreground/50">No one yet</span>
        )}
      </div>
    </div>
  );
}



export default function Home() {
  const [, navigate] = useLocation();
  const [showCount, setShowCount] = useState(2);
  const role = getStoredRole();
  const isAdmin = role === "admin";

  const { data: runs, isLoading } = useQuery<RunWithDetails[]>({
    queryKey: ["/api/runs"],
    refetchInterval: 30000,
  });

  const { data: weather } = useQuery<WeatherData>({
    queryKey: ["/api/weather"],
    refetchInterval: 60 * 60 * 1000,
  });

  const sortedRuns = [...(runs || [])].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.isCustom !== b.isCustom) return a.isCustom ? -1 : 1;
    return a.startTime < b.startTime ? -1 : 1;
  });
  const visibleRuns = isAdmin ? sortedRuns : sortedRuns.filter(r => !r.hidden);

  const nextRun = isLoading ? undefined : visibleRuns[0];
  const allUpcoming = visibleRuns.slice(1);
  const upcomingRuns = allUpcoming.slice(0, showCount);
  const hasMore = allUpcoming.length > showCount;

  return (
    <div className="flex flex-col min-h-full">
      <div className="nav-header" style={{ background: "hsl(215,18%,24%)" }} data-testid="header-bar">
        <div className="max-w-[500px] mx-auto w-full px-4 pt-8 pb-6 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 flex-1" data-testid="link-home">
            <img src="/logo.png" alt="Clubb Nubb" className="h-9 w-auto" />
            <h1 className="text-xl font-bold font-serif text-white tracking-tight" data-testid="text-heading">
              Clubb Nubb
            </h1>
          </Link>
          <AppNavMenu />
        </div>
      </div>

      <div className="content-wrapper flex-1 pb-8 space-y-6">
        {isLoading ? (
          <div className="space-y-4 pt-1">
            <Card className="p-5 space-y-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-56" />
              <div className="flex gap-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
              <div className="flex gap-2 pt-2">
                <Skeleton className="h-10 flex-1" />
                <Skeleton className="h-10 flex-1" />
              </div>
            </Card>
          </div>
        ) : nextRun ? (
          <NextRunCard run={nextRun} weather={weather} />
        ) : (
          <EmptyNextRun />
        )}

        {upcomingRuns.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-2xl font-bold font-serif text-white">Coming Up</h3>
            <Card className="divide-y divide-border overflow-hidden">
              {upcomingRuns.map((run) => (
                <UpcomingRunRow key={run.id} run={run} weather={weather} isAdmin={isAdmin} />
              ))}
            </Card>
            {hasMore && (
              <div className="flex justify-center pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white/70 hover:text-white hover:bg-white/10"
                  onClick={() => setShowCount((c) => c + 5)}
                  data-testid="button-show-more"
                >
                  Show more <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
