import{useLayoutEffect,useRef}from'react'
import{gsap}from'gsap'
import'./PillNav.css'

export default function PillNav({items,baseColor='#d7e6df',pillColor='#214b4c',pillTextColor='#eff8f3',hoveredPillTextColor='#173536'}){
 const circles=useRef([]),timelines=useRef([]),wrap=useRef(null)
 useLayoutEffect(()=>{
  circles.current.forEach((circle,i)=>{if(!circle?.parentElement)return;const pill=circle.parentElement,{width:w,height:h}=pill.getBoundingClientRect(),r=((w*w)/4+h*h)/(2*h),d=Math.ceil(2*r)+2,delta=Math.ceil(r-Math.sqrt(Math.max(0,r*r-(w*w)/4)))+1,origin=d-delta;circle.style.width=`${d}px`;circle.style.height=`${d}px`;circle.style.bottom=`-${delta}px`;gsap.set(circle,{xPercent:-50,scale:0,transformOrigin:`50% ${origin}px`});const normal=pill.querySelector('.pill-label'),hover=pill.querySelector('.pill-label-hover');gsap.set(normal,{y:0});gsap.set(hover,{y:h+30,opacity:0});timelines.current[i]?.kill();timelines.current[i]=gsap.timeline({paused:true}).to(circle,{scale:1.2,duration:.45,ease:'power3.out'},0).to(normal,{y:-(h+8),duration:.45,ease:'power3.out'},0).to(hover,{y:0,opacity:1,duration:.45,ease:'power3.out'},0)})
  gsap.set(wrap.current,{xPercent:-50,y:0,opacity:1,clearProps:'transform'})
 },[items])
 return <nav ref={wrap} className="hero-pill-nav" aria-label="页面导航" style={{'--base':baseColor,'--pill-bg':pillColor,'--pill-text':pillTextColor,'--hover-text':hoveredPillTextColor}}><div className="pill-list">{items.map((item,i)=><a href={item.href} className="pill" key={item.href} onMouseEnter={()=>timelines.current[i]?.play()} onMouseLeave={()=>timelines.current[i]?.reverse()}><span className="hover-circle" ref={el=>circles.current[i]=el}/><span className="label-stack"><span className="pill-label">{item.label}</span><span className="pill-label-hover">{item.label}</span></span></a>)}</div><small>DIGITAL MEDIA · FAN SHUWEI</small></nav>
}
