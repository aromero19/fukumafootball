import assert from "node:assert/strict";
import test from "node:test";
import { confirmationEmail,processEmailOutbox } from "../src/lib/email-worker.mjs";
const row={request_id:"a",year:2026,week:1,email:"family@example.test",confirmation:{picks:[{game_id:5,team_id:10}]}};
const games=[{game_id:5,away_team_id:10,home_team_id:16,away_name:"Broncos",home_name:"Chiefs"}];
function mock({enabled=true,locked=true}={}) {
 const queries=[];
 return {queries, async query(sql,params){queries.push({sql,params});
  if(sql.startsWith("select pg_try"))return {rows:[{locked}]};
  if(sql.startsWith("select enabled"))return {rows:[{enabled,sender_address:"league@example.test"}]};
  if(sql.startsWith("select o.request_id"))return {rows:[row]};
  if(sql.startsWith("select g.game_id"))return {rows:games};
  return {rows:[]};
 }};
}
test("email renders only picks in the saved snapshot, escaping names",()=>{
 const email=confirmationEmail(row,[...games,{game_id:6,away_name:"Other",home_name:"Unpicked"}],"league@example.test","reply@example.test");
 assert.match(email.text,/Broncos at Chiefs: Broncos/);assert.doesNotMatch(email.text,/Unpicked/);assert.equal(email.reply_to,"reply@example.test");
 assert.match(confirmationEmail(row,[{...games[0],away_name:"<Team>"}],"x").html,/&lt;Team&gt;/);
});
test("disabled delivery releases its lock without touching jobs",async()=>{
 const client=mock({enabled:false});assert.deepEqual(await processEmailOutbox(client,()=>assert.fail()),{attempted:0,sent:0,failed:0,disabled:true});assert.match(client.queries.at(-1).sql,/pg_advisory_unlock/);assert.ok(!client.queries.some(q=>q.sql.startsWith("update")));
});
test("a competing worker does not send or release another worker's lock",async()=>{
 const client=mock({locked:false});assert.equal((await processEmailOutbox(client,()=>assert.fail())).busy,true);assert.equal(client.queries.length,1);
});
test("attempt is recorded before send and failure is retained without leaking exception data",async()=>{
 const client=mock();const result=await processEmailOutbox(client,async()=>{assert.match(client.queries.find(q=>q.sql.startsWith("update")).sql,/attempts=attempts\+1/);throw Error("secret-provider-token");});
 assert.equal(result.failed,1);assert.ok(!JSON.stringify(client.queries).includes("secret-provider-token"));assert.match(client.queries.at(-1).sql,/pg_advisory_unlock/);
 assert.match(client.queries.find(q=>q.sql.startsWith("select o.")).sql,/attempts < 5/);
});
test("successful delivery uses the saved request ID and marks sent only after provider success",async()=>{
 const client=mock();const result=await processEmailOutbox(client,async(message,id)=>{assert.equal(id,"a");assert.equal(message.to[0],row.email);assert.ok(!client.queries.some(q=>q.sql.includes("set sent_at")));});
 assert.equal(result.sent,1);assert.ok(client.queries.some(q=>q.sql.includes("set sent_at")));
});
test("invalid batch and database failures never send and release an acquired lock",async()=>{
 await assert.rejects(()=>processEmailOutbox(mock(),()=>assert.fail(),101),/Batch/);
 const client=mock();const query=client.query.bind(client);client.query=async sql=>{if(sql.startsWith("select enabled"))throw Error("DB");return query(sql);};
 await assert.rejects(()=>processEmailOutbox(client,()=>assert.fail()),/DB/);assert.match(client.queries.at(-1).sql,/pg_advisory_unlock/);
});
