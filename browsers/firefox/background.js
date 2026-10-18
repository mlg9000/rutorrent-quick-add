let pending=new Map();
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
async function openPicker(url,source,tabId){let id=uid();pending.set(id,{url,source,tabId,created:Date.now()});await browser.windows.create({url:browser.runtime.getURL('launcher.html')+'?id='+encodeURIComponent(id),type:'popup',width:510,height:680});setTimeout(()=>pending.delete(id),600000)}
browser.runtime.onMessage.addListener((msg,sender)=>{if(msg.type==='open')return openPicker(msg.url,msg.source,sender.tab?.id);if(msg.type==='get')return Promise.resolve(pending.get(msg.id)||null);if(msg.type==='previewName')return previewTorrentName(msg);if(msg.type==='submit')return submit(msg);});
browser.contextMenus.create({id:'quick-add',title:'Send torrent to ruTorrent Quick Add',contexts:['link']});browser.contextMenus.onClicked.addListener((info,tab)=>{if(info.menuItemId==='quick-add')openPicker(info.linkUrl,tab?.url,tab?.id)});
function failResponse(status){if(status===401)return 'Authentication failed (HTTP 401). Check the username and password.';if(status===403)return 'Access forbidden (HTTP 403). Check Apache/ruTorrent permissions.';if(status===404)return 'ruTorrent addtorrent.php was not found (HTTP 404). Check the server URL.';return 'Server returned HTTP '+status}

// Try the normal ruTorrent torrent list endpoint. A failed lookup is not a failed submission.
async function loadedHashes(server,headers){
 // ruTorrent's supported list RPC is POST mode=list, not php/gettorrents.php.
 const endpoint=new URL('plugins/httprpc/action.php',server.url.endsWith('/')?server.url:server.url+'/');
 const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),10000);
 try{
  const h={...headers,'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8'};
  const r=await fetch(endpoint.toString(),{method:'POST',body:'mode=list',headers:h,credentials:'include',redirect:'manual',signal:ctl.signal});
  if(r.type==='opaqueredirect')throw Error('Torrent list API redirected');
  if(!r.ok)throw Error('Torrent list API returned HTTP '+r.status);
  const data=await r.json();
  if(!data||typeof data!=='object'||!data.t||typeof data.t!=='object')throw Error('Unexpected torrent list response');
  return new Set(Object.keys(data.t).filter(k=>/^[a-f0-9]{40}$/i.test(k)).map(k=>k.toUpperCase()));
 }finally{clearTimeout(timer)}
}
function magnetHash(url) {
  const xt=new URLSearchParams(url.slice(url.indexOf('?')+1)).getAll('xt');
  for(const item of xt){const m=/^urn:btih:([0-9a-f]{40}|[a-z2-7]{32})$/i.exec(item);if(m){if(m[1].length===40)return m[1].toUpperCase();const chars='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';let bits=0,n=0,out=[];for(const c of m[1].toUpperCase()){bits=(bits<<5)|chars.indexOf(c);n+=5;if(n>=8){n-=8;out.push((bits>>n)&255)}}return out.map(v=>v.toString(16).padStart(2,'0')).join('').toUpperCase()}}
  return null;
}
// Locate the exact bencoded info dictionary bytes, then SHA-1 those bytes.
async function torrentHash(blob){
 const a=new Uint8Array(await blob.arrayBuffer());let i=0,info=null,decoder=new TextDecoder();
 function parse(depth=0){if(depth>80||i>=a.length)throw Error('Invalid torrent bencoding');const start=i,c=a[i++];
 if(c===105){while(i<a.length&&a[i]!==101)i++;if(i>=a.length)throw Error('Invalid integer');i++}
 else if(c===108){while(i<a.length&&a[i]!==101)parse(depth+1);if(i>=a.length)throw Error('Invalid list');i++}
 else if(c===100){while(i<a.length&&a[i]!==101){const key=parseString();const valueStart=i;parse(depth+1);if(depth===0&&key==='info')info=a.slice(valueStart,i)}if(i>=a.length)throw Error('Invalid dictionary');i++}
 else if(c>=48&&c<=57){i--;parseString()}
 else throw Error('Invalid bencoding');return [start,i]}
 function parseString(){let len=0;while(i<a.length&&a[i]!==58){const c=a[i++];if(c<48||c>57)throw Error('Invalid string length');len=len*10+c-48;if(len>a.length)throw Error('Invalid length')}if(i>=a.length)throw Error('Invalid string');i++;const end=i+len;if(end>a.length)throw Error('Truncated string');const value=decoder.decode(a.slice(i,end));i=end;return value}
 parse();if(!info)throw Error('Torrent lacks info dictionary');const digest=await crypto.subtle.digest('SHA-1',info);return Array.from(new Uint8Array(digest),v=>v.toString(16).padStart(2,'0')).join('').toUpperCase();
}
async function confirmHash(server,headers,hash){
 for(let attempt=0;attempt<8;attempt++){
  await new Promise(r=>setTimeout(r,attempt===0?400:1100));
  try{if((await loadedHashes(server,headers)).has(hash))return true}catch(e){if(attempt===7)throw e}
 }
 return false;
}
// Same-origin fallback for sites that redirect extension-origin requests to login.
async function fetchFromSiteTab(url,tabId){
 if(!Number.isInteger(tabId))throw Error('No originating site tab is available for authenticated retry');
 const tab=await browser.tabs.get(tabId);
 if(!tab.url||new URL(tab.url).origin!==new URL(url).origin)throw Error('Originating tab is no longer on the torrent site');
 const result=await browser.tabs.sendMessage(tabId,{type:'fetchTorrentInPage',url});
 if(!result?.ok)throw Error('Authenticated page retry failed: '+(result?.error||'No response'));
 const binary=atob(result.base64),bytes=new Uint8Array(binary.length);
 for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
 return new Blob([bytes],{type:'application/x-bittorrent'});
}
// Read the name from the bencoded info dictionary, without altering magnet behavior.
function torrentDisplayName(blob){
 return blob.arrayBuffer().then(buffer=>{
  const bytes=new Uint8Array(buffer);let pos=0, found=null;
  const decoder=new TextDecoder('utf-8',{fatal:false});
  function stringBytes(){
   let len=0,digits=0;
   while(pos<bytes.length&&bytes[pos]!==58){const c=bytes[pos++];if(c<48||c>57||++digits>12)throw Error('Invalid torrent string');len=len*10+c-48;if(len>bytes.length)throw Error('Torrent string too large')}
   if(pos>=bytes.length)throw Error('Truncated torrent string');pos++;
   if(pos+len>bytes.length)throw Error('Truncated torrent string');const value=bytes.subarray(pos,pos+len);pos+=len;return value;
  }
  function parse(depth=0,atInfo=false){
   if(depth>80||pos>=bytes.length)throw Error('Invalid torrent metadata');const c=bytes[pos++];
   if(c===100){let utf8=null,name=null;
    while(pos<bytes.length&&bytes[pos]!==101){const key=decoder.decode(stringBytes());
     if(atInfo&&(key==='name'||key==='name.utf-8')){
      if(pos>=bytes.length||bytes[pos]<48||bytes[pos]>57)throw Error('Invalid torrent name');
      const value=decoder.decode(stringBytes());if(key==='name.utf-8')utf8=value;else name=value;
     }else parse(depth+1,!atInfo&&depth===0&&key==='info');
    }
    if(pos>=bytes.length)throw Error('Unterminated torrent dictionary');pos++;
    if(atInfo)found=utf8||name||found;
   }else if(c===108){while(pos<bytes.length&&bytes[pos]!==101)parse(depth+1);if(pos>=bytes.length)throw Error('Unterminated list');pos++}
   else if(c===105){while(pos<bytes.length&&bytes[pos]!==101){if(bytes[pos]<45||bytes[pos]>57)throw Error('Invalid integer');pos++}if(pos>=bytes.length)throw Error('Unterminated integer');pos++}
   else if(c>=48&&c<=57){pos--;stringBytes()}
   else throw Error('Invalid torrent bencoding');
  }
  parse();return typeof found==='string'&&found.trim()?found.trim().slice(0,300):null;
 });
}
async function downloadTorrentBlob(url,tabId){
 const source=new URL(url);if(!/^https?:$/.test(source.protocol))throw Error('Unsupported torrent URL');
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),25000);
 let response;try{response=await fetch(url,{credentials:'include',signal:controller.signal})}finally{clearTimeout(timeout)}
 if(!response.ok)throw Error('Could not download .torrent file: HTTP '+response.status);
 let blob=await response.blob();
 if(blob.size>20*1024*1024||blob.size<10)throw Error('Torrent file has invalid size');
 if(!/^d/.test(await blob.slice(0,32).text())){
  const initial='HTTP '+response.status+', '+(response.headers.get('content-type')||'unknown')+', path '+new URL(response.url).pathname;
  try{blob=await fetchFromSiteTab(url,tabId)}catch(e){throw Error('Extension request returned non-torrent ('+initial+'). '+e.message)}
  if(blob.size>20*1024*1024||blob.size<10)throw Error('Page response has invalid torrent size');
  if(!/^d/.test(await blob.slice(0,32).text()))throw Error('Page retry also returned non-torrent content');
 }
 return blob;
}
async function previewTorrentName(msg){
 if(!/^https?:\/\//i.test(msg.url||''))return {name:null};
 try{const blob=await downloadTorrentBlob(msg.url,msg.tabId);return {name:await torrentDisplayName(blob)}}
 catch(e){return {name:null};} // Name lookup is optional; never block submission.
}

async function submit(msg){let s=await settings(),server=serverFor(s,msg.serverId||s.serverId);if(!server)throw Error('No server configured');if(!/^https?:\/\//.test(server.url))throw Error('Server address must begin with https:// or http://');let dest=msg.destination;if(!dest||!dest.directory)throw Error('Choose a destination');let endpoint=new URL('php/addtorrent.php?json=1',server.url.endsWith('/')?server.url:server.url+'/');let headers={};if(server.auth==='basic'&&server.username)headers.Authorization='Basic '+btoa(unescape(encodeURIComponent(server.username+':'+(server.password||''))));let form=new FormData();form.append('dir_edit',dest.directory);form.append('label',dest.label||'');if(msg.paused)form.append('torrents_start_stopped','true');let url=msg.url,hash=null;if(/^magnet:\?/i.test(url)){hash=magnetHash(url);form.append('url',url)}else{const blob=await downloadTorrentBlob(url,msg.tabId);hash=await torrentHash(blob);form.append('torrent_file[]',blob,'quick-add.torrent')}
// Verification is best-effort: never block a valid submission because a list API is unavailable.
if(hash){try{if((await loadedHashes(server,headers)).has(hash))return {ok:true,alreadyExists:true,detail:'Torrent already exists in rTorrent; no duplicate submitted.'}}catch(e){/* proceed */}}
let controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000),response;try{response=await fetch(endpoint.toString(),{method:'POST',body:form,headers,credentials:'include',redirect:'manual',signal:controller.signal})}catch(e){if(e.name==='AbortError')throw Error('ruTorrent request timed out');throw Error('Cannot reach ruTorrent: '+e.message)}finally{clearTimeout(timeout)}if(response.type==='opaqueredirect'||(response.status>=300&&response.status<400)){
 try{if(hash && await confirmHash(server,headers,hash))return {ok:true,verified:true,detail:'Torrent confirmed in rTorrent.'};}
 catch(e){return {ok:false,uncertain:true,detail:'Submission redirected, but torrent-list verification failed: '+e.message+'. Check ruTorrent before retrying.'}}
 return {ok:false,uncertain:true,detail:'Submission redirected, but torrent was not found in rTorrent after checking. Check ruTorrent before retrying.'};
}
if(!response.ok)throw Error(failResponse(response.status));
let body=await response.text(),result;
try{result=JSON.parse(body)}catch{result=null}
if(result?.error||result?.errors?.length||result?.success===false||result?.result===false)throw Error('ruTorrent rejected torrent: '+JSON.stringify(result.error||result.errors||result));
try{if(hash && await confirmHash(server,headers,hash))return {ok:true,verified:true,detail:'Torrent confirmed in rTorrent.'};}
catch(e){return {ok:false,uncertain:true,detail:'Submission received but torrent-list verification failed: '+e.message+'. Check ruTorrent before retrying.'}}
return {ok:false,uncertain:true,detail:'Torrent was not found in rTorrent after submission. Check ruTorrent before retrying.'};
}
