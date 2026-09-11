import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, copyFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const workdir = resolve('.supabase-integration', randomBytes(8).toString('hex'));
const project = `fukuma-it-${randomBytes(8).toString('hex')}`;
const cli = resolve('node_modules/supabase/dist/supabase.js');
const env = { ...process.env, FUKUMA_INTEGRATION_WORKDIR: workdir };

// Credentials can occur in CLI start/status output. Keep all CLI output private.
function run(args, display = false) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(process.execPath, args, { env, stdio: display ? 'inherit' : 'pipe' });
    if (!display) { child.stdout.resume(); child.stderr.resume(); }
    child.once('error', () => reject(new Error('Unable to launch local test command')));
    child.once('exit', code => code === 0 ? resolveRun() : reject(new Error(`Local command failed (exit ${code})`)));
  });
}
await mkdir(resolve(workdir, 'supabase/migrations'), { recursive: true });
const config = (await readFile('supabase/config.toml', 'utf8'))
  .replace(/^project_id = .*$/m, `project_id = "${project}"`)
  .replace(/\b543(\d{2})\b/g, '553$1')
  .replace(/^inspector_port = 8083$/m, 'inspector_port = 8183');
await writeFile(resolve(workdir, 'supabase/config.toml'), config);
for (const file of (await readdir('supabase/migrations')).filter(f => f.endsWith('.sql'))) {
  await copyFile(resolve('supabase/migrations', file), resolve(workdir, 'supabase/migrations', file));
}
let failed = false;
try {
  console.log('Starting an isolated local Supabase stack on ports 55320–55329. First run downloads container images.');
  await run([cli, 'start', '--workdir', workdir]);
  console.log('Replaying migrations in the isolated local database.');
  await run([cli, 'db', 'reset', '--local', '--workdir', workdir, '--yes']);
  await run([cli, 'db', 'lint', '--local', '--workdir', workdir, '--level', 'warning', '--fail-on', 'warning']);
  await run(['--test', 'tests/database.test.mjs'], true);
  await run(['--test', 'tests/integration/concurrency.test.mjs'], true);
  console.log('Local Supabase integration checks passed.');
} catch (error) {
  failed = true;
  console.error(`${error.message}. Check Docker Desktop and rerun npm run test:db:integration.`);
} finally {
  console.log('Stopping only the generated integration stack.');
  try { await run([cli, 'stop', '--workdir', workdir, '--no-backup']); }
  catch { failed = true; console.error(`Could not stop integration project ${project}; inspect Docker Desktop.`); }
}
if (failed) process.exitCode = 1;
