import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const out=new URL('./public/',import.meta.url);const file=fileURLToPath;
const browser=await chromium.launch({headless:true,channel:'chrome'});const page=await browser.newPage({viewport:{width:1360,height:800},deviceScaleFactor:1});
await page.goto('http://127.0.0.1:8765/cp4/public/slides.html',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
await fs.mkdir(new URL('slide-preview/',out),{recursive:true});
const slides=page.locator('.slide');if(await slides.count()!==8)throw Error('Expected 8 slides');
for(let i=0;i<8;i++){
const section=slides.nth(i);const overlap=await section.evaluate(el=>{const foot=el.querySelector('footer').getBoundingClientRect();return [...el.children].filter(x=>x.tagName!=='FOOTER').some(x=>x.getBoundingClientRect().bottom>foot.top-6)});
if(overlap)throw Error('Slide content overlaps footer: '+(i+1));
await section.screenshot({path:file(new URL(`slide-preview/${i+1}.png`,out))});}
await page.pdf({path:file(new URL('demo-slides.pdf',out)),printBackground:true,preferCSSPageSize:true});
await fs.copyFile(new URL('demo-slides.pdf',out),new URL('../demo-slides.pdf',import.meta.url));
console.log('Exported 8 slides, screenshots and PDF');await browser.close();
