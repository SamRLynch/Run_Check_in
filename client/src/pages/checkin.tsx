import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { RunnerChip } from "@/components/runner-chip";
import { DaySelector } from "@/components/day-selector";
import { formatRunDate, formatTime, formatCheckinDate } from "@/lib/dates";
import { getStoredName, setStoredName, getRecurringDays, setRecurringDays } from "@/lib/identity";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, MapPin, Clock, CheckCircle2, Users, ArrowRight } from "lucide-react";
import type { RunWithDetails } from "@shared/schema";
import { Link } from "wouter";

type Step = "name" | "confirm" | "recurring" | "done";

export default function CheckIn() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [step, setStep] = useState<Step>(getStoredName() ? "confirm" : "name");
  const [name, setName] = useState(getStoredName());
  const [recurringDays, setRecurringDaysState] = useState<number[]>(getRecurringDays());
  const [checkedInRun, setCheckedInRun] = useState<RunWithDetails | null>(null);

  const { data: runs, isLoading } = useQuery<RunWithDetails[]>({
    queryKey: ["/api/runs"],
  });

  const nextRun = runs?.[0];

  const checkinMutation = useMutation({
    mutationFn: async () => {
      if (!nextRun) return;
      setStoredName(name.trim());
      await apiRequest("POST", `/api/runs/${nextRun.id}/checkin`, { runnerName: name.trim() });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      setCheckedInRun(nextRun!);
      setStep("recurring");
    },
    onError: (err: Error) => {
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    },
  });

  function handleNameContinue() {
    if (!name.trim()) return;
    setStoredName(name.trim());
    setStep("confirm");
  }

  function handleSaveRecurring() {
    setRecurringDays(recurringDays);
    setStep("done");
  }

  function handleSkipRecurring() {
    setStep("done");
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-lg mx-auto w-full space-y-4 pt-8">
        <Skeleton className="h-8 w-40" />
        <Card className="p-5 space-y-3">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-full" />
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 max-w-lg mx-auto w-full">
      <Link href="/">
        <Button variant="ghost" size="sm" className="mb-4" data-testid="button-back">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
      </Link>

      {step === "name" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold font-serif">Who are you?</h1>
            <p className="text-sm text-muted-foreground">Enter your name to check in. We'll remember it for next time.</p>
          </div>
          <Card className="p-5 space-y-4">
            <Input
              placeholder="Your name (e.g. Sarah K.)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleNameContinue()}
              data-testid="input-name"
            />
            <Button
              className="w-full"
              disabled={!name.trim()}
              onClick={handleNameContinue}
              data-testid="button-continue-name"
            >
              Continue <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </Card>
        </div>
      )}

      {step === "confirm" && nextRun && (() => {
        const runningCheckins = nextRun.checkins.filter(c => c.status === "running");
        const alreadyIn = runningCheckins.some(
          (c) => c.runnerName.toLowerCase() === name.trim().toLowerCase()
        );
        return (
          <div className="space-y-4">
            <div className="space-y-1">
              <h1 className="text-xl font-semibold font-serif">Confirm your run</h1>
              <p className="text-sm text-muted-foreground">
                Checking in as <span className="font-medium text-foreground">{name}</span>
                {" "}
                <Button variant="ghost" size="sm" className="text-xs h-auto p-0 underline" onClick={() => setStep("name")} data-testid="button-change-name">
                  change
                </Button>
              </p>
            </div>

            <Card className="p-5 space-y-4" data-testid="card-confirm-run">
              <h2 className="text-lg font-semibold font-serif" data-testid="text-checkin-date">Running {formatCheckinDate(nextRun.date)}</h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {formatTime(nextRun.startTime)}
                </span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {nextRun.location}
                </span>
              </div>

              {runningCheckins.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {runningCheckins.length} already checked in
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {runningCheckins.map((c) => (
                      <RunnerChip key={c.id} name={c.runnerName} />
                    ))}
                  </div>
                </div>
              )}

              {alreadyIn && (
                <p className="text-xs text-primary" data-testid="text-already-checked-in">
                  {name.trim()} is already checked in for this run
                </p>
              )}

              <Button
                className="w-full"
                onClick={() => checkinMutation.mutate()}
                disabled={checkinMutation.isPending || alreadyIn}
                data-testid="button-im-in"
              >
                {alreadyIn ? "Already Checked In" : checkinMutation.isPending ? "Checking in..." : "I'm In"}
              </Button>
            </Card>
          </div>
        );
      })()}

      {step === "confirm" && !nextRun && (
        <div className="space-y-4">
          <h1 className="text-xl font-semibold font-serif">No upcoming run</h1>
          <Card className="p-5 text-center space-y-3">
            <p className="text-sm text-muted-foreground">There are no runs scheduled right now. Check back later!</p>
            <Link href="/">
              <Button variant="outline" data-testid="button-back-home">Back to Home</Button>
            </Link>
          </Card>
        </div>
      )}

      {step === "recurring" && (
        <div className="space-y-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold font-serif">Set a recurring schedule</h1>
            <p className="text-sm text-muted-foreground">Do you run on a regular schedule? Select the days you usually run.</p>
          </div>
          <Card className="p-5 space-y-4">
            <DaySelector selected={recurringDays} onChange={setRecurringDaysState} />
            <div className="flex flex-col gap-2">
              <Button onClick={handleSaveRecurring} disabled={recurringDays.length === 0} className="w-full" data-testid="button-save-recurring">
                Save Schedule
              </Button>
              <Button variant="ghost" onClick={handleSkipRecurring} className="w-full" data-testid="button-skip-recurring">
                Skip for now
              </Button>
            </div>
          </Card>
        </div>
      )}

      {step === "done" && checkedInRun && (
        <div className="space-y-4">
          <Card className="p-5 space-y-4 text-center" data-testid="card-confirmation">
            <div className="w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-green-700 dark:text-green-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-serif">You're in!</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {formatRunDate(checkedInRun.date)} at {formatTime(checkedInRun.startTime)}
              </p>
              <p className="text-sm text-muted-foreground">{checkedInRun.location}</p>
            </div>

            {recurringDays.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Recurring schedule saved for selected days.
              </p>
            )}

            <Button className="w-full" onClick={() => navigate("/")} data-testid="button-done">
              Back to Home
            </Button>
          </Card>
        </div>
      )}
    </div>
  );
}
