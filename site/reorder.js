(()=>{
 const trigger=document.querySelector('[data-reorder]');if(!trigger)return;
 const dialog=document.createElement('dialog');dialog.className='order-dialog';dialog.setAttribute('aria-labelledby','order-title');
 dialog.innerHTML='<header class="order-header"><div><h2 id="order-title">调整快手作品顺序</h2><p>拖动卡片调整先后，或点击前移、后移。瀑布流会根据画面高度自动排列。</p></div><button class="dialog-close" aria-label="关闭排序面板">×</button></header><div class="order-grid" role="list" aria-label="作品顺序"></div><footer class="order-footer"><div><p class="order-status" role="status" aria-live="polite">调整后点击保存生效。</p><span class="order-count"></span></div><div><button class="secondary-button" data-order-reset>撤销本次调整</button><button class="manage-button" data-order-save>保存顺序</button></div></footer>';
 document.body.append(dialog);
 const grid=dialog.querySelector('.order-grid'),save=dialog.querySelector('[data-order-save]'),reset=dialog.querySelector('[data-order-reset]'),status=dialog.querySelector('.order-status');
 let items=[],original=[],revision=0,busy=false,dragId=null,urls=[],dirty=false;
 const message=(text,error=false)=>{status.textContent=text;status.classList.toggle('error',error);};
 function render(focusId,action){
  dirty=items.some((item,index)=>item.id!==original[index]);save.disabled=busy||!dirty;reset.disabled=busy||!dirty;
  grid.innerHTML=items.map((item,index)=>`<article class="order-card" role="listitem" draggable="${!busy}" data-order-id="${esc(item.id)}"><div class="order-thumb"><img src="${esc(item.poster)}" alt="${esc(item.title)}封面" draggable="false"><span class="order-number">${String(index+1).padStart(2,'0')}</span><span class="drag-handle" aria-hidden="true">⠿ 拖动</span></div><h3>${esc(item.title)}</h3><div class="order-controls"><button data-move="-1" aria-label="前移：${esc(item.title)}" ${busy||index===0?'disabled':''}>← 前移</button><button data-move="1" aria-label="后移：${esc(item.title)}" ${busy||index===items.length-1?'disabled':''}>后移 →</button><label>移到第 <select aria-label="${esc(item.title)}的位置" ${busy?'disabled':''}>${items.map((_,n)=>`<option value="${n}" ${n===index?'selected':''}>${n+1}</option>`).join('')}</select> 位</label></div></article>`).join('');
  dialog.querySelector('.order-count').textContent=`${items.length} 件作品 · ${dirty?'有未保存的调整':'当前展示顺序'}`;
  if(focusId){const card=[...grid.children].find(el=>el.dataset.orderId===focusId);const target=action==='select'?card?.querySelector('select'):card?.querySelector(`[data-move="${action}"]:not(:disabled)`);(target||card?.querySelector('select'))?.focus({preventScroll:true});}
 }
 function move(id,to,action){
  if(busy)return;const from=items.findIndex(i=>i.id===id);to=Math.max(0,Math.min(items.length-1,to));if(from<0||from===to)return;
  const [item]=items.splice(from,1);items.splice(to,0,item);render(id,action);message(`「${item.title}」已移至第 ${to+1} 位，点击保存顺序生效。`);
 }
 async function open(){
  if(busy)return;
  try{if(!await PortfolioStore.authorize())return;const state=await PortfolioStore.get();revision=state.revision||0;items=await Promise.all(state.items.filter(i=>i.collection==='kuaishou'&&!i.deleted).map(i=>PortfolioStore.resolve(i)));original=items.map(i=>i.id);urls=items.flatMap(i=>[i.file,i.poster]).filter(u=>u?.startsWith('blob:'));message('调整后点击保存生效。');render();dialog.showModal();dialog.scrollTop=0;document.body.classList.add('modal-open');}
  catch(error){showPortfolioError(error);}
 }
 document.addEventListener('click',event=>{if(!event.target.closest('[data-reorder]'))return;document.querySelector('.manager[open]')?.close();open();});
 dialog.querySelector('.dialog-close').addEventListener('click',()=>{if(!busy)dialog.close();});
 dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
 dialog.addEventListener('close',()=>{document.body.classList.remove('modal-open');urls.forEach(u=>URL.revokeObjectURL(u));urls=[];trigger.focus({preventScroll:true});});
 grid.addEventListener('click',event=>{const button=event.target.closest('[data-move]');if(!button)return;const id=button.closest('[data-order-id]').dataset.orderId;move(id,items.findIndex(i=>i.id===id)+Number(button.dataset.move),button.dataset.move);});
 grid.addEventListener('change',event=>{if(event.target.tagName!=='SELECT')return;move(event.target.closest('[data-order-id]').dataset.orderId,Number(event.target.value),'select');});
 grid.addEventListener('dragstart',event=>{const card=event.target.closest('[data-order-id]');if(!card||busy||event.target.closest('button,select')){event.preventDefault();return;}dragId=card.dataset.orderId;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',dragId);card.classList.add('is-dragging');});
 const clearDrop=()=>grid.querySelectorAll('.drop-target,.is-dragging').forEach(el=>el.classList.remove('drop-target','is-dragging'));
 grid.addEventListener('dragover',event=>{if(!dragId||busy)return;event.preventDefault();event.dataTransfer.dropEffect='move';grid.querySelectorAll('.drop-target').forEach(el=>el.classList.remove('drop-target'));event.target.closest('[data-order-id]')?.classList.add('drop-target');});
 grid.addEventListener('drop',event=>{if(!dragId||busy)return;event.preventDefault();const card=event.target.closest('[data-order-id]'),id=dragId;dragId=null;clearDrop();if(card)move(id,items.findIndex(i=>i.id===card.dataset.orderId),'select');});
 grid.addEventListener('dragend',()=>{dragId=null;clearDrop();});
 reset.addEventListener('click',()=>{const byId=new Map(items.map(i=>[i.id,i]));items=original.map(id=>byId.get(id));render();message('已撤销本次调整，恢复为打开面板时的顺序。');});
 save.addEventListener('click',async()=>{
  if(busy||!dirty)return;busy=true;render();dialog.querySelector('.dialog-close').disabled=true;message('正在保存顺序…');
  try{const state=await PortfolioStore.reorder('kuaishou',items.map(i=>i.id),revision);revision=state.revision||0;original=items.map(i=>i.id);await window.refreshPortfolio();message('顺序已保存，刷新或重新打开后仍会保留。');}
  catch(error){message(error.message,true);}finally{busy=false;dialog.querySelector('.dialog-close').disabled=false;render();}
 });
})();
