import { runEmailDelivery } from "../src/lib/email-delivery.mjs";
async function main() {
 const result=await runEmailDelivery(Number(process.env.FUKUMA_EMAIL_BATCH_SIZE ?? 25));
 console.log("Email worker: attempted "+result.attempted+", sent "+result.sent+", failed "+result.failed+", disabled "+result.disabled+", busy "+Boolean(result.busy)+".");
 if(result.failed)process.exitCode=1;
}
main().catch(()=>{console.error("Email worker failed. Check server configuration, database connectivity and provider availability. Saved picks remain intact.");process.exitCode=1;});
