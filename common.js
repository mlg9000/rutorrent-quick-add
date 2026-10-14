const DEFAULTS={servers:[],serverId:'',destinations:[],paused:false,notifications:true,catchLinks:true,patterns:[],autoCloseMs:2000};
async function settings(){let s=await browser.storage.local.get();return {...DEFAULTS,...s};}
function isTorrentLink(url,patterns=[]){if(!url)return false;if(/^magnet:\?/i.test(url))return true;try{let u=new URL(url);if(!/^https?:$/.test(u.protocol))return false;if(/\.torrent(?:$|[?#])/i.test(url))return true;return patterns.some(p=>{try{return new RegExp(p,'i').test(url)}catch{return false}})}catch{return false}}
function serverFor(s,id){return s.servers.find(x=>x.id===id)||s.servers[0]}

const DESTINATION_ICONS=['tv','movies','video','pictures','applications','games','music','books','magazines','anime','general'];
function destinationIcon(name){return DESTINATION_ICONS.includes(name)?name:'general'}
