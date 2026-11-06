import { Button } from "@/components/ui/button";

const DAYS = [
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
  { label: "Sun", value: 0 },
];

interface DaySelectorProps {
  selected: number[];
  onChange: (days: number[]) => void;
}

export function DaySelector({ selected, onChange }: DaySelectorProps) {
  function toggle(day: number) {
    if (selected.includes(day)) {
      onChange(selected.filter((d) => d !== day));
    } else {
      onChange([...selected, day]);
    }
  }

  return (
    <div className="flex flex-wrap gap-2" data-testid="day-selector">
      {DAYS.map((day) => {
        const isSelected = selected.includes(day.value);
        return (
          <Button
            key={day.value}
            type="button"
            variant={isSelected ? "default" : "outline"}
            className={`min-w-[3rem] toggle-elevate ${isSelected ? "toggle-elevated" : ""}`}
            onClick={() => toggle(day.value)}
            data-testid={`button-day-${day.label.toLowerCase()}`}
          >
            {day.label}
          </Button>
        );
      })}
    </div>
  );
}
