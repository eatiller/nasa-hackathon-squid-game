// Game state, 3D loader (Three.js), and UI wiring.
// Inputs (RFID platform and keyboard in input.js) only call unlock(id), add(), primary(), nav(d) and reset().
// Flow: build (place parts) -> ready (Wake up, Oppy) -> rewind (date rolls back to launch) -> timeline (slides) -> ending (silhouette) -> reset.
const unlocked=new Set();
let phase='build',pending=-1,slide=0,tries=0,endAt=0,timers=[],step=0,busy=false,seq=0;
const $=s=>document.querySelector(s);
const has=i=>unlocked.has(PARTS[i].id);
const pad=n=>String(n).padStart(2,'0');
const later=(f,ms)=>timers.push(setTimeout(f,ms));
const CALM=matchMedia('(prefers-reduced-motion: reduce)').matches;   // stars stay still for people who asked for less motion
document.querySelectorAll('[data-ui]').forEach(e=>e.textContent=UI[e.dataset.ui]);
document.querySelectorAll('[data-aria]').forEach(e=>e.setAttribute('aria-label',UI[e.dataset.aria]));

// ---- unfold panels (tab and timeline card): fold() collapses to the line, swap() refills and opens again
function fold(el){clearTimeout(el._t);if(el.classList.contains('open')){el.classList.remove('open');el._shut=performance.now()}}
function swap(el,fill){
  fold(el);
  const wait=Math.max(0,560-(performance.now()-(el._shut||-1e9)));
  el._t=setTimeout(()=>{fill();el.classList.add('open')},wait);
}

// ---- redraw everything from state
function update(){
  document.body.dataset.phase=phase;
  $('#tParts').textContent=UI.tParts+' '+unlocked.size+'/'+PARTS.length;
  $('#tState').textContent=UI.state[phase];
  $('#intro').classList.toggle('gone',unlocked.size>0||pending>=0);
  PARTS.forEach((p,i)=>{const g=$('#p-'+p.id);if(g){g.classList.toggle('on',has(i));g.classList.toggle('pend',i===pending)}});
  const r=$('#rover');
  r.classList.toggle('dusty',phase==='build'||phase==='ready'||tries>0);
  r.classList.toggle('sil',phase==='ending');
  $('#stage').classList.toggle('awake',phase==='rewind'||phase==='timeline');
  if(GL.ready)GL.sync();
}

// ---- building
// Called by every input when a part is placed. Opens the part tab; the part joins the rover on add().
function unlock(id){
  const i=PARTS.findIndex(p=>p.id===id);
  if(i<0||phase!=='build'||unlocked.has(id)||i===pending)return false;   // tags are ignored after the build
  if(pending>=0)add();                                                    // a new tag commits the open one first
  pending=i;update();
  swap($('#tab'),()=>{fillTab(i);$('#add').focus({preventScroll:true})});
  return true;
}
// Shrink the tab's text until it all fits (no scrolling), whatever the screen size.
function fitTab(){
  const b=$('#tab .body'),inf=$('#tabInfo');
  for(let f=16;f>=9;f-=.5){b.style.fontSize=f+'px';if(inf.scrollHeight<=inf.clientHeight+1&&b.scrollHeight<=b.clientHeight+1)break}
}
addEventListener('resize',()=>{if(pending>=0)fitTab();if(phase==='timeline')fitSlide();if(photo>=0)fitPhoto()});
// Same for the timeline card's event text (left half of the card).
function fitSlide(){
  const e=$('#slide .ev');if(!e)return;
  for(let f=16;f>=9;f-=.5){e.style.fontSize=f+'px';if(e.scrollHeight<=e.clientHeight+1)break}
}
function fillTab(i){
  const p=PARTS[i];
  $('#tabHead').innerHTML='<p class="lbl">'+UI.tabLabel+'<span>'+pad(i+1)+' / '+pad(PARTS.length)+'</span></p><p class="tag">'+p.tag+'</p><h2>'+p.name+'</h2>';
  $('#tabInfo').innerHTML='<p>'+p.desc+'</p><dl>'+p.specs.map(s=>'<dt>'+s[0]+'</dt><dd>'+s[1]+'</dd>').join('')+'</dl><p class="fact">'+p.fact+'</p>';
  $('#tabgl').classList.toggle('none',!GL.preview(i));
  fitTab();
}
function add(){
  if(pending<0)return;
  const i=pending;pending=-1;unlocked.add(PARTS[i].id);
  fold($('#tab'));
  if(unlocked.size===PARTS.length)phase='ready';
  update();if(GL.ready)GL.pop(i);
  if(document.activeElement)document.activeElement.blur();
  if(phase==='ready')later(()=>$('#wakeBtn').focus({preventScroll:true}),700);
}

// ---- wake up and rewind to launch
function wake(){
  if(phase!=='ready')return;
  phase='rewind';update();if(GL.ready)GL.wake();
  const strip=$('#rwStrip'),W=140,y0=2003,from=2018+5.5/12,to=2003+6/12,T=3400;let t0=0;
  strip.innerHTML='';for(let y=y0;y<=2019;y++)strip.insertAdjacentHTML('beforeend','<span>'+y+'</span>');
  $('#rwLbl').textContent=UI.rwLbl;$('#rwDate').textContent=UI.months[5]+' 2018';
  $('#rewind').classList.add('intro');   // at first only "Opportunity is awake…"; the date and ruler are hidden
  strip.style.transform='translateX('+(-(from-y0)*W)+'px)';   // the ruler waits at the same date
  GL.skyOn=false;GL.starSweep=0;
  later(()=>GL.skyOn=true,1300);   // stars fade in with the line (the overlay fades in at 1.3 s, after the dust)
  const step=now=>{
    if(phase!=='rewind')return;
    t0=t0||now;
    const k=Math.min(1,(now-t0)/T),e=k<.5?4*k*k*k:1-Math.pow(-2*k+2,3)/2,p=from+(to-from)*e,y=Math.floor(p);
    strip.style.transform='translateX('+(-(p-y0)*W)+'px)';
    $('#rwDate').textContent=UI.months[Math.min(11,Math.floor((p-y)*12))]+' '+y;
    GL.starSweep=e;   // the stars sweep past with the rewind: slow, fast, slow
    if(k<1){requestAnimationFrame(step);return}
    $('#rwDate').textContent=UI.rwLand;$('#rwLbl').textContent=UI.rwLandLbl;
    later(()=>{phase='timeline';slide=0;update();showSlide()},1400);
  };
  // the dust parts; "Opportunity is awake" fades in at 1.3 s and stays alone for a few seconds;
  // then the date and ruler fade in (JUN 2018), and the rewind starts rolling
  later(()=>$('#rewind').classList.remove('intro'),3000);
  later(()=>requestAnimationFrame(step),3500);
}

// ---- timeline: on each card, wake Oppy (status report), then give her instructions one by one (a part works, findings come back),
// and her picture pops up after the last one. Nothing moves on by itself: every step waits for the button (or Enter).
// step: how many exchanges are done (0 asleep, 1 status received, 1+n after the nth instruction). busy: Oppy is answering.
// seq: bumps on every card change, so callbacks from a card you already left do nothing.
const ev=()=>TIMELINE[slide][3]||{};
const fmt=(s,o)=>s.replace(/\{(\w+)\}/g,(m,k)=>o[k]);
const ACTP={snap:'camera',pan:'camera',arm:'arm',drive:'wheels',back:'wheels',odo:'wheels',panels:'solar'};   // which part does each job
const row=r=>(r[0]+' ').padEnd(18,'.')+' '+r[1];
const turnsDone=x=>step>(x.turns||[]).length;   // woken up and every instruction given
function showSlide(){
  const t=TIMELINE[slide],last=slide===TIMELINE.length-1,x=ev();
  seq++;step=0;busy=false;closePhoto();
  if(x.tries)tries=0;   // the storm card starts fresh (going back to it undoes the wake attempts)
  const hz=$('#haze');hz.classList.remove('gust');GL.gust(x.fx==='storm');
  if(x.fx==='storm'){void hz.offsetWidth;hz.classList.add('gust')}   // restart the haze animation
  $('#prev').hidden=slide===0;$('#next').hidden=last||!!x.tries;   // the storm card only moves on after the wake attempts
  document.querySelectorAll('.fly,.vf').forEach(e=>e.remove());   // a picture still in flight from the card you left
  pano(x.pano);$('#pano').classList.toggle('storm',x.fx==='storm');
  const from=+($('#trail').dataset.at||0);drawMap(x.at);if(GL.ready&&x.at!==from)GL.drive(x.at>from?1:-1);   // she drives with the map dot
  $('#tSol').textContent=UI.tSol+' '+x.sol.toLocaleString('en');
  if(GL.ready){GL.focus(-1);GL.aim(0);GL.cleanAt=-1}
  update();
  swap($('#slide'),()=>{
    $('#slBody').innerHTML='<div class="ev"><p class="lbl">'+UI.tlHead+'<span'+(UI.tlHead?'':' class="solo"')+'>'+pad(slide+1)+' / '+pad(TIMELINE.length)+'</span></p><p class="when">'+t[0]+'</p><h2>'+t[1]+'</h2><p>'+t[2]+'</p></div>'
      +'<div class="talk"><div id="log"></div><p class="btns"><button id="act" type="button">'+UI.wake+'</button>'
      +'<button id="pic" class="ghost" type="button" hidden>'+UI.viewPic+'</button></p></div>';
    $('#act').onclick=primary;$('#pic').onclick=()=>openPhoto(slide);fitSlide();
    $('#act').focus({preventScroll:true});
  });
}
// Her picture arrives: a camera on the rover takes it (the mast turns, or the arm's Microscopic Imager for cam:'arm'),
// then it flies out of that camera into the picture pop-up as the pop-up opens. Then done().
function downlink(i,done){
  const x=TIMELINE[i][3],s=seq,ph=$('#photo');
  const cam=x.cam==='arm'?'arm':'mast',last=(x.turns||[]).slice(-1)[0],shot=cam==='mast'&&!(last&&/^(snap|pan)$/.test(last.act));
  if(GL.ready){if(shot)GL.act('snap');GL.focus(PARTS.findIndex(p=>p.id===(cam==='arm'?'arm':'camera')))}
  const land=()=>{ph.classList.remove('arriving');if(s!==seq)return;if(GL.ready)GL.focus(-1);done()};
  later(()=>{
    if(s!==seq)return;
    const from=!CALM&&GL.ready&&GL.screenAt(cam);
    if(!from){openPhoto(i);land();return}   // no camera to fly from (reduced motion, other models): it just pops up
    const vf=document.createElement('i');vf.className='vf';vf.style.left=from.x+'px';vf.style.top=from.y+'px';document.body.appendChild(vf);
    later(()=>{
      vf.remove();if(s!==seq)return;
      ph.classList.add('arriving');openPhoto(i);
      let n=0;const fly=()=>{   // swap() fills the pop-up a moment later: wait for it, then fly into its picture frame
        if(s!==seq||photo!==i){land();return}
        if(!ph.classList.contains('open')&&n++<40){later(fly,30);return}
        const r=$('#phImg').getBoundingClientRect(),f=document.createElement('img');
        f.className='fly';f.src=x.img;f.alt='';
        Object.assign(f.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});document.body.appendChild(f);
        const k=.04,tx=from.x-r.left-r.width*k/2,ty=from.y-r.top-r.height*k/2;
        f.animate([{transform:'translate('+tx+'px,'+ty+'px) scale('+k+')'},{transform:'none'}],{duration:800,easing:'cubic-bezier(.3,.1,.2,1)'})
          .onfinish=()=>{land();requestAnimationFrame(()=>f.remove())};
      };
      fly();
    },550);
  },shot?900:400);
}
const cardOpen=()=>$('#slide').classList.contains('open')&&$('#act');   // the card has finished unfolding: its button is the live one
function nav(d){
  if(photo>=0){if(gallery)openPhoto(photo+d,true);return}   // ←/→ browse the gallery; a picture pop-up must be closed first
  if(phase!=='timeline')return;
  const x=ev(),n=Math.max(0,Math.min(TIMELINE.length-1,slide+d));
  if(n===slide||(d>0&&x.tries&&tries<WAKE_TRIES))return;   // no skipping past the storm before the wake attempts
  slide=n;showSlide();
}
// Talk to Oppy: k=0 wakes her up (status comes back), k>=1 gives instruction k (a part works, findings come back).
// Your line shows straight away; her answer types in under it. After the last instruction her picture pops up.
function send(k){
  const x=ev(),s=seq,b=cardOpen(),tn=k?x.turns[k-1]:null;if(busy||!b)return;
  busy=true;b.disabled=true;
  if(tn&&tn.gap)gap(tn.gap);
  say(tn?tn.cmd:UI.wake);
  const act=tn?tn.act:'';
  if(GL.ready){if(!k)GL.aim(1);if(act){GL.act(act);GL.focus(PARTS.findIndex(p=>p.id===ACTP[act]))}}   // the antenna turns to Earth; the part does its job
  later(()=>{
    if(s!==seq)return;
    const lines=tn?tn.found||[]:[fmt(UI.goodMorning,{sol:x.sol.toLocaleString('en')})].concat(x.status.map(row));   // picture commands send no text: the picture pops up
    typeAll(lines,()=>{
      if(s!==seq)return;
      if(x.tries&&!k)later(()=>{if(s===seq){say(UI.lost,'lost');fin()}},900);   // the storm card: the signal cuts out right after her status
      else fin();
    },!tn);
  },act?2200:450);
  function fin(){
    if(GL.ready)GL.focus(-1);
    step=k+1;busy=false;b.disabled=false;
    const next=(x.turns||[])[step-1],done=turnsDone(x);
    b.textContent=next?next.cmd:x.tries?UI.wake:UI.nextStop;
    if(!(done&&x.img)){b.focus({preventScroll:true});return}
    // her picture: busy until it has flown out of her camera into the pop-up, then See the picture can reopen it
    busy=true;b.disabled=true;
    later(()=>{if(s===seq)downlink(slide,()=>{busy=false;b.disabled=false;$('#pic').hidden=false})},400);
  }
}
// The storm card: after the signal is lost, try to wake Oppy WAKE_TRIES times.
// No answer: the button fades back in as Good night, Oppy, which goes to the ending.
function tryWake(){
  const b=cardOpen(),s=seq;if(!b||busy)return;
  if(tries>=WAKE_TRIES){goodbye();return}
  busy=true;b.disabled=true;tries++;update();
  say(UI.wake);
  later(()=>{
    if(s!==seq)return;
    type(UI.tryLog[Math.min(tries,UI.tryLog.length)-1],()=>{
      if(s!==seq)return;
      const ok=()=>{busy=false;b.disabled=false;b.focus({preventScroll:true})};
      if(tries<WAKE_TRIES){ok();return}
      b.classList.add('fadeout');   // the wake-up button fades out, what really happened next fades in, then Good night, Oppy
      // what really happened types in like her other lines, one log line per piece, with a short pause after each
      const R=UI.realLife,PAUSE=2000,line=i=>{
        if(s!==seq)return;
        if(i<R.length){type(R[i],()=>later(()=>line(i+1),PAUSE),1);return}
        b.textContent=UI.goodbye;b.classList.remove('fadeout');b.classList.add('fadein');ok();
      };
      later(()=>line(0),900);
    });
  },700);
}
// Your side of the conversation: shown at once, in the accent color. gap(): a time jump between instructions.
function say(s,cls){const log=$('#log');if(!log)return;const p=document.createElement('p');p.className=cls||'you';p.textContent=s;log.appendChild(p);follow(log);return p}
// Keep Oppy's side scrolled to the newest line.
const follow=log=>{log.scrollTop=log.scrollHeight};
const gap=s=>say(s,'gap');
// Oppy's side: typewriter lines. fast: report speed (status and findings), otherwise the slower wake-attempt speed.
function type(s,done,fast){
  const log=$('#log');if(!log)return;
  const p=document.createElement('p');log.appendChild(p);
  let i=0;const t=setInterval(()=>{
    if(!p.isConnected){clearInterval(t);return}
    p.textContent=s.slice(0,++i);follow(log);
    if(i>=s.length){clearInterval(t);later(()=>p.isConnected&&done&&done(),fast?110:500)}
  },fast?9:28);
  return p;
}
function typeAll(lines,done,head){
  const go=i=>{if(i>=lines.length){done();return}const p=type(lines[i],()=>go(i+1),1);if(p&&head&&!i)p.className='head'};
  go(0);
}
// Picture pop-up (like the part tab): Oppy's picture for a card, or the photo gallery on the ending (gallery: ←/→ browse all of them).
// photo: the TIMELINE index shown, or -1 when closed.
let photo=-1,gallery=false;
const PICS=()=>TIMELINE.map((t,i)=>i).filter(i=>(TIMELINE[i][3]||{}).img);
function openPhoto(i,gal){
  const P=PICS();if(gal)i=P[(P.indexOf(i)+P.length)%P.length]??P[0];   // gallery wraps around
  if(i===undefined||!TIMELINE[i][3].img)return;
  const browsing=gal&&gallery&&photo>=0;   // already in the gallery: change the picture and text in place, no fold
  photo=i;gallery=!!gal;document.body.classList.add('pic');
  const x=TIMELINE[i][3],n=P.indexOf(i);
  (browsing?(el,f)=>f():swap)($('#photo'),()=>{
    $('#phImg').innerHTML='<img alt="'+x.cap+'" src="'+x.img+'">';
    $('#phImg img').onload=()=>requestAnimationFrame(fitPhoto);fitPhoto();   // fit the text again once the picture is in (layout can shift)
    $('#phHead').innerHTML='<p class="lbl">'+(gal?UI.gallery+'<span>'+pad(n+1)+' / '+pad(P.length)+'</span>':UI.photoLbl)+'</p>'
      +'<h2>'+x.cap+'</h2><p class="about">'+x.about+'</p><p class="credit">'+x.credit+'</p>'
      +(gal?'<p class="fact">'+UI.galleryNote+'</p>':'');
    $('#phNav').hidden=!gal;
    $('#phClose').textContent=gal?UI.close:UI.backToOppy;
    if(!browsing)$('#phClose').focus({preventScroll:true});
  });
}
// Shrink the pop-up text until the text, the gallery buttons and Back to Oppy all fit.
function fitPhoto(){
  const h=$('#phHead'),b=$('#photo .body');
  for(let f=16;f>=9;f-=.5){h.style.fontSize=f+'px';if(b.scrollHeight<=b.clientHeight+1)break}
}
function closePhoto(){
  if(photo<0)return;
  photo=-1;gallery=false;fold($('#photo'));document.body.classList.remove('pic');$('#photo').classList.remove('arriving');
  const b=phase==='timeline'?$('#act'):phase==='ending'?$('#galBtn'):null;
  if(b)later(()=>b.focus({preventScroll:true}),300);
}
// Backdrop: a dimmed NASA panorama of where she is. Two layers crossfade.
function pano(src){
  const a=$('#pano .on'),b=[...document.querySelectorAll('#pano i')].find(e=>e!==a);
  if(a&&a.dataset.src===(src||''))return;
  if(a)a.classList.remove('on');
  if(src){b.style.backgroundImage='url("'+src+'")';b.dataset.src=src;b.classList.add('on')}
}
// The map: Opportunity's route so far (orange) over the faint full route, with a dot that drives to this card's stop.
function drawMap(at){
  const pts=TRAVERSE.map(p=>p.join(',')),r=$('#route'),tr=$('#trail'),dot=$('#dot');
  r.setAttribute('points',pts.join(' '));
  const from=+(tr.dataset.at||0),t0=performance.now(),D=CALM?0:1400;
  tr.dataset.at=at;
  const step=now=>{
    const k=D?Math.min(1,(now-t0)/D):1,e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2,f=from+(at-from)*e,i=Math.floor(f),u=f-i;
    const a=TRAVERSE[i],b=TRAVERSE[Math.min(i+1,TRAVERSE.length-1)],x=a[0]+(b[0]-a[0])*u,y=a[1]+(b[1]-a[1])*u;
    tr.setAttribute('points',pts.slice(0,i+1).concat(x+','+y).join(' '));
    dot.setAttribute('transform','translate('+x+' '+y+')');
    if(k<1&&tr.dataset.at==at)requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
  const x=ev();$('#where').innerHTML=x.where+(x.km?'<span>'+x.km+'</span>':'');
}
function goodbye(){
  phase='ending';endAt=performance.now();seq++;
  fold($('#slide'));update();
  if(document.activeElement)document.activeElement.blur();
  later(()=>$('#again').focus({preventScroll:true}),6800);
}
// Enter key: whatever the main button on screen is right now (a picture pop-up first).
function primary(){
  if(photo>=0){if(!$('#photo').classList.contains('arriving'))closePhoto();return}   // not while her picture is still flying in
  if(phase==='build')add();
  else if(phase==='ready')wake();
  else if(phase==='timeline'){
    const x=ev();if(busy)return;
    if(!turnsDone(x))send(step);
    else if(x.tries)tryWake();
    else nav(1);
  }
  else if(phase==='ending'&&performance.now()-endAt>6000)reset();
}
function reset(){
  timers.forEach(clearTimeout);timers=[];
  closePhoto();
  unlocked.clear();pending=-1;phase='build';slide=0;tries=0;step=0;busy=false;seq++;
  fold($('#tab'));fold($('#slide'));$('#slBody').innerHTML='';$('#haze').classList.remove('gust');GL.gust(false);
  document.querySelectorAll('.fly,.vf').forEach(e=>e.remove());
  pano(null);$('#trail').dataset.at=0;
  if(document.activeElement)document.activeElement.blur();
  if(GL.ready)GL.reset();
  update();
}
$('#phClose').onclick=closePhoto;$('#phPrev').onclick=()=>nav(-1);
$('#phNext').onclick=()=>nav(1);
$('#galBtn').onclick=()=>openPhoto(PICS()[0],true);
$('#add').onclick=add;
$('#wakeBtn').onclick=wake;
$('#prev').onclick=()=>nav(-1);
$('#next').onclick=()=>nav(1);
$('#again').onclick=reset;
PARTS.forEach((p,i)=>{const b=document.createElement('button');b.className='ghost';b.type='button';b.textContent=i+1;b.title=p.name;b.onclick=()=>unlock(p.id);$('#sim').appendChild(b)});

const msg=t=>$('#msg').textContent=t;
// Model materials -> part id. Anything not listed (body, deck, antennas) is the base, which is always shown.
const MATMAP={tex_panels_n:'solar',tex_panels2_n:'solar',tex_arm:'arm',tex_mast:'camera',foil_silver:'camera',tex_suspension_n:'wheels'};
// Materials that are always the base, whatever the mesh is called (the antenna boom is named HGAA_arm but isn't the robotic arm).
const BASEMATS=['tex_body_n','tex_instruments','Silver'];
// Fallback for other .glb files: match mesh names.
const NAMES={solar:/solar|panel|array|cell/i,arm:/idd|arm|turret|instrument|tool|rat\b|drill/i,camera:/mast|pancam|navcam|camera|periscope/i,wheels:/wheel|rocker|bogie|suspens|strut|axle|tire|tyre/i};
function stripTextures(buf){
  const dv=new DataView(buf);
  if(dv.getUint32(0,true)!==0x46546C67)throw new Error('not a .glb file');
  const jl=dv.getUint32(12,true);
  const j=JSON.parse(new TextDecoder().decode(new Uint8Array(buf,20,jl)));
  delete j.images;delete j.textures;delete j.samplers;
  const strip=o=>{if(!o||typeof o!=='object')return;Object.keys(o).forEach(k=>{if(/Texture$/.test(k))delete o[k];else strip(o[k])})};
  (j.materials||[]).forEach(strip);
  const nj=new TextEncoder().encode(JSON.stringify(j)),pad=(4-nj.length%4)%4;
  const jb=new Uint8Array(nj.length+pad);jb.fill(32);jb.set(nj);
  const rest=new Uint8Array(buf,20+jl),out=new Uint8Array(20+jb.length+rest.length),ov=new DataView(out.buffer);
  ov.setUint32(0,0x46546C67,true);ov.setUint32(4,2,true);ov.setUint32(8,out.length,true);
  ov.setUint32(12,jb.length,true);ov.setUint32(16,0x4E4F534A,true);
  out.set(jb,20);out.set(rest,20+jb.length);
  return out.buffer;
}
// Dust layer: a noisy coat of Mars dust mixed over the model's textures, heaviest on surfaces that face up
// (like the solar panels). One shared set of uniforms drives every material: uDust 0 clean .. 1 buried.
const DUSTU={uDust:{value:.55},uDustCol:{value:null},uRig:{value:null}};
function dusty(m){
  if(!m.isMeshStandardMaterial)return;
  m.onBeforeCompile=sh=>{
    Object.assign(sh.uniforms,DUSTU);
    sh.vertexShader='uniform vec3 uRig;varying vec3 vDP;varying vec3 vDN;\n'+sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nvDP=(modelMatrix*vec4(transformed,1.0)).xyz-uRig;vDN=normalize(mat3(modelMatrix)*objectNormal);');
    sh.fragmentShader=['uniform float uDust;uniform vec3 uDustCol;varying vec3 vDP;varying vec3 vDN;',
      'float dh(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}',
      'float dn(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(dh(i),dh(i+vec3(1,0,0)),f.x),mix(dh(i+vec3(0,1,0)),dh(i+vec3(1,1,0)),f.x),f.y),mix(mix(dh(i+vec3(0,0,1)),dh(i+vec3(1,0,1)),f.x),mix(dh(i+vec3(0,1,1)),dh(i+vec3(1,1,1)),f.x),f.y),f.z);}',
      sh.fragmentShader.replace('#include <map_fragment>',['#include <map_fragment>',
        'float dN=dn(vDP*9.0)*.55+dn(vDP*60.0)*.45;float dUp=smoothstep(-.3,.9,normalize(vDN).y);',
        'diffuseColor.rgb=mix(diffuseColor.rgb,uDustCol,clamp(uDust*(.3+.7*dUp)*(.25+1.1*dN),0.0,.9));'].join('\n'))].join('\n');
  };
  m.needsUpdate=true;
}
// rig holds base + parts + ghosts so the whole rover can float. dust: 0 clean .. 1 dusty. sil: 0 normal .. 1 black silhouette.
const GL={ready:false,groups:[],ghosts:[],base:null,mats:[],dust:.55,dustT:.55,sil:0,silT:0,vx:0,vy:0,wakeT:0,starA:0,starSweep:0,starDrift:0,skyOn:false,storm:0,stormT:0,stormEnd:0,
piv:[],actN:'',actT:0,aimT:0,aimA:0,fi:-1,fk:0,cleanAt:-1,
drvT:-9,drvD:0,DRV:1.4,drvV:2,wr:.33,gridA:0,gridZ:0,   // driving between cards: start, direction, length (s, same as the map dot), ground speed, wheel radius
init(){
  if(this.r)return;
  const box=$('#gl'),w=box.clientWidth||640,h=box.clientHeight||360;
  try{this.r=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){this.r=null;throw new Error('WebGL is not available in this browser')}
  this.r.outputEncoding=THREE.sRGBEncoding;
  this.r.setPixelRatio(Math.min(devicePixelRatio||1,2));this.r.setSize(w,h,false);box.appendChild(this.r.domElement);
  this.s=new THREE.Scene();this.rig=new THREE.Group();this.s.add(this.rig);
  this.c=new THREE.PerspectiveCamera(40,w/h,.1,100);this.c.position.set(6.2,3.2,7.4);
  const hl=new THREE.HemisphereLight(0xfff0dd,0x3a3040,.75),d=new THREE.DirectionalLight(0xfff4ea,.95);d.position.set(4,8,5);
  hl.userData.i=hl.intensity;d.userData.i=d.intensity;this.s.add(hl,d);this.lights=[hl,d];
  // starfield for the rewind: faint points on a tilted sphere around the scene
  const N=900,P=new Float32Array(N*3);
  for(let i=0;i<N;i++){const u=Math.random()*2-1,th=Math.random()*6.2832,r=Math.sqrt(1-u*u)*30;P.set([r*Math.cos(th),u*30,r*Math.sin(th)],i*3)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.BufferAttribute(P,3));
  this.stars=new THREE.Points(sg,new THREE.PointsMaterial({color:0x9fb3d9,size:1.6,sizeAttenuation:false,transparent:true,opacity:0,depthWrite:false}));
  this.sky=new THREE.Group();this.sky.rotation.x=.45;this.sky.add(this.stars);this.s.add(this.sky);this.stars.visible=false;
  this.o=new THREE.OrbitControls(this.c,this.r.domElement);
  this.o.enableDamping=true;this.o.enablePan=false;this.o.enableZoom=false;   // no auto-spin: the user turns it by dragging
  this.o.target.set(0,.9,0);
  // missing parts: blueprint-blue fill + outline (pulses in tick), so they stand apart from the dusty model. The part in the open tab turns Mars orange.
  const gmat=(c,o,line)=>line?new THREE.LineBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false}):new THREE.MeshBasicMaterial({color:c,transparent:true,opacity:o,depthWrite:false});
  this.gm=gmat(0x6ea8ff,.1);this.gl=gmat(0x8fbcff,.55,1);this.hot=gmat(0xc8553d,.3);this.hotl=gmat(0xff8a66,.9,1);
  this.hil=gmat(0xff8a66,.6,1);   // the part doing a job in the timeline gets a Mars-orange outline (pulses in tick)
  // timeline ground: a faint line grid under the wheels that fades out around her (in the shader, so the pattern can
  // slide while the fade stays put). It slides backward while she drives between cards (drive()).
  const G=16,C=.5,gp=[];for(let v=-G/2;v<=G/2+1e-6;v+=C)gp.push(-G/2,0,v,G/2,0,v,v,0,-G/2,v,0,G/2);
  const gg=new THREE.BufferGeometry();gg.setAttribute('position',new THREE.Float32BufferAttribute(gp,3));
  this.gridM=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uC:{value:new THREE.Color(0x7f8fab)},uA:{value:0}},
    vertexShader:'varying vec2 vW;void main(){vec4 w=modelMatrix*vec4(position,1.0);vW=w.xz;gl_Position=projectionMatrix*viewMatrix*w;}',
    fragmentShader:'uniform vec3 uC;uniform float uA;varying vec2 vW;void main(){gl_FragColor=vec4(uC,uA*(1.0-smoothstep(2.2,6.5,length(vW))));}'});
  this.grid=new THREE.LineSegments(gg,this.gridM);this.grid.position.y=.002;this.grid.visible=false;this.s.add(this.grid);
  this.DUST=new THREE.Color(0x8a4a30);this.SIL=new THREE.Color(0x000000);this.FOC=new THREE.Color(0x1a2740);   // FOC: parts not in focus fade toward --dark
  this.DUSTC=new THREE.Color(0xa35a3c);DUSTU.uDustCol.value=this.DUSTC.clone();DUSTU.uRig.value=this.rig.position;
  addEventListener('resize',()=>this.size());
  const loop=()=>{requestAnimationFrame(loop);this.tick()};loop();
},
size(){
  if(this.pr){const p=$('#tabgl');if(p.clientWidth){this.pr.setSize(p.clientWidth,p.clientHeight,false);this.pc.aspect=p.clientWidth/p.clientHeight;this.pc.updateProjectionMatrix()}}
  const b=$('#gl'),w=b.clientWidth,h=b.clientHeight;if(!w||!h||!this.r)return;this.r.setSize(w,h,false);this.c.aspect=w/h;this.c.fov=w<h?Math.min(70,28*h/w):40;this.c.updateProjectionMatrix()},   // widen the view on tall screens so the rover fits

tint(){
  this.mats.forEach(m=>{m.color.copy(m.userData.c0).lerp(this.DUST,this.dust*.25);if(this.fk>.001&&m.userData.g!==this.fi)m.color.lerp(this.FOC,this.fk*.45);m.color.lerp(this.SIL,this.sil)});
  DUSTU.uDust.value=this.dust;DUSTU.uDustCol.value.copy(this.DUSTC).multiplyScalar(1-this.sil*.6);
  // dim the lights for the silhouette; the dust (not darkened by color) stays as faint specks on the black shape
  if(this.lights)this.lights.forEach(l=>l.intensity=l.userData.i*(1-this.sil*.8));
},
tick(){
  if(!this.ready)return;
  const t=performance.now()/1000,dt=Math.min(.1,t-(this.lt||t));this.lt=t;   // fades are time-based, so any frame rate looks the same
  if(this.pr&&pending>=0){this.po.update();this.pr.render(this.ps,this.pc)}
  if(!$('#stage').classList.contains('is3d'))return;
  // float while waiting to be built; a short shake when it wakes up
  const bob=phase==='build'||phase==='ready'?Math.sin(t*1.1)*.08:0;
  this.rig.position.y+=(bob-this.rig.position.y)*.05;
  const sh=t-this.wakeT;this.rig.position.x=phase==='rewind'&&sh<1.4?Math.sin(sh*55)*.035*(1.4-sh):0;
  // move (and shrink) the model so panels never cover it
  const w=this.r.domElement.width,h=this.r.domElement.height,k=w/innerWidth;
  let vt=0,vu=phase==='ready'?h*.11:phase==='rewind'?h*.13:phase==='ending'?h*.16:0,zt=1;
  if(phase==='timeline'){
    // the free area: top left, between the ‹ arrow and the map, above the card at the bottom
    const sl=$('#slide').getBoundingClientRect(),nv=$('#nav').getBoundingClientRect();
    const L=innerWidth>760?96:16,R=nv.width?nv.left-24:innerWidth-16,T=innerWidth>760?76:60,B=sl.top-16;
    vt=(innerWidth/2-(L+R)/2)*k;vu=(innerHeight/2-(T+B)/2)*k;zt=Math.max(.35,Math.min(1,(R-L)/(innerWidth*.45),(B-T)/(innerHeight*.6)));
  }
  const e=1-Math.exp(-3.5*dt);this.vx+=(vt-this.vx)*e;this.vy+=(vu-this.vy)*e;this.c.zoom+=(zt-this.c.zoom)*e;
  this.c.setViewOffset(w,h,this.vx,this.vy,w,h);
  this.gl.opacity=.4+.25*Math.sin(t*2.6);this.gm.opacity=.07+.05*Math.sin(t*2.6);   // missing parts pulse gently
  this.hil.opacity=.45+.3*Math.sin(t*4);                                             // so does the outline on the working part
  this.gridA+=((phase==='timeline'?1:0)-this.gridA)*(1-Math.exp(-2*dt));              // the ground fades in for the timeline
  this.grid.visible=this.gridA>.01;this.gridM.uniforms.uA.value=this.gridA*.22;
  this.stormFx(t,dt);
  this.skyFx(dt);
  if(this.lights)this.lights.forEach(l=>l.intensity=l.userData.i*(1-this.sil*.8)*(1-this.storm*.25));   // the storm dims the sun
  this.o.update();
  this.groups.forEach(g=>{if(g.position.y>.002)g.position.y*=.86;else g.position.y=0});
  this.puff(dt);
  this.joints(t,dt);
  const fT=this.fi>=0?1:0;
  if(Math.abs(this.dust-this.dustT)>.002||Math.abs(this.sil-this.silT)>.002||Math.abs(this.fk-fT)>.002){
    this.dust+=(this.dustT-this.dust)*(1-Math.exp(-(phase==='rewind'?1.2:2.1)*dt));this.sil+=(this.silT-this.sil)*(1-Math.exp(-.75*dt));
    this.fk+=(fT-this.fk)*(1-Math.exp(-4*dt));this.tint();
  }
  this.r.render(this.s,this.c);
},
load(buf){
  if(!window.THREE||!THREE.GLTFLoader){msg('The 3D libraries did not load. Check your connection and try again.');return}
  const ok=g=>{try{this.build(g.scene,g.animations)}catch(e){$('#stage').classList.remove('is3d');msg('Could not display the model: '+e.message)}};
  const run=(b,retry)=>{
    try{new THREE.GLTFLoader().parse(b,'',ok,e=>{
      if(retry){msg('Textures failed to load, retrying without them…');try{run(stripTextures(buf),false)}catch(x){msg('Could not read that file: '+x.message)}}
      else msg('Could not read that file: '+((e&&e.message)||e));
    })}catch(e){msg('Could not read that file: '+e.message)}
  };
  run(buf,true);
},
build(root,clips){
  $('#stage').classList.add('is3d');this.init();this.size();
  // the full NASA model is stowed for launch and carries its own deploy animation: jump every clip to its last frame
  if(clips&&clips.length){
    const mx=new THREE.AnimationMixer(root);
    clips.forEach(c=>{const a=mx.clipAction(c);a.setLoop(THREE.LoopOnce);a.clampWhenFinished=true;a.play()});
    mx.update(1e4);
  }
  if(this.root)this.s.remove(this.root);
  [...this.groups,...this.ghosts,this.base].forEach(g=>g&&this.rig.remove(g));this.groups=[];this.ghosts=[];this.mats=[];
  this.rig.position.set(0,0,0);this.rig.updateMatrixWorld(true);
  // the full NASA model ships Blender helper boxes with no material (real parts hang under them):
  // empty their geometry so they don't draw or count toward the size, but keep their children
  root.traverse(o=>{if(o.isMesh&&!Array.isArray(o.material)&&!o.material.name&&!o.material.map&&o.geometry.attributes.position.count<=24){o.geometry=new THREE.BufferGeometry();o.visible=false}});
  root.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(root),sz=b.getSize(new THREE.Vector3()),ctr=b.getCenter(new THREE.Vector3());
  const k=4/Math.max(sz.x,sz.y,sz.z);
  root.scale.multiplyScalar(k);root.position.sub(ctr.multiplyScalar(k));root.position.y+=sz.y*k/2;
  this.s.add(root);this.root=root;root.updateMatrixWorld(true);
  const meshes=[];root.traverse(o=>{if(o.isMesh&&o.visible)meshes.push(o)});
  if(!meshes.length)throw new Error('no visible geometry found in the file');
  const bins=PARTS.map(()=>[]),baseBin=[];
  meshes.forEach(m=>{
    const mt=Array.isArray(m.material)?m.material[0]:m.material;
    let id=mt&&MATMAP[mt.name];
    if(!id&&!(mt&&BASEMATS.includes(mt.name)))id=Object.keys(NAMES).find(k=>NAMES[k].test(m.name||''));
    const i=PARTS.findIndex(p=>p.id===id);
    (i<0?baseBin:bins[i]).push(m);
  });
  // Joints the timeline moves (full NASA model only): the camera head, the arm, the high-gain antenna and each wheel.
  // Meshes under a joint go into a pivot group placed at that joint, so the part can turn without taking the model apart.
  // Joints that aren't in the file (mer_small.glb, other .glb files) are skipped and those parts just stay still.
  const jointOf=new Map(),jpos={},piv={};this.piv=[];
  const tagJ=(o,j,at)=>{jpos[j]=at;o.traverse(c=>{if(c.isMesh&&c.visible)jointOf.set(c,j)})};
  [['mast','mast_neck'],['arm','arm_base'],['hga','HGAA_top']].forEach(([j,n])=>{
    const o=root.getObjectByName(n);if(!o)return;
    const at=o.getWorldPosition(new THREE.Vector3());
    if(j==='mast'){   // the camera head turns around the middle of the neck, not the node's origin (which sits off to one side)
      const nb=new THREE.Box3();(o.isMesh?[o]:o.children.filter(c=>c.isMesh)).forEach(m=>nb.expandByObject(m));
      if(!nb.isEmpty()){const c=nb.getCenter(new THREE.Vector3());at.x=c.x;at.z=c.z}
    }
    tagJ(o,j,at);
  });
  root.traverse(o=>{if(/_wheel$/.test(o.name)&&!jpos['w:'+o.name])tagJ(o,'w:'+o.name,new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()))});
  const keep=(g,m,gi)=>{
    const j=jointOf.get(m);
    if(j){
      const key=j+'@'+gi;
      if(!piv[key]){const p=new THREE.Group();p.position.copy(jpos[j]);p.userData.j=j;g.add(p);piv[key]=p;this.piv.push(p)}
      piv[key].attach(m);
    }else g.attach(m);
    m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();
    (Array.isArray(m.material)?m.material:[m.material]).forEach(x=>{
      // the NASA model is fully metallic, which renders near-black without an environment map
      if('metalness' in x){x.metalness=Math.min(x.metalness,.55);x.roughness=Math.max(x.roughness,.5)}
      x.polygonOffset=true;x.polygonOffsetFactor=1;x.polygonOffsetUnits=1;   // faces sit a hair back, so the highlight outline draws cleanly on top
      if(x.color){x.userData.c0=x.color.clone();x.userData.g=gi;this.mats.push(x)}
      dusty(x);
    });
  };
  this.base=new THREE.Group();this.rig.add(this.base);
  baseBin.forEach(m=>keep(this.base,m,-1));
  PARTS.forEach((p,i)=>{
    const g=new THREE.Group();this.rig.add(g);this.groups.push(g);
    const gh=new THREE.Group();this.rig.add(gh);this.ghosts.push(gh);
    bins[i].forEach(m=>{
      m.updateWorldMatrix(true,false);
      const gmesh=new THREE.Mesh(m.geometry,this.gm),edge=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,30),this.gl);
      [gmesh,edge].forEach(x=>{x.matrixAutoUpdate=false;x.matrix.copy(m.matrixWorld);gh.add(x)});
      keep(g,m,i);
    });
  });
  const wp=this.piv.find(p=>/^w:/.test(p.userData.j));   // wheel radius, so the wheels roll at the speed the ground slides
  this.wr=wp?Math.max(.05,new THREE.Box3().setFromObject(wp).getSize(new THREE.Vector3()).y/2):.33;
  this.ready=true;this.sil=0;this.dust=this.dustT=phase==='build'||phase==='ready'?.55:0;this.tint();
  $('#toggle').hidden=false;$('#toggle').textContent='Show illustration';
  msg('Locked parts show as faint outlines. '+meshes.length+' pieces sorted into '+PARTS.length+' parts, '+this.piv.length+' moving joints.');
  $('#map').hidden=false;
  $('#maptxt').textContent=[['Base (always shown)',baseBin],...PARTS.map((p,i)=>[p.name,bins[i]])].map(([nm,bin])=>nm+': '+bin.length+' piece(s)'+(bin.length?' ('+bin.slice(0,4).map(m=>(m.material&&m.material.name)||m.name||'unnamed').join(', ')+')':'')).join('\n');
  this.sync();
},
// Mirror the game state onto the scene.
sync(){
  this.groups.forEach((g,i)=>g.visible=has(i));
  this.ghosts.forEach((g,i)=>{g.visible=!has(i);g.children.forEach(m=>m.material=m.isLineSegments?(i===pending?this.hotl:this.gl):(i===pending?this.hot:this.gm))});
  // after the storm event the dust stays on (it never blew off the real rover); wake attempts add a little more
  const after=phase==='timeline'&&TIMELINE.slice(0,slide+1).some(t=>(t[3]||{}).fx==='storm'),base=after?.45:0;
  this.dustT=phase==='build'||phase==='ready'?.55:phase==='ending'?.8:Math.min(.8,base+tries*.12);
  // a card with dust:… (the dusty panels) starts dusty until the wind cleans the panels (act 'panels')
  const x=phase==='timeline'&&ev();if(x&&x.dust&&this.cleanAt!==slide)this.dustT=Math.max(this.dustT,x.dust);
  this.silT=phase==='ending'?1:0;
},
// Timeline jobs: one part does its job (act), the others dim (focus), and the antenna points at Earth while she talks (aim).
act(n){
  this.actN=n;this.actT=performance.now()/1000;
  if(n==='drive'||n==='back')this.burst([this.groups[3]],n==='drive'?500:200);       // sand kicked up by the spinning wheels
  if(n==='panels'){this.cleanAt=slide;this.dustT=0;this.burst([this.groups[0]],1400)}  // a gust of wind cleans the panels
},
// focus(i) also outlines part i in Mars orange: edge lines added once as children of its meshes, so they move with the joints.
focus(i){
  this.fi=i;
  const g=this.groups[i];
  if(g&&!g.userData.hl){
    const ms=[];g.traverse(m=>{if(m.isMesh&&m.visible&&m.geometry.attributes.position)ms.push(m)});   // skips the emptied helper boxes
    g.userData.hl=ms.map(m=>{const e=new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry,30),this.hil);e.raycast=()=>{};m.add(e);return e});
  }
  this.groups.forEach((g,k)=>(g.userData.hl||[]).forEach(e=>e.visible=k===i));
},
aim(on){this.aimT=on?1:0},
// Drive to the next stop (dir 1) or back to the last one (-1), alongside the map dot: the wheels roll and the ground slides
// under her. She stays in place and keeps her angle. Off under reduced motion.
drive(dir){if(!CALM)this.drvT=performance.now()/1000;this.drvD=dir},
// Where a joint ('mast' or 'arm') is on screen, in page pixels. null if the model has no such joint.
screenAt(j){
  const p=this.piv.find(q=>q.userData.j===j);if(!p||!$('#stage').classList.contains('is3d'))return null;
  let v=null;
  if(j==='arm'){   // the Microscopic Imager is on the turret: the piece farthest out from the shoulder
    const o=p.getWorldPosition(new THREE.Vector3());let far=-1;
    p.traverse(m=>{if(m.isMesh&&m.visible&&m.geometry.attributes.position){const c=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3()),d=c.distanceTo(o);if(d>far){far=d;v=c}}});
  }else{const b=new THREE.Box3().setFromObject(p);if(!b.isEmpty())v=b.getCenter(new THREE.Vector3())}
  if(!v)return null;
  v.project(this.c);const r=this.r.domElement.getBoundingClientRect();
  if(Math.abs(v.x)>1||Math.abs(v.y)>1)return null;
  return {x:r.left+(v.x+1)/2*r.width,y:r.top+(1-v.y)/2*r.height};
},
joints(t,dt){
  const a=t-this.actT,n=this.actN,ease=v=>v*v*(3-2*v),env=D=>a<0||a>D?0:ease(Math.min(1,a/.6,(D-a)/.6));
  const da=t-this.drvT,dv=da>0&&da<this.DRV?Math.sin(Math.PI*da/this.DRV)*this.drvD:0;   // driving between cards: speed -1..1
  this.aimA+=(this.aimT-this.aimA)*(1-Math.exp(-2.2*dt));
  this.piv.forEach(p=>{
    const j=p.userData.j;
    if(j==='mast')p.rotation.y=n==='snap'?.5*Math.sin(a*2.4)*env(2.6):n==='pan'?.85*Math.sin(a*1.7)*env(3.7):0;    // Pancam looks around
    else if(j==='arm')p.rotation.y=n==='arm'?-.9*env(5):0;                                                         // the arm swings out to the rock (and stays out for the picture)
    else if(j==='hga')p.rotation.y=this.aimA*.9;                                                                   // antenna turns toward Earth
    else p.rotation.x+=(n==='drive'||n==='odo'||n==='back'?env(3):0)*dt*({drive:8,odo:4,back:-2.5}[n]||0)          // wheels roll, spin in sand, or back out slowly
      +dv*this.drvV/this.wr*dt;                                                                                    // or drive to the next stop (+x turns roll her toward +z)
  });
  this.gridZ=((this.gridZ-dv*this.drvV*dt)%.5+.5)%.5;this.grid.position.z=this.gridZ;   // the ground slides the other way (one cell, repeating)
},
// Still copy of one part for the tab, turned to a three-quarter view. Returns false if there is nothing to show.
preview(i){
  if(!this.ready||!this.groups[i]||!this.groups[i].children.length)return false;
  const box=$('#tabgl');box.classList.remove('none');
  if(!this.pr){
    try{this.pr=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){return false}
    this.pr.outputEncoding=THREE.sRGBEncoding;this.pr.setPixelRatio(Math.min(devicePixelRatio||1,2));box.appendChild(this.pr.domElement);
    this.ps=new THREE.Scene();this.ps.add(new THREE.HemisphereLight(0xfff0dd,0x3a3040,.75));
    const d=new THREE.DirectionalLight(0xfff4ea,.95);d.position.set(4,8,5);this.ps.add(d);
    this.pc=new THREE.PerspectiveCamera(35,1,.01,100);
    this.po=new THREE.OrbitControls(this.pc,this.pr.domElement);this.po.enableZoom=false;this.po.enablePan=false;this.po.enableDamping=true;
  }
  const w=box.clientWidth||320,h=box.clientHeight||170;this.pr.setSize(w,h,false);this.pc.aspect=w/h;this.pc.updateProjectionMatrix();
  if(this.pv)this.ps.remove(this.pv);
  const c=this.groups[i].clone();c.position.set(0,0,0);c.visible=true;c.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(c),r=b.getSize(new THREE.Vector3()).length()/2||1;
  c.position.sub(b.getCenter(new THREE.Vector3()));
  this.pv=new THREE.Group();this.pv.add(c);this.pv.rotation.y=-.6;this.ps.add(this.pv);
  // fit the whole part with a margin: distance from its bounding sphere and the narrower of the two view angles
  const hv=THREE.MathUtils.degToRad(this.pc.fov/2),hh=Math.atan(Math.tan(hv)*this.pc.aspect);
  this.pc.position.set(0,.3,1).normalize().multiplyScalar(r/Math.sin(Math.min(hv,hh))*1.05);this.pc.lookAt(0,0,0);this.po.target.set(0,0,0);this.po.update();
  return true;
},
pop(i){if(this.groups[i])this.groups[i].position.y=1.8},
// Rewind stars: fade in with "Opportunity is awake", drift slowly, sweep past with the rewind, fade out on the timeline.
skyFx(dt){
  this.starA+=((phase==='rewind'&&this.skyOn?1:0)-this.starA)*(1-Math.exp(-2*dt));
  this.stars.visible=this.starA>.01;if(!this.stars.visible)return;
  this.stars.material.opacity=this.starA*.75;
  if(!CALM){this.starDrift+=dt*.04;this.sky.rotation.y=this.starDrift+this.starSweep*Math.PI*.9}
},
// Dust storm (timeline events with fx:'storm'): a short gust (gust()) of dust streaks blowing past the rover.
gust(on){this.stormEnd=on?performance.now()/1000+2.6:0},
stormFx(t,dt){
  this.stormT=t<this.stormEnd?1:0;
  this.storm+=(this.stormT-this.storm)*(1-Math.exp(-2.5*dt));
  if(this.storm<.01){if(this.sp)this.sp.visible=false;return}
  if(!this.sp){
    // short streaks along the wind read as blowing dust (single points look like stars)
    const N=700,P=new Float32Array(N*6),S=new Float32Array(N);
    for(let i=0;i<N;i++){const x=Math.random()*14-7,y=Math.random()*4.2-.4,z=Math.random()*10-5,l=.06+Math.random()*.16;P.set([x,y,z,x+l,y+l*.08,z],i*6);S[i]=2.5+Math.random()*3.5}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));
    this.sp=new THREE.LineSegments(g,new THREE.LineBasicMaterial({color:0xb8673f,transparent:true,depthWrite:false}));this.sp.userData.S=S;this.s.add(this.sp);
  }
  const P=this.sp.geometry.attributes.position.array,S=this.sp.userData.S;
  for(let i=0;i<S.length;i++){
    const j=i*6,dx=S[i]*dt,dy=Math.sin(t*1.7+i)*.004;
    P[j]+=dx;P[j+3]+=dx;P[j+1]+=dy;P[j+4]+=dy;
    if(P[j]>7){P[j]-=14;P[j+3]-=14}
  }
  this.sp.geometry.attributes.position.needsUpdate=true;this.sp.visible=true;this.sp.material.opacity=this.storm*.35;
},
wake(){this.wakeT=performance.now()/1000;this.sync();this.burst()},
// Dust parting on wake: specks sampled from the rover's surfaces (mostly the up-facing ones, where the dust sits)
// lift off, blow outward and up on a light wind, settle under weak gravity, and fade.
// from: the groups the dust comes off (default: the whole rover). N: how many specks.
burst(from,N=1800){
  this.clearPuff();
  const src=[],w=[];let tot=0;
  (from||[this.base,...this.groups]).forEach(g=>g&&g.traverse(o=>{if(o.isMesh&&o.geometry.attributes.position&&o.geometry.attributes.normal){src.push(o);tot+=o.geometry.attributes.position.count;w.push(tot)}}));
  if(!tot)return;
  const P=new Float32Array(N*3),V=new Float32Array(N*3),D=new Float32Array(N);
  const v=new THREE.Vector3(),n=new THREE.Vector3(),c=new THREE.Box3().setFromObject(this.rig).getCenter(new THREE.Vector3());
  for(let i=0;i<N;i++){
    let m,k;
    for(let tries=0;tries<5;tries++){     // prefer up-facing surfaces
      const r=Math.random()*tot;m=src[w.findIndex(x=>x>r)];k=Math.random()*m.geometry.attributes.position.count|0;
      n.fromBufferAttribute(m.geometry.attributes.normal,k).transformDirection(m.matrixWorld);
      if(n.y>.3)break;
    }
    v.fromBufferAttribute(m.geometry.attributes.position,k).applyMatrix4(m.matrixWorld);
    P.set([v.x,v.y,v.z],i*3);
    const o=v.clone().sub(c).setY(0).normalize(),sp=.3+Math.random()*.9;
    V.set([o.x*sp+.4*Math.random(),.3+Math.random()*.8,o.z*sp+.15*Math.random()],i*3);
    D[i]=Math.random()*.7;               // staggered: the coat lifts off over the first 0.7 s
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(P,3));
  this.pts=new THREE.Points(g,new THREE.PointsMaterial({color:0xa35a3c,size:.035,transparent:true,opacity:1,depthWrite:false}));
  this.pts.userData={V,D,age:0};this.s.add(this.pts);
},
puff(dt){
  const p=this.pts;if(!p)return;
  const u=p.userData,P=p.geometry.attributes.position.array,T=2.8;u.age+=dt;
  for(let i=0;i<u.D.length;i++){
    if(u.age<u.D[i])continue;
    const j=i*3;u.V[j+1]-=.55*dt;          // Mars gravity is weak
    u.V[j]*=.985;u.V[j+2]*=.985;
    P[j]+=u.V[j]*dt;P[j+1]+=u.V[j+1]*dt;P[j+2]+=u.V[j+2]*dt;
  }
  p.geometry.attributes.position.needsUpdate=true;
  p.material.opacity=Math.min(1,Math.max(0,(T-u.age)/1.2));
  if(u.age>T)this.clearPuff();
},
clearPuff(){if(this.pts){this.s.remove(this.pts);this.pts.geometry.dispose();this.pts.material.dispose();this.pts=null}},
reset(){
  this.clearPuff();this.skyOn=false;this.starSweep=0;this.dust=this.dustT=.55;this.sil=this.silT=0;
  this.actN='';this.aimT=this.aimA=0;this.focus(-1);this.fk=0;this.cleanAt=-1;this.piv.forEach(p=>p.rotation.set(0,0,0));   // joints back to rest
  this.drvT=-9;this.gridZ=0;this.grid.position.z=0;   // stop driving, ground back to center
  this.tint();this.sync();
}
};
function readFile(f){
  if(!f)return;msg('Reading '+f.name+'…');
  const r=new FileReader();r.onload=()=>GL.load(r.result);r.onerror=()=>msg('Could not read that file.');r.readAsArrayBuffer(f);
}
$('#pick').onclick=()=>$('#file').click();
$('#file').onchange=e=>readFile(e.target.files[0]);
$('#toggle').onclick=()=>{const st=$('#stage');const on=st.classList.toggle('is3d');$('#toggle').textContent=on?'Show illustration':'Show 3D model';if(on)GL.size()};
const stg=$('#stage');
stg.ondragover=e=>{e.preventDefault();stg.classList.add('over')};
stg.ondragleave=()=>stg.classList.remove('over');
stg.ondrop=e=>{e.preventDefault();stg.classList.remove('over');readFile(e.dataTransfer.files[0])};
update();
// Full NASA model first; the compressed copy is the backup.
const MODELS=['assets/Mars Exploration Rover - Spirit and Opportunity.glb','assets/mer_small.glb'];
const get=u=>fetch(encodeURI(u)).then(r=>{if(!r.ok)throw new Error(u+': HTTP '+r.status);return r.arrayBuffer()});
get(MODELS[0]).catch(()=>get(MODELS[1]))
  .then(buf=>GL.load(buf))
  .catch(e=>msg('Could not load the 3D model ('+e.message+'). Serve the folder over http, not file://.'));
