import { Hono } from 'hono'
import { listTherapies } from '../store'

export const therapies = new Hono()

therapies.get('/', (c) => c.json(listTherapies()))
