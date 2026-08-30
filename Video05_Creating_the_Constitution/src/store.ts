import { getPool } from './db'
import * as ailmentsRepo from './db/repository/ailments'
import * as appointmentsRepo from './db/repository/appointments'
import * as slotsRepo from './db/repository/slots'
import * as therapiesRepo from './db/repository/therapies'

// This module is the application's data-access surface — routes and
// app.ts import domain types and data functions from here, same as
// before. What changed is what's *behind* it: every function now
// delegates to the PostgreSQL repository (src/db/repository/) via the
// shared connection pool (getPool(), src/db/index.ts) instead of
// reading/writing in-memory arrays. There is no in-memory fallback if
// Postgres is unavailable — a failed query simply rejects, and Hono's
// error handler (see app.ts) turns that into a controlled 500 response.

export const CATEGORIES = [
  'performance',
  'reliability',
  'integration',
  'auth',
  'other',
] as const

export type Category = (typeof CATEGORIES)[number]

export interface Ailment {
  id: number
  agentId: string
  category: Category
  title: string
  description: string
  status: 'open' | 'resolved'
  createdAt: string
}

export interface Therapy {
  id: number
  name: string
  description: string
  categories: Category[]
}

export interface Slot {
  id: number
  timeSlot: string
  taken: boolean
}

export interface Appointment {
  id: number
  agentId: string
  therapyId: number
  slotId: number
  createdAt: string
}

export async function createAilment(input: {
  agentId: string
  category: Category
  title: string
  description: string
}): Promise<Ailment> {
  return ailmentsRepo.createAilment(getPool(), input)
}

export async function listAilments(): Promise<Ailment[]> {
  return ailmentsRepo.listAilments(getPool())
}

/**
 * Route params arrive as `Number(c.req.param('id'))`, which is `NaN`
 * for a non-numeric id (e.g. `/api/ailments/abc`). The old in-memory
 * `.find()` quietly returned undefined for that (NaN never matches any
 * real id) — a real SQL query would instead reject with a Postgres type
 * error, turning a clean 404 into a 500. Guarding here preserves the
 * original graceful-404 behavior without special-casing it in the
 * route.
 */
export async function getAilment(id: number): Promise<Ailment | undefined> {
  if (!Number.isInteger(id)) return undefined
  return ailmentsRepo.getAilment(getPool(), id)
}

export async function listTherapies(): Promise<Therapy[]> {
  return therapiesRepo.listTherapies(getPool())
}

export async function getTherapy(id: number): Promise<Therapy | undefined> {
  if (!Number.isInteger(id)) return undefined
  return therapiesRepo.getTherapy(getPool(), id)
}

export async function therapiesForAilment(ailmentId: number): Promise<Therapy[] | undefined> {
  if (!Number.isInteger(ailmentId)) return undefined
  return ailmentsRepo.therapiesForAilment(getPool(), ailmentId)
}

export async function listAvailableSlots(): Promise<Slot[]> {
  return slotsRepo.listAvailableSlots(getPool())
}

export async function getSlot(id: number): Promise<Slot | undefined> {
  if (!Number.isInteger(id)) return undefined
  return slotsRepo.getSlot(getPool(), id)
}

export type CreateAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'therapy_not_found' | 'slot_not_found' | 'slot_taken' }

export async function createAppointment(input: {
  agentId: string
  therapyId: number
  slotId: number
}): Promise<CreateAppointmentResult> {
  // The repository's result type also covers 'appointment_not_found'
  // (relevant to update/delete, not implemented yet) — createAppointment
  // itself never returns that reason, so this narrows back to the
  // public type this module has always exposed.
  return appointmentsRepo.createAppointment(getPool(), input) as Promise<CreateAppointmentResult>
}

export async function listAppointments(): Promise<Appointment[]> {
  return appointmentsRepo.listAppointments(getPool())
}
