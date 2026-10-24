import { addMinutes, isBefore, set } from "date-fns";
import type { DayHours, WeekHours } from "./types";

export const DEFAULT_HOURS: WeekHours = {
  "0": { closed: true },
  "1": { open: "09:00", close: "19:00" },
  "2": { open: "09:00", close: "19:00" },
  "3": { open: "09:00", close: "19:00" },
  "4": { open: "09:00", close: "19:00" },
  "5": { open: "09:00", close: "19:00" },
  "6": { open: "08:00", close: "17:00" },
};

/** Horário do barbeiro no dia; se ele não tiver um próprio, vale o da barbearia. */
export function hoursFor(day: Date, shop: WeekHours, barber?: WeekHours): DayHours | null {
  const key = String(day.getDay());
  const h = (barber && barber[key]) || shop[key];
  if (!h || h.closed || !h.open || !h.close) return null;
  return h;
}

const at = (day: Date, hhmm: string) => {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return set(day, { hours, minutes, seconds: 0, milliseconds: 0 });
};

export function dayBounds(day: Date) {
  const start = set(day, { hours: 0, minutes: 0, seconds: 0, milliseconds: 0 });
  return { from: start, to: addMinutes(start, 24 * 60) };
}

/** Horários livres para um serviço de `serviceMinutes`, em passos de `step` minutos. */
export function freeSlots(
  day: Date,
  hours: DayHours,
  serviceMinutes: number,
  busy: { start_time: string; end_time: string }[],
  step = 30,
  now = new Date(),
) {
  const slots: Date[] = [];
  const close = at(day, hours.close!);
  const ranges = busy.map((b) => [new Date(b.start_time), new Date(b.end_time)] as const);
  for (let t = at(day, hours.open!); !isBefore(close, addMinutes(t, serviceMinutes)); t = addMinutes(t, step)) {
    const end = addMinutes(t, serviceMinutes);
    if (isBefore(t, now)) continue;
    if (ranges.some(([s, e]) => t < e && end > s)) continue;
    slots.push(t);
  }
  return slots;
}

/** Os 7 dias (0 = domingo) com o horário que vale para o barbeiro, ou null se folga. */
export function weekSchedule(shop: WeekHours, barber?: WeekHours) {
  return Array.from({ length: 7 }, (_, i) => {
    const h = (barber && barber[String(i)]) || shop[String(i)];
    return h && !h.closed && h.open && h.close ? h : null;
  });
}
