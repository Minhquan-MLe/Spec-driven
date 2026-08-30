// Single import point for the whole PostgreSQL repository layer.
// Not used by src/store.ts or any route yet (that wiring is a later
// phase) — this barrel exists so that future wiring is a one-line
// import instead of five.

export * from './ailments'
export * from './appointments'
export * from './slots'
export * from './therapies'
export type { QueryExecutor } from './types'
