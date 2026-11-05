import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {prepareMotionAssets} from '@brasa/motion/runtime';
import {generateCompositionHtml, resolveVisualStyle} from '../src/lib/video/reel-composition.ts';
import {chooseEditorialVoice, EDITORIAL_VOICES} from '../src/lib/video/video-voice.mjs';

const output=path.resolve('tmp/reel-runtime-verification');
await fs.mkdir(output,{recursive:true});
if(resolveVisualStyle(12)!=='editorial')throw new Error('O padrão editorial não está ativo.');
if(chooseEditorialVoice('auto',EDITORIAL_VOICES[0])!==EDITORIAL_VOICES[1])throw new Error('A alternância de vozes não está ativa.');
const narration='A nova edição mantém o enquadramento fixo. Acompanhe jogos e indústria com contexto.';
const voice=chooseEditorialVoice('auto');
const result=spawnSync(process.env.PYTHON_BIN||'python3',['src/lib/video/reel-tts.py','--text',narration,'--voice',voice,'--provider','edge-tts','--out-dir',output],{encoding:'utf8',timeout:120000});
if(result.status!==0)throw new Error(result.stderr||'Falha ao validar a nova voz.');
const metadata=JSON.parse(await fs.readFile(path.join(output,'tts-provider.json'),'utf8'));
if(metadata.voice!==voice||metadata.provider!=='edge-tts')throw new Error('O executor usou uma voz diferente da configurada.');
const sentences=JSON.parse(await fs.readFile(path.join(output,'sentences.json'),'utf8'));
const duration=sentences.at(-1).end+.8;
await prepareMotionAssets(output,path.resolve('public/logos/orange-brick-mark.png'));
await fs.writeFile(path.join(output,'fixture.svg'),'<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080"><rect width="1920" height="1080" fill="#1c1e24"/></svg>');
const html=generateCompositionHtml({category:'industry',style:'editorial',duration,sentences,imagePaths:['fixture.svg'],script:{hook:'Edição editorial',headline:'Quadro fixo e voz atualizada',subHeadline:'',badge:'Verificação interna',narrationText:narration,scenes:[{id:'scene1',headline:'O enquadramento permanece fixo',highlight:'Animações locais',tag:'Editorial',imageIndex:0,narrationAnchor:'A nova edição mantém'}],ctaQuestion:'Acompanhe jogos e indústria com contexto.',ctaAction:'Inscreva-se',ctaButton:'INSCREVA-SE',ctaVariant:'follow'}});
await fs.writeFile(path.join(output,'index.html'),html);
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({viewport:{width:1080,height:1920}});
 const errors=[];page.on('pageerror',error=>errors.push(error.message));
 await page.goto(pathToFileURL(path.join(output,'index.html')).href);
 await page.evaluate(async()=>{await document.fonts.ready;await window.__seek(.6);});
 await page.screenshot({path:path.join(output,'frame.png')});
 if(errors.length)throw new Error(errors.join('\n'));
 const dimensions=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight}));
 if(dimensions.width!==1080||dimensions.height!==1920)throw new Error('A composição está fora do quadro.');
}finally{await browser.close();}
const check={standard:'youtube-editorial-v3',style:'editorial',provider:metadata.provider,voice:metadata.voice,rotation:EDITORIAL_VOICES,composition:'1080x1920',actual_tts:true,rendered_frame:true,human_listening:false,commit:process.env.GITHUB_SHA||null};
await fs.writeFile(path.join(output,'verification.json'),JSON.stringify(check,null,2));
console.log(JSON.stringify(check));
