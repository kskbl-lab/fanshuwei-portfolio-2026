const $ = (s,root=document) => root.querySelector(s);
const $$ = (s,root=document) => [...root.querySelectorAll(s)];
const esc = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const products={picturethis:'PictureThis · 植物识别与养护',woodworking:'Woodsense · 木工制作'};
// StarBorder's two moving radial highlights, clipped to the existing card edge.
const starBorderMarkup='<span class="star-border-ring" aria-hidden="true"><span class="border-gradient-bottom"></span><span class="border-gradient-top"></span></span>';
function decorateStarBorders(root=document){
 root.querySelectorAll('.media-preview,.experience-card,.personal-banner,.product-card').forEach((surface,index)=>{
  if(surface.querySelector(':scope > .star-border-ring'))return;
  surface.classList.add('star-border-container');
  surface.style.setProperty('--star-delay',`${-(index%6)*.8}s`);
  surface.insertAdjacentHTML('beforeend',starBorderMarkup);
 });
}
decorateStarBorders();
const page=document.body.dataset.page;
let currentProduct=new URLSearchParams(location.search).get('product')||'woodworking';
if(!products[currentProduct])currentProduct='woodworking';
window.currentCollection=()=>page==='ruiqi'?currentProduct:page==='personal'?'personal':'kuaishou';
let cleanups=[],controller,objectUrls=[];
window.refreshPortfolio=async()=>{
 const state=await PortfolioStore.get();
 const resolved=await Promise.all(state.items.filter(i=>!i.deleted).map(i=>PortfolioStore.resolve(i)));
 cleanups.forEach(fn=>fn());cleanups=[];controller?.abort();controller=new AbortController();const signal=controller.signal;
 objectUrls.forEach(u=>URL.revokeObjectURL(u));objectUrls=resolved.flatMap(i=>[i.file,i.poster]).filter(u=>u?.startsWith('blob:'));
 const collection=window.currentCollection();const pageItems=page==='index'?[]:resolved.filter(i=>i.collection===collection);
 $$('[data-count]').forEach(el=>el.textContent=resolved.filter(i=>i.collection===el.dataset.count).length);
 $$('[data-group-count]').forEach(el=>el.textContent=String(pageItems.filter(i=>i.group===el.dataset.groupCount).length).padStart(2,'0'));
 $$('[data-group]').forEach(el=>{el.hidden=false;const label=$('.group-heading span',el);if(label)label.textContent=pageItems.filter(i=>i.group===el.dataset.group).length+' PROJECTS';});
 $$('.filter').forEach(el=>{el.setAttribute('aria-pressed',String(el.dataset.filter==='all'));$('span',el).textContent=String(pageItems.filter(i=>el.dataset.filter==='all'||i.kind===el.dataset.filter).length).padStart(2,'0');});
 const count=$('.result-count');if(count)count.textContent=String(pageItems.length).padStart(2,'0')+' 件作品';
 $$('.product-card').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.product===currentProduct)));
 const title=$('#product-work-title');if(title)title.textContent=products[currentProduct];
 $$('.empty-state').forEach(el=>el.remove());
 if($('.work-section')){const empty=document.createElement('div');empty.className='empty-state';empty.hidden=pageItems.length>0;empty.innerHTML='<h3>这里的作品待补充</h3><p>可以上传该分类的图片或视频，也可以切换作品类型查看。</p><button class="manage-button" data-manage>＋ 上传作品</button>';$('.work-section').append(empty);}




const formatDuration = d => `${Math.floor(d/60).toString().padStart(2,'0')}:${Math.floor(d%60).toString().padStart(2,'0')}`;
function mediaCard(item,index){
 const number = String(index+1).padStart(2,'0');
 if(page==='kuaishou')return `<button class="media-card ${item.kind}" data-item="${esc(item.id)}" data-kind="${item.kind}" aria-label="${item.kind==='video'?'播放视频':'查看图片'}：${esc(item.title)}"><div class="media-preview"><img src="${esc(item.poster)}" ${item.width&&item.height?`width="${item.width}" height="${item.height}"`:''} alt="${esc(item.title)}作品预览" loading="lazy" decoding="async"><span class="play-icon" aria-hidden="true">${item.kind==='video'?'▶':'↗'}</span><span class="duration">${item.kind==='video'?(item.duration?formatDuration(item.duration):'播放视频'):'查看原图'}</span><div class="reference-caption"><p>${esc(item.subtitle||'快手 / 快影')}</p><h4>${esc(item.title)} <span aria-hidden="true">↗</span></h4></div></div></button>`;
 return `<button class="media-card ${item.kind}" data-item="${esc(item.id)}" data-kind="${item.kind}" aria-label="${item.kind==='video'?'播放视频':'查看图片'}：${esc(item.title)}"><div class="media-preview"><img src="${esc(item.poster)}" ${item.width&&item.height?`width="${item.width}" height="${item.height}"`:''} alt="${esc(item.title)}作品预览" loading="lazy" decoding="async"><span class="media-shade"></span><span class="media-badge">${item.kind==='video'?'FILM':'IMAGE'} ${number}</span><span class="play-icon" aria-hidden="true">${item.kind==='video'?'▶':'↗'}</span><span class="duration">${item.kind==='video'?(item.duration?formatDuration(item.duration):'播放视频'):'查看原图'}</span></div><h4>${esc(item.title)} <span aria-hidden="true">↗</span></h4><p>${esc(item.subtitle)}</p>${item.fileId?`<p class="file-id">${esc(item.fileId)}</p>`:''}</button>`;
}
$$('[data-gallery]').forEach(gallery=>{
 const kind=gallery.dataset.gallery;
 gallery.innerHTML=pageItems.filter(i=>(kind==='all'||i.kind===kind)&&(!gallery.dataset.section||i.group===gallery.dataset.section)).map(mediaCard).join('');
});
decorateStarBorders();
// Place each item in the shortest column, preserving the source and keyboard order.
const masonryGalleries=$$('.media-grid.masonry');
let layoutFrame=0;
function layoutMasonry(){
 layoutFrame=0;
 masonryGalleries.forEach(gallery=>{
  const width=gallery.clientWidth;
  if(!width)return;
  const css=getComputedStyle(gallery), columns=Number(css.getPropertyValue('--masonry-columns'))||3;
  const gap=Number.parseFloat(css.getPropertyValue('--masonry-gap'))||24;
  const cardWidth=(width-gap*(columns-1))/columns;
  const cards=$$('.media-card',gallery).filter(card=>!card.hidden);
  gallery.classList.add('is-positioned');
  cards.forEach(card=>card.style.width=`${cardWidth}px`);
  const heights=Array(columns).fill(0);
  cards.forEach(card=>{
   const col=heights.indexOf(Math.min(...heights));
   card.style.left=`${col*(cardWidth+gap)}px`;
   card.style.top=`${heights[col]}px`;
   heights[col]+=card.getBoundingClientRect().height+gap;
  });
  gallery.style.height=`${Math.max(0,Math.max(...heights)-gap)}px`;
  window.PortfolioMotion?.refresh(gallery);
 });
}
function scheduleMasonry(){if(!layoutFrame)layoutFrame=requestAnimationFrame(layoutMasonry);}
if(masonryGalleries.length){
 const widths=new WeakMap();
 const observer=new ResizeObserver(entries=>{for(const entry of entries){if(widths.get(entry.target)!==entry.contentRect.width){widths.set(entry.target,entry.contentRect.width);scheduleMasonry();}}});
 masonryGalleries.forEach(gallery=>observer.observe(gallery)); cleanups.push(()=>observer.disconnect());
 document.fonts.ready.then(scheduleMasonry);
 window.addEventListener('resize',scheduleMasonry,{signal});
 scheduleMasonry();
}
// Load at most one silent video preview, only while the pointer is over its card.
let previewCard=null;
function stopPreview(){
 if(!previewCard)return;
 const video=$('.hover-video',previewCard);
 if(video){video.pause();video.removeAttribute('src');video.load();video.remove();}
 previewCard.classList.remove('is-previewing');previewCard=null;
}
if(matchMedia('(hover:hover) and (pointer:fine)').matches&&!matchMedia('(prefers-reduced-motion:reduce)').matches){
 const visibility=new IntersectionObserver(entries=>entries.forEach(e=>{if(!e.isIntersecting&&e.target===previewCard)stopPreview();}));cleanups.push(()=>visibility.disconnect());
 $$('.masonry .media-card.video').forEach(card=>{
  visibility.observe(card);
  card.addEventListener('mouseenter',()=>{
   if(document.body.classList.contains('modal-open'))return;
   stopPreview();previewCard=card;
   const item=pageItems.find(i=>i.id===card.dataset.item),video=document.createElement('video');
   video.className='hover-video';video.muted=true;video.loop=true;video.playsInline=true;video.preload='none';video.setAttribute('aria-hidden','true');video.tabIndex=-1;video.src=item.file;
   video.addEventListener('playing',()=>{if(previewCard===card)card.classList.add('is-previewing');});
   $('.media-preview',card).append(video);
   video.play().catch(()=>{if(previewCard===card)stopPreview();});
  });
  card.addEventListener('mouseleave',()=>{if(previewCard===card)stopPreview();});
 });
 window.addEventListener('blur',stopPreview,{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPreview();},{signal});
}
$$('.filter').forEach(b=>b.replaceWith(b.cloneNode(true)));
$$('.filter').forEach(button=>button.addEventListener('click',()=>{
 stopPreview();
 const filter=button.dataset.filter;
 $$('.filter').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
 $$('.media-card').forEach(card=>card.hidden=filter!=='all'&&card.dataset.kind!==filter);
 let empty=$('.empty-state');if(empty)empty.hidden=pageItems.some(i=>filter==='all'||i.kind===filter);
 $$('[data-group]').forEach(group=>group.hidden=!$$('.media-card',group).some(card=>!card.hidden));
 const count=pageItems.filter(i=>filter==='all'||i.kind===filter).length;
 const status=$('.result-count');if(status)status.textContent=`${String(count).padStart(2,'0')} 件作品`;
 scheduleMasonry();
}));
let dialog,selected=0,activeItems=[],lastTrigger;
if(pageItems.length){
 dialog=document.createElement('dialog');dialog.className='dialog';dialog.setAttribute('aria-labelledby','dialog-title');
 dialog.innerHTML='<div class="dialog-header"><h2 id="dialog-title"></h2><button class="dialog-close" aria-label="关闭作品详情">×</button></div><div class="dialog-content"><div class="dialog-media"></div><div class="dialog-details"></div></div><div class="dialog-controls"><button class="prev">← 上一件</button><span class="dialog-counter" aria-live="polite"></span><button class="next">下一件 →</button></div>';
 document.body.append(dialog);
 const stopMedia=()=>{const video=$('video',dialog);if(video){video.pause();video.removeAttribute('src');video.load();}};
 function renderItem(){
  stopMedia();const item=activeItems[selected];$('#dialog-title',dialog).textContent=item.title;
  $('.dialog-media',dialog).innerHTML=item.kind==='video'?`<video src="${esc(item.file)}" poster="${esc(item.poster)}" controls playsinline preload="metadata" aria-label="${esc(item.title)}完整视频"></video>`:`<a href="${esc(item.file)}" target="_blank" rel="noopener" aria-label="打开${esc(item.title)}原图"><img src="${esc(item.file)}" alt="${esc(item.title)}完整作品"></a>`;
  $('.dialog-details',dialog).innerHTML=`<div class="eyebrow">${esc(item.company)} / ${item.kind==='video'?'VIDEO':'IMAGE'}</div><h3>${esc(item.detailLabel||'画面与内容')}</h3><p>${esc(item.description)}</p><h3>${esc(item.contributionLabel||'参与工作')}</h3><p>${esc(item.contribution)}</p>${item.fileId?`<h3>素材编号</h3><p>${esc(item.fileId)}</p>`:''}<button class="secondary-button edit-in-detail" data-edit="${esc(item.id)}">编辑此作品</button><br><a class="original-link" href="${esc(item.file)}" target="_blank" rel="noopener">${item.kind==='image'?'查看高清原图':'单独打开视频'} ↗</a>`;
  $('.dialog-counter',dialog).textContent=`${selected+1} / ${activeItems.length}`;$('.prev',dialog).disabled=selected===0;$('.next',dialog).disabled=selected===activeItems.length-1;
 }
 $$('.media-card').forEach(card=>card.addEventListener('click',()=>{
  stopPreview();
  const visibleIds=$$('.media-card').filter(c=>!c.closest('[hidden]')).map(c=>c.dataset.item);
  activeItems=visibleIds.map(id=>pageItems.find(i=>i.id===id));selected=activeItems.findIndex(i=>i.id===card.dataset.item);lastTrigger=card;renderItem();document.body.classList.add('modal-open');dialog.showModal();$('.dialog-close',dialog).focus();
 }));
 $('.dialog-close',dialog).addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
 dialog.addEventListener('close',()=>{stopMedia();document.body.classList.remove('modal-open');lastTrigger?.focus();});
 $('.prev',dialog).addEventListener('click',()=>{if(selected>0){selected--;renderItem();}});$('.next',dialog).addEventListener('click',()=>{if(selected<activeItems.length-1){selected++;renderItem();}});
 dialog.addEventListener('keydown',event=>{if(event.target.closest('video'))return;if(event.key==='ArrowLeft'&&selected>0){selected--;renderItem();}else if(event.key==='ArrowRight'&&selected<activeItems.length-1){selected++;renderItem();}});
}

cleanups.push(()=>{stopPreview();if(layoutFrame)cancelAnimationFrame(layoutFrame);dialog?.close();dialog?.remove();});

};
$$('.product-card').forEach(button=>button.addEventListener('click',async()=>{
 currentProduct=button.dataset.product;const url=new URL(location.href);url.searchParams.set('product',currentProduct);url.hash='works';history.replaceState({},'',url);
 try{await window.refreshPortfolio();$('#works').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});}catch(e){showPortfolioError(e);}
}));
function showPortfolioError(error){let el=$('.global-error');if(!el){el=document.createElement('p');el.className='global-error';el.setAttribute('role','alert');document.body.prepend(el);}el.textContent='作品读取失败：'+error.message;}
window.refreshPortfolio().catch(showPortfolioError);
