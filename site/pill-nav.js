// Native adaptation of the supplied React Bits PillNav circle geometry.
// CSS transitions reproduce the circle fill and sliding labels without React/GSAP.
(() => {
  const pills = [...document.querySelectorAll('.hero-pill-nav .pill')];
  const layout = () => pills.forEach(pill => {
    const {width:w,height:h} = pill.getBoundingClientRect();
    if (!w || !h) return;
    const r = (w*w/4+h*h)/(2*h);
    const d = Math.ceil(2*r)+2;
    const delta = Math.ceil(r-Math.sqrt(Math.max(0,r*r-w*w/4)))+1;
    const circle = pill.querySelector('.hover-circle');
    Object.assign(circle.style,{width:`${d}px`,height:`${d}px`,bottom:`-${delta}px`,transformOrigin:`50% ${d-delta}px`});
  });
  const observer = new ResizeObserver(layout);
  pills.forEach(pill => observer.observe(pill));
  document.fonts?.ready.then(layout);
  layout();
})();
