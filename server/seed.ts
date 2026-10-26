import { randomUUID } from 'node:crypto';
import { DateTime } from 'luxon';
import { transaction, scheduleLock } from './db.js';
import { hashPassword } from './auth.js';
import { local } from './config.js';
export async function seed(){
 if(!local || !process.env.DEMO_PASSWORD) return;
 const hash=await hashPassword(process.env.DEMO_PASSWORD);
 await transaction(async c=>{
  await scheduleLock(c);
  const exists=await c.query('SELECT id FROM users LIMIT 1'); if(exists.rowCount)return;
  const seeds=[
   ['admin@clinicflow.example','Morgan Example','administrator'],
   ['reception@clinicflow.example','Casey Example','receptionist'],
   ['therapist@clinicflow.example','Taylor Example','therapist'],
   ['jules@clinicflow.example','Jules Example','therapist'],
   ['sam@clinicflow.example','Sam Example','therapist'],
   ['alex@clinicflow.example','Alex Example','receptionist'],
   ['patient@clinicflow.example','Riley Example','patient'],
   ['jordan@clinicflow.example','Jordan Example','patient'],
   ['caregiver@clinicflow.example','Avery Example','patient']
  ];
  const ids:string[]=[];
  for(const [email,name,role] of seeds){
   const id=randomUUID();ids.push(id);
   await c.query('INSERT INTO users(id,email,name,role,password_hash,consent,reminders) VALUES($1,$2,$3,$4,$5,$6,$6)',[id,email,name,role,hash,role==='patient']);
  }
  const rooms=[randomUUID(),randomUUID(),randomUUID()];
  for(let i=0;i<rooms.length;i++)await c.query('INSERT INTO rooms(id,name) VALUES($1,$2)',[rooms[i],['Movement studio','Treatment room A','Treatment room B'][i]]);
  await c.query('INSERT INTO delegations(patient_id,caregiver_id) VALUES($1,$2)',[ids[6],ids[8]]);
  let day=DateTime.now().setZone('America/New_York').plus({days:1}).startOf('day');
  while(day.weekday>5)day=day.plus({days:1});
  for(let i=0;i<4;i++){
   const id=randomUUID(),start=day.set({hour:9+i*2});
   await c.query('INSERT INTO appointments(id,patient_id,therapist_id,room_id,starts_at,ends_at,channel,treatment,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[id,ids[6+i%2],ids[2+i%3],rooms[i%3],start.toISO(),start.plus({minutes:45}).toISO(),i%2?'telephone':'patient','Physical therapy',ids[1]]);
   await c.query('INSERT INTO reminders(id,appointment_id,appointment_version,due_at) VALUES($1,$2,1,$3)',[randomUUID(),id,start.minus({hours:24}).toISO()]);
  }
 });
}

