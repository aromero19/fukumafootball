import assert from 'node:assert/strict';
import test from 'node:test';
import { reminderEmail, processPickReminders } from '../src/lib/pick-reminder-worker.mjs';

const row = {entry_id:1,year:2026,week:3,email:'player@example.test'};
const settings = {enabled:true,sender_address:'league@example.test'};
const message = reminderEmail(row,settings,'https://football.example.test');
function mock({locked=true,enabled=true,eligible=true}={}) {
  const queries=[];
  return {queries,async query(sql,params) {
    queries.push({sql,params});
    if(sql.startsWith('select pg_try')) return {rows:[{locked}]};
    if(sql.startsWith('select enabled')) return {rows:[{...settings,enabled}]};
    if(sql.startsWith('select r.*')) return {rows:[row]};
    if(sql.startsWith('insert into')) return {rows:[{request_id:'stable-id',message}]};
    if(sql.startsWith('select * from private.due')) return {rows:eligible?[row]:[]};
    return {rows:[]};
  }};
}
test('reminder contains picks and opt-out links for the selected entry',()=>{
  assert.match(message.text,/https:\/\/football.example.test\/picks\?entry=1/);
  assert.match(message.text,/https:\/\/football.example.test\/profile\?entry=1/);
  assert.equal(message.to[0],row.email);
  assert.throws(()=>reminderEmail(row,settings,'http://example.test'),/HTTPS/);
});
test('disabled or competing workers do not send',async()=>{
  for(const options of [{locked:false},{enabled:false}]) {
    const client=mock(options);
    await processPickReminders(client,()=>assert.fail('must not send'),'https://football.example.test');
    assert.ok(!client.queries.some(q=>q.sql.startsWith('insert')));
  }
});
test('eligibility is rechecked before delivery',async()=>{
  const client=mock({eligible:false});
  const result=await processPickReminders(client,()=>assert.fail('must not send'),'https://football.example.test');
  assert.equal(result.sent,0);
  assert.ok(client.queries.some(q=>q.sql==='commit'));
});
test('sends saved payload with stable key and persists attempt before provider call',async()=>{
  const client=mock();
  const result=await processPickReminders(client,async(payload,key)=>{
    assert.deepEqual(payload,message); assert.equal(key,'stable-id');
    assert.ok(client.queries.some(q=>q.sql.includes('attempts=attempts+1')));
    assert.ok(!client.queries.some(q=>q.sql.includes('set sent_at')));
  },'https://football.example.test');
  assert.equal(result.sent,1);
  assert.match(client.queries.at(-1).sql,/pg_advisory_unlock/);
});
test('uncertain delivery is recorded without sensitive errors and releases locks',async()=>{
  const client=mock();
  const result=await processPickReminders(client,async()=>{throw Error('secret');},'https://football.example.test');
  assert.equal(result.failed,1);
  assert.ok(client.queries.some(q=>q.sql==='rollback'));
  assert.ok(!JSON.stringify(client.queries).includes('secret'));
  assert.match(client.queries.find(q=>q.sql.startsWith('select r.*')).sql,/attempts < 5/);
  assert.match(client.queries.at(-1).sql,/pg_advisory_unlock/);
});
