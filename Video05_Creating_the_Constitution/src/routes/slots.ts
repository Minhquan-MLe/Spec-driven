import { Hono } from 'hono'
import { listAvailableSlots } from '../store'

export const slots = new Hono()

slots.get('/', (c) => c.json(listAvailableSlots()))
