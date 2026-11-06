import { Badge } from "@/components/ui/badge";
import { User } from "lucide-react";

interface RunnerChipProps {
  name: string;
  confirmed?: boolean;
}

export function RunnerChip({ name, confirmed = true }: RunnerChipProps) {
  return (
    <Badge
      variant={confirmed ? "default" : "secondary"}
      className={`gap-1 ${confirmed ? "bg-green-700 dark:bg-green-700 text-white" : ""}`}
      data-testid={`chip-runner-${name.replace(/\s/g, "-")}`}
    >
      <User className="w-3 h-3" />
      {name}
    </Badge>
  );
}
