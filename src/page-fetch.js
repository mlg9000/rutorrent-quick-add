// Runs in the site's page context to use its normal authenticated fetch context.
(()=>{
 const marker='__rqa_page_fetch_v108';
 window.addEventListener('message',async event=>{
  if(event.source!==window||event.origin!==location.origin||event.data?.marker!==marker||event.data?.kind!=='request')return;
  const {id,url}=event.data;
  if(typeof id!=='string'||typeof url!=='string')return;
  let reply={marker,kind:'response',id,ok:false};
  try{
   const u=new URL(url);
   if(!/^https?:$/.test(u.protocol)||u.origin!==location.origin)throw Error('Cross-origin download blocked');
   const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),25000);
   let r;
   try{r=await fetch(u.href,{credentials:'include',redirect:'follow',signal:ctl.signal})}finally{clearTimeout(timer)}
   if(!r.ok)throw Error('HTTP '+r.status);
   const blob=await r.blob();
   if(blob.size<10||blob.size>20*1024*1024)throw Error('Unexpected response size: '+blob.size);
   if(!/^d/.test(await blob.slice(0,32).text()))throw Error('Page-context response is '+(r.headers.get('content-type')||'unknown')+' at '+new URL(r.url).pathname);
   const bytes=new Uint8Array(await blob.arrayBuffer());let b64='';
   for(let i=0;i<bytes.length;i+=8192)b64+=String.fromCharCode(...bytes.subarray(i,i+8192));
   reply={marker,kind:'response',id,ok:true,base64:btoa(b64)};
  }catch(e){reply.error=e.message||String(e)}
  window.postMessage(reply,location.origin);
 });
})();
