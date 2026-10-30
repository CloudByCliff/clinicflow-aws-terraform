import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import '../server/config.js';
import { pool } from '../server/db.js';
import { validateRuntime } from '../server/config.js';
const base=process.env.TEST_URL||'http://localhost:3000';
const suffix=randomUUID().slice(0,8), password='Fictional-test-'+randomUUID();
type Session={cookie:string;id:string;email:string};
let admin:Session, reception:Session, patient:Session, other:Session, caregiver:Session, therapist:Session;
let therapist2:string, room:string,room2:string,first:string,day:DateTime;
const created:string[]=[];
async function request(url:string,session?:Session,body?:unknown,method?:string){
 const r=await fetch(base+'/api'+url,{method:method||(body?'POST':'GET'),headers:{'X-ClinicFlow':'1',...(session?{Cookie:session.cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
 return {status:r.status,body:await r.json(),headers:r.headers};
}
async function login(email:string,pw:string):Promise<Session>{
 const r=await request('/auth/login',undefined,{email,password:pw});assert.equal(r.status,200,JSON.stringify(r.body));
 const cookie=r.headers.get('set-cookie')!.split(';')[0];
 assert.match(r.headers.get('set-cookie')!,/HttpOnly/i);assert.match(r.headers.get('set-cookie')!,/SameSite=Strict/i);
 const me=await request('/me',{cookie,id:'',email});
 return {cookie,id:me.body.id,email};
}
async function register(label:string){
 const email=label+'-'+suffix+'@clinicflow.example';
 const r=await request('/auth/register',undefined,{email,name:'Test '+label+' Example',password});assert.equal(r.status,201,JSON.stringify(r.body));
 return login(email,password);
}
function booking(hour=9,overrides:Record<string,unknown>={}){
 return {patientId:patient.id,therapistId:therapist.id,roomId:room,startsAt:day.set({hour,minute:0}).toISO(),duration:45,treatment:'Fictional integration test',channel:'patient',...overrides};
}
async function create(body:unknown,session=patient){
 const r=await request('/appointments',session,body);
 if(r.status===201)created.push(r.body.id);return r;
}
before(async()=>{
 admin=await login('admin@clinicflow.example',process.env.DEMO_PASSWORD!);
 reception=await login('reception@clinicflow.example',process.env.DEMO_PASSWORD!);
 patient=await register('patient');other=await register('other');caregiver=await register('caregiver');
 for(let i=0;i<2;i++){
  const email='therapist'+i+'-'+suffix+'@clinicflow.example';
  const r=await request('/admin/users',admin,{email,password,name:'Test Therapist '+i+' '+suffix,role:'therapist'});
  assert.equal(r.status,201);
  if(i===0)therapist=await login(email,password);else therapist2=r.body.id;
 }
 room=(await request('/admin/rooms',admin,{name:'Test room '+suffix})).body.id;
 room2=(await request('/admin/rooms',admin,{name:'Test room two '+suffix})).body.id;
 day=DateTime.now().setZone('America/New_York').plus({days:14}).startOf('day');
 while(day.weekday>5)day=day.plus({days:1});
});
after(async()=>{
 // Cancel only the appointments this suite created; retain audit evidence, never reset demo data.
 if(admin)for(const id of created)await request('/appointments/'+id+'/cancel',admin,{}).catch(()=>{});
 await pool.end();
});
test('anonymous access and cross-origin writes are denied',async()=>{
 assert.equal((await request('/appointments')).status,401);
 const r=await fetch(base+'/api/preferences',{method:'PATCH',headers:{Cookie:patient.cookie,'Content-Type':'application/json',Origin:'https://untrusted.example','X-ClinicFlow':'1'},body:JSON.stringify({consent:true,reminders:true})});
 assert.equal(r.status,403);
});
test('all four roles authenticate and patients cannot administer roles',async()=>{
 for(const s of [admin,reception,therapist,patient])assert.equal((await request('/me',s)).status,200);
 assert.equal((await request('/admin/users',patient)).status,403);
 assert.equal((await request('/admin/users',reception)).status,403);
 assert.equal((await request('/reports',therapist)).status,403);
});
test('concurrent therapist claims produce exactly one committed booking',async()=>{
 const result=await Promise.all([create(booking()),create(booking(9,{roomId:room2}))]);
 assert.deepEqual(result.map(r=>r.status).sort(),[201,409]);
 first=result.find(r=>r.status===201)!.body.id;
 const db=await pool.query("SELECT count(*)::int AS n FROM appointments WHERE therapist_id=$1 AND starts_at=$2 AND status='scheduled'",[therapist.id,day.set({hour:9}).toISO()]);
 assert.equal(db.rows[0].n,1);
});
test('concurrent room claims produce exactly one committed booking',async()=>{
 const result=await Promise.all([create(booking(10)),create(booking(10,{therapistId:therapist2}))]);
 assert.deepEqual(result.map(r=>r.status).sort(),[201,409]);
});
test('duration, adjacency, operating hours, and invalid duration are enforced',async()=>{
 assert.equal((await create(booking(11,{duration:60}))).status,201);
 assert.equal((await create(booking(11,{startsAt:day.set({hour:11,minute:45}).toISO()}))).status,409);
 assert.equal((await create(booking(12))).status,201);
 assert.equal((await create(booking(7))).status,400);
 assert.equal((await create(booking(13,{duration:0}))).status,400);
});
test('failed rescheduling preserves the old appointment; successful change moves it',async()=>{
 const old=(await pool.query('SELECT starts_at FROM appointments WHERE id=$1',[first])).rows[0].starts_at;
 assert.equal((await request('/appointments/'+first,patient,booking(11),'PUT')).status,409);
 assert.equal(+(await pool.query('SELECT starts_at FROM appointments WHERE id=$1',[first])).rows[0].starts_at,+old);
 assert.equal((await request('/appointments/'+first,patient,booking(13),'PUT')).status,200);
 assert.equal((await create(booking(9))).status,201);
});
test('cancellation releases room and therapist capacity',async()=>{
 const r=await create(booking(14));assert.equal(r.status,201);
 assert.equal((await request('/appointments/'+r.body.id+'/cancel',patient,{})).status,200);
 assert.equal((await create(booking(14))).status,201);
});
test('telephone and walk-in bookings share the schedule and conflict checks',async()=>{
 const a=await create(booking(15,{channel:'telephone',patientId:other.id}),reception);assert.equal(a.status,201);
 assert.equal(a.body.channel,'telephone');
 const b=await create(booking(16,{channel:'walk-in',patientId:other.id}),reception);assert.equal(b.status,201);
 assert.equal(b.body.channel,'walk-in');
 assert.equal((await create(booking(15),patient)).status,409);
 const view=await request('/appointments',other);assert.ok(view.body.some((r:any)=>r.id===a.body.id));
});
test('patients cannot read or cancel other patients; therapists see assigned patients only',async()=>{
 const mine=await request('/appointments',patient);
 assert.ok(mine.body.every((a:any)=>a.patient_id===patient.id));
 const r=await create(booking(17,{patientId:other.id}),reception);
 assert.equal((await request('/appointments/'+r.body.id+'/cancel',patient,{})).status,403);
 const boot=await request('/bootstrap',therapist);
 assert.ok(boot.body.patients.some((p:any)=>p.id===patient.id));
 assert.ok(!boot.body.patients.some((p:any)=>p.id===caregiver.id));
 assert.equal((await create(booking(17),therapist)).status,403);
});
test('authorized caregiver books for linked patient only and revocation takes effect',async()=>{
 assert.equal((await request('/delegations',patient,{email:caregiver.email,active:true})).status,200);
 const b=booking(9,{startsAt:day.plus({days:1}).set({hour:9}).toISO()});
 // Use the next weekday rather than assuming tomorrow is open.
 let next=day.plus({days:1});while(next.weekday>5)next=next.plus({days:1});b.startsAt=next.set({hour:9}).toISO();
 const result=await create(b,caregiver);assert.equal(result.status,201);assert.equal(result.body.channel,'caregiver');
 assert.equal((await request('/appointments/'+result.body.id+'/cancel',caregiver,{})).status,403);
 assert.equal((await create({...b,patientId:other.id},caregiver)).status,403);
 await request('/delegations',patient,{email:caregiver.email,active:false});
 assert.equal((await create({...b,startsAt:next.set({hour:10}).toISO()},caregiver)).status,403);
});
test('waitlist conversion is atomic and a failed conflict leaves entry waiting',async()=>{
 const w=await request('/waitlist',reception,{patientId:patient.id,preference:'Fictional weekday preference'});
 assert.equal(w.status,201);
 assert.equal((await create(booking(11,{waitlistId:w.body.id,channel:'waitlist'}),reception)).status,409);
 assert.equal((await pool.query('SELECT status FROM waitlist WHERE id=$1',[w.body.id])).rows[0].status,'waiting');
 const r=await create(booking(8,{waitlistId:w.body.id,channel:'waitlist'}),reception);
 assert.equal(r.status,201);
 assert.equal((await pool.query('SELECT status FROM waitlist WHERE id=$1',[w.body.id])).rows[0].status,'booked');
});
test('clinic exceptions reject bookings, and cannot silently displace existing bookings',async()=>{
 const conflict=await request('/admin/exceptions',admin,{therapistId:therapist.id,roomId:null,startsAt:day.set({hour:11}).toISO(),endsAt:day.set({hour:12}).toISO(),reason:'Test overlap'});
 assert.equal(conflict.status,409);
 let d=day.plus({days:7});
 const payload={therapistId:therapist.id,roomId:null,startsAt:d.set({hour:9}).toISO(),endsAt:d.set({hour:10}).toISO(),reason:'Fictional test leave'};
 assert.equal((await request('/admin/exceptions',admin,payload)).status,201);
 assert.equal((await create(booking(9,{startsAt:payload.startsAt}))).status,409);
 assert.equal((await create(booking(9,{startsAt:payload.startsAt,therapistId:therapist2}))).status,201);
});
test('document upload, authorized download, content validation, and isolation',async()=>{
 const upload=async(session:Session,text:string,type:string)=>{
  const form=new FormData();form.append('patientId',patient.id);form.append('file',new Blob([text],{type}),'fictional.txt');
  return fetch(base+'/api/documents',{method:'POST',headers:{Cookie:session.cookie,'X-ClinicFlow':'1'},body:form});
 };
 const r=await upload(patient,'Fictional recovery exercises only.','text/plain');assert.equal(r.status,201);
 const doc=await r.json() as any;
 const download=await fetch(base+'/api/documents/'+doc.id+'/download',{headers:{Cookie:patient.cookie}});
 assert.equal(download.status,200);assert.equal(await download.text(),'Fictional recovery exercises only.');
 assert.equal((await fetch(base+'/api/documents/'+doc.id+'/download',{headers:{Cookie:other.cookie}})).status,403);
 assert.equal((await fetch(base+'/api/documents/'+doc.id+'/download')).status,401);
 assert.equal((await upload(other,'Unrelated content','text/plain')).status,403);
 assert.equal((await upload(patient,'<script>alert(1)</script>','text/plain')).status,400);
 assert.equal((await upload(patient,'Not a PDF','application/pdf')).status,400);
 assert.equal((await upload(patient,'x'.repeat(5*1024*1024+1),'text/plain')).status,413);
});
test('reminders honor current consent, deduplicate confirmed sends and suppress stale versions',async()=>{
 await request('/preferences',patient,{consent:true,reminders:true},'PATCH');
 const current=await pool.query("SELECT r.id FROM reminders r JOIN appointments a ON a.id=r.appointment_id WHERE a.id=$1 AND r.appointment_version=a.version",[first]);
 const id=current.rows[0].id;
 await pool.query('UPDATE reminders SET due_at=now() WHERE id=$1',[id]);
 assert.equal((await request('/reminders/process',admin,{})).status,200);
 let record=(await pool.query('SELECT * FROM reminders WHERE id=$1',[id])).rows[0];
 assert.equal(record.status,'sent');
 const attempts=record.attempts;
 await request('/reminders/process',admin,{});
 record=(await pool.query('SELECT * FROM reminders WHERE id=$1',[id])).rows[0];assert.equal(record.attempts,attempts);
 await request('/preferences',patient,{consent:false,reminders:true},'PATCH');
 const otherJob=(await pool.query("SELECT r.id FROM reminders r JOIN appointments a ON a.id=r.appointment_id WHERE a.patient_id=$1 AND r.status='pending' LIMIT 1",[patient.id])).rows[0];
 await pool.query('UPDATE reminders SET due_at=now() WHERE id=$1',[otherJob.id]);
 await request('/reminders/process',admin,{});
 assert.equal((await pool.query('SELECT status FROM reminders WHERE id=$1',[otherJob.id])).rows[0].status,'suppressed');
 const old=(await pool.query("SELECT status FROM reminders WHERE appointment_id=$1 AND appointment_version=1",[first])).rows[0];assert.equal(old.status,'suppressed');
 const inbox=await fetch('http://localhost:8025/api/v1/messages').then(r=>r.json()) as any;
 assert.ok(inbox.messages.some((m:any)=>m.To.some((t:any)=>t.Address===patient.email)));
});
test('admin changes preserve future appointments and audit meaningful actions',async()=>{
 assert.equal((await request('/admin/users/'+therapist.id,admin,{active:false},'PATCH')).status,409);
 assert.equal((await request('/admin/rooms/'+room,admin,{active:false},'PATCH')).status,409);
 const audit=await request('/audit',admin);
 assert.ok(audit.body.some((a:any)=>a.action==='appointment.booked'));
 assert.ok(audit.body.some((a:any)=>a.action==='document.uploaded'));
 assert.equal((await request('/audit',patient)).status,403);
});
test('production mode refuses local shortcuts',()=>{
 const original=process.env.NODE_ENV;process.env.NODE_ENV='production';
 // Spawned runtime validation is covered separately; the configuration function must reject current production env.
 assert.throws(()=>validateRuntime(),/Production|production|Cloud adapters/);
 process.env.NODE_ENV=original;
});
test('logout invalidates the server session',async()=>{
 await request('/auth/logout',caregiver,{});
 assert.equal((await request('/me',caregiver)).status,401);
});

