import { server } from '../server.mjs';
import { initSupabaseSync } from '../db.mjs';

let synced = false;

export default async function handler(req, res) {
  if (!synced) {
    await initSupabaseSync().catch(err => console.error('Supabase initial sync error:', err));
    synced = true;
  }
  return server.emit('request', req, res);
}
