import {text,safeURL} from './core.js';
export function el(tag,attrs={},...children){
 const node=document.createElement(tag);
 for(const [key,value] of Object.entries(attrs)){
  if(key.startsWith('on') && typeof value==='function') node.addEventListener(key.slice(2),value);
  else if(key==='class')node.className=value;
  else if(value!==false && value!=null)node.setAttribute(key,String(value));
 }
 for(const child of children.flat(Infinity))if(child!=null)node.append(child instanceof Node?child:document.createTextNode(text(child)));
 return node;
}
export const link=(label,href,attrs={})=>el('a',{href,...attrs},label);
export const button=(label,action,attrs={})=>el('button',{type:'button',onclick:action,...attrs},label);
function inline(value){
 const out=document.createDocumentFragment();
 const regex=/(\[([^\]]+)\]\(([^\s)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;let start=0;
 for(const m of value.matchAll(regex)){
  out.append(value.slice(start,m.index));
  if(m[2]){const url=safeURL(m[3]);out.append(url?link(m[2],url,{rel:'noopener noreferrer',target:'_blank'}):document.createTextNode(m[2]));}
  else out.append(el(m[4]?'strong':'code',{},m[4]||m[5]));
  start=m.index+m[0].length;
 }out.append(value.slice(start));return out;
}
export function markdown(value){
 const root=el('div',{class:'markdown'});let list=null,code=null;
 for(const line of text(value).slice(0,150000).split('\n')){
  if(line.startsWith('```')){if(code)code=null;else{code=el('code');root.append(el('pre',{},code));}continue;}
  if(code){code.append(line+'\n');continue;}
  const heading=line.match(/^(#{1,6})\s+(.+)/), item=line.match(/^\s*(?:[-*]|\d+\.)\s+(.+)/);
  if(item){if(!list){list=el('ul');root.append(list);}list.append(el('li',{},inline(item[1])));continue;}
  list=null;
  if(heading)root.append(el('h'+Math.min(4,heading[1].length+1),{},inline(heading[2])));
  else if(line.trim())root.append(el('p',{},inline(line)));
 }return root;
}
