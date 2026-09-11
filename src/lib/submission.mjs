export function validateSubmission(input) {
 if(!input || typeof input!=="object" || Array.isArray(input))throw new Error("Invalid submission.");
 const integer=(value,min,max)=>Number.isSafeInteger(value)&&value>=min&&value<=max;
 if(!integer(input.p_entry_id,1,Number.MAX_SAFE_INTEGER)||!integer(input.p_theme_id,1,Number.MAX_SAFE_INTEGER)||!integer(input.p_year,1920,9999)||!integer(input.p_week,1,22)||typeof input.p_request_id!=="string"||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.p_request_id))throw new Error("Choose a valid player, theme and week.");
 if(!Array.isArray(input.p_picks)||input.p_picks.length>32)throw new Error("Too many picks in one submission.");
 const ids=new Set();
 for(const pick of input.p_picks){if(!pick||!integer(pick.game_id,1,Number.MAX_SAFE_INTEGER)||!integer(pick.team_id,1,32)||ids.has(pick.game_id))throw new Error("Invalid or duplicate game selection.");ids.add(pick.game_id);}
 return {p_entry_id:input.p_entry_id,p_theme_id:input.p_theme_id,p_year:input.p_year,p_week:input.p_week,p_request_id:input.p_request_id,p_picks:input.p_picks.map(p=>({game_id:p.game_id,team_id:p.team_id}))};
}
// Best-effort per-process protection. Direct public RPC traffic still needs
// gateway controls; honor-system identity is deliberately not authentication.
export function createSubmissionLimiter() {
 const windows=new Map();
 return (key,now=Date.now())=>{
  for(const [address,window] of windows)if(window.until<=now)windows.delete(address);
  let window=windows.get(key);
  if(!window){if(windows.size>=10000)return false;window={until:now+60000,count:0};windows.set(key,window);}
  return ++window.count<=30;
 };
}
