// Game state, 3D loader (Three.js), and UI wiring.
let n=0,cur=-1,awake=false;
const $=s=>document.querySelector(s);
const list=$('#list'),info=$('#info'),go=$('#go');
function renderList(){
  list.innerHTML='';
  PARTS.forEach((p,i)=>{
    const li=document.createElement('li'),b=document.createElement('button');
    const on=i<n;
    b.className=(on?'on ':'')+(i===cur?'cur':'');
    b.setAttribute('aria-disabled',on?'false':'true');
    b.innerHTML=(on?'✔':'🔒')+' <span>'+(on?p.name:'Locked part '+(i+1))+'</span>';
    b.onclick=()=>{if(on){cur=i;renderList();showInfo(i)}};
    li.appendChild(b);list.appendChild(li);
  });
}
function showInfo(i){
  if(i<0){info.innerHTML='<p style="color:var(--mute);margin:0">Part details will appear here as you unlock them.</p>';return}
  const p=PARTS[i];
  info.innerHTML='<p class="tag">'+p.tag+'</p><h2>'+p.name+'</h2><p>'+p.desc+'</p><dl>'+p.specs.map(s=>'<dt>'+s[0]+'</dt><dd>'+s[1]+'</dd>').join('')+'</dl><p class="fact">'+p.fact+'</p>';
}
function update(){
  const pct=Math.round(n/PARTS.length*100);
  $('#count').textContent=n+' of '+PARTS.length+' parts unlocked';
  $('#pct').textContent=pct+'%';$('#fill').style.width=pct+'%';
  $('#hint').classList.toggle('gone',n>0);
  PARTS.forEach((p,i)=>$('#p-'+p.id).classList.toggle('on',i<n));
  if(GL.ready)GL.sync();
  $('#status').textContent=awake?'Awake: ready to roll':(n===PARTS.length?'Fully built: covered in dust':'Offline: '+n+' of '+PARTS.length+' parts');
  go.textContent=awake?'Replay wake-up':(n===PARTS.length?'Wake Opportunity':'Unlock part '+(n+1));
  renderList();
}
go.onclick=()=>{
  if(awake){reset(true);return}
  if(n<PARTS.length){cur=n;n++;update();showInfo(cur);if(GL.ready)GL.pop(cur);return}
  wake();
};
function wake(){
  awake=true;
  if(GL.ready)GL.wake();
  $('#rover').classList.remove('dusty');
  $('.stage').classList.add('awake');
  update();
  info.innerHTML='<p class="tag">Systems online</p><h2>Opportunity is awake</h2><p>The dust is gone, the cameras are watching, and the wheels are turning. Scroll down for the mission timeline.</p>';
  buildTimeline();
  setTimeout(()=>$('#timeline').scrollIntoView({behavior:'smooth'}),1400);
}
function buildTimeline(){
  const ol=$('#tl');ol.className='tl';
  ol.innerHTML=TIMELINE.map((t,i)=>'<li style="transition-delay:'+(i*.18)+'s"><span class="when">'+t[0]+'</span><h3>'+t[1]+'</h3><p>'+t[2]+'</p></li>').join('');
  $('#timeline').classList.add('show');
  requestAnimationFrame(()=>requestAnimationFrame(()=>ol.classList.add('go')));
}
function reset(replay){
  n=0;cur=-1;awake=false;
  if(GL.ready)GL.reset();
  $('#rover').classList.add('dusty');
  $('.stage').classList.remove('awake');
  $('#timeline').classList.remove('show');$('#tl').className='tl';
  update();showInfo(-1);
  if(replay)window.scrollTo({top:0,behavior:'smooth'});
}

const msg=t=>$('#msg').textContent=t;
const NAMES=[/body|chassis|warm|web\b|deck|electronic|box/i,/wheel|rocker|bogie|suspens|strut|axle|tire|tyre/i,/solar|panel|array|cell/i,/mast|pancam|navcam|camera|periscope/i,/idd|arm|turret|instrument|tool|rat\b|drill/i,/hga|antenna|dish|lga/i];
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
const MATMAP={tex_body_n:0,tex_suspension_n:1,tex_panels_n:2,tex_panels2_n:2,tex_mast:3,foil_silver:3,tex_arm:4,tex_instruments:5,Silver:5};
const GL={ready:false,groups:[],ghosts:[],mats:[],dust:.55,dustT:.55,
init(){
  if(this.r)return;
  const box=$('#gl'),w=box.clientWidth||640,h=box.clientHeight||360;
  try{this.r=new THREE.WebGLRenderer({antialias:true,alpha:true})}catch(e){this.r=null;throw new Error('WebGL is not available in this browser')}
  this.r.outputEncoding=THREE.sRGBEncoding;
  this.r.setPixelRatio(Math.min(devicePixelRatio||1,2));this.r.setSize(w,h,false);box.appendChild(this.r.domElement);
  this.s=new THREE.Scene();
  this.c=new THREE.PerspectiveCamera(40,w/h,.1,100);this.c.position.set(5.5,3,6.5);
  this.s.add(new THREE.HemisphereLight(0xfff0dd,0x6b4a35,1.1));
  const d=new THREE.DirectionalLight(0xffffff,1.1);d.position.set(4,8,5);this.s.add(d);
  this.o=new THREE.OrbitControls(this.c,this.r.domElement);
  this.o.enableDamping=true;this.o.autoRotateSpeed=1.4;this.o.target.set(0,.9,0);
  addEventListener('resize',()=>this.size());
  const loop=()=>{requestAnimationFrame(loop);this.tick()};loop();
},
size(){const b=$('#gl'),w=b.clientWidth,h=b.clientHeight;if(!w||!h||!this.r)return;this.r.setSize(w,h,false);this.c.aspect=w/h;this.c.updateProjectionMatrix()},
tick(){
  if(!this.ready||!$('.stage').classList.contains('is3d'))return;
  this.o.update();
  this.groups.forEach(g=>{if(g.position.y>.002)g.position.y*=.86;else g.position.y=0});
  if(Math.abs(this.dust-this.dustT)>.002){
    this.dust+=(this.dustT-this.dust)*.035;
    this.mats.forEach(m=>m.color.copy(m.userData.c0).lerp(new THREE.Color(0xb07a45),this.dust));
  }
  this.r.render(this.s,this.c);
},
load(buf){
  if(!window.THREE||!THREE.GLTFLoader){msg('The 3D libraries did not load. Check your connection and try again.');return}
  const ok=g=>{try{this.build(g.scene)}catch(e){$('.stage').classList.remove('is3d');msg('Could not display the model: '+e.message)}};
  const run=(b,retry)=>{
    try{new THREE.GLTFLoader().parse(b,'',ok,e=>{
      if(retry){msg('Textures failed to load, retrying without them…');try{run(stripTextures(buf),false)}catch(x){msg('Could not read that file: '+x.message)}}
      else msg('Could not read that file: '+((e&&e.message)||e));
    })}catch(e){msg('Could not read that file: '+e.message)}
  };
  run(buf,true);
},
build(root){
  $('.stage').classList.add('is3d');this.init();this.size();
  if(this.root)this.s.remove(this.root);
  this.groups.forEach(g=>this.s.remove(g));this.ghosts.forEach(g=>this.s.remove(g));this.groups=[];this.ghosts=[];this.mats=[];
  this.gm=this.gm||new THREE.MeshBasicMaterial({color:0xc98a2b,transparent:true,opacity:.16,depthWrite:false});
  root.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(root),sz=b.getSize(new THREE.Vector3()),ctr=b.getCenter(new THREE.Vector3());
  const k=4/Math.max(sz.x,sz.y,sz.z);
  root.scale.multiplyScalar(k);root.position.sub(ctr.multiplyScalar(k));root.position.y+=sz.y*k/2;
  this.s.add(root);this.root=root;root.updateMatrixWorld(true);
  b.setFromObject(root);const mn=b.min.clone(),size=b.getSize(new THREE.Vector3());
  const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o)});
  if(!meshes.length)throw new Error('no visible geometry found in the file');
  const bins=PARTS.map(()=>[]);
  const merged=meshes.length<6;
  meshes.forEach(m=>{
    let i=-1;
    const mt=Array.isArray(m.material)?m.material[0]:m.material;
    if(mt&&MATMAP[mt.name]!==undefined)i=MATMAP[mt.name];
    else if(!merged){
      i=NAMES.findIndex(r=>r.test(m.name||''));
      if(i<0){
        const c=new THREE.Box3().setFromObject(m).getCenter(new THREE.Vector3());
        const ny=(c.y-mn.y)/size.y,nx=(c.x-mn.x)/size.x;
        i=ny<.3?1:ny>.78?(nx<.5?5:3):ny>.6?2:0;
      }
    }else i=0;
    bins[i].push(m);
  });
  PARTS.forEach((p,i)=>{
    const g=new THREE.Group();this.s.add(g);this.groups.push(g);
    const gh=new THREE.Group();this.s.add(gh);this.ghosts.push(gh);
    bins[i].forEach(m=>{
      m.updateWorldMatrix(true,false);
      const gmesh=new THREE.Mesh(m.geometry,this.gm);gmesh.matrixAutoUpdate=false;gmesh.matrix.copy(m.matrixWorld);gh.add(gmesh);
      g.attach(m);
      m.material=Array.isArray(m.material)?m.material.map(x=>x.clone()):m.material.clone();
      (Array.isArray(m.material)?m.material:[m.material]).forEach(x=>{if(x.color){x.userData.c0=x.color.clone();this.mats.push(x)}});
    });
  });
  this.ready=true;this.dust=0;this.dustT=awake?0:.55;
  $('#toggle').hidden=false;$('#toggle').textContent='Show illustration';
  msg('Locked parts show as faint outlines. '+(merged?'This model is one merged piece, so it appears all at once on the first unlock.':meshes.length+' pieces sorted into 6 parts.'));
  $('#map').hidden=false;
  $('#maptxt').textContent=PARTS.map((p,i)=>p.name+': '+bins[i].length+' piece(s)'+(bins[i].length?' ('+bins[i].slice(0,4).map(m=>m.name||'unnamed').join(', ')+')':'')).join('\n');
  this.sync();
},
sync(){this.groups.forEach((g,i)=>g.visible=i<n);this.ghosts.forEach((g,i)=>g.visible=i>=n);this.dustT=awake?0:.55},
pop(i){if(this.groups[i])this.groups[i].position.y=1.8},
wake(){this.dustT=0;this.o.autoRotate=true},
reset(){this.dustT=.55;this.o.autoRotate=false;this.sync()}
};
function readFile(f){
  if(!f)return;msg('Reading '+f.name+'…');
  const r=new FileReader();r.onload=()=>GL.load(r.result);r.onerror=()=>msg('Could not read that file.');r.readAsArrayBuffer(f);
}
$('#pick').onclick=()=>$('#file').click();
$('#file').onchange=e=>readFile(e.target.files[0]);
$('#toggle').onclick=()=>{const st=$('.stage');const on=st.classList.toggle('is3d');$('#toggle').textContent=on?'Show illustration':'Show 3D model';if(on)GL.size()};
const stg=$('.stage');
stg.ondragover=e=>{e.preventDefault();stg.classList.add('over')};
stg.ondragleave=()=>stg.classList.remove('over');
stg.ondrop=e=>{e.preventDefault();stg.classList.remove('over');readFile(e.dataTransfer.files[0])};
$('#reset').onclick=()=>reset(false);
update();showInfo(-1);
fetch('assets/mer_small.glb')
  .then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.arrayBuffer()})
  .then(buf=>GL.load(buf))
  .catch(e=>msg('Could not load assets/mer_small.glb ('+e.message+'). Serve the folder over http, not file://.'));
