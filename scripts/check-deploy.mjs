import {readdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const base=process.argv[2];
if(!base)throw new Error('Provide the deployed site URL');
async function walk(dir){let files=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;files.push(...(entry.isDirectory()?await walk(path):[path]));}return files;}
const files=await walk('dist');
for(const file of files){const path=file.slice(5);const response=await fetch(new URL(path,base),{signal:AbortSignal.timeout(20000)});assert.equal(response.status,200,`${path}: HTTP status`);const content=Buffer.from(await response.arrayBuffer());const local=await readFile(file);if(path.endsWith('.html')) {
 assert.ok(content.toString().includes('id="main"'),`${path}: application main element`);
 for(const match of local.toString().matchAll(/(?:src|href)="(\/assets\/[^"]+)"/g)) assert.ok(content.toString().includes(match[1]),`${path}: expected asset reference`);
} else assert.ok(content.equals(local),`${path}: published bytes differ`);if(path.endsWith('.js'))assert.match(response.headers.get('content-type')||'',/javascript/,`${path}: JavaScript MIME type`);}
console.log(`Verified ${files.length} deployed files, including all HTML, JavaScript and CSS.`);
