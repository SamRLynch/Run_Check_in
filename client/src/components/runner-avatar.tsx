import { Avatar, AvatarFallback } from "@/components/ui/avatar";

const COLORS = [
  "bg-slate-100 text-slate-600",
  "bg-sky-100 text-sky-700",
  "bg-indigo-100 text-indigo-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-emerald-100 text-emerald-700",
  "bg-rose-100 text-rose-700",
  "bg-amber-100 text-amber-700",
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function getColorIndex(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % COLORS.length;
}

interface RunnerAvatarProps {
  name: string;
  size?: "sm" | "md";
  muted?: boolean;
}

export function RunnerAvatar({ name, size = "md", muted = false }: RunnerAvatarProps) {
  const initials = getInitials(name);
  const colorClass = muted
    ? "bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500"
    : COLORS[getColorIndex(name)];
  const sizeClass = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <Avatar
      className={`${sizeClass} ${muted ? "opacity-60" : ""}`}
      data-testid={`avatar-${name.replace(/\s/g, "-")}`}
    >
      <AvatarFallback className={`${colorClass} font-semibold`}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}

interface RunnerAvatarStackProps {
  names: string[];
  max?: number;
  muted?: boolean;
}

export function RunnerAvatarStack({ names, max = 6, muted = false }: RunnerAvatarStackProps) {
  const visible = names.slice(0, max);
  const remaining = names.length - max;

  return (
    <div className="flex items-center" data-testid={muted ? "avatar-stack-muted" : "avatar-stack"}>
      <div className="flex -space-x-1.5">
        {visible.map((name) => (
          <RunnerAvatar key={name} name={name} size="sm" muted={muted} />
        ))}
      </div>
      {remaining > 0 && (
        <span className={`text-xs ml-2 ${muted ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
          +{remaining}
        </span>
      )}
    </div>
  );
}
