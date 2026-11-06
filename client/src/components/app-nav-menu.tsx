import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Plus, Settings, Newspaper, Menu } from "lucide-react";
import { format, parseISO, addDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getStoredName } from "@/lib/identity";
import {
  LocationSearch,
  LocationNameInput,
  type LocationResult,
  type SavedLocationItem,
} from "@/components/location-search";
import {
  getStoredRole,
  setStoredRole,
  getRoleFromPassword,
  canCreateRun,
  type Role,
} from "@/lib/permissions";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function getTomorrowDate() {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

export function getDefaultRunName(dateStr: string) {
  try {
    return `${format(parseISO(dateStr), "EEEE")} Run`;
  } catch {
    return "Run";
  }
}

export function parse24h(value: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  const [h, m] = value.split(":").map(Number);
  const ampm: "AM" | "PM" = h < 12 ? "AM" : "PM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return { hour: hour12, minute: m, ampm };
}

export function to24h(hour12: number, minute: number, ampm: "AM" | "PM"): string {
  let h = hour12 % 12;
  if (ampm === "PM") h += 12;
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function TimeSelect({ value, onChange, testId }: { value: string; onChange: (v: string) => void; testId?: string }) {
  const { hour, minute, ampm } = parse24h(value);
  const hours = [5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3, 4];
  const minutes = [0, 15, 30, 45];

  return (
    <div className="flex gap-2" data-testid={testId}>
      <Select value={String(hour)} onValueChange={(v) => onChange(to24h(Number(v), minute, ampm))}>
        <SelectTrigger className="flex-1" data-testid="select-hour">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {hours.map((h) => (
            <SelectItem key={h} value={String(h)}>{h}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={String(minute)} onValueChange={(v) => onChange(to24h(hour, Number(v), ampm))}>
        <SelectTrigger className="w-20" data-testid="select-minute">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {minutes.map((m) => (
            <SelectItem key={m} value={String(m)}>{String(m).padStart(2, "0")}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={ampm} onValueChange={(v) => onChange(to24h(hour, minute, v as "AM" | "PM"))}>
        <SelectTrigger className="w-20" data-testid="select-ampm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

function PasswordDialog({ open, onClose, onSuccess }: {
  open: boolean;
  onClose: () => void;
  onSuccess: (role: Role) => void;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit() {
    const role = getRoleFromPassword(password);
    if (!role) {
      setError("Incorrect password. Try again.");
      setPassword("");
      return;
    }
    setStoredRole(role);
    setError("");
    setPassword("");
    onSuccess(role);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPassword(""); setError(""); onClose(); } }}>
      <DialogContent className="max-w-sm top-[8%] translate-y-0">
        <DialogHeader>
          <DialogTitle className="font-serif">Enter Password</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-1">
          <p className="text-sm text-muted-foreground">Enter your creator or admin password to continue.</p>
          <div className="space-y-1.5">
            <Label htmlFor="pw-input">Password</Label>
            <Input
              id="pw-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              data-testid="input-password"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setPassword(""); setError(""); onClose(); }} data-testid="button-cancel-password">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!password} data-testid="button-submit-password">Continue</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const DEFAULT_LOCATION = "Short Sands Beach";
const DEFAULT_LAT = 43.1717;
const DEFAULT_LON = -70.6117;

function CreateRunDialog({ open, onClose, role }: {
  open: boolean;
  onClose: () => void;
  role: Role;
}) {
  const { toast } = useToast();
  const tomorrow = getTomorrowDate();
  const [runName, setRunName] = useState(getDefaultRunName(tomorrow));
  const [date, setDate] = useState(tomorrow);
  const [time, setTime] = useState("05:30");
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [weatherText, setWeatherText] = useState(DEFAULT_LOCATION);
  const [lat, setLat] = useState<number | null>(DEFAULT_LAT);
  const [lon, setLon] = useState<number | null>(DEFAULT_LON);
  const [nameAutoSet, setNameAutoSet] = useState(true);
  const [saveChecked, setSaveChecked] = useState(false);
  const [savedThisSession, setSavedThisSession] = useState(false);

  useEffect(() => {
    if (nameAutoSet) setRunName(getDefaultRunName(date));
  }, [date, nameAutoSet]);

  const storedName = getStoredName();

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

  const createMutation = useMutation({
    mutationFn: async () => {
      const password = role === "admin" ? "harper" : "daisy";
      return apiRequest("POST", "/api/runs", {
        name: runName.trim() || getDefaultRunName(date),
        date,
        startTime: time,
        location: location.trim(),
        lat,
        lon,
        createdBy: storedName || "Someone",
        password,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/runs"] });
      toast({ title: "Run created!", description: `${runName} has been added to the schedule.`, variant: "success" as any });
      onClose();
      setDate(tomorrow);
      setTime("05:30");
      setLocation(DEFAULT_LOCATION);
      setWeatherText(DEFAULT_LOCATION);
      setLat(DEFAULT_LAT);
      setLon(DEFAULT_LON);
      setRunName(getDefaultRunName(tomorrow));
      setNameAutoSet(true);
      setSaveChecked(false);
      setSavedThisSession(false);
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create run", description: err.message, variant: "destructive" });
    },
  });

  const hasCoords = lat !== null && lon !== null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-sm top-[5%] translate-y-0 max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif">Create a Run</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-1">
          <div className="space-y-1.5">
            <Label htmlFor="run-name">Run Name</Label>
            <Input
              id="run-name"
              value={runName}
              onChange={(e) => { setRunName(e.target.value); setNameAutoSet(false); }}
              placeholder="Monday Run"
              data-testid="input-run-name"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="run-date">Date</Label>
            <Input
              id="run-date"
              type="date"
              value={date}
              min={format(new Date(), "yyyy-MM-dd")}
              onChange={(e) => setDate(e.target.value)}
              data-testid="input-run-date"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start Time</Label>
            <TimeSelect value={time} onChange={setTime} testId="create-time-select" />
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
              testId="input-run-location"
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
              testId="input-weather-address"
            />
            {hasCoords && !savedThisSession && (
              <div className="flex items-center gap-2">
                <Checkbox
                  id="save-location-create"
                  checked={saveChecked}
                  onCheckedChange={(v) => {
                    setSaveChecked(!!v);
                    if (v) saveMutation.mutate();
                  }}
                  disabled={saveMutation.isPending}
                  data-testid="checkbox-save-location"
                />
                <Label htmlFor="save-location-create" className="text-[11px] text-muted-foreground cursor-pointer">
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
          {!storedName && (
            <p className="text-xs text-muted-foreground">Your name will show as the creator. Set your name on the home screen first.</p>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} data-testid="button-cancel-create">Cancel</Button>
          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || !date || !time || !location.trim()}
            data-testid="button-submit-create"
          >
            {createMutation.isPending ? "Creating..." : "Create Run"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


export function AppNavMenu({ onRoleChange }: { onRoleChange?: (role: Role) => void } = {}) {
  const [, navigate] = useLocation();
  const [role, setRoleState] = useState<Role>(getStoredRole());
  const [showPassword, setShowPassword] = useState(false);
  const [showCreate, setShowCreate] = useState(false);

  function handleRoleChange(newRole: Role) {
    setRoleState(newRole);
    onRoleChange?.(newRole);
  }

  function handleCreateRunClick() {
    if (canCreateRun(role)) {
      setShowCreate(true);
    } else {
      setShowPassword(true);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="w-9 h-9 rounded-md bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center"
            data-testid="button-menu"
          >
            <Menu className="w-5 h-5 text-white" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={handleCreateRunClick} data-testid="menu-item-create-run">
            <Plus className="w-4 h-4 mr-2" />
            Create Run
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/settings")} data-testid="menu-item-settings">
            <Settings className="w-4 h-4 mr-2" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/whats-new")} data-testid="menu-item-whats-new">
            <Newspaper className="w-4 h-4 mr-2" />
            What's New
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <PasswordDialog
        open={showPassword}
        onClose={() => setShowPassword(false)}
        onSuccess={(newRole) => {
          handleRoleChange(newRole);
          setShowPassword(false);
          setShowCreate(true);
        }}
      />
      <CreateRunDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        role={role}
      />
    </>
  );
}
