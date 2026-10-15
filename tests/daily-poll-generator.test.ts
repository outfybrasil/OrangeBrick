import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import * as rules from "../src/lib/daily-poll.ts";

function generator(title: string, existing: boolean, ai: boolean) {
  const writes: Array<Record<string,unknown>>=[];
  const prompts: Array<{correctionRequired:string|null}>=[];
  const article={id:"post",title,summary:title,category:"breaking",slug:"post",published_at:new Date().toISOString()};
  const db={from:(table:string)=>{
    let payload:Record<string,unknown>|null=null;
    const run=async()=>({data:table==="posts"?[article]:payload?{id:"new",...payload}:[],error:null});
    const chain={select:()=>chain,eq:()=>chain,gte:()=>chain,neq:()=>chain,order:()=>chain,limit:()=>chain,maybeSingle:async()=>({data:existing?{id:"old",question:"Pergunta atual",options:[],is_active:true}:null,error:null}),update:(value:Record<string,unknown>)=>{writes.push(value);payload=value;return chain;},insert:(value:Record<string,unknown>)=>{writes.push(value);payload=value;return chain;},single:run,then:(resolve:(value:unknown)=>unknown,reject:(error:unknown)=>unknown)=>run().then(resolve,reject)};
    return chain;
  }};
  const source=ts.transpileModule(readFileSync(new URL("../src/lib/daily-poll-generator.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const output:{generateDailyPoll?:(db:unknown)=>Promise<{created:boolean;usedFallback:boolean}>}={};
  vm.runInNewContext(source,{exports:output,Date,AbortSignal,JSON,process:{env:ai?{GROQ_API_KEY:"fixture"}:{}},require:(name:string)=>{if(name.includes("daily-poll"))return rules;throw new Error(name);},fetch:async(_url:string,init:{body:string})=>{
    const body=JSON.parse(init.body);prompts.push(JSON.parse(body.messages[1].content));
    const question=prompts.length===1?"Qual é o impacto de Hogwarts Legacy 2 na indústria de jogos?":"Hogwarts Legacy 2 muda seus planos de jogar a sequência?";
    return Response.json({choices:[{message:{content:JSON.stringify({question,options:["Quero jogar a sequência no lançamento","Vou esperar avaliações dos jogadores","Prefiro continuar no jogo original"],sourcePostId:"post"})}}]});
  }});
  return {run:()=>output.generateDailyPoll!(db),writes,prompts};
}

test("enquete existente é preservada sem nova geração ou alteração de opções",async()=>{
 const mock=generator("Hogwarts Legacy 2 está em desenvolvimento",true,true);
 await mock.run();assert.equal(mock.writes.length,0);assert.equal(mock.prompts.length,0);
});

test("gerador pede correção automática e só salva a pergunta específica validada",async()=>{
 const mock=generator("Hogwarts Legacy 2 está em desenvolvimento",false,true);
 const result=await mock.run();assert.equal(result.usedFallback,false);assert.equal(mock.prompts.length,2);
 assert.match(mock.prompts[1].correctionRequired!,/genérica/);
 assert.ok(mock.writes.some(row=>String(row.question).includes("planos de jogar")));
});

test("sem chave usa modelo contextual; sem modelo adequado não encerra a enquete anterior",async()=>{
 const supported=generator("Resident Evil chega ao Nintendo Switch 2",false,false);
 assert.equal((await supported.run()).usedFallback,true);assert.equal(supported.prompts.length,0);
 assert.ok(supported.writes.some(row=>String(row.question).includes("versão")));
 const unsupported=generator("Warner prioriza Hogwarts Legacy 2",false,false);
 await assert.rejects(unsupported.run(),/Nenhuma pergunta genérica foi publicada/);assert.equal(unsupported.writes.length,0);
});
