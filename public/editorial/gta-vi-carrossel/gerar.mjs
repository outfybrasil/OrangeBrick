import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import sharp from 'sharp';
const root=path.dirname(fileURLToPath(import.meta.url));
const records=JSON.parse(await fs.readFile(path.join(root,'fontes.json'),'utf8'));
const desc=['Jason e Lucia juntos em uma festa iluminada por luzes azuis e roxas.','Jason e Lucia armados durante um assalto a uma loja.','Silhuetas de Jason e Lucia junto a uma árvore, com a cidade ao fundo ao pôr do sol.','Jason segura uma pistola diante de um porta-malas aberto, com Lucia ao fundo.','Jason e Lucia em um bar com mesas de sinuca e iluminação de néon.','Lucia dispara de um veículo durante uma perseguição.','Jason e Lucia em um carro conversível sob luzes coloridas.','Jason conduz uma moto diante de uma viatura policial à noite.','Jason aponta uma pistola durante um confronto em um ambiente fechado.','Motociclistas em uma rua iluminada por luzes verdes.','Jason diante de outros homens em uma área com veículos estacionados.','Jason sem camisa segura uma barra de musculação.','Jason com uma arma longa em meio a faíscas à noite.','Jason empunha uma arma longa atrás de um carro atingido por tiros.','Jason com uma pistola em uma rua à noite.','Jason dirige um carro, com passageiros ao fundo.','Lucia empunha uma pistola sob iluminação azul e roxa.','Lucia aponta duas pistolas de dentro de um carro.','Lucia aponta uma pistola diante da câmera, com a cidade ao fundo.','Lucia diante de luzes de viaturas policiais à noite.','Público em uma casa noturna com iluminação verde.','Dois homens conversam dentro de um carro.','Barcos em uma marina com os prédios de Vice City ao fundo.','Homem com anéis leva a mão ao rosto.','Vista de uma via movimentada de Vice City ao entardecer.','Homem deitado entre cédulas sob iluminação rosa.','Homem com óculos escuros ao lado de um cachorro.','Grupo de pessoas reunido em uma área externa.','Três homens tatuados sentados lado a lado.','Posto de combustível com néon e a cidade ao fundo à noite.','Grupo de mulheres reunido em um ambiente de festa.','Homem junto a um carro rosa em uma avenida com palmeiras.','Pessoas brindam em uma festa sob iluminação rosa.','Vista aérea de uma piscina rodeada por palmeiras e espreguiçadeiras.','Vista noturna de Vice City, com prédios iluminados e canais.','Mergulhador em uma caverna subaquática de Leonida Keys.','Dançarina diante de um letreiro de néon em Port Gellhorn.','Homem com arma longa em um acampamento em Grassrivers.','Barco em uma região alagada de Grassrivers, sob a lua.'];
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;');
const svg=body=>Buffer.from(`<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg"><style>text{font-family:Outfit;fill:#fff}.label{font-family:Space Grotesk;font-size:23px;letter-spacing:2px}.muted{fill:#999ba3}.orange{fill:#ff5e00}</style>${body}</svg>`);
const txt=(x,y,s,size=24,extra='')=>`<text x="${x}" y="${y}" font-size="${size}" ${extra}>${esc(s)}</text>`;
const logo=await sharp(path.resolve(root,'../../logos/orange-brick-horizontal-dark.png')).resize({width:285}).png().toBuffer();
await fs.mkdir(path.join(root,'slides'),{recursive:true});
const manifest=[];
for(let i=0;i<20;i++){
 const items=i===0?[records[0]]:records.slice(1+(i-1)*2,3+(i-1)*2);
 const comps=[];
 let body=`<rect width="1080" height="1080" fill="#0d0e12"/><rect width="1080" height="8" fill="#ff5e00"/>`;
 if(i===0){
 body+=`<rect x="0" y="608" width="1080" height="8" fill="#ff5e00"/>`;
 body+=txt(44,712,'NOVAS IMAGENS',87,'font-weight="900" letter-spacing="-2"');
 body+=txt(39,832,'DE GTA VI',132,'font-weight="900" letter-spacing="-4" class="orange"');
 body+=txt(44,926,'DIVULGADAS',98,'font-weight="900" letter-spacing="-2"');
 body+=txt(48,1000,'39 CAPTURAS OFICIAIS. DESLIZE PARA VER →',26,'class="label"');
 body+=txt(48,1054,'ROCKSTAR GAMES  /  GRAND THEFT AUTO VI',18,'class="muted"');
 body+=txt(937,1054,'01/20',21,'class="muted"');
 comps.push({input:await sharp(path.join(root,items[0].file)).resize(1080,608,{fit:'contain',background:'#0d0e12'}).toBuffer(),left:0,top:0});
 comps.push({input:svg(`<rect x="0" y="0" width="1080" height="92" fill="#0d0e12" fill-opacity="0.88"/>${txt(686,56,'ROCKSTAR GAMES',23,'class="label"')}`),left:0,top:0});
 }else{
 body+=txt(900,49,`${String(i+1).padStart(2,'0')}/20`,22,'class="label muted"');
 for(let j=0;j<items.length;j++){
 const r=items[j];const y=j===0?104:606;
 const label=r.name.replace(/ \d+$/,'').replace('Jason and Lucia','JASON E LUCIA').toUpperCase();
 if(i===19&&j===1){
 body+=txt(48,577,'CURTIU? DEIXA O LIKE E SEGUE A ORANGE BRICK.',27,'font-weight="800" class="orange"');
 body+=txt(48,600,'Mais GTA VI e notícias de games no seu feed.',19);
 }else{body+=txt(48,y-13,label,21,'class="label"');}
 comps.push({input:await sharp(path.join(root,r.file)).resize(1080,450,{fit:'cover',position:'centre'}).toBuffer(),left:0,top:y});
 }
 body+=txt(48,1076,'© ROCKSTAR GAMES',17,'class="muted"');
 body+=txt(540,1076,'GRAND THEFT AUTO VI',17,i===19?'class="orange"':'class="muted"');
 }
 const bg=await sharp(svg(body)).png().toBuffer();
 const out=path.join(root,`slides/${String(i+1).padStart(2,'0')}.jpg`);
 await sharp(bg).composite([...comps,{input:logo,left:48,top:30}]).jpeg({quality:96,chromaSubsampling:'4:4:4'}).toFile(out);
 manifest.push({slide:i+1,file:`slides/${String(i+1).padStart(2,'0')}.jpg`,alt:items.map(r=>desc[records.indexOf(r)]).join(' '),images:items.map(r=>r.name)});
}
await fs.writeFile(path.join(root,'slides.json'),JSON.stringify(manifest,null,2));
const tiles=await Promise.all(manifest.map(async(r,i)=>({input:await sharp(path.join(root,r.file)).resize(216,216).png().toBuffer(),left:(i%5)*224,top:Math.floor(i/5)*224})));
await sharp({create:{width:1112,height:888,channels:3,background:'#25262a'}}).composite(tiles).jpeg({quality:92}).toFile(path.join(root,'previa.jpg'));
console.log('20 slides gerados em 1080 × 1080; 39 imagens distintas.');
