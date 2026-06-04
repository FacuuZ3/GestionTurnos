/**
 * Tipos compartidos por el cliente.
 * Espejan los modelos del backend (Prisma) sin necesidad de un paquete shared.
 */

export type Role = 'USER' | 'ADMIN';
export type SportType = 'PADEL' | 'TENNIS' | 'FUTBOL';
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED';

export interface UserDto {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  isEmailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourtDto {
  id: string;
  name: string;
  sportType: SportType;
  description: string | null;
  isActive: boolean;
  pricePerHour: string; // Prisma Decimal → string en JSON
  createdAt: string;
  updatedAt: string;
}

export interface ReservationDto {
  id: string;
  userId: string;
  courtId: string;
  startTime: string;
  endTime: string;
  status: ReservationStatus;
  notes: string | null;
  rescheduledAt: string | null;
  court?: CourtDto;
  user?: UserDto;
  createdAt: string;
  updatedAt: string;
}

export interface AvailabilitySlot {
  start: string;
  end: string;
  isReserved: boolean;
  reservationId: string | null;
}

export interface ClubInfoDto {
  id: string;
  address: string;
  mapEmbedUrl: string | null;
  weekdayHours: string;
  weekendHours: string;
  holidayHours: string;
  services: string[];
  createdAt: string;
  updatedAt: string;
}

export interface StatsResponse {
  range: { from: string; to: string; days: number };
  totals: { confirmed: number; cancelled: number; pending: number };
  revenue: {
    total: number;
    byCourt: Array<{ courtId: string; courtName: string; hours: number; revenue: number }>;
  };
  topUsers: Array<{ userId: string; name: string; email: string; count: number }>;
  occupancy: Array<{
    courtId: string;
    courtName: string;
    hoursReserved: number;
    hoursTotal: number;
    rate: number;
  }>;
  heatmap: Array<{ dayOfWeek: number; startMinute: number; count: number }>;
}

export interface RecurringReservationDto {
  id: string;
  courtId: string;
  dayOfWeek: number;        // 0..6
  startMinute: number;      // 0..1439
  endMinute: number;        // 1..1440
  notes: string | null;
  isActive: boolean;
  court?: CourtDto;
  createdAt: string;
  updatedAt: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: UserDto;
}
