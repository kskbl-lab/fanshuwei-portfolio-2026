const ALLOWED_ORIGINS=new Set(['https://kskbl-lab.github.io'])
const EVENT_TYPES=new Set(['session_start','section_view','project_view','video_play'])

const corsHeaders=origin=>({
 'Access-Control-Allow-Origin':ALLOWED_ORIGINS.has(origin)?origin:'https://kskbl-lab.github.io',
 'Access-Control-Allow-Methods':'POST, OPTIONS',
 'Access-Control-Allow-Headers':'Content-Type',
 'Access-Control-Max-Age':'86400',
 'Vary':'Origin'
})

export default{
 async fetch(request,env,ctx){
  const origin=request.headers.get('Origin')||''
  const headers=corsHeaders(origin)
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers})
  if(request.method!=='POST'||!ALLOWED_ORIGINS.has(origin))return new Response('Not allowed',{status:403,headers})
  if(Number(request.headers.get('Content-Length')||0)>12000)return new Response('Payload too large',{status:413,headers})

  let payload
  try{payload=await request.json()}catch{return new Response('Invalid JSON',{status:400,headers})}
  if(!EVENT_TYPES.has(payload?.event_type)||typeof payload?.session_id!=='string')return new Response('Invalid event',{status:400,headers})

  const cf=request.cf||{}
  const enriched={
   ...payload,
   country_code:cf.country||null,
   region_name:cf.region||null,
   region_code:cf.regionCode||null,
   city_name:cf.city||null,
   network_org:cf.asOrganization||null
  }

  ctx.waitUntil(fetch(`${env.SUPABASE_URL}/rest/v1/rpc/record_portfolio_event`,{
   method:'POST',
   headers:{'Content-Type':'application/json','apikey':env.SUPABASE_ANON_KEY,'Authorization':`Bearer ${env.SUPABASE_ANON_KEY}`},
   body:JSON.stringify({payload:enriched})
  }).then(response=>{if(!response.ok)throw new Error(`Supabase analytics write failed: ${response.status}`)}).catch(error=>console.error(error)))

  return new Response(null,{status:204,headers})
 }
}
