import assert from "node:assert/strict";
import test from "node:test";
import { relatedArticles } from "../src/lib/content-discovery.ts";

const current = { id:"current",slug:"current",title:"GTA VI revela trailer de lançamento",summary:"Rockstar apresenta Vice City e novidades de Grand Theft Auto VI.",topic_id:"gta",published_at:"2026-10-15T15:00:00Z" };

test("related articles prioritize the same subject and recognize GTA names without repeating the current article",()=>{
 const sameTopic={...current,id:"topic",slug:"topic",title:"Tudo que sabemos até agora",topic_id:"gta"};
 const sameGame={...current,id:"game",slug:"game",title:"Grand Theft Auto VI detalha Vice City",topic_id:null};
 const unrelated={...current,id:"unrelated",slug:"unrelated",title:"Novo trailer revela lançamento de jogo",summary:"Veja os novos jogos deste ano.",topic_id:null};
 const result=relatedArticles(current,[current,unrelated,sameGame,sameTopic,sameGame]);
 assert.deepEqual(result.map(post=>post.id),["topic","game"]);
 assert.equal(new Set(result.map(post=>post.id)).size,result.length);
});

test("generic launch words and matching category alone cannot fill related articles",()=>{
 const base={...current,title:"Novo jogo ganha trailer oficial",summary:"Veja o novo lançamento de 2026.",topic_id:null};
 assert.deepEqual(relatedArticles(base,[{...base,id:"other",slug:"other",title:"Trailer revela novo jogo de 2026"}]),[]);
 assert.deepEqual(relatedArticles(current,[{...current,id:"other",slug:"other",title:"Resident Evil chega ao Switch",summary:"Capcom lança sua trilogia.",topic_id:null}]),[]);
});

test("matching coverage from another category is valid and equally relevant articles favor recency",()=>{
 const older={...current,id:"old",slug:"old",topic_id:null,published_at:"2026-10-01T00:00:00Z",category:"industry"};
 const newer={...older,id:"new",slug:"new",published_at:"2026-10-14T00:00:00Z",category:"breaking"};
 assert.deepEqual(relatedArticles(current,[older,newer],1).map(post=>post.id),["new"]);
});
