"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
export default function SignOut() {
 const [pending,setPending]=useState(false), [message,setMessage]=useState(""); const router=useRouter();
 return <div><button className="button secondary" disabled={pending} onClick={async()=>{setPending(true);try{const {error}=await createClient().auth.signOut();if(error)throw error;router.replace("/admin/login");router.refresh();}catch{setMessage("Unable to sign out. Please retry.");}finally{setPending(false);}}}>{pending?"Signing out…":"Sign out"}</button><span role="status">{message}</span></div>;
}
