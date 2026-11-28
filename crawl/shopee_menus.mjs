// Public DOM menu collector. Node + Playwright (see requirements-crawl.txt).
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const slugs = (await fs.readFile('inputs/shopee_slugs.txt','utf8')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const urls = [...new Set(slugs.map(s=>s.startsWith('https://')?s:`https://shopeefood.vn/ha-noi/${s}`))];
let prior=[];
try{prior=JSON.parse(await fs.readFile('data/raw/shopee_menus_20261127.json','utf8'));}catch{}
const byUrl=new Map(prior.map(r=>[r.url,r]));
const records = urls.map(url=>byUrl.get(url));
const browser = await chromium.launch({headless:true,channel:'chrome'});
async function read(page,url){
  if(url.includes('/khu-vuc/')) return {url,record_type:'area_listing',items:[],complete:false};
  await page.goto(url,{waitUntil:'domcontentloaded',timeout:35000});
  await page.locator('[role="grid"]').waitFor({state:'visible',timeout:20000});
  const meta = await page.evaluate(()=>({name:document.querySelector('h1')?.textContent.trim()||'',address:document.querySelector('.address-restaurant')?.textContent.trim()||'',rating:document.querySelector('.rating')?.textContent.trim()||'',status:document.querySelector('.opentime-status [title]')?.getAttribute('title')||''}));
  const rows = new Map(); let complete=false,stale=0,old=-1;
  for(let k=0;k<180;k++){
    const chunk=await page.evaluate(()=>{const g=document.querySelector('[role="rowgroup"]');return {h:g?.style.height,r:[...(g?.children||[])].map(e=>[e.style.top,e.style.height,e.querySelector('.title-menu')?.textContent.trim()||'',e.querySelector('.item-restaurant-name')?.textContent.trim()||'',e.querySelector('.item-restaurant-desc')?.textContent.trim()||'',e.querySelector('.current-price')?.textContent.trim()||'',e.querySelector('.old-price')?.textContent.trim()||''])}});
    for(const r of chunk.r)rows.set(r[0],r);
    if(chunk.r.length&&parseFloat(chunk.h)>0&&chunk.r.some(r=>parseFloat(r[0])+parseFloat(r[1])>=parseFloat(chunk.h)-1)){complete=true;break;}
    stale=old===rows.size?stale+1:0; old=rows.size;if(stale>=12)break;
    const search=page.getByPlaceholder('Tìm món');
    if(k===0&&await search.count())await search.scrollIntoViewIfNeeded();
    else {await page.mouse.move(650,650);await page.mouse.wheel(0,1150);}
    await wait(220);
  }
  let group='';const items=[];
  for(const r of [...rows.values()].sort((a,b)=>parseFloat(a[0])-parseFloat(b[0]))){if(r[2])group=r[2];if(r[3])items.push([group,...r.slice(3)]);}
  return {...meta,url,items,complete,collected_at:new Date().toISOString()};
}
let next=0;
async function worker(){const page=await browser.newPage({viewport:{width:1366,height:900},locale:'vi-VN'});while(next<urls.length){const index=next++;const url=urls[index];if(records[index]&&!records[index].error)continue;let result;try{result=await read(page,url);}catch(e){result={url,items:[],complete:false,error:e.message,collected_at:new Date().toISOString()};}records[index]=result;console.log(`${index+1}/${urls.length} ${result.items.length} ${result.complete?'OK':'partial'} ${result.name||url}`);}await page.close();}
await Promise.all([worker(),worker()]);await browser.close();
await fs.mkdir('data/raw',{recursive:true});
await fs.writeFile('data/raw/shopee_menus_20261127.json',JSON.stringify(records,null,2));
const quote=v=>'"'+String(v??'').replaceAll('"','""').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g,' ')+'"';
const stores=[['store_id','name','address_text','status_at_fetch','rating_text','menu_complete','menu_rows','source_url','fetched_at','error']];
const menu=[['store_id','menu_group','item_name','description','online_price_vnd','original_price_vnd','online_price_text','original_price_text','source_url','fetched_at']];
records.filter(r=>r.record_type!=='area_listing').forEach((r,i)=>{const id='sf_'+String(i+1).padStart(4,'0');stores.push([id,r.name,r.address,r.status,r.rating,r.complete?1:0,r.items.length,r.url,r.collected_at,r.error]);for(const item of r.items)menu.push([id,...item.slice(0,3),Number(item[3].replace(/\D/g,''))||'',Number(item[4].replace(/\D/g,''))||'',item[3],item[4],r.url,r.collected_at]);});
for(const [file,rows] of [['shopee_stores.csv',stores],['shopee_menu.csv',menu]])await fs.writeFile('data/processed/'+file,'\uFEFF'+rows.map(r=>r.map(quote).join(',')).join('\n')+'\n');
console.log(JSON.stringify({urls:urls.length,stores:stores.length-1,menu:menu.length-1}));
