import nodemailer from 'nodemailer';
import { transaction, scheduleLock, pool } from './db.js';
const transport=nodemailer.createTransport({host:process.env.SMTP_HOST||'127.0.0.1',port:Number(process.env.SMTP_PORT||1025),secure:false,connectionTimeout:5000,socketTimeout:5000});
let running=false;
export async function processReminders(){
 if(running)return {processed:0};running=true;let processed=0;
 try{
 const jobs=await pool.query("SELECT id FROM reminders WHERE status='pending' AND due_at<=now() ORDER BY due_at LIMIT 30");
 for(const job of jobs.rows){
  await transaction(async c=>{
   // Same lock as booking and consent changes prevents stale sends during a mutation.
   await scheduleLock(c);
   const r=await c.query("SELECT r.*,a.status AS appointment_status,a.version,a.starts_at,u.email,u.consent,u.reminders,u.active FROM reminders r JOIN appointments a ON a.id=r.appointment_id JOIN users u ON u.id=a.patient_id WHERE r.id=$1 FOR UPDATE OF r",[job.id]);
   const row=r.rows[0];if(!row||row.status!=='pending')return;
   if(row.appointment_status!=='scheduled'||row.version!==row.appointment_version||!row.active||!row.consent||!row.reminders||new Date(row.starts_at).getTime()<=Date.now()){
    await c.query("UPDATE reminders SET status='suppressed',reason='Cancelled, stale, past, inactive, or no consent/preference' WHERE id=$1",[row.id]);return;
   }
   // This release is local-only. SMTP is restricted to the compose mail sink or loopback.
   try{
    await transport.sendMail({from:'ClinicFlow Demo <reminders@clinicflow.example>',to:row.email,
     subject:'Your ClinicFlow appointment reminder',text:'Fictional demo appointment: '+new Date(row.starts_at).toISOString()+'. Sign in to ClinicFlow to view or change your booking.',
     messageId:'<'+row.id+'@clinicflow.example>'});
    await c.query("UPDATE reminders SET status='sent',sent_at=now(),attempts=attempts+1 WHERE id=$1",[row.id]);
   }catch(err){
    const code=(err as {code?:string}).code;
    const retryable=['ECONNREFUSED','EDNS','ECONNECTION'].includes(code||'');
    await c.query("UPDATE reminders SET attempts=attempts+1,status=$2,reason=$3,due_at=now()+interval '1 minute' WHERE id=$1",[row.id,retryable?(row.attempts>=2?'failed':'pending'):'ambiguous',retryable?'Mail sink unavailable':'Outcome uncertain; manual reconciliation required']);
   }
   processed++;
  });
 }
 return {processed};
 }finally{running=false;}
}

