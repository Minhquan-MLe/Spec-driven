// Manual Vitest mock for '../store' / './store'. Activated only in test
// files that call `vi.mock('./store')` (or `vi.mock('../store')`) —
// never loaded by production code, which always imports the real
// ./store.ts (backed by PostgreSQL).
//
// This is a straight async port of what src/store.ts's in-memory
// implementation looked like before this phase — same seed data, same
// logic — so existing route/app tests exercise real HTTP request
// handling, validation, and idempotency without needing a live
// database. Each test *file* gets its own fresh copy (Vitest isolates
// modules per file), matching how the old store behaved across a test
// run.

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

function seed(): void {
  const seedTherapies: Array<Omit<Therapy, 'id'>> = [
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
  for (const t of seedTherapies) {
    therapies.push({ id: therapies.length + 1, ...t })
  }

  const day = 24 * 60 * 60 * 1000
  const now = Date.now()
  for (let i = 1; i <= 8; i++) {
    slots.push({
      id: slots.length + 1,
      timeSlot: new Date(now + i * day).toISOString(),
      taken: false,
    })
  }
}

seed()

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
