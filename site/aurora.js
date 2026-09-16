/* Aurora shader supplied by the user from React Bits. Vanilla WebGL2 host for this static portfolio. */
(()=>{
const VERT = `#version 300 es
in vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}
`;
const FRAG = `#version 300 es
precision highp float;

uniform float uTime;
uniform float uAmplitude;
uniform vec3 uColorStops[3];
uniform vec2 uResolution;
uniform float uBlend;
uniform float uLightMode;

out vec4 fragColor;

vec3 permute(vec3 x) {
  return mod(((x * 34.0) + 1.0) * x, 289.0);
}

float snoise(vec2 v){
  const vec4 C = vec4(
      0.211324865405187, 0.366025403784439,
      -0.577350269189626, 0.024390243902439
  );
  vec2 i  = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);

  vec3 p = permute(
      permute(i.y + vec3(0.0, i1.y, 1.0))
    + i.x + vec3(0.0, i1.x, 1.0)
  );

  vec3 m = max(
      0.5 - vec3(
          dot(x0, x0),
          dot(x12.xy, x12.xy),
          dot(x12.zw, x12.zw)
      ), 
      0.0
  );
  m = m * m;
  m = m * m;

  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);

  vec3 g;
  g.x  = a0.x  * x0.x  + h.x  * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

struct ColorStop {
  vec3 color;
  float position;
};

#define COLOR_RAMP(colors, factor, finalColor) {              \
  int index = 0;                                            \
  for (int i = 0; i < 2; i++) {                               \
     ColorStop currentColor = colors[i];                    \
     bool isInBetween = currentColor.position <= factor;    \
     index = int(mix(float(index), float(i), float(isInBetween))); \
  }                                                         \
  ColorStop currentColor = colors[index];                   \
  ColorStop nextColor = colors[index + 1];                  \
  float range = nextColor.position - currentColor.position; \
  float lerpFactor = (factor - currentColor.position) / range; \
  finalColor = mix(currentColor.color, nextColor.color, lerpFactor); \
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution;
  
  ColorStop colors[3];
  colors[0] = ColorStop(uColorStops[0], 0.0);
  colors[1] = ColorStop(uColorStops[1], 0.5);
  colors[2] = ColorStop(uColorStops[2], 1.0);
  
  vec3 rampColor;
  COLOR_RAMP(colors, uv.x, rampColor);
  
  float height = snoise(vec2(uv.x * 2.0 + uTime * 0.1, uTime * 0.25)) * 0.5 * uAmplitude;
  height = exp(height);
  height = (uv.y * 2.0 - height + 0.2);
  float intensity = 0.6 * height;
  
  float midPoint = 0.20;
  float auroraAlpha = smoothstep(midPoint - uBlend * 0.5, midPoint + uBlend * 0.5, intensity);
  
  vec3 auroraColor = intensity * rampColor;
  
  if (uLightMode > 0.5) {
    float energy = clamp(max(intensity, 0.0), 0.0, 1.0);
    float coverage = clamp(auroraAlpha * (0.55 + 0.45 * energy), 0.0, 0.86);
    vec3 chroma = pow(clamp(rampColor, 0.0, 1.0), vec3(1.2));
    float chromaPeak = max(chroma.r, max(chroma.g, chroma.b));
    chroma /= max(chromaPeak, 0.0001);
    fragColor = vec4(mix(vec3(1.0), chroma, min(coverage * 1.08, 0.94)), 1.0);
  } else {
    fragColor = vec4(auroraColor * auroraAlpha, auroraAlpha);
  }
}
`;
const hero=document.querySelector('.portfolio-hero'),container=document.querySelector('.hero-aurora');
if(!hero||!container)return;
const canvas=container.querySelector('canvas'),root=document.documentElement;
const config={colorStops:['#7cff67','#B497CF','#5227FF'],blend:.5,amplitude:1,speed:.5};
const reduced=matchMedia('(prefers-reduced-motion:reduce)');
let gl,program,buffer,vao,frame=0,visible=true,last=0,elapsed=0,previous=0,destroyed=false;
function updateLayout(){
 const header=document.querySelector('.site-header'),bar=document.querySelector('.draft-bar');
 root.style.setProperty('--hero-chrome',`${Math.ceil(header.getBoundingClientRect().height+(bar?.getBoundingClientRect().height||0))}px`);
 root.style.setProperty('--page-width',`${document.documentElement.clientWidth}px`);
}
const headerObserver=new ResizeObserver(updateLayout);
headerObserver.observe(document.querySelector('.site-header'));if(document.querySelector('.draft-bar'))headerObserver.observe(document.querySelector('.draft-bar'));updateLayout();
function stop(){cancelAnimationFrame(frame);frame=0;previous=0;}
function release(){if(!gl)return;if(vao)gl.deleteVertexArray(vao);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);vao=buffer=program=null;}
function shader(type,source){const result=gl.createShader(type);gl.shaderSource(result,source);gl.compileShader(result);if(!gl.getShaderParameter(result,gl.COMPILE_STATUS)){const error=gl.getShaderInfoLog(result);gl.deleteShader(result);throw Error(error);}return result;}
let uniforms;
function init(){
 try{
  gl=canvas.getContext('webgl2',{alpha:true,premultipliedAlpha:true,antialias:false,powerPreference:'low-power'});
  if(!gl)throw Error('WebGL2 unavailable');
  const vertex=shader(gl.VERTEX_SHADER,VERT),fragment=shader(gl.FRAGMENT_SHADER,FRAG);
  program=gl.createProgram();gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);vao=gl.createVertexArray();gl.bindVertexArray(vao);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  uniforms=Object.fromEntries(['uTime','uResolution','uAmplitude','uBlend','uLightMode','uColorStops[0]'].map(name=>[name,gl.getUniformLocation(program,name)]));
  const colors=config.colorStops.flatMap(hex=>[1,3,5].map(offset=>parseInt(hex.slice(offset,offset+2),16)/255));
  gl.uniform3fv(uniforms['uColorStops[0]'],new Float32Array(colors));gl.uniform1f(uniforms.uAmplitude,config.amplitude);gl.uniform1f(uniforms.uBlend,config.blend);gl.uniform1f(uniforms.uLightMode,0);
  gl.clearColor(0,0,0,0);gl.enable(gl.BLEND);gl.blendFunc(gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
  container.dataset.aurora='ready';resize();resume();
 }catch(error){stop();release();container.dataset.aurora='fallback';console.warn('Aurora uses its static fallback:',error.message);}
}
function draw(){if(!program||gl.isContextLost())return;gl.useProgram(program);gl.bindVertexArray(vao);gl.uniform1f(uniforms.uTime,(reduced.matches?5:elapsed*.001)*config.speed);gl.clear(gl.COLOR_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,3);}
function resize(){
 updateLayout();if(!program)return;
 const box=container.getBoundingClientRect(),ratio=Math.min(devicePixelRatio||1,1.5,1600/Math.max(box.width,1));
 const width=Math.max(1,Math.round(box.width*ratio)),height=Math.max(1,Math.round(box.height*ratio));
 if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
 gl.viewport(0,0,width,height);gl.useProgram(program);gl.uniform2f(uniforms.uResolution,width,height);draw();
}
function tick(now){
 frame=0;if(destroyed||!visible||document.hidden||reduced.matches||!program)return;
 if(previous)elapsed+=Math.min(now-previous,100);previous=now;
 if(now-last>=1000/30){last=now;draw();}
 frame=requestAnimationFrame(tick);
}
function resume(){stop();if(destroyed||!program||!visible||document.hidden)return;if(reduced.matches)draw();else frame=requestAnimationFrame(tick);}
const sizeObserver=new ResizeObserver(resize);sizeObserver.observe(container);
const viewObserver=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;resume();},{threshold:0});viewObserver.observe(hero);
window.addEventListener('resize',resize);document.addEventListener('visibilitychange',resume);reduced.addEventListener('change',resume);
canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();stop();program=null;container.dataset.aurora='fallback';});
canvas.addEventListener('webglcontextrestored',()=>{init();});
window.addEventListener('pagehide',event=>{stop();if(event.persisted)return;destroyed=true;headerObserver.disconnect();sizeObserver.disconnect();viewObserver.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('visibilitychange',resume);reduced.removeEventListener('change',resume);release();});
window.addEventListener('pageshow',event=>{if(event.persisted){resize();resume();}});
init();

})();
