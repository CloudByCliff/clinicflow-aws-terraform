export type User={id:string;email:string;name:string;role:'administrator'|'receptionist'|'therapist'|'patient';active:boolean;consent:boolean;reminders:boolean};
export type Room={id:string;name:string;active:boolean};
export type Appointment={id:string;patient_id:string;therapist_id:string;room_id:string;starts_at:string;ends_at:string;status:string;channel:string;treatment:string;patient_name:string;therapist_name:string;room_name:string};
export type Bootstrap={staff:User[];patients:User[];rooms:Room[];settings:{timezone:string;open_hour:number;close_hour:number;weekdays:number[]}};
export async function api<T=any>(path:string,options:RequestInit={}):Promise<T>{
 const isForm=options.body instanceof FormData;
 const r=await fetch('/api'+path,{...options,credentials:'same-origin',headers:{'X-ClinicFlow':'1',...(!isForm&&options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 const body=await r.json();
 if(!r.ok)throw new Error(body.error||'Request failed.');
 return body;
}
export const send=<T=any>(path:string,body:unknown,method='POST')=>api<T>(path,{method,body:JSON.stringify(body)});

