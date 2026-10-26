import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { z } from 'zod';
import type { PoolClient } from 'pg';
import { transaction, scheduleLock, audit } from './db.js';
import { fail, type User } from './auth.js';
export const bookingSchema=z.object({
 patientId:z.string().uuid(), therapistId:z.string().uuid(), roomId:z.string().uuid(),
 startsAt:z.string().datetime({offset:true}), duration:z.number().int().min(15).max(120),
 treatment:z.string().trim().min(1).max(80),
 channel:z.enum(['patient','telephone','walk-in','caregiver','waitlist','staff']).default('patient'),
 waitlistId:z.string().uuid().optional()
});
export async function patientAccess(c:PoolClient,user:User,patientId:string,purpose:'book'|'view'|'document'|'change'){
 if(user.id===patientId)return true;
 if(['administrator','receptionist'].includes(user.role))return purpose!=='document';
 if(user.role==='therapist' && (purpose==='view'||purpose==='document')){
  const r=await c.query("SELECT 1 FROM appointments WHERE patient_id=$1 AND therapist_id=$2 AND status='scheduled' AND ends_at>now()-interval '30 days' LIMIT 1",[patientId,user.id]);
  return !!r.rowCount;
 }
 if(purpose==='book'){
  const r=await c.query('SELECT 1 FROM delegations WHERE patient_id=$1 AND caregiver_id=$2 AND active',[patientId,user.id]);
  return !!r.rowCount;
 }
 return false;
}
export async function book(user:User,input:unknown,appointmentId?:string){
 const b=bookingSchema.parse(input);
 if(user.role==='therapist')fail(403,'Therapists cannot change the shared schedule.');
 return transaction(async c=>{
  await scheduleLock(c);
  if(!await patientAccess(c,user,b.patientId,appointmentId?'change':'book'))fail(403,'Access denied.');
  if(appointmentId){
   const existing=await c.query('SELECT * FROM appointments WHERE id=$1 FOR UPDATE',[appointmentId]);
   if(!existing.rowCount || existing.rows[0].patient_id!==b.patientId)fail(404,'Appointment unavailable.');
   if(existing.rows[0].status!=='scheduled')fail(409,'A cancelled appointment cannot be rescheduled.');
  }
  const settings=(await c.query('SELECT * FROM settings WHERE id=1')).rows[0];
  const start=DateTime.fromISO(b.startsAt,{setZone:true}).setZone(settings.timezone);
  const end=start.plus({minutes:b.duration});
  if(!start.isValid||!end.isValid || start.toMillis()<=Date.now())fail(400,'Choose a future appointment time.');
  if(!settings.weekdays.includes(start.weekday)||start.toISODate()!==end.toISODate()||
     start.hour*60+start.minute<settings.open_hour*60||end.hour*60+end.minute>settings.close_hour*60)
     fail(400,'This appointment is outside clinic operating hours.');
  const users=await c.query("SELECT id,role FROM users WHERE id=ANY($1::uuid[]) AND active",[ [b.patientId,b.therapistId] ]);
  if(!users.rows.some(u=>u.id===b.patientId&&u.role==='patient')||!users.rows.some(u=>u.id===b.therapistId&&u.role==='therapist'))fail(400,'Select an active patient and therapist.');
  if(!(await c.query('SELECT 1 FROM rooms WHERE id=$1 AND active',[b.roomId])).rowCount)fail(400,'Select an active room.');
  const overlaps=await c.query("SELECT 1 FROM exceptions WHERE starts_at<$2 AND ends_at>$1 AND ((therapist_id IS NULL AND room_id IS NULL) OR therapist_id=$3 OR room_id=$4)",[start.toISO(),end.toISO(),b.therapistId,b.roomId]);
  if(overlaps.rowCount)fail(409,'The therapist, room, or clinic is unavailable during this exception.');
  let channel=b.channel;
  if(user.role==='patient')channel=user.id===b.patientId?'patient':'caregiver';
  else if(!['telephone','walk-in','waitlist','staff'].includes(channel))channel='staff';
  const id=appointmentId||randomUUID();
  let row;
  if(appointmentId){
   row=(await c.query("UPDATE appointments SET therapist_id=$2,room_id=$3,starts_at=$4,ends_at=$5,treatment=$6,version=version+1 WHERE id=$1 RETURNING *",[id,b.therapistId,b.roomId,start.toISO(),end.toISO(),b.treatment])).rows[0];
  }else{
   row=(await c.query('INSERT INTO appointments(id,patient_id,therapist_id,room_id,starts_at,ends_at,channel,treatment,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[id,b.patientId,b.therapistId,b.roomId,start.toISO(),end.toISO(),channel,b.treatment,user.id])).rows[0];
  }
  if(b.waitlistId){
   if(!['receptionist','administrator'].includes(user.role))fail(403,'Access denied.');
   const w=await c.query("UPDATE waitlist SET status='booked',appointment_id=$1 WHERE id=$2 AND patient_id=$3 AND status='waiting' RETURNING id",[id,b.waitlistId,b.patientId]);
   if(!w.rowCount)fail(409,'Waitlist entry is no longer available.');
  }
  await c.query("UPDATE reminders SET status='suppressed',reason='Appointment changed' WHERE appointment_id=$1 AND status='pending'",[id]);
  await c.query("INSERT INTO reminders(id,appointment_id,appointment_version,due_at) VALUES($1,$2,$3,$4)",[randomUUID(),id,row.version,start.minus({hours:24}).toISO()]);
  await audit(c,user.id,appointmentId?'appointment.rescheduled':'appointment.booked',id);
  return row;
 });
}
export async function cancel(user:User,id:string){
 return transaction(async c=>{
  await scheduleLock(c);
  const r=await c.query('SELECT * FROM appointments WHERE id=$1 FOR UPDATE',[id]);
  if(!r.rowCount)fail(404,'Appointment unavailable.');
  if(user.role==='therapist'||!await patientAccess(c,user,r.rows[0].patient_id,'change'))fail(403,'Access denied.');
  await c.query("UPDATE appointments SET status='cancelled',version=version+1 WHERE id=$1 AND status='scheduled'",[id]);
  await c.query("UPDATE reminders SET status='suppressed',reason='Cancelled' WHERE appointment_id=$1 AND status='pending'",[id]);
  await audit(c,user.id,'appointment.cancelled',id);
 });
}

