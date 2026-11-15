// Switchable input: on-screen controls or an RFID platform over Web Serial.
(()=>{
const $=s=>document.querySelector(s);
const BOARDS=[{usbVendorId:0x16c0},{usbVendorId:0x2e8a}];
const TAGS_KEY='uidMap';
const btn=$('#connect'),plat=$('#plat');
let port=null,open=false;
const seenUnknown=new Map(),rawLog=[];
let saved={};try{saved=JSON.parse(localStorage.getItem(TAGS_KEY)||'{}')}catch(e){}

function partFor(uid){
  if(saved[uid])return saved[uid];
  const p=PARTS.find(p=>(p.uids||[]).some(u=>u.toLowerCase()===uid));
  return p&&p.id;
}
function normUid(t){
  const b=t.trim().split(/[\s:-]+/);
  return (b.length>1?b.map(x=>x.padStart(2,'0').slice(-2)).join(''):b[0]).toLowerCase();
}
function setPlat(text,state){plat.textContent=text;plat.dataset.state=state||''}
function log(s){rawLog.push(s);if(rawLog.length>12)rawLog.shift();$('#rawlog').textContent=rawLog.join('\n')}

const UID_RE=/^(?:uid|uid is|card uid|tag_detected)\s*[:,]?\s*((?:[0-9a-f]+[\s:-]+)*[0-9a-f]+)$/i;
function handleLine(raw){
  const s=raw.trim();if(!s)return;
  log(s);
  let m;
  if(/^(?:debug,)?ready\b|^rfid reader ready/i.test(s)){setPlat('Platform ready','ok');return}
  if(/^error,/i.test(s)){setPlat('Reader problem: '+s.slice(6),'err');return}
  if(inputMode!=='hardware')return;
  if((m=s.match(/^add\s*:\s*([a-z0-9_]+)$/i))){unlock(m[1].toLowerCase());return}
  if((m=s.match(UID_RE))){
    const uid=normUid(m[1]),id=partFor(uid);
    if(id)unlock(id);else unknown(uid);
  }
}

async function openPort(p){
  if(open)return;
  try{await p.open({baudRate:115200})}
  catch(e){setPlat('Could not open the platform: '+e.message,'err');return}
  try{await p.setSignals({dataTerminalReady:true})}catch(e){}
  port=p;open=true;btn.hidden=true;setPlat('Platform connected','ok');
  readLoop(p);
}
async function readLoop(p){
  const dec=new TextDecoder();let buf='';
  while(p.readable){
    const reader=p.readable.getReader();
    try{
      for(;;){
        const {value,done}=await reader.read();if(done)break;
        buf+=dec.decode(value,{stream:true});let i;
        while((i=buf.search(/[\r\n]/))>=0){handleLine(buf.slice(0,i));buf=buf.slice(i+1)}
        if(buf.length>2000)buf='';
      }
    }catch(e){}
    finally{reader.releaseLock()}
    if(!open)break;
  }
  try{await p.close()}catch(e){}
  if(port===p){port=null;open=false;btn.hidden=false;setPlat('Platform unplugged','err')}
}
async function autoConnect(){
  if(!('serial' in navigator)||open||inputMode!=='hardware')return;
  const ps=await navigator.serial.getPorts();if(ps.length)openPort(ps[0]);
}

function setInputMode(next){
  inputMode=next==='hardware'?'hardware':'browser';
  document.body.dataset.input=inputMode;
  const browser=inputMode==='browser';
  $('#browserMode').classList.toggle('active',browser);
  $('#hardwareMode').classList.toggle('active',!browser);
  $('#browserMode').setAttribute('aria-pressed',String(browser));
  $('#hardwareMode').setAttribute('aria-pressed',String(!browser));
  $('#hardwareStatus').hidden=browser;
  $('[data-ui="intro"]').textContent=browser?'Build Opportunity':'Place a part on the platform';
  $('[data-ui="introKeys"]').textContent=browser?'Select each part below, then explore her journey.':'';
  $('#dev').hidden=browser;
  update();
  if(!browser)autoConnect();
}
$('#browserMode').onclick=()=>setInputMode('browser');
$('#hardwareMode').onclick=()=>setInputMode('hardware');

if('serial' in navigator){
  btn.onclick=async()=>{
    try{await openPort(await navigator.serial.requestPort({filters:BOARDS}))}
    catch(e){if(e.name!=='NotFoundError')setPlat('Could not connect: '+e.message,'err')}
  };
  navigator.serial.addEventListener('connect',autoConnect);
  navigator.serial.addEventListener('disconnect',e=>{if(e.target===port)open=false});
}else{
  btn.hidden=true;setPlat('Web Serial needs Chrome or Edge','err');
}

function unknown(uid){
  seenUnknown.set(uid,(seenUnknown.get(uid)||0)+1);
  $('#tools').hidden=false;$('#dev').hidden=false;renderTags();
}
function renderTags(){
  const opts='<option value="">Assign to…</option>'+PARTS.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join('');
  $('#tags').innerHTML=[...seenUnknown.keys()].map(u=>'<li><code>'+u+'</code><select data-uid="'+u+'">'+opts+'</select></li>').join('')||'<li>None yet. Place a tag on the platform.</li>';
  $('#tags').querySelectorAll('select').forEach(s=>s.onchange=()=>{
    if(!s.value)return;
    saved[s.dataset.uid]=s.value;try{localStorage.setItem(TAGS_KEY,JSON.stringify(saved))}catch(e){}
    seenUnknown.delete(s.dataset.uid);renderTags();unlock(s.value);
  });
  $('#saved').textContent=PARTS.map(p=>p.name+': '+Object.keys(saved).filter(u=>saved[u]===p.id).join(', ')).join('\n');
}
$('#clearTags').onclick=()=>{saved={};try{localStorage.removeItem(TAGS_KEY)}catch(e){}renderTags()};
renderTags();

addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
  const k=e.key.toLowerCase(),n=parseInt(k,10);
  if(n>=1&&n<=PARTS.length)unlock(PARTS[n-1].id);
  else if(k==='enter'&&e.target.tagName!=='BUTTON'){e.preventDefault();primary()}
  else if(k==='arrowleft')nav(-1);
  else if(k==='arrowright')nav(1);
  else if(k==='r')reset();
  else if(k==='d')$('#tools').hidden=!$('#tools').hidden;
});

let initial=new URLSearchParams(location.search).get('mode')||'hardware';
setInputMode(initial);
})();
