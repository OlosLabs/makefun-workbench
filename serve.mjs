import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
const root=fileURLToPath(new URL('./app/',import.meta.url));
const port=Number(process.env.PORT||8080);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json'};
createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method||'')){res.writeHead(405);res.end();return;}
  const path=decodeURIComponent(new URL(req.url||'/', 'http://localhost').pathname);
  const target=resolve(root,'.'+(path==='/'?'/index.html':path));
  if(!target.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
  const body=await readFile(target);res.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);
 }catch{res.writeHead(404);res.end('Not found');}
}).listen(port,'127.0.0.1',()=>console.log(`Workbench ready at http://127.0.0.1:${port}`));
