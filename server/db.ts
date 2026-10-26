import './config.js';
import pg, { type PoolClient } from 'pg';
import { readFile } from 'node:fs/promises';
export const pool = new pg.Pool({connectionString:process.env.DATABASE_URL, max:10});
export async function transaction<T>(fn:(client:PoolClient)=>Promise<T>):Promise<T>{
 const c=await pool.connect();
 try { await c.query('BEGIN'); const result=await fn(c); await c.query('COMMIT'); return result; }
 catch(e){await c.query('ROLLBACK'); throw e;} finally{c.release();}
}
export async function migrate(){
 await transaction(async c=>{
  await c.query('SELECT pg_advisory_xact_lock(772200)');
  await c.query(await readFile(new URL('./schema.sql',import.meta.url),'utf8'));
 });
}
export async function scheduleLock(c:PoolClient){await c.query('SELECT pg_advisory_xact_lock(772201)');}
export async function audit(c:PoolClient,actor:string,action:string,id:string){
 await c.query('INSERT INTO audit(actor_id,action,entity_id) VALUES($1,$2,$3)',[actor,action,id]);
}

