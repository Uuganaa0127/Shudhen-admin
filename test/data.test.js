import test from 'node:test';
import assert from 'node:assert/strict';
import {readData,addClient,dayReport,statsFor} from '../src/data.js';
const now=new Date('2026-09-21T12:00:00');
const row=(section,milliseconds=30000,extra={})=>({childId:'KID-001',sessionId:'session-a',type:'brush',date:'2026-09-20T09:00:00',section,milliseconds,...extra});
const full=[0,1,2,3].map(i=>row(i));
test('complete session meets target; short and missing sections flag red',()=>{assert.equal(dayReport(full,'2026-09-20',now).state,'complete');assert.equal(dayReport([row(0)],'2026-09-20',now).state,'attention');assert.equal(dayReport([row(0,10000),...full.slice(1)],'2026-09-20',now).state,'attention');});
test('no data and future are separate from problem days',()=>{assert.equal(dayReport([],'2026-09-20',now).state,'empty');assert.equal(dayReport([],'2026-09-22',now).state,'future');assert.equal(dayReport([row(0,0,{type:'floss'})],'2026-09-20',now).state,'empty');});
test('session spanning midnight is not marked incomplete',()=>{const events=full.map((e,i)=>({...e,date:i<2?'2026-09-19T23:59:50':'2026-09-20T00:00:20'}));assert.equal(dayReport(events,'2026-09-19',now).state,'complete');assert.equal(dayReport(events,'2026-09-20',now).state,'complete');});
test('repeat confirmations do not inflate sections or total',()=>{const s=statsFor([...full,row(0)]);assert.equal(s.complete,1);assert.equal(s.total,120);assert.equal(s.sections[0].count,1);});
test('long measurements flag review',()=>assert.equal(dayReport([row(0,181000),...full.slice(1)],'2026-09-20',now).state,'attention'));
function memory(){const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};}
test('shared preferences encoding and normalized doctor ID',()=>{const s=memory();s.setItem('flutter.careEvents',JSON.stringify(JSON.stringify(full)));assert.equal(readData(s).events.length,4);addClient(s,' kid-002 ');assert.deepEqual(JSON.parse(s.getItem('flutter.doctorClients')),['KID-002']);assert.throws(()=>addClient(s,'kid-002'));assert.throws(()=>addClient(s,'a'));});
test('corrupt data stays intact and prevents overwriting registry',()=>{const s=memory();s.setItem('flutter.doctorClients','broken');assert.ok(readData(s).error);assert.throws(()=>addClient(s,'KID-003'));assert.equal(s.getItem('flutter.doctorClients'),'broken');});

test('registration generates unique login IDs and stores child details',async()=>{
 const {registerChild,readProfiles}=await import('../src/data.js');const s=memory();
 const details={name:'Test Child',age:'7',registrationNumber:'TEST-001',phone:'99112233'};
 const id=registerChild(s,details);
 assert.match(id,/^[0-9]{6}$/);assert.ok(readData(s).issued.includes(id));
 assert.deepEqual(readProfiles(s)[id],{...details,age:7});
 assert.throws(()=>registerChild(s,details));
 const second=registerChild(s,{...details,registrationNumber:'TEST-002'});assert.notEqual(second,id);
 assert.throws(()=>registerChild(s,{...details,age:'-1',registrationNumber:'TEST-003'}));
});

import {starAccount,redeemStars} from '../src/data.js';
test('stars redeem once, persist, and cannot overspend or affect another child',()=>{
 const s=memory();s.setItem('flutter.doctorClients',JSON.stringify(['KID-001','KID-002']));s.setItem('flutter.careEvents',JSON.stringify(JSON.stringify(full)));
 assert.equal(starAccount(s,'KID-001').balance,1);
 assert.throws(()=>redeemStars(s,'KID-001',2,'Sticker'));
 assert.throws(()=>redeemStars(s,'KID-001',0,'Sticker'));
 assert.throws(()=>redeemStars(s,'KID-001',.5,'Sticker'));
 assert.throws(()=>redeemStars(s,'KID-001',1,''));
 redeemStars(s,'KID-001',1,'Sticker');
 assert.equal(starAccount(s,'KID-001').balance,0);
 assert.equal(starAccount(s,'KID-001').history.length,1);
 assert.equal(starAccount(s,'KID-002').history.length,0);
 assert.throws(()=>redeemStars(s,'KID-001',1,'Sticker'));
});
test('corrupt redemption history is preserved',()=>{const s=memory();s.setItem('shudkhen.redemptions','broken');assert.throws(()=>starAccount(s,'KID-001'));assert.equal(s.getItem('shudkhen.redemptions'),'broken');});
