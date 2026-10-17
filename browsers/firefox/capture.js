(async()=>{let enabled=true,patterns=[];async function refresh(){let s=await browser.storage.local.get(['catchLinks','patterns']);enabled=s.catchLinks!==false;patterns=s.patterns||[]}await refresh();browser.storage.onChanged.addListener(refresh);document.addEventListener('click',e=>{if(!enabled||e.defaultPrevented||e.button!==0||e.ctrlKey||e.metaKey||e.shiftKey||e.altKey)return;let a=e.target.closest?.('a[href]');if(!a)return;let url=a.href;if(!(/^magnet:\?/i.test(url)||/\.torrent(?:$|[?#])/i.test(url)||patterns.some(p=>{try{return new RegExp(p,'i').test(url)}catch{return false}})))return;e.preventDefault();e.stopImmediatePropagation();browser.runtime.sendMessage({type:'open',url,source:location.href});},true)})();

// The extension's isolated content-script world can have different cookies than the page.
// Bridge the fallback to a page-context script, which uses the site's session.
let rqaPagePromise;
function rqaEnsurePageScript(){
 if(!rqaPagePromise)rqaPagePromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=browser.runtime.getURL('page-fetch.js');
  script.onload=()=>{script.remove();resolve()};
  script.onerror=()=>{script.remove();reject(Error('Page-context script blocked by site policy'))};
  (document.head||document.documentElement).appendChild(script);
 });
 return rqaPagePromise;
}
browser.runtime.onMessage.addListener(msg=>{
 if(msg.type!=='fetchTorrentInPage')return;
 return new Promise(resolve=>{
  try{
   const u=new URL(msg.url);
   if(u.origin!==location.origin||!/^https?:$/.test(u.protocol))throw Error('Cross-origin page retry blocked');
   const id=crypto.randomUUID();
   const marker='__rqa_page_fetch_v108';
   const timeout=setTimeout(()=>finish({ok:false,error:'Page-context retry timed out'}),30000);
   function onMessage(event){
    if(event.source!==window||event.origin!==location.origin||event.data?.marker!==marker||event.data?.kind!=='response'||event.data?.id!==id)return;
    finish(event.data);
   }
   function finish(result){clearTimeout(timeout);window.removeEventListener('message',onMessage);resolve(result)}
   window.addEventListener('message',onMessage);
   rqaEnsurePageScript().then(()=>window.postMessage({marker,kind:'request',id,url:u.href},location.origin)).catch(e=>finish({ok:false,error:e.message}));
  }catch(e){resolve({ok:false,error:e.message||String(e)})}
 });
});
