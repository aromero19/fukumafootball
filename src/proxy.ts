import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
export async function proxy(request: NextRequest) {
 let response=NextResponse.next({request});
 const supabase=createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!,process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,{cookies:{
  getAll:()=>request.cookies.getAll(),
  setAll(values){for(const {name,value} of values)request.cookies.set(name,value);response=NextResponse.next({request});for(const {name,value,options} of values)response.cookies.set(name,value,options);},
 }});
 // Refresh cookies here; every protected page/action independently verifies admin rights.
 await supabase.auth.getUser();
 response.headers.set("Cache-Control","private, no-store");
 return response;
}
export const config={matcher:"/admin/:path*"};
