import { WEEKDAYS } from "@/lib/format";
import type { WeekHours } from "@/lib/types";
import { Input } from "./ui";

export function HoursEditor({ value, onChange }: { value: WeekHours; onChange: (v: WeekHours) => void }) {
  const set = (day: number, patch: Partial<NonNullable<WeekHours[string]>>) =>
    onChange({ ...value, [day]: { open: "09:00", close: "19:00", ...value[day], ...patch } });

  return (
    <div className="space-y-2">
      {WEEKDAYS.map((name, day) => {
        const h = value[day] ?? { closed: true };
        return (
          <div key={day} className="grid grid-cols-[90px_1fr] items-center gap-3 sm:grid-cols-[110px_auto_1fr]">
            <span className="text-sm font-medium">{name}</span>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" className="accent-[hsl(var(--primary))]" checked={!h.closed} onChange={(e) => set(day, { closed: !e.target.checked })} />
              Aberto
            </label>
            {!h.closed && (
              <div className="col-span-2 flex items-center gap-2 sm:col-span-1">
                <Input type="time" value={h.open ?? ""} onChange={(e) => set(day, { open: e.target.value })} className="h-9" />
                <span className="text-muted-foreground">às</span>
                <Input type="time" value={h.close ?? ""} onChange={(e) => set(day, { close: e.target.value })} className="h-9" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
