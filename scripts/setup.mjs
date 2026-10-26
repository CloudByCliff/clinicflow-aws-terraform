import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
if (existsSync('.env')) { console.log('Existing .env preserved. Local credentials are in .local/access.txt.'); }
else {
  const db = randomBytes(24).toString('hex'), password = randomBytes(18).toString('base64url');
  mkdirSync('.local', { recursive: true });
  writeFileSync('.env', `DB_PASSWORD=${db}\nDEMO_PASSWORD=${password}\nDATABASE_URL=postgres://clinicflow:${db}@127.0.0.1:5434/clinicflow\nAPP_MODE=local\nNODE_ENV=development\nAPP_ORIGIN=http://localhost:3000\nSMTP_HOST=127.0.0.1\nSMTP_PORT=1025\n`, { mode: 0o600 });
  writeFileSync('.local/access.txt', `LOCAL FICTIONAL DEMO ONLY\nPassword for seeded accounts: ${password}\n\nadmin@clinicflow.example\nreception@clinicflow.example\ntherapist@clinicflow.example\npatient@clinicflow.example\ncaregiver@clinicflow.example\n\nApplication: http://localhost:3000\nCaptured email: http://localhost:8025\n`, { mode: 0o600 });
  console.log('Created ignored local configuration. Credentials: .local/access.txt');
}
