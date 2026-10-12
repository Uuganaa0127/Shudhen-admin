export const sectionNames=['Дээд зүүн','Дээд баруун','Доод зүүн','Доод баруун'];
export const dayKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const monthKey=d=>dayKey(d).slice(0,7);
export function readData(storage){
  let error=''; let clients=[], events=[];
  try { const raw=JSON.parse(storage.getItem('flutter.doctorClients')||'[]'); if(!Array.isArray(raw)||raw.some(x=>typeof x!=='string'))throw Error(); clients=raw; } catch {error='ID бүртгэлийг уншиж чадсангүй. Өгөгдлийг өөрчлөлгүй хадгаллаа.';}
  try {const raw=JSON.parse(storage.getItem('flutter.careEvents')||'"[]"');const parsed=typeof raw==='string'?JSON.parse(raw):raw;if(!Array.isArray(parsed))throw Error();
    events=parsed.filter(e=>e&&typeof e.childId==='string'&&typeof e.sessionId==='string'&&!Number.isNaN(new Date(e.date).getTime())&&(e.type==='floss'||(e.type==='brush'&&Number.isInteger(e.section)&&e.section>=0&&e.section<4&&Number.isFinite(e.milliseconds)&&e.milliseconds>=0)));
    if(events.length!==parsed.length)error='Зарим бүртгэл буруу форматтай тул тайланд оруулаагүй.';
  }catch{error='Угаалтын бүртгэлийг уншиж чадсангүй. Өгөгдлийг өөрчлөлгүй хадгаллаа.';}
  return {clients:[...new Set([...clients,...events.map(e=>e.childId)])].sort(),issued:clients,events,error};
}
export function addClient(storage,value){
  const id=value.trim().toUpperCase();
  if(!/^[A-Z0-9-]{3,32}$/.test(id))throw Error('3–32 латин үсэг, тоо, зураас ашиглана уу.');
  const state=readData(storage);
  if(state.error)throw Error('Өгөгдлийн алдааг шийдсэний дараа ID нэмнэ үү.');
  if(state.clients.includes(id))throw Error('Энэ ID аль хэдийн бүртгэлтэй байна.');
  storage.setItem('flutter.doctorClients',JSON.stringify([...state.issued,id]));return id;
}
export function uniqueBrush(events){const map=new Map();events.filter(e=>e.type==='brush').forEach(e=>map.set(`${e.childId}|${e.sessionId}|${e.section}`,e));return [...map.values()];}
export function statsFor(events){
  const brush=uniqueBrush(events);const sessions=new Map();brush.forEach(e=>{const key=`${e.childId}|${e.sessionId}`;if(!sessions.has(key))sessions.set(key,new Set());sessions.get(key).add(e.section);});
  const sections=sectionNames.map((name,i)=>{const rows=brush.filter(e=>e.section===i);const total=rows.reduce((s,e)=>s+e.milliseconds/1000,0);return {name,count:rows.length,total,avg:rows.length?total/rows.length:null};});
  return {brush,sections,sessions:sessions.size,complete:[...sessions.values()].filter(s=>s.size===4).length,total:sections.reduce((s,e)=>s+e.total,0),floss:events.filter(e=>e.type==='floss').length};
}
export function dayReport(allEvents,key,now=new Date()){
  if(key>dayKey(now))return {state:'future',events:[],issues:[],total:0};
  const events=allEvents.filter(e=>dayKey(new Date(e.date))===key);const brush=uniqueBrush(events);
  if(!brush.length)return {state:'empty',events,issues:[],total:0};
  const issues=[];const allBrush=uniqueBrush(allEvents);
  sectionNames.forEach((name,i)=>{const rows=brush.filter(e=>e.section===i);const short=rows.filter(e=>e.milliseconds<30000).length;const long=rows.filter(e=>e.milliseconds>180000).length;if(short)issues.push(`${name}: ${short} тэмдэглэгээ 30 секунд хүрээгүй.`);if(long)issues.push(`${name}: ${long} тэмдэглэгээ 3 минутаас урт — хэмжилтийг нягтална уу.`);});
  const keys=[...new Set(brush.map(e=>`${e.childId}|${e.sessionId}`))];
  for(const session of keys){const sides=new Set(allBrush.filter(e=>`${e.childId}|${e.sessionId}`===session).map(e=>e.section));if(sides.size<4)issues.push(`Нэг угаалтын ${4-sides.size} хэсэг баталгаажаагүй${key===dayKey(now)?' (үргэлжилж байж болно)':''}.`);}
  return {state:issues.length?'attention':'complete',events,issues,total:brush.reduce((s,e)=>s+e.milliseconds/1000,0)};
}
export function suggestions(events){const s=statsFor(events);if(!s.brush.length)return ['Өгөгдөл хүрэлцэхгүй. Апп ашиглалт болон ID зөв эсэхийг шалгана уу. Бүртгэлгүй гэдэг нь угаагаагүй гэсэн үг биш.'];
  const list=[];if(s.sessions<3)list.push(`Ердөө ${s.sessions} угаалтын бүртгэлтэй. Тогтвортой хандлага дүгнэхээс өмнө нэмэлт бүртгэл цуглуулна уу.`);
  s.sections.forEach(x=>{if(!x.count)list.push(`${x.name}: бүртгэл алга. Хэсэг сонгох, дуусгах үйлдлийг хүүхэдтэй хамт шалгана уу.`);else if(x.avg<30)list.push(`${x.name}: дунджаар ${x.avg.toFixed(1)} сек. Сойз хүрч байгаа эсэх, эрт дуусгасан эсэх, хөдөлгөөний хэмжилт тасалдсан эсэхийг ажиглана уу.`);});
  if(s.complete<s.sessions)list.push(`${s.sessions-s.complete} угаалт дутуу баталгаажсан. Дөрвөн хэсгийг дуусгах дадлыг асран хамгаалагчтай ярилцаарай.`);
  if(s.brush.some(e=>e.milliseconds>180000))list.push('Хэт урт тэмдэглэгээ байна. Камерын хэмжилт, толгойн хөдөлгөөн нөлөөлсөн эсэхийг шалгана уу.');
  if(!s.floss)list.push('Шүдний утас хэрэглэсэн бүртгэл алга. Бодит дадлыг асран хамгаалагчаас лавлана уу.');
  if(!list.length)list.push('Бүртгэлүүд аппын зорилтод хүрсэн байна. Бодит угаалтын аргыг үзлэгээр давхар үнэлнэ үү.');return list;
}

export function readProfiles(storage){
 const value=JSON.parse(storage.getItem('shudkhen.childProfiles')||'{}');
 if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Хүүхдийн бүртгэлийг уншиж чадсангүй.');
 return value;
}
export function registerChild(storage,details){
 const name=details.name.trim(), registrationNumber=details.registrationNumber.trim().toUpperCase(), phone=details.phone.trim();
 const age=Number(details.age);
 if(!name||!details.age.toString().trim()||!Number.isInteger(age)||age<0||age>17||!registrationNumber||!/^\+?[0-9 ()-]{6,20}$/.test(phone))throw Error('Нэр, нас (0–17), регистрийн дугаар, утасны дугаарыг зөв бөглөнө үү.');
 const state=readData(storage);if(state.error)throw Error(state.error);
 const profiles=readProfiles(storage);
 if(Object.values(profiles).some(p=>p.registrationNumber===registrationNumber))throw Error('Энэ регистрийн дугаартай хүүхэд бүртгэлтэй байна.');
 let id;let attempts=0;
 do {id=String(100000+Math.floor(Math.random()*900000));if(++attempts>1000)throw Error('ID үүсгэж чадсангүй. Дахин оролдоно уу.');}while(state.clients.includes(id)||profiles[id]);
 const old=storage.getItem('shudkhen.childProfiles');
 storage.setItem('shudkhen.childProfiles',JSON.stringify({...profiles,[id]:{name,age,registrationNumber,phone}}));
 try{addClient(storage,id);}catch(error){if(old===null)storage.removeItem('shudkhen.childProfiles');else storage.setItem('shudkhen.childProfiles',old);throw error;}
 return id;
}

export function starAccount(storage,id){
 const rows=JSON.parse(storage.getItem('shudkhen.redemptions')||'[]');
 if(!Array.isArray(rows)||rows.some(r=>!r||typeof r.childId!=='string'||!Number.isSafeInteger(r.cost)||r.cost<=0))throw Error('Одны зарцуулалтын бүртгэл алдаатай.');
 const data=readData(storage);if(data.error)throw Error(data.error);
 const earned=statsFor(data.events.filter(e=>e.childId===id)).complete;
 const history=rows.filter(r=>r.childId===id);const spent=history.reduce((s,r)=>s+r.cost,0);
 return {earned,spent,balance:Math.max(0,earned-spent),history};
}
export function redeemStars(storage,id,cost,reward){
 if(!readData(storage).clients.includes(id))throw Error('Хүүхэд сонгоно уу.');
 const account=starAccount(storage,id);cost=Number(cost);reward=reward.trim();
 if(!Number.isSafeInteger(cost)||cost<=0||cost>account.balance)throw Error('Зарцуулах одны тоог шалгана уу. Үлдэгдэл хүрэлцэх ёстой.');
 if(!reward||reward.length>80)throw Error('Бэлгийн нэрийг оруулна уу (80 тэмдэгт хүртэл).');
 const rows=JSON.parse(storage.getItem('shudkhen.redemptions')||'[]');
 storage.setItem('shudkhen.redemptions',JSON.stringify([...rows,{childId:id,cost,reward,date:new Date().toISOString()}]));
 return starAccount(storage,id);
}
