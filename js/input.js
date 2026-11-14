// Inputs: RFID platform (Pico over USB serial) and keyboard. They only call unlock(id) and reset() from app.js.
// The platform can only unlock parts; resetting is up to the user (Start over button or the r key).
//
// Serial lines understood (case-insensitive, everything else is ignored):
//   UID:93e39a92            agreed protocol: tag UID as hex
//   Uid is: 93 e3 9a 92     what Mechatronics/RFID_Project/example.c prints today (%x, unpadded bytes)
//   Card UID: 93 E3 9A 92   printed by PICC_DumpToSerial
//   ADD:<part id>           firmware did the mapping itself
//   READY                   platform booted
// Keys: 1-4 unlock PARTS[0-3], r resets, d toggles the dev panel.
(()=>{
const $=s=>document.querySelector(s);
const PICO={usbVendorId:0x2e8a};             // Raspberry Pi USB vendor id (Pico SDK stdio_usb)
const LS='uidMap';                           // tags assigned in the dev panel, kept in this browser
const btn=$('#connect'),plat=$('#plat');
let port=null,open=false;
const seenUnknown=new Map(),rawLog=[];

// ---- UID -> part
let saved={};try{saved=JSON.parse(localStorage.getItem(LS)||'{}')}catch(e){}
function partFor(uid){
  if(saved[uid])return saved[uid];
  const p=PARTS.find(p=>(p.uids||[]).some(u=>u.toLowerCase()===uid));
  return p&&p.id;
}
function normUid(t){
  const b=t.trim().split(/[\s:-]+/);
  // Spaced bytes: keep the last 2 digits of each. PICC_DumpToSerial prints 0x05 as "005" and 0x93 as "FFFFFF93".
  return (b.length>1?b.map(x=>x.padStart(2,'0').slice(-2)).join(''):b[0]).toLowerCase();
}

// ---- line parsing
const UID_RE=/^(?:uid|uid is|card uid)\s*:?\s*((?:[0-9a-f]+[\s:-]+)*[0-9a-f]+)$/i;
function handleLine(raw){
  const s=raw.trim();if(!s)return;
  log(s);
  let m;
  if(/^ready$/i.test(s)){setPlat('Platform ready','ok');return}
  if((m=s.match(/^add\s*:\s*([a-z0-9_]+)$/i))){unlock(m[1].toLowerCase());return}
  if((m=s.match(UID_RE))){
    const uid=normUid(m[1]),id=partFor(uid);
    if(id)unlock(id);else unknown(uid);
  }
}

// ---- Web Serial
function setPlat(text,state){plat.textContent=text;plat.dataset.state=state||''}
async function openPort(p){
  if(open)return;
  try{await p.open({baudRate:115200})}
  catch(e){setPlat('Could not open the platform: '+e.message,'err');return}
  port=p;open=true;btn.hidden=true;setPlat('Platform connected','ok');
  readLoop(p);
}
async function readLoop(p){
  const dec=new TextDecoder();let buf='';
  while(p.readable){
    const reader=p.readable.getReader();
    try{
      for(;;){
        const {value,done}=await reader.read();
        if(done)break;
        buf+=dec.decode(value,{stream:true});
        let i;
        while((i=buf.search(/[\r\n]/))>=0){handleLine(buf.slice(0,i));buf=buf.slice(i+1)}
        if(buf.length>2000)buf='';
      }
    }catch(e){/* device unplugged or a read error: fall through */}
    finally{reader.releaseLock()}
    if(!open)break;
  }
  try{await p.close()}catch(e){}
  if(port===p){port=null;open=false;btn.hidden=false;setPlat('Platform disconnected. Plug it back in or press Connect.','err')}
}
if('serial' in navigator){
  btn.onclick=async()=>{
    try{await openPort(await navigator.serial.requestPort({filters:[PICO]}))}
    catch(e){if(e.name!=='NotFoundError')setPlat('Could not connect: '+e.message,'err')}
  };
  // Reconnect to a port this site was already allowed to use, on load and when it's plugged back in.
  const auto=async()=>{const ps=await navigator.serial.getPorts();if(ps.length&&!open)openPort(ps[0])};
  navigator.serial.addEventListener('connect',auto);
  navigator.serial.addEventListener('disconnect',e=>{if(e.target===port){open=false}});
  setPlat('Platform not connected','');
  auto();
}else{
  btn.hidden=true;
  setPlat('No platform: Web Serial needs Chrome or Edge on localhost. Keys 1–'+PARTS.length+' still work.','err');
}

// ---- keyboard
addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey||/^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName))return;
  const k=e.key.toLowerCase(),n=parseInt(k,10);
  if(n>=1&&n<=PARTS.length)unlock(PARTS[n-1].id);
  else if(k==='r')reset();
  else if(k==='d')$('#dev').hidden=!$('#dev').hidden;
});

// ---- dev panel: raw serial log + register unknown tags
function log(s){rawLog.push(s);if(rawLog.length>12)rawLog.shift();$('#rawlog').textContent=rawLog.join('\n')}
function unknown(uid){
  seenUnknown.set(uid,(seenUnknown.get(uid)||0)+1);
  $('#dev').hidden=false;
  renderTags();
}
function renderTags(){
  const opts='<option value="">Assign to…</option>'+PARTS.map(p=>'<option value="'+p.id+'">'+p.name+'</option>').join('');
  const rows=[...seenUnknown.keys()].map(u=>'<li><code>'+u+'</code><select data-uid="'+u+'">'+opts+'</select></li>');
  $('#tags').innerHTML=rows.join('')||'<li>None yet. Place a tag on the platform.</li>';
  $('#tags').querySelectorAll('select').forEach(s=>s.onchange=()=>{
    if(!s.value)return;
    saved[s.dataset.uid]=s.value;try{localStorage.setItem(LS,JSON.stringify(saved))}catch(e){}
    seenUnknown.delete(s.dataset.uid);renderTags();unlock(s.value);
  });
  $('#saved').textContent=PARTS.map(p=>p.id+": uids:["+[...(p.uids||[]),...Object.keys(saved).filter(u=>saved[u]===p.id)].map(u=>"'"+u+"'").join(',')+"]").join('\n');
}
$('#clearTags').onclick=()=>{saved={};try{localStorage.removeItem(LS)}catch(e){}renderTags()};
renderTags();
})();
