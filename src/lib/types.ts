export type DayHours = { open?: string; close?: string; closed?: boolean };
/** Chave = dia da semana (0 = domingo). */
export type WeekHours = Partial<Record<string, DayHours>>;

export type AppointmentStatus = "scheduled" | "confirmed" | "cancelled" | "completed";

export interface Barbershop {
  id: string;
  owner_id: string;
  name: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  opening_hours: WeekHours;
}

export interface Barber {
  id: string;
  barbershop_id: string;
  name: string;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  working_hours: WeekHours;
  is_active: boolean;
}

export interface Service {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  duration: number;
  price: number;
  category: string | null;
  is_active: boolean;
}

export interface Client {
  id: string;
  barbershop_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  barbershop_id: string;
  name: string;
  description: string | null;
  price: number;
  stock: number | null;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
}

export interface Appointment {
  id: string;
  barbershop_id: string;
  barber_id: string;
  service_id: string;
  client_id: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export interface BookingPage {
  barbershop: Pick<Barbershop, "id" | "name" | "logo_url" | "address" | "phone" | "opening_hours">;
  barbers: Pick<Barber, "id" | "name" | "avatar_url" | "working_hours">[];
  services: Pick<Service, "id" | "name" | "description" | "duration" | "price" | "category">[];
  /** Ausente enquanto a migration de produtos não tiver sido aplicada. */
  products?: (Pick<Product, "id" | "name" | "description" | "price" | "image_url" | "category"> & { in_stock: boolean })[];
}
