import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { z, ZodError } from 'zod';
import { DateTime } from 'luxon';
import { config, validateRuntime } from './config.js';
import { pool, transaction, migrate, audit, scheduleLock } from './db.js';
import { authenticate, roles, fail, hashPassword, verifyPassword, digest, publicColumns } from './auth.js';
import { book, cancel, patientAccess } from './scheduling.js';
import { seed } from './seed.js';
import { processReminders } from './reminders.js';

validateRuntime();
if(!['mail','127.0.0.1','localhost'].includes(process.env.SMTP_HOST||'127.0.0.1'))throw new Error('Local SMTP must use the mail sink.');
await migrate();await seed();await mkdir(config.documents,{recursive:true});
const dummyHash=await hashPassword(randomBytes(24).toString('hex'));
const app=express();
app.disable('x-powered-by');
app.use(helmet({contentSecurityPolicy:{directives:{"script-src":["'self'"],"style-src":["'self'"],"img-src":["'self'","data:"],"upgrade-insecure-requests":null}}}));
app.use(express.json({limit:'32kb'}),cookieParser());
app.use('/api',(_req,res,next)=>{res.set('Cache-Control','no-store');next();});
app.use('/api',(req,res,next)=>{
 if(!['GET','HEAD','OPTIONS'].includes(req.method)){
  const origin=req.get('Origin');
  if(req.get('X-ClinicFlow')!=='1'||(origin && ![config.origin,'http://127.0.0.1:3000','http://localhost:5173','http://127.0.0.1:5173'].includes(origin))){
   res.status(403).json({error:'Request origin not allowed.'});return;
  }
 }next();
});
app.get('/api/health',async(_req,res)=>{
 await pool.query('SELECT 1');res.json({status:'healthy',mode:'local',fictionalDataOnly:true});
});
app.get('/api/config',(_req,res)=>res.json({local:true,registration:true}));
const loginLimit=rateLimit({windowMs:15*60*1000,limit:40,standardHeaders:'draft-8',legacyHeaders:false,message:{error:'Too many attempts. Try again later.'}});
const credentials=z.object({email:z.string().email().max(254).transform(s=>s.toLowerCase()),password:z.string().min(12).max(128)});
app.post('/api/auth/login',loginLimit,async(req,res)=>{
 const b=credentials.parse(req.body);
 const r=await pool.query('SELECT * FROM users WHERE email=$1',[b.email]);
 const u=r.rows[0];const valid=await verifyPassword(b.password,u?.password_hash||dummyHash);
 if(!u||!u.active||!valid)fail(401,'Email or password is incorrect.');
 const token=randomBytes(32).toString('base64url');
 await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')",[digest(token),u.id]);
 res.cookie('clinicflow',token,{httpOnly:true,sameSite:'strict',secure:false,maxAge:8*3600*1000,path:'/'});
 res.json({ok:true});
});
app.post('/api/auth/register',loginLimit,async(req,res)=>{
 const b=credentials.extend({name:z.string().trim().min(2).max(80)}).parse(req.body);
 // No real recipients in this fictional local environment.
 if(!b.email.endsWith('.example'))fail(400,'Use a fictional address ending in .example.');
 const hash=await hashPassword(b.password);
 await transaction(async c=>{
  const id=randomUUID();
  await c.query("INSERT INTO users(id,email,name,role,password_hash) VALUES($1,$2,$3,'patient',$4)",[id,b.email,b.name,hash]);
  await audit(c,id,'patient.registered',id);
 });
 res.status(201).json({ok:true});
});
app.use('/api',authenticate);
app.get('/api/me',(req,res)=>res.json(req.user));
app.post('/api/auth/logout',async(req,res)=>{
 await pool.query('DELETE FROM sessions WHERE token_hash=$1',[digest(req.cookies.clinicflow)]);
 res.clearCookie('clinicflow',{path:'/'}).json({ok:true});
});
app.get('/api/bootstrap',async(req,res)=>{
 const c=await pool.connect();
 try{
  const staff=(await c.query("SELECT id,name,role,active FROM users WHERE role<>'patient' AND active ORDER BY name")).rows;
  const settings=(await c.query('SELECT * FROM settings WHERE id=1')).rows[0];
  const rooms=(await c.query('SELECT * FROM rooms ORDER BY name')).rows;
  let patients;
  if(['administrator','receptionist'].includes(req.user.role))patients=(await c.query("SELECT "+publicColumns+" FROM users WHERE role='patient' ORDER BY name")).rows;
  else if(req.user.role==='therapist')patients=(await c.query("SELECT "+publicColumns+" FROM users WHERE id IN (SELECT patient_id FROM appointments WHERE therapist_id=$1 AND status='scheduled' AND ends_at>now()-interval '30 days') ORDER BY name",[req.user.id])).rows;
  else patients=(await c.query('SELECT '+publicColumns+' FROM users WHERE id=$1 OR id IN (SELECT patient_id FROM delegations WHERE caregiver_id=$1 AND active) ORDER BY name',[req.user.id])).rows;
  res.json({staff,settings,rooms,patients});
 }finally{c.release();}
});
app.get('/api/appointments',async(req,res)=>{
 const params:unknown[]=[];let where='TRUE';
 if(req.user.role==='patient'){params.push(req.user.id);where='a.patient_id=$1';}
 if(req.user.role==='therapist'){params.push(req.user.id);where='a.therapist_id=$1';}
 const r=await pool.query('SELECT a.*,p.name AS patient_name,t.name AS therapist_name,r.name AS room_name FROM appointments a JOIN users p ON p.id=a.patient_id JOIN users t ON t.id=a.therapist_id JOIN rooms r ON r.id=a.room_id WHERE '+where+' ORDER BY a.starts_at DESC LIMIT 500',params);
 res.json(r.rows);
});
app.post('/api/appointments',async(req,res)=>res.status(201).json(await book(req.user,req.body)));
app.put('/api/appointments/:id',async(req,res)=>res.json(await book(req.user,req.body,z.string().uuid().parse(req.params.id))));
app.post('/api/appointments/:id/cancel',async(req,res)=>{await cancel(req.user,z.string().uuid().parse(req.params.id));res.json({ok:true});});
app.get('/api/availability',async(req,res)=>{
 const q=z.object({date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),therapistId:z.string().uuid(),roomId:z.string().uuid(),duration:z.coerce.number().int().min(15).max(120)}).parse(req.query);
 const settings=(await pool.query('SELECT * FROM settings WHERE id=1')).rows[0];
 const day=DateTime.fromISO(q.date,{zone:settings.timezone});
 if(!day.isValid)fail(400,'Invalid date.');
 const appointments=(await pool.query("SELECT starts_at,ends_at FROM appointments WHERE status='scheduled' AND (therapist_id=$1 OR room_id=$2) AND starts_at<$4 AND ends_at>$3",[q.therapistId,q.roomId,day.toISO(),day.plus({days:1}).toISO()])).rows;
 const exceptions=(await pool.query('SELECT starts_at,ends_at FROM exceptions WHERE (therapist_id=$1 OR room_id=$2 OR (therapist_id IS NULL AND room_id IS NULL)) AND starts_at<$4 AND ends_at>$3',[q.therapistId,q.roomId,day.toISO(),day.plus({days:1}).toISO()])).rows;
 const slots:string[]=[];
 if(settings.weekdays.includes(day.weekday)){
  for(let m=settings.open_hour*60;m+q.duration<=settings.close_hour*60;m+=15){
   const start=day.plus({minutes:m}),end=start.plus({minutes:q.duration});
   if(start.toMillis()>Date.now()&&![...appointments,...exceptions].some(a=>new Date(a.starts_at).getTime()<end.toMillis()&&new Date(a.ends_at).getTime()>start.toMillis()))slots.push(start.toISO()!);
  }
 }
 res.json({slots,timezone:settings.timezone});
});
app.patch('/api/preferences',async(req,res)=>{
 const b=z.object({consent:z.boolean(),reminders:z.boolean()}).parse(req.body);
 await transaction(async c=>{
  await scheduleLock(c);
  await c.query('UPDATE users SET consent=$2,reminders=$3 WHERE id=$1',[req.user.id,b.consent,b.reminders]);
  await audit(c,req.user.id,'preferences.changed',req.user.id);
 });res.json({ok:true});
});
app.get('/api/delegations',roles('patient'),async(req,res)=>{
 res.json((await pool.query('SELECT d.*,u.name,u.email FROM delegations d JOIN users u ON u.id=d.caregiver_id WHERE d.patient_id=$1',[req.user.id])).rows);
});
app.post('/api/delegations',roles('patient'),async(req,res)=>{
 const b=z.object({email:z.string().email(),active:z.boolean()}).parse(req.body);
 await transaction(async c=>{
  await scheduleLock(c);
  const caregiver=(await c.query("SELECT id FROM users WHERE email=$1 AND role='patient' AND active",[b.email.toLowerCase()])).rows[0];
  if(!caregiver||caregiver.id===req.user.id)fail(400,'Select another registered fictional patient account.');
  await c.query('INSERT INTO delegations(patient_id,caregiver_id,active) VALUES($1,$2,$3) ON CONFLICT(patient_id,caregiver_id) DO UPDATE SET active=$3',[req.user.id,caregiver.id,b.active]);
  await audit(c,req.user.id,b.active?'caregiver.authorized':'caregiver.revoked',caregiver.id);
 });res.json({ok:true});
});
app.post('/api/patients',roles('administrator','receptionist'),async(req,res)=>{
 const b=z.object({name:z.string().trim().min(2).max(80),email:z.string().email().max(254)}).parse(req.body);
 if(!b.email.endsWith('.example'))fail(400,'Use a fictional .example email.');
 const user=await transaction(async c=>{
  const id=randomUUID();
  const r=await c.query("INSERT INTO users(id,email,name,role) VALUES($1,$2,$3,'patient') RETURNING "+publicColumns,[id,b.email.toLowerCase(),b.name]);
  await audit(c,req.user.id,'patient.registered',id);return r.rows[0];
 });res.status(201).json(user);
});
app.get('/api/waitlist',roles('administrator','receptionist'),async(_req,res)=>res.json((await pool.query("SELECT w.*,u.name AS patient_name FROM waitlist w JOIN users u ON u.id=w.patient_id WHERE w.status='waiting' ORDER BY w.created_at")).rows));
app.post('/api/waitlist',roles('administrator','receptionist'),async(req,res)=>{
 const b=z.object({patientId:z.string().uuid(),preference:z.string().trim().min(1).max(240)}).parse(req.body);
 const row=await transaction(async c=>{
  if(!(await c.query("SELECT 1 FROM users WHERE id=$1 AND role='patient' AND active",[b.patientId])).rowCount)fail(400,'Patient unavailable.');
  const id=randomUUID();const r=await c.query('INSERT INTO waitlist(id,patient_id,preference) VALUES($1,$2,$3) RETURNING *',[id,b.patientId,b.preference]);
  await audit(c,req.user.id,'waitlist.added',id);return r.rows[0];
 });res.status(201).json(row);
});
app.patch('/api/waitlist/:id',roles('administrator','receptionist'),async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 const b=z.object({preference:z.string().trim().min(1).max(240).optional(),remove:z.boolean().optional()}).parse(req.body);
 await transaction(async c=>{
  const r=await c.query("UPDATE waitlist SET preference=COALESCE($2,preference),status=CASE WHEN $3 THEN 'removed' ELSE status END WHERE id=$1 AND status='waiting' RETURNING id",[id,b.preference,b.remove||false]);
  if(!r.rowCount)fail(404,'Entry unavailable.');await audit(c,req.user.id,'waitlist.updated',id);
 });res.json({ok:true});
});
const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:5*1024*1024,files:1}});
function fileType(buffer:Buffer){
 if(buffer.subarray(0,5).toString()==='%PDF-')return 'application/pdf';
 if(buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))return 'image/png';
 if(buffer[0]===255&&buffer[1]===216&&buffer[2]===255)return 'image/jpeg';
 if(!buffer.includes(0)&&!buffer.subarray(0,1024).toString().match(/<\s*(script|html|svg|iframe)/i))return 'text/plain';
 return null;
}
app.get('/api/documents',async(req,res)=>{
 const id=z.string().uuid().parse(req.query.patientId);
 const c=await pool.connect();
 try{if(!await patientAccess(c,req.user,id,'document'))fail(403,'Access denied.');
 res.json((await c.query('SELECT id,patient_id,name,mime,size,created_at FROM documents WHERE patient_id=$1 ORDER BY created_at DESC',[id])).rows);
 }finally{c.release();}
});
app.post('/api/documents',upload.single('file'),async(req,res)=>{
 const patientId=z.string().uuid().parse(req.body.patientId);
 if(!req.file)fail(400,'Select a file.');
 const file=req.file!,mime=fileType(file.buffer);
 if(!mime||!['application/pdf','image/png','image/jpeg','text/plain'].includes(file.mimetype)||mime!==file.mimetype)fail(400,'Upload a valid PDF, PNG, JPEG, or plain text file.');
 const result=await transaction(async c=>{
  if(!await patientAccess(c,req.user,patientId,'document'))fail(403,'Access denied.');
  const id=randomUUID(),key=randomUUID();
  await writeFile(path.join(config.documents,key),file.buffer,{flag:'wx',mode:0o600});
  await c.query('INSERT INTO documents(id,patient_id,uploader_id,name,mime,size,storage_key,sha256) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[id,patientId,req.user.id,path.basename(file.originalname).slice(0,150),mime,file.size,key,digest(file.buffer.toString('base64'))]);
  await audit(c,req.user.id,'document.uploaded',id);return {id};
 });res.status(201).json(result);
});
app.get('/api/documents/:id/download',async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);const c=await pool.connect();
 try{
  const r=await c.query('SELECT * FROM documents WHERE id=$1',[id]);const doc=r.rows[0];
  if(!doc||!await patientAccess(c,req.user,doc.patient_id,'document'))fail(403,'Access denied.');
  const bytes=await readFile(path.join(config.documents,doc.storage_key));
  res.type(doc.mime).attachment(doc.name).send(bytes);
 }finally{c.release();}
});
app.get('/api/admin/users',roles('administrator'),async(_req,res)=>res.json((await pool.query('SELECT '+publicColumns+" FROM users WHERE role<>'patient' ORDER BY name")).rows));
app.post('/api/admin/users',roles('administrator'),async(req,res)=>{
 const b=credentials.extend({name:z.string().trim().min(2).max(80),role:z.enum(['administrator','receptionist','therapist'])}).parse(req.body);
 if(!b.email.endsWith('.example'))fail(400,'Use a fictional .example email.');
 const hash=await hashPassword(b.password);
 const r=await transaction(async c=>{
  const id=randomUUID();const r=await c.query('INSERT INTO users(id,name,email,role,password_hash) VALUES($1,$2,$3,$4,$5) RETURNING '+publicColumns,[id,b.name,b.email,b.role,hash]);
  await audit(c,req.user.id,'staff.created',id);return r.rows[0];
 });res.status(201).json(r);
});
app.patch('/api/admin/users/:id',roles('administrator'),async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 const b=z.object({name:z.string().trim().min(2).max(80).optional(),role:z.enum(['administrator','receptionist','therapist']).optional(),active:z.boolean().optional()}).parse(req.body);
 await transaction(async c=>{
  await scheduleLock(c);
  if(id===req.user.id && (b.active===false || (b.role&&b.role!=='administrator')))fail(400,'You cannot deactivate or demote your own administrator account.');
  const u=(await c.query("SELECT * FROM users WHERE id=$1 AND role<>'patient'",[id])).rows[0];
  if(!u)fail(404,'Staff unavailable.');
  if((b.active===false||b.role&&b.role!=='therapist') && u.role==='therapist'){
   if((await c.query("SELECT 1 FROM appointments WHERE therapist_id=$1 AND status='scheduled' AND ends_at>now()",[id])).rowCount)fail(409,'Reschedule or cancel this therapist’s future appointments first.');
  }
  await c.query('UPDATE users SET name=COALESCE($2,name),role=COALESCE($3,role),active=COALESCE($4,active) WHERE id=$1',[id,b.name,b.role,b.active]);
  await c.query('DELETE FROM sessions WHERE user_id=$1',[id]);
  await audit(c,req.user.id,'staff.updated',id);
 });res.json({ok:true});
});
app.post('/api/admin/rooms',roles('administrator'),async(req,res)=>{
 const b=z.object({name:z.string().trim().min(2).max(80)}).parse(req.body);
 const room=await transaction(async c=>{const id=randomUUID();const r=await c.query('INSERT INTO rooms(id,name) VALUES($1,$2) RETURNING *',[id,b.name]);await audit(c,req.user.id,'room.created',id);return r.rows[0];});
 res.status(201).json(room);
});
app.patch('/api/admin/rooms/:id',roles('administrator'),async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);const b=z.object({active:z.boolean()}).parse(req.body);
 await transaction(async c=>{
  await scheduleLock(c);
  if(!b.active&&(await c.query("SELECT 1 FROM appointments WHERE room_id=$1 AND status='scheduled' AND ends_at>now()",[id])).rowCount)fail(409,'Reschedule or cancel future appointments in this room first.');
  const r=await c.query('UPDATE rooms SET active=$2 WHERE id=$1 RETURNING id',[id,b.active]);if(!r.rowCount)fail(404,'Room unavailable.');
  await audit(c,req.user.id,'room.updated',id);
 });res.json({ok:true});
});
app.put('/api/admin/settings',roles('administrator'),async(req,res)=>{
 const b=z.object({timezone:z.string().max(80),open_hour:z.number().int().min(0).max(23),close_hour:z.number().int().min(1).max(24),weekdays:z.array(z.number().int().min(1).max(7)).min(1)}).parse(req.body);
 if(b.close_hour<=b.open_hour||!DateTime.now().setZone(b.timezone).isValid)fail(400,'Invalid hours or timezone.');
 await transaction(async c=>{
  await scheduleLock(c);
  const future=(await c.query("SELECT starts_at,ends_at FROM appointments WHERE status='scheduled' AND ends_at>now()")).rows;
  if(future.some(a=>{const s=DateTime.fromJSDate(a.starts_at).setZone(b.timezone),e=DateTime.fromJSDate(a.ends_at).setZone(b.timezone);return !b.weekdays.includes(s.weekday)||s.hour*60+s.minute<b.open_hour*60||e.hour*60+e.minute>b.close_hour*60||s.toISODate()!==e.toISODate();}))fail(409,'These hours would invalidate existing appointments. Reschedule them first.');
  await c.query('UPDATE settings SET timezone=$1,open_hour=$2,close_hour=$3,weekdays=$4 WHERE id=1',[b.timezone,b.open_hour,b.close_hour,b.weekdays]);
  await audit(c,req.user.id,'hours.updated','1');
 });res.json({ok:true});
});
app.get('/api/exceptions',roles('administrator','receptionist','therapist'),async(req,res)=>{
 res.json((await pool.query('SELECT * FROM exceptions WHERE ends_at>now() ORDER BY starts_at')).rows);
});
app.post('/api/admin/exceptions',roles('administrator'),async(req,res)=>{
 const b=z.object({therapistId:z.string().uuid().nullable(),roomId:z.string().uuid().nullable(),startsAt:z.string().datetime({offset:true}),endsAt:z.string().datetime({offset:true}),reason:z.string().trim().min(2).max(160)}).parse(req.body);
 if(new Date(b.endsAt)<=new Date(b.startsAt))fail(400,'End must follow start.');
 await transaction(async c=>{
  await scheduleLock(c);
  const existing=await c.query("SELECT 1 FROM appointments WHERE status='scheduled' AND starts_at<$2 AND ends_at>$1 AND (($3::uuid IS NULL AND $4::uuid IS NULL) OR therapist_id=$3 OR room_id=$4)",[b.startsAt,b.endsAt,b.therapistId,b.roomId]);
  if(existing.rowCount)fail(409,'Reschedule affected appointments before adding this exception.');
  const id=randomUUID();await c.query('INSERT INTO exceptions(id,therapist_id,room_id,starts_at,ends_at,reason) VALUES($1,$2,$3,$4,$5,$6)',[id,b.therapistId,b.roomId,b.startsAt,b.endsAt,b.reason]);await audit(c,req.user.id,'exception.created',id);
 });res.status(201).json({ok:true});
});
app.get('/api/reports',roles('administrator','receptionist'),async(_req,res)=>{
 const counts=(await pool.query("SELECT status,channel,count(*)::int AS count FROM appointments GROUP BY status,channel ORDER BY status,channel")).rows;
 const reminders=(await pool.query('SELECT status,count(*)::int AS count FROM reminders GROUP BY status')).rows;
 res.json({counts,reminders,scope:'All fictional appointments'});
});
app.get('/api/audit',roles('administrator'),async(_req,res)=>res.json((await pool.query('SELECT a.*,u.name AS actor_name FROM audit a LEFT JOIN users u ON u.id=a.actor_id ORDER BY a.id DESC LIMIT 100')).rows));
app.get('/api/reminders',roles('administrator','receptionist'),async(_req,res)=>res.json((await pool.query('SELECT r.*,a.starts_at,u.name AS patient_name FROM reminders r JOIN appointments a ON a.id=r.appointment_id JOIN users u ON u.id=a.patient_id ORDER BY r.due_at DESC LIMIT 100')).rows));
app.post('/api/reminders/process',roles('administrator'),async(_req,res)=>res.json(await processReminders()));
app.post('/api/reminders/:id/retry',roles('administrator'),async(req,res)=>{
 const id=z.string().uuid().parse(req.params.id);
 await transaction(async c=>{
  await scheduleLock(c);
  const r=await c.query("UPDATE reminders SET status='pending',attempts=0,due_at=now(),reason=NULL WHERE id=$1 AND status='failed' RETURNING id",[id]);
  if(!r.rowCount)fail(409,'Only confirmed failed reminders can be retried. Ambiguous sends require reconciliation.');
  await audit(c,req.user.id,'reminder.retried',id);
 });res.json({ok:true});
});
app.use('/api',(_req,res)=>res.status(404).json({error:'Endpoint not found.'}));
app.use(express.static(path.resolve('dist'),{index:false}));
app.get('/{*path}',(_req,res)=>res.sendFile(path.resolve('dist/index.html')));
app.use((error:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
 const e=error as {status?:number;code?:string;message?:string};
 if(error instanceof ZodError){res.status(400).json({error:'Check the form fields.',details:error.issues.map(i=>i.path.join('.')+': '+i.message)});return;}
 if(e.code==='23P01'){res.status(409).json({error:'This therapist or room is already booked. Choose another time.'});return;}
 if(e.code==='23505'){res.status(409).json({error:'This email or name is already registered.'});return;}
 if(e.code==='LIMIT_FILE_SIZE'){res.status(413).json({error:'Files must be 5 MB or smaller.'});return;}
 if(e.code==='23503'||e.code==='22P02'){res.status(400).json({error:'Referenced record is unavailable.'});return;}
 const status=e.status||500;
 if(status>=500)console.error(JSON.stringify({event:'request.failed',code:e.code||'internal'}));
 res.status(status).json({error:status<500?e.message:'An unexpected error occurred. Please try again.'});
});
const timer=setInterval(()=>processReminders().catch(()=>console.error('Reminder worker failed')),30000);
timer.unref();
const server=app.listen(config.port,'0.0.0.0',()=>console.log('ClinicFlow local application: '+config.origin));
process.on('SIGTERM',()=>{clearInterval(timer);server.close(()=>pool.end().then(()=>process.exit(0)));});

