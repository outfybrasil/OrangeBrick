import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";
import vm from "node:vm";
import ts from "typescript";

test("retry API rejects unknown, successful and queued deliveries and only retries a failed Telegram notice",async()=>{
  let state="unknown", authorized=true, published=true, sends=0;
  const db={from:(table:string)=>{const query={select:()=>query,eq:()=>query,maybeSingle:async()=>({data:table==="posts"?{is_published:published}:{value:state,updated_at:new Date().toISOString()},error:null})};return query;},rpc:async()=>({data:true,error:null})};
  const source=ts.transpileModule(readFileSync(new URL("../src/app/api/admin/publications/route.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const output:{POST?:(request:Request)=>Promise<Response>}={};
  vm.runInNewContext(source,{exports:output,Response,Request,Buffer,Date,URL,Number,AbortSignal,require:(name:string)=>{
    if(name==="next/server")return {NextResponse:{json:Response.json}};
    if(name.includes("/auth"))return {isVerifiedAdminSession:()=>authorized};
    if(name.includes("supabase/server"))return {createPublicServerClient:()=>({auth:{getUser:async()=>({data:{user:{id:"admin"}},error:null})}}),createServiceDataClient:()=>db};
    if(name.includes("server/network"))return {readResponseBuffer:async(response:Response)=>Buffer.from(await response.arrayBuffer())};
    if(name.includes("telegram-publication"))return {deliverPublicationNotice:async()=>{sends++;return true;}};
    if(name.includes("rate-limit"))return {getRateLimitWindowStart:()=>new Date()};
    if(name.includes("publication-status"))return {};
    throw new Error(name);
  }});
  const request=(destination="telegram")=>new Request("https://example.test/api/admin/publications",{method:"POST",headers:{authorization:"Bearer fixture","content-type":"application/json"},body:JSON.stringify({postId:"00000000-0000-0000-0000-000000000001",confirmed:true,destination})});
  for(state of ["sent","unknown","pending","sending:fixture"])assert.equal((await output.POST!(request())).status,409);
  assert.equal(sends,0);
  state="failed";published=false;assert.equal((await output.POST!(request())).status,409);
  published=true;authorized=false;assert.equal((await output.POST!(request())).status,403);
  authorized=true;assert.equal((await output.POST!(request("youtube"))).status,400);
  assert.equal(sends,0);
  assert.equal((await output.POST!(request())).status,200);assert.equal(sends,1);
});
