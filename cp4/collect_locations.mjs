// Read only public store metadata returned while opening each supplied ShopeeFood page.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
const stores=JSON.parse(await fs.readFile('web-demo/data/menus_live.json','utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});const rows=[];let next=0;
async function worker(){const page=await browser.newPage();while(next<stores.length){const s=stores[next++];let detail=null;
const listener=async r=>{if(!r.url().includes('get_detail'))return;try{const j=await r.json();if(j.reply?.delivery_detail)detail=j.reply.delivery_detail}catch{}};
page.on('response',listener);let error='';try{await page.goto(s.source_url,{waitUntil:'domcontentloaded',timeout:25000});for(let i=0;i<80&&!detail;i++)await page.waitForTimeout(200)}catch(e){error=e.message.split('\n')[0]}
page.off('response',listener);const pos=detail?.position;const valid=Number.isFinite(pos?.latitude)&&Number.isFinite(pos?.longitude)&&pos.latitude>20&&pos.latitude<22&&pos.longitude>105&&pos.longitude<107;
rows.push({store_id:s.store_id,name:detail?.name||s.name,address:detail?.address||s.address,lat:valid?pos.latitude:null,lng:valid?pos.longitude:null,source_url:s.source_url,fetched_at:new Date().toISOString(),coordinate_source:valid?'ShopeeFood public store metadata':'unavailable',error:valid?'':error||'No valid public position returned'});
if(rows.length%10===0)console.log(`${rows.length}/${stores.length}; coordinates ${rows.filter(r=>r.lat!=null).length}`);
}await page.close()}
await Promise.all([worker(),worker(),worker()]);await browser.close();rows.sort((a,b)=>a.store_id.localeCompare(b.store_id));await fs.writeFile('data/processed/shopee_locations.json',JSON.stringify(rows,null,2));console.log(JSON.stringify({stores:rows.length,coordinates:rows.filter(r=>r.lat!=null).length}));
