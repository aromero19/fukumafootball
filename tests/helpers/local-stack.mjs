import { execFile } from 'node:child_process';
import { readFile, access } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { promisify } from 'node:util';
import pg from 'pg';

const execute = promisify(execFile);
export async function localStack() {
  const root = resolve('.supabase-integration');
  const workdir = resolve(process.env.FUKUMA_INTEGRATION_WORKDIR ?? '.');
  const child = relative(root, workdir);
  if (!child || child.startsWith('..') || isAbsolute(child)) throw new Error('Integration workspace required');
  const config = await readFile(resolve(workdir, 'supabase/config.toml'), 'utf8');
  if (!/^project_id = "fukuma-it-[a-f0-9]+"$/m.test(config)) throw new Error('Not an isolated test project');
  try {
    await access(resolve(workdir, 'supabase/.temp/project-ref'));
    throw new Error('Linked projects are forbidden in integration tests');
  } catch (error) { if (error.code !== 'ENOENT') throw error; }
  let stdout;
  try {
    ({ stdout } = await execute(process.execPath, [resolve('node_modules/supabase/dist/supabase.js'),
      'status', '--workdir', workdir, '-o', 'json'], { maxBuffer: 4 * 1024 * 1024 }));
  } catch { throw new Error('Local Supabase status unavailable; start the isolated test stack'); }
  // Capture credentials in memory only. Never log CLI status or connection errors.
  let status;
  try { status = JSON.parse(stdout); } catch { throw new Error('Local status did not return JSON'); }
  const values = new Map();
  function collect(value) {
    for (const [key, item] of Object.entries(value)) {
      if (item && typeof item === 'object') collect(item);
      else values.set(key.toUpperCase(), item);
    }
  }
  collect(status);
  let dbUrl, apiUrl;
  try {
    dbUrl = new URL(values.get('DB_URL'));
    apiUrl = new URL(values.get('API_URL'));
  } catch { throw new Error('Local status did not include valid database/API URLs'); }
  if (dbUrl.hostname !== '127.0.0.1' || dbUrl.port !== '55322' || dbUrl.pathname !== '/postgres'
      || !['postgres:', 'postgresql:'].includes(dbUrl.protocol)
      || apiUrl.hostname !== '127.0.0.1' || apiUrl.port !== '55321' || apiUrl.protocol !== 'http:') {
    throw new Error('Integration tests only allow the dedicated loopback ports');
  }
  return {
    apiUrl: apiUrl.origin,
    anonKey: values.get('ANON_KEY'),
    serviceKey: values.get('SERVICE_ROLE_KEY'),
    async connect() {
      const client = new pg.Client({ connectionString: dbUrl.href, connectionTimeoutMillis: 5000,
        statement_timeout: 15000,
        // Fixtures are small integers. Do not reuse this parser for application bigint IDs.
        types: { getTypeParser: (oid, format) => oid === 20 ? Number : pg.types.getTypeParser(oid, format) } });
      try { await client.connect(); } catch { throw new Error('Cannot connect to isolated local PostgreSQL'); }
      return client;
    },
  };
}
