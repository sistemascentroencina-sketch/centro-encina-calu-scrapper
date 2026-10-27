export type ProfessionalKind = 'clinical' | 'admission';

export type AppointmentType = 'admission' | 'session';

export type AppointmentStatus =
  | 'pending_confirm'
  | 'paid'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface Patient {
  id: string;
  dni: string;
  firstName: string;
  lastName: string;
  timeZone: string;
  assignedProfessionalId: string | null;
  isFirstVisit: boolean;
  phone?: string;
  email?: string;
}

export interface Professional {
  id: string;
  displayName: string;
  title: string;
  focus: string;
  kind: ProfessionalKind;
  /** true si tiene franjas workTimes (puede generar slots) */
  bookable: boolean;
}

export interface Centre {
  id: string;
  name: string;
}

export interface Slot {
  id: string;
  startsAt: string;
  endsAt: string;
  localLabel: string;
  dateLocal: string;
}

export interface Appointment {
  id: string;
  patientId: string;
  professionalId: string;
  professionalName: string;
  type: AppointmentType;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  timeZone: string;
  paymentRef?: string;
}

export interface Service {
  id: string;
  name: string;
  durationMinutes: number;
  available: boolean;
  type?: string;
}
