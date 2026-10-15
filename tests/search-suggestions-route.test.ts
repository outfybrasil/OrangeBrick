import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";
import {readFileSync} from "node:fs";
import {normalizeNewsSearch} from "../src/lib/news-query.ts";
import {PLATFORMS_CONFIG} from "../src/lib/types/platform.ts";

test("suggestions query public published articles and active games with a rate limit and bounded results",async()=>{
 let allowed=true, calls=0;
 const requests:Array<{table:string; columns:string;filters:Array<[string,unknown]>;limit:number}>=[];
 const source=ts.transpileModule(readFileSync(new URL("../src/app/api/search/suggestions/route.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const output:{GET?:(request:Request)=>Promise<Response>}={};
 vm.runInNewContext(source,{exports:output,URL,AbortSignal,Date,process:{env:{RATE_LIMIT_SALT:"fixture"}},require:(name:string)=>{
  if(name==="next/server")return {NextResponse:{json:Response.json}};
  if(name.includes("news-query"))return {normalizeNewsSearch};
  if(name.includes("types/platform"))return {PLATFORMS_CONFIG};
  if(name.includes("rate-limit"))return {getRateLimitIdentity:()=>"hash",getRateLimitWindowStart:()=>new Date()};
  if(name.includes("supabase/server"))return {
   createServiceDataClient:()=>({rpc:async()=>{calls++;return {data:allowed,error:null};}}),
   createPublicServerClient:()=>({from:(table:string)=>{
    const record={table,columns:"",filters:[] as Array<[string,unknown]>,limit:0};requests.push(record);
    const query={select:(columns:string)=>{record.columns=columns;return query;},eq:(key:string,value:unknown)=>{record.filters.push([key,value]);return query;},or:()=>query,ilike:()=>query,order:()=>query,limit:(value:number)=>{record.limit=value;return query;},abortSignal:()=>query,returns:()=>query,then:(resolve:(value:unknown)=>unknown)=>Promise.resolve({data:table==="posts"?[{id:"post",title:"Nintendo anuncia novidades",slug:"nintendo-news"}]:[{id:"game",name:"Nintendo Game",slug:"nintendo-game"}],error:null}).then(resolve)};
    return query;
   }})
  };
  throw new Error(name);
 }});
 assert.equal((await output.GET!(new Request("https://example.test/api/search/suggestions?q=n"))).status,200);assert.equal(calls,0);
 const response=await output.GET!(new Request("https://example.test/api/search/suggestions?q=Nintendo"));
 const data=await response.json();assert.equal(response.status,200);assert.equal(response.headers.get("cache-control"),"private, no-store");
 assert.ok(data.items.some((item:{kind:string})=>item.kind==="Plataforma"));
 assert.equal(data.items.find((item:{kind:string})=>item.kind==="Jogo").href,"/games/nintendo-game");
 assert.ok(requests.find(row=>row.table==="posts")!.filters.some(([key,value])=>key==="is_published"&&value===true));
 assert.ok(requests.find(row=>row.table==="games")!.filters.some(([key,value])=>key==="is_active"&&value===true));
 assert.ok(requests.every(row=>row.limit<=4&&!row.columns.includes("*")));
 allowed=false;const reads=requests.length;
 assert.equal((await output.GET!(new Request("https://example.test/api/search/suggestions?q=Nintendo"))).status,429);
 assert.equal(requests.length,reads);
});
