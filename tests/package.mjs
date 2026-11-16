import {mkdtempSync,readdirSync,readFileSync,statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import assert from 'node:assert/strict';
function manifest(root,dir=root){return Object.fromEntries(readdirSync(dir).sort().flatMap(name=>{const p=join(dir,name);return statSync(p).isDirectory()?Object.entries(manifest(root,p)):[[relative(root,p),createHash('sha256').update(readFileSync(p)).digest('hex')]];}));}
const dirs=[mkdtempSync(join(tmpdir(),'workbench-a-')),mkdtempSync(join(tmpdir(),'workbench-b-'))];
for(const dir of dirs){const result=spawnSync(process.execPath,['main.ts'],{env:{...process.env,MAKEFUN_OUTPUT_DIR:dir},encoding:'utf8'});assert.equal(result.status,0,result.stderr);console.log(result.stdout.trim(),dir);}
const a=manifest(dirs[0]),b=manifest(dirs[1]);assert.deepEqual(a,b);console.log('Identical output files:',Object.keys(a).length);console.log(JSON.stringify(a,null,2));
let raw=0,gzip=0;for(const file of readdirSync('app').sort()){const bytes=readFileSync(join('app',file));raw+=bytes.length;gzip+=gzipSync(bytes,{level:9}).length;console.log('ASSET',file,'raw',bytes.length,'gzip9',gzipSync(bytes,{level:9}).length);}
console.log('APP TOTAL',raw,'raw',gzip,'gzip9');console.log('DOSSIER BYTES',statSync(join(dirs[0],'dossier.json')).size);
