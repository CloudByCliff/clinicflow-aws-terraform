import { randomBytes, scrypt as rawScrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';
import { pool } from './db.js';
const scrypt=promisify(rawScrypt);
export type Role='administrator'|'receptionist'|'therapist'|'patient';
export type User={id:string;email:string;name:string;role:Role;active:boolean;consent:boolean;reminders:boolean};
declare global { namespace Express { interface Request { user: User; } } }
export async function hashPassword(password:string){
 const salt=randomBytes(16).toString('hex');
 const key=await scrypt(password,salt,64) as Buffer;
 return salt+':'+key.toString('hex');
}
export async function verifyPassword(password:string,stored:string){
 const [salt,hex]=stored.split(':'); if(!salt||!hex)return false;
 const key=await scrypt(password,salt,64) as Buffer;
 const expected=Buffer.from(hex,'hex');
 return expected.length===key.length && timingSafeEqual(expected,key);
}
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export const publicColumns='id,email,name,role,active,consent,reminders';
export async function authenticate(req:Request,res:Response,next:NextFunction){
 const token=req.cookies?.clinicflow;
 if(!token || typeof token!=='string'){res.status(401).json({error:'Please sign in.'});return;}
 const result=await pool.query('SELECT u.'+publicColumns.split(',').join(',u.')+' FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',[digest(token)]);
 if(!result.rowCount){res.status(401).json({error:'Your session has expired. Please sign in.'});return;}
 req.user=result.rows[0];next();
}
export function roles(...allowed:Role[]){
 return (req:Request,res:Response,next:NextFunction)=>{
  if(!allowed.includes(req.user.role)){res.status(403).json({error:'Access denied.'});return;}next();
 };
}
export function fail(status:number,message:string):never {throw Object.assign(new Error(message),{status});}

