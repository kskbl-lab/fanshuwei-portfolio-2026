// Production adapter. The local draft continues to use its local disk store.
window.PortfolioStore=(()=>{
 const config=window.PORTFOLIO_CLOUD, seed=window.PORTFOLIO_SEED;
 const collections={kuaishou:'快手 · 快影',personal:'个人作品 · MG 动画',picturethis:'睿琪 · PictureThis 植物识别与养护',woodworking:'睿琪 · Woodsense 木工制作'};
 const catalogKey='portfolio_catalog_v4', sessionKey='fsw-live-editor-v4';
 const headers={apikey:config.key,Authorization:'Bearer '+config.key};
 let state=structuredClone(seed),unlocked=false;
 try{unlocked=sessionStorage.getItem(sessionKey)===config.editorHash;}catch{}
 const updateEditor=()=>document.body.classList.toggle('editor-unlocked',unlocked);
 updateEditor();
 async function request(path,options={}){
  const response=await fetch(config.url+path,{...options,headers:{...headers,...options.headers},signal:options.signal||AbortSignal.timeout(20000)});
  const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{throw Error('云端响应异常，请稍后重试。');}
  if(!response.ok)throw Error(data?.message||data?.error||'云端保存失败，请稍后重试。');
  return data;
 }
 async function readRow(){const rows=await request('/rest/v1/portfolio_state?id=eq.main&select=media,updated_at');if(!rows?.[0])throw Error('未找到云端作品目录。');return rows[0];}
 function catalog(row){const saved=row.media?.[catalogKey];return saved?.release===config.release&&Array.isArray(saved.items)?saved:structuredClone(seed);}
 const ready=(async()=>{try{state=catalog(await readRow());}catch{state=structuredClone(seed);}})();
 async function get(){await ready;return structuredClone(state);}
 async function authorize(){
  if(unlocked)return true;
  const password=window.prompt('请输入原网站的编辑密码');if(password===null)return false;
  const buffer=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(password));
  const hash=Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
  if(hash!==config.editorHash){window.alert('密码不正确，已保持只读模式。');return false;}
  unlocked=true;try{sessionStorage.setItem(sessionKey,hash);}catch{}updateEditor();return true;
 }
 function requireEditor(){if(!unlocked)throw Error('请先通过「素材管理」输入编辑密码。');}
 async function change(mutator,expectedRevision=state.revision){
  await ready;requireEditor();const row=await readRow(),latest=catalog(row);
  if(latest.revision!==expectedRevision){state=latest;throw Error('作品目录已在其他页面更新，请关闭并重新打开管理面板。');}
  const next=structuredClone(latest);mutator(next);next.revision=(latest.revision||0)+1;next.release=config.release;
  const updatedAt=new Date().toISOString();
  const result=await request('/rest/v1/portfolio_state?id=eq.main&updated_at=eq.'+encodeURIComponent(row.updated_at),{method:'PATCH',headers:{'Content-Type':'application/json',Prefer:'return=representation'},body:JSON.stringify({media:{...row.media,[catalogKey]:next},updated_at:updatedAt})});
  if(!Array.isArray(result)||result.length!==1)throw Error('作品目录刚刚有新的改动，请重新打开面板再保存。');
  state=next;return get();
 }
 async function upload(file){
  await ready;requireEditor();
  const ext=file.name.split('.').pop().toLowerCase();
  if(!['png','jpg','jpeg','webp','gif','mp4','webm','mov'].includes(ext))throw Error('不支持此素材格式。');
  const path='portfolio-v4/'+crypto.randomUUID()+'.'+ext;
  await request('/storage/v1/object/portfolio-media/'+path,{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','Cache-Control':'31536000','x-upsert':'false'},body:file,signal:AbortSignal.timeout(300000)});
  return config.url+'/storage/v1/object/public/portfolio-media/'+path;
 }
 function validRef(value){return typeof value==='string'&&(value.startsWith(config.url+'/storage/v1/object/public/portfolio-media/')||(/^assets\/[\w./-]+$/.test(value)&&!value.split('/').includes('..')));}
 async function save(item){
  if(!collections[item.collection]||!['video','image'].includes(item.kind)||!item.id||!item.title?.trim()||!validRef(item.file)||!validRef(item.poster))throw Error('作品信息或素材路径无效。');
  return change(next=>{const index=next.items.findIndex(i=>i.id===item.id);const value={...item,updatedAt:new Date().toISOString()};if(index<0)next.items.push(value);else next.items[index]=value;});
 }
 async function deleted(id,value){return change(next=>{const item=next.items.find(i=>i.id===id);if(!item)throw Error('未找到作品。');item.deleted=!!value;});}
 async function reorder(collection,ids,revision){return change(next=>{
  const items=next.items.filter(i=>i.collection===collection&&!i.deleted),byId=new Map(items.map(i=>[i.id,i]));
  if(!collections[collection]||items.length!==ids.length||new Set(ids).size!==items.length||ids.some(id=>!byId.has(id)))throw Error('作品列表已变化，请重新打开排序面板。');
  let index=0;next.items=next.items.map(i=>i.collection===collection&&!i.deleted?byId.get(ids[index++]):i);
 },revision);}
 async function resolve(item){return {...item};}
 return {ready,get,upload,save,deleted,reorder,resolve,authorize,collections,mode:'cloud'};
})();
