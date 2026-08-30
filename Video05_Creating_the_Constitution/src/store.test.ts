import { beforeEach, describe, expect, it, vi } from 'vitest'

// store.ts is now a thin async wrapper around the PostgreSQL repository
// (src/db/repository/) — the business rules that used to live here
// directly (category matching, slot-taken rejection, etc.) now live in
// the repository instead, and are covered by its own integration tests
// (src/db/repository/*.integration.test.ts, run via `npm run test:db`
// against a real database). What's left to verify at this level is
// store.ts's own remaining responsibility: does it correctly delegate
// to the repository with the shared pool, pass results through
// unchanged, and guard against a non-integer id before ever reaching
// the database? So the repository modules (and the connection module)
// are mocked here — this file never touches Postgres.

vi.mock('./db', () => ({ getPool: vi.fn(() => 'FAKE_POOL') }))
vi.mock('./db/repository/ailments')
vi.mock('./db/repository/appointments')
vi.mock('./db/repository/slots')
vi.mock('./db/repository/therapies')

import * as ailmentsRepo from './db/repository/ailments'
import * as appointmentsRepo from './db/repository/appointments'
import * as slotsRepo from './db/repository/slots'
import * as therapiesRepo from './db/repository/therapies'
import {
  createAilment,
  createAppointment,
  getAilment,
  getSlot,
  getTherapy,
  listAilments,
  listAppointments,
  listAvailableSlots,
  listTherapies,
  therapiesForAilment,
} from './store'

const FAKE_AILMENT = {
  id: 1,
  agentId: 'agent-1',
  category: 'auth' as const,
  title: 'Token expired',
  description: 'd',
  status: 'open' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const FAKE_THERAPY = { id: 1, name: 'Credential Refresh Clinic', description: 'd', categories: ['auth'] }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createAilment', () => {
  it('delegates to the repository using the shared pool', async () => {
    vi.mocked(ailmentsRepo.createAilment).mockResolvedValue(FAKE_AILMENT)

    const input = { agentId: 'agent-1', category: 'auth' as const, title: 't', description: 'd' }
    const result = await createAilment(input)

    expect(result).toBe(FAKE_AILMENT)
    expect(ailmentsRepo.createAilment).toHaveBeenCalledWith('FAKE_POOL', input)
  })
})

describe('listAilments', () => {
  it('returns whatever the repository returns', async () => {
    vi.mocked(ailmentsRepo.listAilments).mockResolvedValue([FAKE_AILMENT])
    await expect(listAilments()).resolves.toEqual([FAKE_AILMENT])
    expect(ailmentsRepo.listAilments).toHaveBeenCalledWith('FAKE_POOL')
  })
})

describe('getAilment', () => {
  it('delegates to the repository for a valid integer id', async () => {
    vi.mocked(ailmentsRepo.getAilment).mockResolvedValue(FAKE_AILMENT)
    await expect(getAilment(1)).resolves.toBe(FAKE_AILMENT)
    expect(ailmentsRepo.getAilment).toHaveBeenCalledWith('FAKE_POOL', 1)
  })

  it('returns undefined without querying the repository for a non-integer id (e.g. NaN from a bad route param)', async () => {
    await expect(getAilment(Number('not-a-number'))).resolves.toBeUndefined()
    expect(ailmentsRepo.getAilment).not.toHaveBeenCalled()
  })
})

describe('therapiesForAilment', () => {
  it('delegates to the repository for a valid integer id', async () => {
    vi.mocked(ailmentsRepo.therapiesForAilment).mockResolvedValue([FAKE_THERAPY])
    await expect(therapiesForAilment(1)).resolves.toEqual([FAKE_THERAPY])
    expect(ailmentsRepo.therapiesForAilment).toHaveBeenCalledWith('FAKE_POOL', 1)
  })

  it('returns undefined without querying the repository for a non-integer id', async () => {
    await expect(therapiesForAilment(NaN)).resolves.toBeUndefined()
    expect(ailmentsRepo.therapiesForAilment).not.toHaveBeenCalled()
  })
})

describe('listTherapies / getTherapy', () => {
  it('listTherapies delegates to the repository', async () => {
    vi.mocked(therapiesRepo.listTherapies).mockResolvedValue([FAKE_THERAPY])
    await expect(listTherapies()).resolves.toEqual([FAKE_THERAPY])
    expect(therapiesRepo.listTherapies).toHaveBeenCalledWith('FAKE_POOL')
  })

  it('getTherapy returns undefined for a non-integer id without querying the repository', async () => {
    await expect(getTherapy(NaN)).resolves.toBeUndefined()
    expect(therapiesRepo.getTherapy).not.toHaveBeenCalled()
  })
})

describe('listAvailableSlots / getSlot', () => {
  it('listAvailableSlots delegates to the repository', async () => {
    const fakeSlot = { id: 1, timeSlot: '2026-01-02T00:00:00.000Z', taken: false }
    vi.mocked(slotsRepo.listAvailableSlots).mockResolvedValue([fakeSlot])
    await expect(listAvailableSlots()).resolves.toEqual([fakeSlot])
    expect(slotsRepo.listAvailableSlots).toHaveBeenCalledWith('FAKE_POOL')
  })

  it('getSlot returns undefined for a non-integer id without querying the repository', async () => {
    await expect(getSlot(NaN)).resolves.toBeUndefined()
    expect(slotsRepo.getSlot).not.toHaveBeenCalled()
  })
})

describe('createAppointment', () => {
  it('passes through a successful result from the repository', async () => {
    const appointment = { id: 1, agentId: 'agent-1', therapyId: 1, slotId: 1, createdAt: '2026-01-01T00:00:00.000Z' }
    vi.mocked(appointmentsRepo.createAppointment).mockResolvedValue({ ok: true, appointment })

    const input = { agentId: 'agent-1', therapyId: 1, slotId: 1 }
    const result = await createAppointment(input)

    expect(result).toEqual({ ok: true, appointment })
    expect(appointmentsRepo.createAppointment).toHaveBeenCalledWith('FAKE_POOL', input)
  })

  it.each([
    ['therapy_not_found' as const],
    ['slot_not_found' as const],
    ['slot_taken' as const],
  ])('passes through a %s rejection from the repository unchanged', async (reason) => {
    vi.mocked(appointmentsRepo.createAppointment).mockResolvedValue({ ok: false, reason })

    const result = await createAppointment({ agentId: 'agent-1', therapyId: 1, slotId: 1 })

    expect(result).toEqual({ ok: false, reason })
  })
})

describe('listAppointments', () => {
  it('delegates to the repository', async () => {
    const appointment = { id: 1, agentId: 'agent-1', therapyId: 1, slotId: 1, createdAt: '2026-01-01T00:00:00.000Z' }
    vi.mocked(appointmentsRepo.listAppointments).mockResolvedValue([appointment])
    await expect(listAppointments()).resolves.toEqual([appointment])
    expect(appointmentsRepo.listAppointments).toHaveBeenCalledWith('FAKE_POOL')
  })
})
