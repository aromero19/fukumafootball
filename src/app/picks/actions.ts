"use server";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { validateSubmission,createSubmissionLimiter } from "@/lib/submission.mjs";
import { submitWithRetry } from "@/lib/picks.mjs";
const allow=createSubmissionLimiter();
export async function submitPicks(input: unknown) {
 let payload;
 try {payload=validateSubmission(input);}catch(error){return {data:null,error:{code:"VALIDATION",message:error instanceof Error?error.message:"Invalid submission."}};}
 const requestHeaders=await headers();
 const address=(requestHeaders.get("x-forwarded-for")?.split(",")[0] ?? "unknown").trim().slice(0,100);
 if(!allow(address))return {data:null,error:{code:"RATE_LIMIT",message:"Please wait a minute before retrying."}};
 try {
  const supabase=await createClient();
  const result=await submitWithRetry((saved:typeof payload)=>supabase.rpc("submit_weekly_picks",saved),payload);
  return {data:result.data,error:result.error?{code:result.error.code,message:result.error.message}:null};
 }catch{return {data:null,error:{code:"CONNECTION",message:"Connection interrupted. Your picks may already be saved; retry without changing your choices."}};}
}
