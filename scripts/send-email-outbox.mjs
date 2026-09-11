import { Client } from "pg";
import { processEmailOutbox } from "../src/lib/email-worker.mjs";

async function main() {
 const databaseUrl=process.env.FUKUMA_DATABASE_URL,resendKey=process.env.RESEND_API_KEY;
 if(!databaseUrl||!resendKey) throw new Error("Worker configuration missing");
 const client=new Client({connectionString:databaseUrl,connectionTimeoutMillis:5000});
 try {
  await client.connect();
  const result=await processEmailOutbox(client,async(message,requestId)=>{
   const response=await fetch("https://api.resend.com/emails",{method:"POST",headers:{Authorization:"Bearer "+resendKey,"Content-Type":"application/json","Idempotency-Key":requestId},body:JSON.stringify(message),signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error("Provider delivery not confirmed");
  },Number(process.env.FUKUMA_EMAIL_BATCH_SIZE ?? 25));
  console.log("Email worker: attempted "+result.attempted+", sent "+result.sent+", failed "+result.failed+", disabled "+result.disabled+", busy "+Boolean(result.busy)+".");
  if(result.failed)process.exitCode=1;
 } finally { await client.end(); }
}
main().catch(()=>{console.error("Email worker failed. Check server configuration, database connectivity and provider availability. Saved picks remain intact.");process.exitCode=1;});
