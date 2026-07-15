const LIVE_HOST='kskbl-lab.github.io'
const SESSION_KEY='fsw-portfolio-analytics-session-v1'
const ANALYTICS_ENDPOINT=import.meta.env.VITE_ANALYTICS_ENDPOINT

export const isOwnerView=new URLSearchParams(location.search).get('notrack')==='1'

const createSessionId=()=>{
 try{return crypto.randomUUID()}catch{return`${Date.now()}-${Math.random().toString(36).slice(2)}`}
}

const getSessionId=()=>{
 try{
  const saved=sessionStorage.getItem(SESSION_KEY)
  if(saved)return saved
  const id=createSessionId()
  sessionStorage.setItem(SESSION_KEY,id)
  return id
 }catch{return createSessionId()}
}

const getDeviceInfo=()=>{
 const ua=navigator.userAgent||''
 const mobile=navigator.userAgentData?.mobile??/Android|iPhone|iPad|iPod|Mobile/i.test(ua)
 let os='Other'
 if(/Windows/i.test(ua))os='Windows'
 else if(/Android/i.test(ua))os='Android'
 else if(/iPhone|iPad|iPod/i.test(ua))os='iOS / iPadOS'
 else if(/Macintosh|Mac OS X/i.test(ua))os='macOS'
 else if(/Linux/i.test(ua))os='Linux'
 let browser='Other'
 if(/Edg\//.test(ua))browser='Microsoft Edge'
 else if(/OPR\//.test(ua))browser='Opera'
 else if(/SamsungBrowser\//.test(ua))browser='Samsung Internet'
 else if(/Firefox\//.test(ua))browser='Firefox'
 else if(/Chrome\//.test(ua))browser='Chrome'
 else if(/Safari\//.test(ua))browser='Safari'
 return{device_type:mobile?'Mobile / Tablet':'Desktop',os_name:os,browser_name:browser,viewport_width:innerWidth,viewport_height:innerHeight,language:navigator.language||'',timezone:Intl.DateTimeFormat().resolvedOptions().timeZone||''}
}

const canTrack=()=>location.hostname===LIVE_HOST&&!isOwnerView&&Boolean(ANALYTICS_ENDPOINT)

export const trackPortfolioEvent=(eventType,details={})=>{
 if(!canTrack())return false
 const payload={
  event_type:eventType,
  session_id:getSessionId(),
  page_path:location.pathname,
  page_hash:location.hash.slice(0,120),
  referrer_host:(()=>{try{return document.referrer?new URL(document.referrer).hostname:''}catch{return''}})(),
  ...getDeviceInfo(),
  ...details
 }
 fetch(ANALYTICS_ENDPOINT,{method:'POST',mode:'cors',keepalive:true,headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(()=>{})
 return true
}
