import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import './GridScan.css'

const vertexShader = `
varying vec2 vUv;
void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }
`

const fragmentShader = `
precision highp float;
varying vec2 vUv;
uniform vec2 iResolution;
uniform float iTime;
uniform vec2 uPointer;
uniform vec3 uLineColor;
uniform vec3 uScanColor;
uniform float uThickness;
uniform float uScale;
uniform float uOpacity;

float line(float value,float width){
  float grid=abs(fract(value-.5)-.5)/fwidth(value);
  return 1.-min(grid/width,1.);
}

void main(){
  vec2 p=(gl_FragCoord.xy*2.-iResolution.xy)/iResolution.y;
  float angle=uPointer.x*.12;
  p=mat2(cos(angle),-sin(angle),sin(angle),cos(angle))*p;
  p.x+=uPointer.x*.52;
  p.y+=uPointer.y*.24;
  float horizon=.2+uPointer.y*.16;
  float z=1.15/max(.055,abs(p.y-horizon));
  float side=(p.x+uPointer.x*z*.018)*z;
  float perspective=z+iTime*.07;
  float gx=line(side/uScale,uThickness);
  float gy=line(perspective/uScale,uThickness);
  float grid=max(gx,gy);
  float depthFade=smoothstep(18.,1.2,z)*smoothstep(-1.4,.15,p.y);
  float scanPos=mod(iTime*.34,5.5)-.5;
  float beam=exp(-pow((z-scanPos)*.58,2.));
  float sideGlow=exp(-pow(p.x-uPointer.x*.5,2.)*2.4)*.42;
  vec3 color=uLineColor*grid*depthFade;
  color+=uScanColor*(beam*grid*.9+beam*.08+sideGlow*grid);
  float vignette=smoothstep(1.65,.25,length(p*.58));
  float noise=fract(sin(dot(gl_FragCoord.xy+vec2(iTime*37.),vec2(12.9898,78.233)))*43758.5453);
  color+=(noise-.5)*.025;
  float alpha=clamp((grid*depthFade+beam*.08)*vignette*uOpacity,0.,1.);
  gl_FragColor=vec4(color,alpha);
}
`

export default function GridScan({ lineThickness=1.2, linesColor='#485057', gridScale=.12, scanColor='#c8ff32', scanOpacity=.82, className='' }) {
  const root = useRef(null)
  useEffect(() => {
    const el=root.current
    if(!el) return
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true})
    renderer.setPixelRatio(Math.min(devicePixelRatio,2))
    renderer.setClearColor(0x000000,0)
    el.appendChild(renderer.domElement)
    const uniforms={
      iResolution:{value:new THREE.Vector2()},iTime:{value:0},uPointer:{value:new THREE.Vector2()},
      uLineColor:{value:new THREE.Color(linesColor)},uScanColor:{value:new THREE.Color(scanColor)},
      uThickness:{value:lineThickness},uScale:{value:gridScale},uOpacity:{value:scanOpacity}
    }
    const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false})
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1,1,1,-1,0,1)
    const geometry=new THREE.PlaneGeometry(2,2),mesh=new THREE.Mesh(geometry,material);scene.add(mesh)
    const pointer=new THREE.Vector2(),current=new THREE.Vector2()
    const resize=()=>{const w=el.clientWidth,h=el.clientHeight;renderer.setSize(w,h);uniforms.iResolution.value.set(w*renderer.getPixelRatio(),h*renderer.getPixelRatio())}
    const move=e=>{const r=el.getBoundingClientRect();pointer.set(THREE.MathUtils.clamp(((e.clientX-r.left)/r.width)*2-1,-1,1),THREE.MathUtils.clamp(-(((e.clientY-r.top)/r.height)*2-1),-1,1))}
    const leave=()=>pointer.set(0,0)
    let raf
    const tick=t=>{current.lerp(pointer,.045);uniforms.uPointer.value.copy(current);uniforms.iTime.value=t/1000;renderer.render(scene,camera);raf=requestAnimationFrame(tick)}
    resize();window.addEventListener('resize',resize);window.addEventListener('pointermove',move);document.documentElement.addEventListener('mouseleave',leave);raf=requestAnimationFrame(tick)
    return()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',resize);window.removeEventListener('pointermove',move);document.documentElement.removeEventListener('mouseleave',leave);material.dispose();geometry.dispose();renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()}
  },[lineThickness,linesColor,gridScale,scanColor,scanOpacity])
  return <div ref={root} className={`gridscan ${className}`} aria-hidden="true" />
}
