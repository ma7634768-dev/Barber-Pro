import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { AppointmentStatus } from "./types";

export const brl = (value: number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const fmt = (date: Date | string, pattern: string) =>
  format(typeof date === "string" ? new Date(date) : date, pattern, { locale: ptBR });

export const duration = (minutes: number) =>
  minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${minutes % 60 ? ` ${minutes % 60}min` : ""}`;

export const STATUS_LABEL: Record<AppointmentStatus, string> = {
  scheduled: "Agendado",
  confirmed: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export const STATUS_STYLE: Record<AppointmentStatus, string> = {
  scheduled: "bg-primary/15 text-primary",
  confirmed: "bg-success/15 text-success",
  completed: "bg-muted text-muted-foreground",
  cancelled: "bg-destructive/15 text-destructive",
};

export const WEEKDAYS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

export function errorMessage(error: unknown) {
  const msg = (error as { message?: string })?.message ?? String(error);
  if (msg.includes("appointments_no_overlap")) return "Esse barbeiro já tem um horário nesse período.";
  return msg;
}
