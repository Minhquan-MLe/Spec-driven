// Manual Vitest mock for '../store' / './store'. Activated only in test
// files that call `vi.mock('./store')` (or `vi.mock('../store')`) —
// never loaded by production code, which always imports the real
// ./store.ts (backed by PostgreSQL).
//
// This is a straight async port of what src/store.ts's in-memory
// implementation looked like before this phase — same seed data (5
// therapies, 8 slots, matching the real db:seed), same logic — so
// existing route/app tests exercise real HTTP request handling,
// validation, and idempotency without needing a live database.
//
// IMPORTANT: Vitest isolates modules *per file*, not per test. Every
// `it()` in a file shares this same module state unless something
// resets it. Call resetMockStore() (below) in a `beforeEach` in every
// test file that mocks ../store, so one test can never observe data,
// booked slots, or id numbering left behind by another.

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

const ailments: Ailment[] = []
const therapies: Therapy[] = []
const slots: Slot[] = []
const appointments: Appointment[] = []

const SEED_THERAPIES: Array<Omit<Therapy, 'id'>> = [
  {
    name: 'Timeout Tuning Session',
    description:
      'Diagnose and adjust retry/backoff settings for slow-running tasks.',
    categories: ['performance'],
  },
  {
    name: 'Failover Rehearsal',
    description: 'Practice graceful degradation and failover paths.',
    categories: ['reliability'],
  },
  {
    name: 'API Contract Alignment',
    description:
      'Resolve mismatched request/response shapes between services.',
    categories: ['integration'],
  },
  {
    name: 'Credential Refresh Clinic',
    description: 'Fix expired tokens and misconfigured auth scopes.',
    categories: ['auth'],
  },
  {
    name: 'General Checkup',
    description: "A catch-all consultation for anything that doesn't fit elsewhere.",
    categories: ['other'],
  },
]

// Matches the real db:seed script exactly (5 therapies, 8 future
// slots) — this mock's row counts are not a place to paper over
// cross-test slot contention; resetMockStore() below is.
const SLOT_COUNT = 8

function reseedTherapiesAndSlots(): void {
  therapies.length = 0
  for (const t of SEED_THERAPIES) {
    therapies.push({ id: therapies.length + 1, ...t })
  }

  slots.length = 0
  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  for (let i = 1; i <= SLOT_COUNT; i++) {
    slots.push({
      id: slots.length + 1,
      timeSlot: new Date(now + i * day).toISOString(),
      taken: false,
    })
  }
}

reseedTherapiesAndSlots()

/**
 * Test-only: restores this mock to its exact initial state.
 *   - ailments and appointments are emptied — since both modules'
 *     "next id" is just `array.length + 1`, this also resets id
 *     numbering back to starting at 1, with no separate counter to
 *     track.
 *   - therapies and slots are cleared and re-seeded from scratch (5
 *     therapies, 8 slots, all `taken: false`), even though nothing
 *     currently mutates therapies — defensive, so this stays correct
 *     if that ever changes.
 * Call this in a `beforeEach` in every test file that mocks ../store,
 * so no test can observe state (booked slots, created records, id
 * numbering) left behind by another.
 */
export function resetMockStore(): void {
  ailments.length = 0
  appointments.length = 0
  reseedTherapiesAndSlots()
}

export async function createAilment(input: {
  agentId: string
  category: Category
  title: string
  description: string
}): Promise<Ailment> {
  const ailment: Ailment = {
    id: ailments.length + 1,
    agentId: input.agentId,
    category: input.category,
    title: input.title,
    description: input.description,
    status: 'open',
    createdAt: new Date().toISOString(),
  }
  ailments.push(ailment)
  return ailment
}

export async function listAilments(): Promise<Ailment[]> {
  return [...ailments].reverse()
}

export async function getAilment(id: number): Promise<Ailment | undefined> {
  return ailments.find((a) => a.id === id)
}

export interface AilmentPatch {
  agentId?: string
  category?: Category
  title?: string
  description?: string
  status?: 'open' | 'resolved'
}

export async function updateAilment(id: number, patch: AilmentPatch): Promise<Ailment | undefined> {
  const ailment = ailments.find((a) => a.id === id)
  if (!ailment) return undefined
  if (patch.agentId !== undefined) ailment.agentId = patch.agentId
  if (patch.category !== undefined) ailment.category = patch.category
  if (patch.title !== undefined) ailment.title = patch.title
  if (patch.description !== undefined) ailment.description = patch.description
  if (patch.status !== undefined) ailment.status = patch.status
  return ailment
}

export async function deleteAilment(id: number): Promise<boolean> {
  const index = ailments.findIndex((a) => a.id === id)
  if (index === -1) return false
  ailments.splice(index, 1)
  return true
}

export async function listTherapies(): Promise<Therapy[]> {
  return therapies
}

export async function getTherapy(id: number): Promise<Therapy | undefined> {
  return therapies.find((t) => t.id === id)
}

export async function therapiesForAilment(ailmentId: number): Promise<Therapy[] | undefined> {
  const ailment = await getAilment(ailmentId)
  if (!ailment) return undefined
  return therapies.filter((t) => t.categories.includes(ailment.category))
}

export async function listAvailableSlots(): Promise<Slot[]> {
  return slots.filter((s) => !s.taken)
}

export async function getSlot(id: number): Promise<Slot | undefined> {
  return slots.find((s) => s.id === id)
}

export type CreateAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'therapy_not_found' | 'slot_not_found' | 'slot_taken' }

export async function createAppointment(input: {
  agentId: string
  therapyId: number
  slotId: number
}): Promise<CreateAppointmentResult> {
  const therapy = await getTherapy(input.therapyId)
  if (!therapy) return { ok: false, reason: 'therapy_not_found' }

  const slot = await getSlot(input.slotId)
  if (!slot) return { ok: false, reason: 'slot_not_found' }
  if (slot.taken) return { ok: false, reason: 'slot_taken' }

  slot.taken = true
  const appointment: Appointment = {
    id: appointments.length + 1,
    agentId: input.agentId,
    therapyId: input.therapyId,
    slotId: input.slotId,
    createdAt: new Date().toISOString(),
  }
  appointments.push(appointment)
  return { ok: true, appointment }
}

export async function listAppointments(): Promise<Appointment[]> {
  return [...appointments].reverse()
}

export async function getAppointment(id: number): Promise<Appointment | undefined> {
  return appointments.find((a) => a.id === id)
}

export interface AppointmentPatch {
  agentId?: string
  therapyId?: number
  slotId?: number
}

export type UpdateAppointmentResult =
  | { ok: true; appointment: Appointment }
  | {
      ok: false
      reason: 'appointment_not_found' | 'therapy_not_found' | 'slot_not_found' | 'slot_taken'
    }

export async function updateAppointment(
  id: number,
  patch: AppointmentPatch
): Promise<UpdateAppointmentResult> {
  const appointment = appointments.find((a) => a.id === id)
  if (!appointment) return { ok: false, reason: 'appointment_not_found' }

  if (patch.therapyId !== undefined) {
    const therapy = await getTherapy(patch.therapyId)
    if (!therapy) return { ok: false, reason: 'therapy_not_found' }
  }

  const nextSlotId = patch.slotId ?? appointment.slotId
  const slotIsChanging = nextSlotId !== appointment.slotId

  if (slotIsChanging) {
    const newSlot = slots.find((s) => s.id === nextSlotId)
    if (!newSlot) return { ok: false, reason: 'slot_not_found' }
    if (newSlot.taken) return { ok: false, reason: 'slot_taken' }

    const oldSlot = slots.find((s) => s.id === appointment.slotId)
    if (oldSlot) oldSlot.taken = false
    newSlot.taken = true
    appointment.slotId = nextSlotId
  }

  if (patch.agentId !== undefined) appointment.agentId = patch.agentId
  if (patch.therapyId !== undefined) appointment.therapyId = patch.therapyId

  return { ok: true, appointment }
}

export type DeleteAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'appointment_not_found' }

export async function deleteAppointment(id: number): Promise<DeleteAppointmentResult> {
  const index = appointments.findIndex((a) => a.id === id)
  if (index === -1) return { ok: false, reason: 'appointment_not_found' }
  const [deleted] = appointments.splice(index, 1)
  const slot = slots.find((s) => s.id === deleted.slotId)
  if (slot) slot.taken = false
  return { ok: true, appointment: deleted }
}
