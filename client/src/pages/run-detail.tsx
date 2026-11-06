import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatTime, formatCheckinDate, getRunTitle } from "@/lib/dates";
import { getStoredName } from "@/lib/identity";
import { getStoredRole, canEditRun, type Role } from "@/lib/permissions";
import {
  LocationSearch,
  LocationNameInput,
  type LocationResult,
  type SavedLocationItem,
} from "@/components/location-search";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { RunnerAvatar } from "@/components/runner-avatar";
import { ArrowLeft, ExternalLink, MessageSquarePlus, X, Plus, Check, LogOut, MoreHorizontal, Pencil, Trash2, Star, Eye, EyeOff } from "lucide-react";
import { AppNavMenu, TimeSelect, getDefaultRunName } from "@/components/app-nav-menu";
import { UiSprite, UI_ICON, PERSON_ICONS } from "@/components/ui-sprite";
import type { RunWithDetails } from "@shared/schema";
import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { getWeatherForDate, getWeatherForHour, windDirToCompass, getWeatherSpritePos, HUMIDITY_SPRITE, type WeatherData } from "@/lib/weather";
import { WeatherSprite } from "@/components/weather-sprite";
import { TideChartMini } from "@/components/tide-chart";

type SuggestionStep = "closed" | "pick-type" | "form";
type SuggestionType = "location" | "time" | "both";

const TIME_OPTIONS = [
  "5:00 AM", "5:15 AM", "5:30 AM", "5:45 AM",
  "6:00 AM", "6:15 AM", "6:30 AM", "6:45 AM",
  "7:00 AM", "7:15 AM", "7:30 AM", "7:45 AM",
  "8:00 AM", "8:30 AM", "9:00 AM",
];

function SuggestionForm({ runId }: { runId: string }) {
  const [step, setStep] = useState<SuggestionStep>("closed");
  const [suggestionType, setSuggestionType] = useState<SuggestionType>("location");
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [newLocation, setNewLocation] = useState("");
  const [addingNew, setAddingNew] = useState(false);
  const [name, setName] = useState(getStoredName());
  const { toast } = useToast();

  const { data: locations = [] } = useQuery<string[]>({
    queryKey: ["/api/locations"],
    enabled: step === "form",
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const finalLocation = addingNew ? newLocation.trim() : selectedLocation;
      await apiRequest("POST", `/api/runs/${runId}/suggestions`, {
        suggestionType,
        suggestedTime: (suggestionType === "time" || suggestionType === "both") ? selectedTime : undefined,
        suggestedLocation: (suggestionType === "location" || suggestionType === "both") ? finalLocation : undefined,
        name: name || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/locations"] });
      resetForm();
      toast({ title: "Suggestion posted" });
    },
  });

  function resetForm() {
    setStep("closed");
    setSelectedTime("");
    setSelectedLocation("");
    setNewLocation("");
    setAddingNew(false);
  }

  function pickType(type: SuggestionType) {
    setSuggestionType(type);
    setStep("form");
  }

  function canSubmit() {
    const needsTime = suggestionType === "time" || suggestionType === "both";
    const needsLocation = suggestionType === "location" || suggestionType === "both";
    const hasTime = !needsTime || selectedTime;
    const hasLocation = !needsLocation || (addingNew ? newLocation.trim() : selectedLocation);
    return hasTime && hasLocation;
  }

  if (step === "closed") {
    return (
      <Button variant="outline" className="w-full" onClick={() => setStep("pick-type")} data-testid="button-suggest">
        <MessageSquarePlus className="w-4 h-4 mr-1.5" />
        Suggest change in plans
      </Button>
    );
  }

  if (step === "pick-type") {
    return (
      <Card className="p-4 space-y-3" data-testid="card-suggestion-type">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-semibold font-serif">What would you like to change?</h4>
          <Button variant="ghost" size="icon" onClick={resetForm} data-testid="button-close-suggestion">
            <X className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" onClick={() => pickType("location")} className="justify-start" data-testid="button-suggest-location">
            <UiSprite cx={UI_ICON.location} size={16} className="mr-2" /> Location
          </Button>
          <Button variant="outline" onClick={() => pickType("time")} className="justify-start" data-testid="button-suggest-time">
            <UiSprite cx={UI_ICON.clock} size={16} className="mr-2" /> Time
          </Button>
          <Button variant="outline" onClick={() => pickType("both")} className="justify-start" data-testid="button-suggest-both">
            <UiSprite cx={UI_ICON.location} size={16} className="mr-1" />
            <UiSprite cx={UI_ICON.clock} size={16} className="mr-1.5" /> Both
          </Button>
        </div>
      </Card>
    );
  }

  const showTime = suggestionType === "time" || suggestionType === "both";
  const showLocation = suggestionType === "location" || suggestionType === "both";

  return (
    <Card className="p-4 space-y-4" data-testid="form-suggestion">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h4 className="text-sm font-semibold font-serif">
          Suggest a {suggestionType === "both" ? "new time & location" : `new ${suggestionType}`}
        </h4>
        <Button variant="ghost" size="icon" onClick={resetForm} data-testid="button-close-suggestion">
          <X className="w-4 h-4" />
        </Button>
      </div>

      {showTime && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Time</label>
          <Select value={selectedTime} onValueChange={setSelectedTime}>
            <SelectTrigger data-testid="select-time">
              <SelectValue placeholder="Pick a time" />
            </SelectTrigger>
            <SelectContent>
              {TIME_OPTIONS.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {showLocation && (
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Location</label>
          {!addingNew ? (
            <div className="space-y-2">
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger data-testid="select-location">
                  <SelectValue placeholder="Pick a location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setAddingNew(true); setSelectedLocation(""); }}
                data-testid="button-add-new-location"
              >
                <Plus className="w-3 h-3 mr-1" /> Add a new location
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <Input
                placeholder="Enter new location"
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                data-testid="input-new-location"
              />
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => { setAddingNew(false); setNewLocation(""); }}
                data-testid="button-pick-existing"
              >
                Pick from existing locations
              </Button>
            </div>
          )}
        </div>
      )}

      <Input
        placeholder="Your name (optional)"
        value={name}
        onChange={(e) => setName(e.target.value)}
        data-testid="input-suggestion-name"
      />

      <div className="flex gap-2">
        <Button
          onClick={() => mutation.mutate()}
          disabled={!canSubmit() || mutation.isPending}
          className="flex-1"
          data-testid="button-submit-suggestion"
        >
          Submit
        </Button>
        <Button variant="outline" onClick={() => setStep("pick-type")} data-testid="button-back-type">
          Back
        </Button>
      </div>
    </Card>
  );
}

const NavBar = () => (
  <div className="nav-header" style={{ background: "hsl(215,18%,24%)" }}>
    <div className="max-w-[500px] mx-auto w-full px-4 pt-8 pb-6 flex items-center gap-3">
      <Link href="/" className="flex items-center gap-3 flex-1" data-testid="link-home">
        <img src="/logo.png" alt="Clubb Nubb" data-testid="img-logo" className="h-9 w-auto" />
        <span className="text-xl font-bold font-serif text-white tracking-tight" data-testid="text-app-name">Clubb Nubb</span>
      </Link>
      <AppNavMenu />
    </div>
  </div>
);

function EditRunDialog({ open, run, role, onClose }: {
  open: boolean;
  run: RunWithDetails;
  role: Role;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [runName, setRunName] = useState(run.name || getDefaultRunName(run.date));
  const [time, setTime] = useState(run.startTime);
  const [location, setLocation] = useState(run.location);
  const [weatherText, setWeatherText] = useState(run.lat != null ? run.location : "");
  const [lat, setLat] = useState<number | null>(run.lat ?? null);
  const [lon, setLon] = useState<number | null>(run.lon ?? null);
  const [saveChecked, setSaveChecked] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);

  useEffect(() => {
    if (open) {
      setRunName(run.name || getDefaultRunName(run.date));
      setTime(run.startTime);
      setLocation(run.location);
      setWeatherText(run.lat != null ? run.location : "");
      setLat(run.lat ?? null);
      setLon(run.lon ?? null);
      setSaveChecked(false);
      setSavedThisSession(false);
    }
  }, [open, run]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/saved-locations", {
        displayName: location.trim(),
        lat,
        lon,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-locations"] });
      setSavedThisSession(true);
      setSaveChecked(false);
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      const password = role === "admin" ? "harper" : "daisy";
      return apiRequest("PATCH", `/api/runs/${run.id}`, {
        name: runName.trim() || null,
        startTime: time,
        location: location.trim(),
        lat,
        lon,
        password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({ title: "Run updated!", variant: "success" as any });
      onClose();
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update run", description: err.message, variant: "destructive" });
    },
  });

  const hasCoords = lat !== null && lon !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm top-[5%] translate-y-0 max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Edit Run</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label>Run Name</Label>
            <Input value={runName} onChange={(e) => setRunName(e.target.value)} data-testid="input-edit-name" />
          </div>
          <div className="space-y-1.5">
            <Label>Start Time</Label>
            <TimeSelect value={time} onChange={setTime} testId="edit-time-select" />
          </div>
          <div className="space-y-1.5">
            <Label>Location</Label>
            <LocationNameInput
              value={location}
              onChange={(text) => { setLocation(text); setSavedThisSession(false); }}
              onSelectSaved={(saved: SavedLocationItem) => {
                setLocation(saved.displayName);
                setSavedThisSession(false);
                if (saved.lat != null && saved.lon != null) {
                  setLat(saved.lat);
                  setLon(saved.lon);
                  setWeatherText(saved.displayName);
                }
              }}
              placeholder="e.g. Short Sands Beach"
              testId="input-edit-location"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-baseline gap-1">
              Weather address
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <LocationSearch
              value={weatherText}
              lat={lat}
              lon={lon}
              onChange={(text) => { setWeatherText(text); setSavedThisSession(false); }}
              onSelect={(result: LocationResult) => {
                setWeatherText(result.displayName);
                setLat(result.lat);
                setLon(result.lon);
              }}
              onClearCoords={() => { setLat(null); setLon(null); }}
              testId="input-edit-weather-address"
            />
            {hasCoords && !savedThisSession && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-location-edit"
                  checked={saveChecked}
                  onCheckedChange={(v) => {
                    setSaveChecked(!!v);
                    if (v) saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  data-testid="checkbox-save-location-edit"
                />
                <Label htmlFor="save-location-edit" className="text-[11px] text-muted-foreground cursor-pointer">
                  Save "{location || "this location"}" for everyone
                </Label>
              </div>
            )}
            {savedThisSession && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Star className="w-3 h-3 fill-current text-primary" />
                Location saved!
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => editMutation.mutate()} disabled={editMutation.isPending || !location.trim()} data-testid="button-save-edit">
            {editMutation.isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CustomRunMenu({ run, role }: { run: RunWithDetails; role: Role }) {
  const storedName = getStoredName();
  const [, navigate] = useLocation();
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { toast } = useToast();

  const checkedInRunners = run.checkins.filter(c => c.status === "running");
  const adminHasWarning = role === "admin" && checkedInRunners.length > 0;

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const password = role === "admin" ? "harper" : "daisy";
      return apiRequest("DELETE", `/api/runs/${run.id}`, { password, createdBy: storedName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({ title: "Run deleted", variant: "info" as any });
      setShowDeleteConfirm(false);
      navigate("/");
    },
    onError: (err: Error) => {
      toast({ title: "Can't delete this run", description: err.message, variant: "destructive" });
      setShowDeleteConfirm(false);
    },
  });

  if (!canEditRun(role, run.createdBy, storedName)) return null;

  const deleteDialogBody = adminHasWarning
    ? `${checkedInRunners.length === 1 ? "1 person is" : `${checkedInRunners.length} people are`} already checked in. Deleting will remove them and cannot be undone.`
    : "This will remove the run and all check-ins. This cannot be undone.";

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
            data-testid={`button-run-menu-${run.id}`}
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => setShowEdit(true)} data-testid="menu-edit-run">
            <Pencil className="w-4 h-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowDeleteConfirm(true)}
            className="text-destructive focus:text-destructive"
            data-testid="menu-delete-run"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditRunDialog open={showEdit} run={run} role={role} onClose={() => setShowEdit(false)} />

      <Dialog open={showDeleteConfirm} onOpenChange={(o) => { if (!o) setShowDeleteConfirm(false); }}>
        <DialogContent className="max-w-sm top-[20%] translate-y-0">
          <DialogHeader>
            <DialogTitle className="font-serif">Delete this run?</DialogTitle>
            <DialogDescription>{deleteDialogBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending} data-testid="button-confirm-delete">
              {deleteMutation.isPending ? "Deleting..." : "Delete Run"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function DefaultRunMenu({ run }: { run: RunWithDetails }) {
  const { toast } = useToast();

  const hideMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("PATCH", `/api/runs/${run.id}/visibility`, {
        hidden: !run.hidden,
        password: "harper",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({
        title: run.hidden ? "Run is now visible" : "Run hidden",
        description: run.hidden
          ? "This run will appear for everyone."
          : "This run is now hidden from non-admins.",
        variant: "info" as any,
      });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update visibility", description: err.message, variant: "destructive" });
    },
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="w-8 h-8 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
          data-testid={`button-run-menu-${run.id}`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => hideMutation.mutate()}
          disabled={hideMutation.isPending}
          data-testid="menu-toggle-visibility"
        >
          {run.hidden ? (
            <>
              <Eye className="w-4 h-4 mr-2" />
              Unhide Run
            </>
          ) : (
            <>
              <EyeOff className="w-4 h-4 mr-2" />
              Hide Run
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default function RunDetail() {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const storedName = getStoredName();
  const role = getStoredRole();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: runs, isLoading } = useQuery<RunWithDetails[]>({
    queryKey: ["/api/runs"],
    refetchInterval: 30000,
  });

  const runFromList = runs?.find((r) => r.id === runId || r.date === runId);
  const hasCustomCoords = !!(runFromList?.isCustom && runFromList.lat && runFromList.lon);
  const weatherKey = hasCustomCoords
    ? `/api/weather?lat=${runFromList!.lat!.toFixed(4)}&lon=${runFromList!.lon!.toFixed(4)}`
    : "/api/weather";

  const { data: weather } = useQuery<WeatherData>({
    queryKey: [weatherKey],
    refetchInterval: 60 * 60 * 1000,
    enabled: !runFromList?.isCustom || hasCustomCoords,
  });

  const run = runFromList;

  const runners = run?.checkins.filter(c => c.status === "running") ?? [];
  const skippers = run?.checkins.filter(c => c.status === "skipping") ?? [];

  const isRunning = !!storedName && runners.some(
    (c) => c.runnerName.toLowerCase() === storedName.toLowerCase()
  );
  const isSkipping = !!storedName && skippers.some(
    (c) => c.runnerName.toLowerCase() === storedName.toLowerCase()
  );
  const isCheckedIn = isRunning;

  const dayLabel = run ? formatCheckinDate(run.date) : "";

  const checkinMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/runs/${run!.id}/checkin`, { runnerName: storedName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({
        title: `You're in for ${dayLabel}!`,
        description: run ? `See you at ${run.location} · ${formatTime(run.startTime)}!` : undefined,
        variant: "success" as any,
      });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/runs/${run!.id}/skip`, { runnerName: storedName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({
        title: `Marked as skipping for ${dayLabel}`,
        description: "We'll miss you — catch you at the next one!",
        variant: "info" as any,
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/runs/${run!.id}/cancel-checkin`, { runnerName: storedName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({
        title: "Bailing? All good!",
        description: `You have been removed from ${dayLabel}'s run. We'll see you at the next one!`,
        variant: "info" as any,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-full">
        <NavBar />
        <div className="content-wrapper pb-4 space-y-4">
          <Skeleton className="h-7 w-48" />
          <Card className="p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
          </Card>
        </div>
      </div>
    );
  }

  if (!run) {
    return (
      <div className="flex flex-col min-h-full">
        <NavBar />
        <div className="content-wrapper pb-4 space-y-4">
          <h1 className="text-xl font-bold font-serif">Run not found</h1>
          <Card className="p-5 text-center space-y-2">
            <p className="text-sm text-muted-foreground">There's no run scheduled for this date.</p>
          </Card>
        </div>
      </div>
    );
  }

  const dateObj = parseISO(run.date);
  const fullDate = format(dateObj, "EEEE, MMMM d");
  const runTitle = getRunTitle(run);

  const showWeather = !run.isCustom || hasCustomCoords;

  const daily = showWeather ? getWeatherForDate(weather, run.date) : null;
  const hourly = showWeather ? getWeatherForHour(weather, run.date, run.startTime) : null;
  const weatherTemp = hourly?.temp ?? daily?.high;
  const precipChance = hourly?.precipChance ?? daily?.precipChance;
  const windSpeed = hourly?.windSpeed ?? daily?.windSpeed;
  const windDir = hourly?.windDir ?? daily?.windDir;
  const weatherCode = hourly?.code ?? daily?.code;
  const humidity = hourly?.humidity;
  const weatherSpritePos = weatherCode != null ? getWeatherSpritePos(weatherCode) : null;

  const currentIndex = runs?.findIndex(r => r.id === runId || r.date === runId) ?? -1;
  const nextRun = runs && currentIndex >= 0 && currentIndex < runs.length - 1 ? runs[currentIndex + 1] : null;

  return (
    <div className="flex flex-col min-h-full">
      <NavBar />

      <div className="content-wrapper flex-1 pb-8 space-y-3">
        <Card className="overflow-hidden" data-testid="card-run-info">
          <div className="p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-[32px] font-bold font-serif leading-tight" data-testid="text-run-date">
                  {runTitle}
                </h2>
                {run.isCustom && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#64748b] text-white" data-testid="badge-run-custom">custom</span>
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
                    {run.locationUrl && (
                      <a href={run.locationUrl} target="_blank" rel="noopener noreferrer" className="ml-0.5 inline-flex items-center text-muted-foreground/60" data-testid="link-map">
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {run.cancelled && (
                  <Badge variant="destructive" className="no-default-hover-elevate no-default-active-elevate">Cancelled</Badge>
                )}
                {run.hidden && role === "admin" && (
                  <Badge variant="secondary" className="no-default-hover-elevate no-default-active-elevate text-muted-foreground" data-testid="badge-run-hidden">Hidden</Badge>
                )}
                {run.isCustom && <CustomRunMenu run={run} role={role} />}
                {!run.isCustom && role === "admin" && <DefaultRunMenu run={run} />}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              {(weatherCode != null || windSpeed != null) ? (
                <div className="flex items-center gap-x-4 gap-y-2 flex-wrap text-sm" data-testid="detail-weather">
                  {weatherSpritePos != null && weatherTemp != null && (
                    <span className="flex items-center gap-1.5" data-testid="detail-temp">
                      <WeatherSprite row={weatherSpritePos[0]} col={weatherSpritePos[1]} size={22} />
                      <span>
                        <span className="font-medium">{weatherTemp}°F</span>
                        <span className="text-xs text-muted-foreground ml-1.5">temp</span>
                      </span>
                    </span>
                  )}
                  {humidity != null && (
                    <span className="flex items-center gap-1.5" data-testid="detail-humidity">
                      <WeatherSprite row={HUMIDITY_SPRITE[0]} col={HUMIDITY_SPRITE[1]} size={20} />
                      <span>
                        <span className="font-medium">{humidity}%</span>
                        <span className="text-xs text-muted-foreground ml-1.5">humidity</span>
                      </span>
                    </span>
                  )}
                  {windSpeed != null && windDir != null && (
                    <span className="flex items-center gap-1.5" data-testid="detail-wind">
                      <WeatherSprite row={2} col={6} size={20} />
                      <span>
                        <span className="font-medium">{windSpeed} mph {windDirToCompass(windDir)}</span>
                        <span className="text-xs text-muted-foreground ml-1.5">wind</span>
                      </span>
                    </span>
                  )}
                  {precipChance != null && (
                    <span className="flex items-center gap-1.5" data-testid="detail-precip">
                      <WeatherSprite row={1} col={3} size={20} />
                      <span>
                        <span className="font-medium">{precipChance}%</span>
                        <span className="text-xs text-muted-foreground ml-1.5">rain chance</span>
                      </span>
                    </span>
                  )}
                </div>
              ) : <div />}
              <TideChartMini date={run.date} runTime={run.startTime} size="lg" />
            </div>

            <div className="border-t border-border pt-3 space-y-3" data-testid="card-roster">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                  Running ({runners.length})
                </p>
                {runners.length === 0 ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ border: "2px dashed hsl(215 16% 47% / 0.4)" }}>
                      <UiSprite cx={PERSON_ICONS[0]} size={20} />
                    </div>
                    <span className="text-sm text-muted-foreground/60">No one yet</span>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {runners.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2" data-testid={`row-runner-${i}`}>
                        <RunnerAvatar name={c.runnerName} size="sm" />
                        <span className="text-sm font-medium">{c.runnerName}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {skippers.length > 0 && (
                <div data-testid="card-skippers">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    Skipping ({skippers.length})
                  </p>
                  <div className="space-y-1.5">
                    {skippers.map((c, i) => (
                      <div key={c.id} className="flex items-center gap-2 opacity-60" data-testid={`row-skipper-${i}`}>
                        <RunnerAvatar name={c.runnerName} size="sm" muted />
                        <span className="text-sm text-muted-foreground">{c.runnerName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {!run.cancelled && storedName && (
            <div className="px-5 pb-5">
              <div className="flex gap-2" data-testid="detail-action-buttons">
                {isRunning ? (
                  <>
                    <Button
                      className="flex-1 bg-green-700 hover:bg-green-800 text-white border-green-700"
                      disabled
                      data-testid="button-detail-checked-in"
                    >
                      <Check className="w-4 h-4 mr-1.5" />
                      You're In!
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-primary border-primary hover:bg-primary/5"
                      onClick={() => cancelMutation.mutate()}
                      disabled={cancelMutation.isPending}
                      data-testid="button-detail-bail"
                    >
                      <LogOut className="w-4 h-4 mr-1.5" />
                      Bail
                    </Button>
                  </>
                ) : isSkipping ? (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => checkinMutation.mutate()}
                      disabled={checkinMutation.isPending}
                      data-testid="button-detail-im-running"
                    >
                      I'm Running
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1 text-muted-foreground border-muted-foreground/30 opacity-60"
                      disabled
                      data-testid="button-detail-skipping"
                    >
                      Skipping
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="flex-1"
                      onClick={() => checkinMutation.mutate()}
                      disabled={checkinMutation.isPending}
                      data-testid="button-detail-checkin"
                    >
                      I'm Running
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => skipMutation.mutate()}
                      disabled={skipMutation.isPending}
                      data-testid="button-detail-im-skipping"
                    >
                      I'm Skipping
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}

          {!run.cancelled && !storedName && (
            <div className="px-5 pb-5">
              <Link href="/checkin">
                <Button className="w-full" data-testid="button-detail-checkin-new">
                  I'm Running
                </Button>
              </Link>
            </div>
          )}
        </Card>

        <div className="flex gap-2 pt-1">
          <Link href="/" className="flex-1">
            <Button variant="secondary" className="w-full" data-testid="button-go-home">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Back
            </Button>
          </Link>
          {nextRun && (
            <Link href={`/run/${nextRun.id}`} className="flex-1">
              <Button className="w-full" data-testid="button-next-run">
                {getRunTitle(nextRun)}
                <ArrowLeft className="w-4 h-4 ml-1.5 rotate-180" />
              </Button>
            </Link>
          )}
        </div>

        {/* Suggestion form disabled but functionality preserved
        <SuggestionForm runId={run.id} />
        */}
      </div>
    </div>
  );
}
