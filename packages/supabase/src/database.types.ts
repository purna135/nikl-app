/**
 * Database types.
 *
 * PLACEHOLDER until the local database runs. Generate the real file with:
 *   pnpm db:start   (needs Docker)
 *   pnpm db:types   (writes this file from supabase/migrations)
 * After that, every `.from('table')` call in both apps is fully typed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
