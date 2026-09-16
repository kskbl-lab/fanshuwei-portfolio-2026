(()=>{
 const store=PortfolioStore,dialog=document.createElement('dialog');dialog.className='manager';dialog.setAttribute('aria-labelledby','manager-title');
 const options=Object.entries(store.collections).map(([key,label])=>`<option value="${key}">${esc(label)}</option>`).join('');
 dialog.innerHTML=`<div class="manager-header"><div><h2 id="manager-title">素材管理</h2><p id="storage-note">正在读取保存位置…</p></div><button class="dialog-close" aria-label="关闭素材管理">×</button></div><div class="manager-body"><form id="work-form"><h3 id="form-title">上传新作品</h3><label>作品分类<select name="collection">${options}</select></label><label>图片 / 视频文件<input name="media" type="file" accept=".png,.jpg,.jpeg,.webp,.gif,.mp4,.webm,.mov" multiple></label><p class="form-tip">支持多选。编辑时留空即可保留原素材；视频会自动提取封面。单个文件不超过 512 MB。</p><label>作品标题<input name="title" maxlength="200" placeholder="留空时使用文件名；多选时以文件名分别命名"></label><label>简短分类 / 副标题<input name="subtitle" maxlength="300" placeholder="例如：角色绑定 / 商业广告"></label><label>作品说明<textarea name="description" rows="3" placeholder="画面内容、创作想法或用户场景"></textarea></label><label>我的工作<textarea name="contribution" rows="3" placeholder="你负责的部分与制作方法"></textarea></label><div class="form-actions"><button class="manage-button" type="submit">保存作品</button><button class="secondary-button" type="button" id="new-work">新建 / 取消编辑</button></div><progress class="upload-progress" hidden></progress></form><section aria-label="现有作品"><div class="manager-toolbar"><select id="manager-category" aria-label="筛选管理分类">${options}</select><button class="secondary-button" id="trash-toggle" aria-pressed="false">回收站</button></div><button class="secondary-button" data-reorder hidden style="margin-bottom:14px">↔ 调整作品顺序</button><p class="manager-count"></p><div class="manager-list"></div></section></div><div class="manager-status" role="status" aria-live="polite"></div>`;
 document.body.append(dialog);
 const form=$('form',dialog),field=name=>form.elements.namedItem(name),category=$('#manager-category',dialog),status=$('.manager-status',dialog),progress=$('progress',dialog);
 let state,editing=null,trash=false,busy=false,urls=[];
 function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
 function setBusy(value){busy=value;$$('button,input,select,textarea',dialog).forEach(el=>el.disabled=value);progress.hidden=!value;}
 function resetForm(){editing=null;form.reset();field('collection').value=category.value;$('#form-title',dialog).textContent='上传新作品';}
 async function render(){
  state=await store.get();$('[data-reorder]',dialog).hidden=document.body.dataset.page!=='kuaishou'||category.value!=='kuaishou'||trash;urls.forEach(u=>URL.revokeObjectURL(u));urls=[];
  const items=state.items.filter(i=>i.collection===category.value&&!!i.deleted===trash),resolved=await Promise.all(items.map(i=>store.resolve(i)));
  urls=resolved.flatMap(i=>[i.file,i.poster]).filter(u=>u?.startsWith('blob:'));
  $('.manager-count',dialog).textContent=`${trash?'回收站':'已收录'} · ${items.length} 件作品${trash?' · 恢复后重新展示':''}`;
  $('.manager-list',dialog).innerHTML=resolved.length?resolved.map(i=>`<article class="manager-row"><img src="${esc(i.poster)}" alt="${esc(i.title)}封面" loading="lazy"><div class="row-copy"><h4>${esc(i.title)}</h4><p>${i.kind==='video'?'视频':'图片'} · ${esc(i.subtitle||store.collections[i.collection])}</p></div><div class="row-actions">${trash?`<button type="button" data-restore="${esc(i.id)}">恢复作品</button>`:`<button type="button" data-edit-work="${esc(i.id)}">编辑</button><button type="button" class="delete" data-delete="${esc(i.id)}">删除</button>`}</div></article>`).join(''):`<div class="empty-state"><h3>${trash?'回收站为空':'还没有作品'}</h3><p>${trash?'删除的作品会保留在这里。':'通过左侧表单添加图片或视频。'}</p></div>`;
 }
 function edit(id){const i=state.items.find(i=>i.id===id);if(!i)return;editing=id;form.reset();for(const name of ['collection','title','subtitle','description','contribution'])field(name).value=i[name]||'';$('#form-title',dialog).textContent='编辑作品';message('编辑「'+i.title+'」，完成后点击保存作品。');form.scrollIntoView({block:'nearest'});field('title').focus({preventScroll:true});}
 async function open(id){
  try{if(!await store.authorize())return;await store.ready;category.value=window.currentCollection();trash=false;$('#trash-toggle',dialog).setAttribute('aria-pressed','false');resetForm();message('');await render();if(id){const item=state.items.find(i=>i.id===id);if(item){category.value=item.collection;await render();edit(id);}}
   $('#storage-note',dialog).textContent='修改保存到云端 · 所有设备同步展示';
   $$('.dialog[open]').forEach(d=>d.close());dialog.showModal();document.body.classList.add('modal-open');
  }catch(e){showPortfolioError(e);}
 }
 document.addEventListener('click',e=>{const manage=e.target.closest('[data-manage]'),editButton=e.target.closest('[data-edit]');if(manage||editButton)open(editButton?.dataset.edit);});
 $('.dialog-close',dialog).addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',e=>{if(busy)e.preventDefault();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');urls.forEach(u=>URL.revokeObjectURL(u));urls=[];});
 category.addEventListener('change',async()=>{resetForm();message('');try{await render();}catch(e){message(e.message,true);}});
 $('#new-work',dialog).addEventListener('click',()=>{resetForm();message('可以继续上传新作品。');});
 $('#trash-toggle',dialog).addEventListener('click',async e=>{trash=!trash;e.currentTarget.setAttribute('aria-pressed',String(trash));try{await render();}catch(error){message(error.message,true);}});
 $('.manager-list',dialog).addEventListener('click',async e=>{
  const editButton=e.target.closest('[data-edit-work]');if(editButton){edit(editButton.dataset.editWork);return;}
  const button=e.target.closest('[data-delete],[data-restore]');if(!button||busy)return;
  const id=button.dataset.delete||button.dataset.restore,deleted=!!button.dataset.delete,item=state.items.find(i=>i.id===id);setBusy(true);
  try{await store.deleted(id,deleted);await render();await window.refreshPortfolio();if(editing===id)resetForm();message(`「${item.title}」${deleted?'已移入回收站，可随时恢复。':'已恢复展示。'}`);}catch(error){message(error.message,true);}finally{setBusy(false);}
 });
 async function inspect(file){
  if(!file.size||file.size>512*1024*1024)throw Error(file.name+'：文件为空或超过 512 MB。');
  const ext=file.name.split('.').pop().toLowerCase(),kind=['png','jpg','jpeg','gif','webp'].includes(ext)?'image':['mp4','webm','mov'].includes(ext)?'video':null;
  if(!kind)throw Error(file.name+'：暂不支持此文件格式。');
  const url=URL.createObjectURL(file),media=document.createElement(kind==='video'?'video':'img');
  try{
   let result;
   if(kind==='image'){
    await new Promise((resolve,reject)=>{media.onload=resolve;media.onerror=()=>reject(Error(file.name+'：图片无法读取。'));media.src=url;});
    result={kind,width:media.naturalWidth,height:media.naturalHeight};
   }else{
    media.muted=true;media.preload='auto';media.playsInline=true;
    await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(file.name+'：读取视频超时，请使用 H.264 MP4。')),45000);media.onloadeddata=()=>{clearTimeout(timer);resolve();};media.onerror=()=>{clearTimeout(timer);reject(Error(file.name+'：浏览器无法播放，请转为 H.264 MP4 后上传。'));};media.src=url;});
    result={kind,width:media.videoWidth,height:media.videoHeight,duration:Number.isFinite(media.duration)?media.duration:0};
    if(!result.width||!result.height)throw Error(file.name+'：未能读取视频画面。');
    if(media.duration>.3)await new Promise(resolve=>{const timer=setTimeout(resolve,2500);media.onseeked=()=>{clearTimeout(timer);resolve();};media.currentTime=Math.min(1,media.duration/3);});
    const canvas=document.createElement('canvas'),scale=Math.min(1,1000/result.width);canvas.width=Math.round(result.width*scale);canvas.height=Math.round(result.height*scale);canvas.getContext('2d').drawImage(media,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.88));if(!blob)throw Error('视频封面生成失败。');result.posterFile=new File([blob],'poster.jpg',{type:'image/jpeg'});
   }
   return result;
  }finally{if(kind==='video'){media.pause();media.removeAttribute('src');media.load();}URL.revokeObjectURL(url);}
 }
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy)return;const files=[...field('media').files],target=field('collection').value,old=state.items.find(i=>i.id===editing);
  if(!old&&!files.length){message('请先选择要上传的图片或视频。',true);field('media').focus();return;}
  if(old&&files.length>1){message('编辑单件作品时请只选择一个替换文件；批量上传请先点击「新建」。',true);return;}
  const title=field('title').value.trim();if(old&&!title){message('请填写作品标题。',true);return;}
  const meta={collection:target,title,subtitle:field('subtitle').value.trim()||store.collections[target],description:field('description').value.trim(),contribution:field('contribution').value.trim(),company:target==='personal'?'个人创作':target==='kuaishou'?'快手 / 快影':store.collections[target],detailLabel:'作品说明',contributionLabel:'我的工作'};
  setBusy(true);let completed=0;
  try{
   if(!files.length){await store.save({...old,...meta});completed=1;}
   else for(const file of files){
    message(`正在保存 ${completed+1} / ${files.length}：${file.name}`);const {posterFile,...media}=await inspect(file),ref=await store.upload(file),poster=posterFile?await store.upload(posterFile):ref;
    const item={...(old||{}),...meta,...media,id:old?.id||'upload-'+crypto.randomUUID(),file:ref,poster,title:files.length===1&&title?title:file.name.replace(/\.[^.]+$/,''),deleted:false};
    if(old){delete item.fileId;delete item.originalFile;}await store.save(item);completed++;
   }
   category.value=target;trash=false;$('#trash-toggle',dialog).setAttribute('aria-pressed','false');resetForm();await render();await window.refreshPortfolio();message(`已保存 ${completed} 件作品。${'已保存到云端，刷新或换设备后仍然保留。'}`);
  }catch(error){await render().catch(()=>{});await window.refreshPortfolio().catch(()=>{});message((completed?`已保存 ${completed} 件；剩余未保存。`:'')+error.message,true);}
  finally{setBusy(false);}
 });
})();
