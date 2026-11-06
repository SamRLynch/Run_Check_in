import { useState } from "react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { AppNavMenu } from "@/components/app-nav-menu";
import { getStoredName, setStoredName } from "@/lib/identity";
import { getStoredRole, setStoredRole, getRoleFromPassword, type Role } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import { Check, LogOut } from "lucide-react";

function roleBadgeVariant(role: Role): "default" | "secondary" | "outline" {
  if (role === "admin") return "default";
  if (role === "creator") return "secondary";
  return "outline";
}

function roleLabel(role: Role) {
  if (role === "admin") return "Admin";
  if (role === "creator") return "Creator";
  return "Runner";
}

export default function Settings() {
  const { toast } = useToast();

  const [name, setName] = useState(getStoredName() || "");
  const [role, setRole] = useState<Role>(getStoredRole());
  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState("");

  function handleSaveName() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setStoredName(trimmed);
    toast({ title: "Name updated", description: `You'll appear as "${trimmed}" on runs.`, variant: "success" as any });
  }

  function handleRoleUpgrade() {
    const newRole = getRoleFromPassword(password);
    if (!newRole) {
      setPwError("Incorrect password. Try again.");
      setPassword("");
      return;
    }
    setStoredRole(newRole);
    setRole(newRole);
    setPassword("");
    setPwError("");
    toast({ title: `Logged in as ${roleLabel(newRole)}`, description: newRole === "admin" ? "You can now create, edit, and delete any run." : "You can now create and edit your own runs.", variant: "success" as any });
  }

  function handleResetRole() {
    setStoredRole("runner");
    setRole("runner");
    toast({ title: "Logged out", description: "You are now a runner.", variant: "info" as any });
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="nav-header" style={{ background: "hsl(215,18%,24%)" }} data-testid="settings-header">
        <div className="max-w-[500px] mx-auto w-full px-4 pt-8 pb-6 flex items-center gap-3">
          <Link href="/" className="flex items-center gap-3 flex-1" data-testid="link-home">
            <img src="/logo.png" alt="Clubb Nubb" className="h-9 w-auto" />
            <span className="text-xl font-bold font-serif text-white tracking-tight">Clubb Nubb</span>
          </Link>
          <AppNavMenu />
        </div>
      </div>

      <div className="content-wrapper flex-1 pb-8 space-y-6">
        <h1 className="text-[32px] font-bold font-serif leading-tight" style={{ color: "#F8FAFC" }} data-testid="text-settings-heading">
          Settings
        </h1>

        <Card className="p-5 space-y-4" data-testid="card-name">
          <div>
            <h2 className="text-base font-semibold font-serif">Display Name</h2>
            <p className="text-sm text-muted-foreground mt-0.5">This is how you appear on runs and check-ins.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="settings-name">Display Name</Label>
            <Input
              id="settings-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
              placeholder="Enter your name"
              data-testid="input-settings-name"
            />
          </div>
          <Button
            onClick={handleSaveName}
            disabled={!name.trim()}
            data-testid="button-save-name"
          >
            <Check className="w-4 h-4 mr-1.5" />
            Save Name
          </Button>
        </Card>

        <Card className="p-5 space-y-4" data-testid="card-role">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="text-base font-semibold font-serif">User Permissions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">Your current role in the group.</p>
            </div>
            <Badge variant={roleBadgeVariant(role)} className="shrink-0" data-testid="badge-role">
              {roleLabel(role)}
            </Badge>
          </div>

          <div className="pt-1 border-t border-border space-y-3">
            {role !== "admin" && (
              <>
                <p className="text-sm text-muted-foreground">
                  {role === "creator"
                    ? "Enter the admin password to upgrade your access."
                    : "Enter the creator or admin password to unlock run creation."}
                </p>
                <div className="space-y-2">
                  <Label htmlFor="settings-password">Password</Label>
                  <Input
                    id="settings-password"
                    type="password"
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setPwError(""); }}
                    onKeyDown={(e) => e.key === "Enter" && handleRoleUpgrade()}
                    placeholder="Enter password"
                    data-testid="input-settings-password"
                  />
                  {pwError && <p className="text-sm text-destructive">{pwError}</p>}
                </div>
              </>
            )}
            <div className="flex gap-2">
              {role !== "admin" && (
                <Button onClick={handleRoleUpgrade} disabled={!password} data-testid="button-upgrade-role">
                  Unlock
                </Button>
              )}
              {role !== "runner" && (
                <Button
                  variant="outline"
                  onClick={handleResetRole}
                  data-testid="button-reset-role"
                >
                  <LogOut className="w-4 h-4 mr-1.5" />
                  Sign out of {roleLabel(role)} role
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
