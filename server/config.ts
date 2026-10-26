import { existsSync } from 'node:fs';
if (existsSync('.env')) process.loadEnvFile('.env');
export const local = process.env.APP_MODE === 'local' && process.env.NODE_ENV !== 'production';
export function validateRuntime() {
  if (!local) throw new Error('Cloud adapters are not enabled in this local release. Production startup is blocked; Cognito, S3 and AWS reminder integration must be configured and verified before deployment.');
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
}
export const config = {
 port: Number(process.env.PORT || 3000),
 origin: process.env.APP_ORIGIN || 'http://localhost:3000',
 documents: process.env.DOCUMENT_DIR || '.local/documents'
};

