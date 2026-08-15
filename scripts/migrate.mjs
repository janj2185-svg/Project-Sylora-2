import pg from 'pg';
import { applyMigrations } from '../src/migrations.mjs';

const databaseUrl = String(process.env.DATABASE_URL || '');
if (!databaseUrl) throw new Error('DATABASE_URL_REQUIRED');

const { Pool } = pg;
const pool = new Pool({ connectionString: databaseUrl, max: 2, application_name: 'sylora-migrate' });
const client = await pool.connect();

try {
  await applyMigrations(client, { log: message => console.log(message) });
} catch (error) {
  throw error;
} finally {
  client.release();
  await pool.end();
}
