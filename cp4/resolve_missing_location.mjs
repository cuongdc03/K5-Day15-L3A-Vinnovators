import {chromium} from 'playwright';import fs from 'node:fs/promises';
const file='data/processed/shopee_locations.json';const rows=JSON.parse(await fs.readFile(file,'utf8'));
const browser=await chromium.launch({channel:'chrome',headless:true});const page=await browser.newPage();
await page.goto('https://shopeefood.vn/ha-noi/danh-sach-dia-diem-giao-tan-noi?q=TocoToco%20100%20C%E1%BB%95%20Bi',{waitUntil:'networkidle',timeout:30000});
const link=page.locator('a').filter({hasText:/TocoToco\s*-\s*100 Cổ Bi/i}).first();
if(await link.count()){
 const url=await link.getAttribute('href');console.log('Matched public listing',url);let detail;
 page.on('response',async r=>{if(r.url().includes('get_detail'))try{detail=(await r.json()).reply?.delivery_detail}catch{}});
 const target=new URL(url,'https://shopeefood.vn').href;await page.goto(target,{waitUntil:'networkidle',timeout:30000});
 if(detail?.position?.latitude&&detail?.position?.longitude){const r=rows.find(r=>r.store_id==='sf_0043');Object.assign(r,{name:detail.name,address:detail.address,lat:detail.position.latitude,lng:detail.position.longitude,resolved_source_url:target,fetched_at:new Date().toISOString(),coordinate_source:'ShopeeFood public store metadata (resolved official listing)',error:''});await fs.writeFile(file,JSON.stringify(rows,null,2));console.log('Resolved sf_0043 position')}
}else console.log('No exact public listing found; keep unavailable position.');await browser.close();
