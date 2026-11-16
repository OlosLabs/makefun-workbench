import {mkdirSync,readdirSync,lstatSync,copyFileSync,writeFileSync} from 'node:fs';
import {resolve,join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDossier} from './vendor/makefun-frontend.ts';

const source=dirname(fileURLToPath(import.meta.url));
const destination=resolve(process.env.MAKEFUN_OUTPUT_DIR || '/output');
if(destination===source || destination.startsWith(source+'/app/') || destination.startsWith(source+'/screenshots/'))throw new Error('Output must not overwrite entry sources');
function transfer(relative){
 const from=join(source,relative),to=join(destination,relative),info=lstatSync(from);
 if(info.isSymbolicLink())throw new Error('Symbolic links are not part of this entry');
 if(info.isDirectory()){
  mkdirSync(to,{recursive:true});
  for(const name of readdirSync(from).sort())transfer(join(relative,name));
 }else if(info.isFile())copyFileSync(from,to);
 else throw new Error('Unsupported file type: '+relative);
}
mkdirSync(destination,{recursive:true});
transfer('app');transfer('screenshots');
const dossier=buildDossier(destination,{
 text_max_bytes:163840,
 screenshots:{max:3,max_bytes:262144},
 app_max_files:993,
 app_max_bytes:16777216,
 app_path_max_bytes:1000
});
if(Buffer.byteLength(dossier)>1572864)throw new Error('Dossier exceeds entry size budget');
writeFileSync(join(destination,'dossier.json'),dossier);
console.log('Packaged make.fun Workbench: app/, screenshots/, dossier.json');
