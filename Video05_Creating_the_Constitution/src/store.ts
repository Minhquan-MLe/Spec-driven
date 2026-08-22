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

export function createAilment(input: {
  agentId: string
  category: Category
  title: string
  description: string
}): Ailment {
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

export function listAilments(): Ailment[] {
  return [...ailments].reverse()
}

export function getAilment(id: number): Ailment | undefined {
  return ailments.find((a) => a.id === id)
}

export function listTherapies(): Therapy[] {
  return therapies
}

export function getTherapy(id: number): Therapy | undefined {
  return therapies.find((t) => t.id === id)
}

export function therapiesForAilment(ailmentId: number): Therapy[] | undefined {
  const ailment = getAilment(ailmentId)
  if (!ailment) return undefined
  return therapies.filter((t) => t.categories.includes(ailment.category))
}

export function listAvailableSlots(): Slot[] {
  return slots.filter((s) => !s.taken)
}

export function getSlot(id: number): Slot | undefined {
  return slots.find((s) => s.id === id)
}

export type CreateAppointmentResult =
  | { ok: true; appointment: Appointment }
  | { ok: false; reason: 'therapy_not_found' | 'slot_not_found' | 'slot_taken' }

export function createAppointment(input: {
  agentId: string
  therapyId: number
  slotId: number
}): CreateAppointmentResult {
  const therapy = getTherapy(input.therapyId)
  if (!therapy) return { ok: false, reason: 'therapy_not_found' }

  const slot = getSlot(input.slotId)
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

export function listAppointments(): Appointment[] {
  return [...appointments].reverse()
}
