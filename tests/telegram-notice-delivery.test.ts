import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { confirmedTelegramDelivery } from "../src/lib/publication-status.ts";

function harness(send: () => Promise<{ok: boolean; error_code?: number}>, value = "pending", date = new Date().toISOString()) {
  const state: Record<string,string> = { key:"telegram:publication:post",value,updated_at:date };
  let calls = 0;
  const from = (table: string) => {
    let patch: Record<string,string> | null = null;
    const filters: Array<[string,string]> = [];
    const run = async () => {
      if(table === "posts") return {data:{title:"News",slug:"news",is_published:true},error:null};
      if(filters.some(([key,value])=>state[key]!==value)) return {data:null,error:null};
      if(patch) Object.assign(state,patch);
      return {data:{...state},error:null};
    };
    const chain = {select:()=>chain,eq:(key:string,value:string)=>{filters.push([key,value]);return chain;},update:(values:Record<string,string>)=>{patch=values;return chain;},maybeSingle:run,then:(resolve: (value:unknown)=>unknown,reject:(error:unknown)=>unknown)=>run().then(resolve,reject)};
    return chain;
  };
  const output: { deliverPublicationNotice?: (id:string)=>Promise<boolean> } = {};
  const source=ts.transpileModule(readFileSync(new URL("../src/lib/server/telegram-publication.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  vm.runInNewContext(source,{exports:output,Date,console,process:{env:{TELEGRAM_BOT_TOKEN:"fixture",TELEGRAM_ADMIN_CHAT_ID:"fixture"}},require:(name:string)=>{
    if(name==="@supabase/supabase-js")return {createClient:()=>({from})};
    if(name.includes("site-url"))return {getSiteUrl:()=>"https://example.test"};
    if(name.includes("telegram/bot"))return {sendTelegramApi:async()=>{calls++;return send();}};
    if(name.includes("publication-status"))return {confirmedTelegramDelivery};
    throw new Error(name);
  }});
  return {deliver:()=>output.deliverPublicationNotice!("post"),state,calls:()=>calls};
}

test("concurrent publication notices claim a single Telegram delivery",async()=>{
  const mock=harness(async()=>({ok:true}));
  await Promise.all([mock.deliver(),mock.deliver()]);
  assert.equal(mock.calls(),1);
  assert.equal(mock.state.value,"sent");
  assert.equal(await mock.deliver(),true);
  assert.equal(mock.calls(),1);
});

test("unknown transport and stale sending notices cannot be resent",async()=>{
  const timeout=harness(async()=>{throw new Error("timeout");});
  await timeout.deliver();await timeout.deliver();
  assert.equal(timeout.state.value,"unknown");assert.equal(timeout.calls(),1);
  const stale=harness(async()=>({ok:true}),"sending:old",new Date(Date.now()-130000).toISOString());
  await stale.deliver();assert.equal(stale.state.value,"unknown");assert.equal(stale.calls(),0);
});
