import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, scryptSync, timingSafeEqual, createCipheriv, createDecipheriv, createHash, randomUUID } from 'node:crypto';
export const ROOT = dirname(fileURLToPath(import.meta.url));
const data = resolve(process.env.DATA_DIR || (process.env.VERCEL ? '/tmp' : resolve(ROOT,'data')));
mkdirSync(data,{recursive:true});
let secret = process.env.DATA_KEY;
if (!secret) {
  if (process.env.NODE_ENV==='production' && !process.env.VERCEL) throw Error('DATA_KEY é obrigatória em produção.');
  const path = resolve(data,'encryption.key');
  if (!existsSync(path)) writeFileSync(path,randomBytes(32).toString('hex'),{mode:0o600});
  secret = readFileSync(path,'utf8').trim();
}
if (!/^[a-f0-9]{64}$/i.test(secret)) throw Error('DATA_KEY deve conter 64 caracteres hexadecimais.');
const key = Buffer.from(secret,'hex');
export const db = new DatabaseSync(resolve(data,'psicotech.sqlite'));
db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;');
db.exec(readFileSync(resolve(ROOT,'schema.sql'),'utf8'));
export const one = (sql,...args) => db.prepare(sql).get(...args);
export const all = (sql,...args) => db.prepare(sql).all(...args);
export const run = (sql,...args) => {
  const result = db.prepare(sql).run(...args);
  try { syncToSupabaseSQL(sql, args); } catch {}
  return result;
};
export const uid = () => randomUUID();
export const now = () => new Date().toISOString();
export const digest = value => createHash('sha256').update(value).digest('hex');
export function hashPassword(password) { const salt=randomBytes(16).toString('hex'); return salt+':'+scryptSync(password,salt,64).toString('hex'); }
export function verifyPassword(password,stored) { const [salt,hash]=stored.split(':'); const check=scryptSync(password,salt,64); return timingSafeEqual(Buffer.from(hash,'hex'),check); }
export function seal(value) { const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv); const body=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]); return [iv,cipher.getAuthTag(),body].map(x=>x.toString('base64')).join('.'); }
export function unseal(value) { const [iv,tag,body]=value.split('.').map(x=>Buffer.from(x,'base64')); const cipher=createDecipheriv('aes-256-gcm',key,iv); cipher.setAuthTag(tag); return JSON.parse(Buffer.concat([cipher.update(body),cipher.final()]).toString('utf8')); }
export function publicUser(u) { return {id:u.id,email:u.email,name:u.name,role:u.role,active:!!u.active,profile:unseal(u.profile),quiz:u.quiz?unseal(u.quiz):null,crp:u.crp,verified:!!u.verified,review_note:u.review_note,created:u.created}; }
export function audit(actor,action,target) { run('INSERT INTO audit(actor,action,target,created) VALUES(?,?,?,?)',actor,action,target,now()); }
export function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try {const result=fn(); db.exec('COMMIT'); return result;} catch(e) {db.exec('ROLLBACK'); throw e;} }

export async function initSupabaseSync() {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) return;
  const tables = ['users', 'settings', 'articles', 'appointments', 'likes', 'messages', 'moods', 'notes', 'reviews', 'slots', 'documents', 'tickets', 'sessions'];
  for (const t of tables) {
    try {
      const res = await fetch(sbUrl + '/rest/v1/' + t + '?select=*', {
        headers: { 'apikey': sbKey, 'Authorization': 'Bearer ' + sbKey },
        signal: AbortSignal.timeout(8000)
      });
      if (res.ok) {
        const rows = await res.json();
        for (const row of rows) {
          const cols = Object.keys(row);
          if (cols.length === 0) continue;
          const placeholders = cols.map(() => '?').join(',');
          const colNames = cols.join(',');
          const values = cols.map(c => typeof row[c] === 'boolean' ? (row[c] ? 1 : 0) : row[c]);
          db.prepare('INSERT OR REPLACE INTO ' + t + ' (' + colNames + ') VALUES (' + placeholders + ')').run(...values);
        }
      }
    } catch (e) {
      console.warn('Sync table ' + t + ' skipped:', e.message);
    }
  }
}

function syncToSupabaseSQL(sql, args) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) return;
  const headers = {
    'apikey': sbKey,
    'Authorization': 'Bearer ' + sbKey,
    'Content-Type': 'application/json'
  };
  let m = /INSERT\s+(?:OR\s+REPLACE\s+INTO|INTO)\s+([a-zA-Z0-9_]+)\s*\(([^)]+)\)\s*VALUES/i.exec(sql);
  if (m) {
    const table = m[1];
    const cols = m[2].split(',').map(c => c.trim());
    const obj = {};
    cols.forEach((c, idx) => { obj[c] = typeof args[idx] === 'boolean' ? (args[idx] ? 1 : 0) : args[idx]; });
    headers['Prefer'] = 'resolution=merge-duplicates';
    fetch(sbUrl + '/rest/v1/' + table, { method: 'POST', headers, body: JSON.stringify(obj) }).catch(e => console.warn('Supabase sync insert error:', e.message));
    return;
  }
  m = /DELETE\s+FROM\s+([a-zA-Z0-9_]+)\s+WHERE\s+([a-zA-Z0-9_]+)\s*=\s*\?/i.exec(sql);
  if (m) {
    const table = m[1], key = m[2], val = args[0];
    fetch(`${sbUrl}/rest/v1/${table}?${key}=eq.${encodeURIComponent(val)}`, { method: 'DELETE', headers }).catch(e => console.warn('Supabase sync delete error:', e.message));
    return;
  }
  m = /UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+([^W]+)\s+WHERE\s+([a-zA-Z0-9_]+)\s*=\s*\?/i.exec(sql);
  if (m) {
    const table = m[1];
    const sets = m[2].split(',').map(s => s.trim().split('=')[0].trim());
    const obj = {};
    sets.forEach((c, idx) => { obj[c] = typeof args[idx] === 'boolean' ? (args[idx] ? 1 : 0) : args[idx]; });
    const key = m[3];
    const val = args[sets.length];
    fetch(`${sbUrl}/rest/v1/${table}?${key}=eq.${encodeURIComponent(val)}`, { method: 'PATCH', headers, body: JSON.stringify(obj) }).catch(e => console.warn('Supabase sync update error:', e.message));
    return;
  }
}

export function syncToSupabase(table, row) {
  const sbUrl = process.env.SUPABASE_URL;
  const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!sbUrl || !sbKey) return;
  fetch(sbUrl + '/rest/v1/' + table, {
    method: 'POST',
    headers: {
      'apikey': sbKey,
      'Authorization': 'Bearer ' + sbKey,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    },
    body: JSON.stringify(row)
  }).catch(e => console.warn('Supabase push error:', e.message));
}
