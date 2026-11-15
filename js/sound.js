// Ambient Mars recording plus small synthesized interface cues. Audio starts only
// after a user gesture, as required by browser autoplay policies.
const SND=(()=>{
const PREF='opportunitySound';
let enabled=true,started=false,ctx=null,master=null,ambientGain=null,ambientBuffer=null,ambientSource=null,ambientLoad=null;
try{enabled=localStorage.getItem(PREF)!=='off'}catch(e){}

function audioContext(){
  if(ctx)return ctx;
  const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
  ctx=new AC();master=ctx.createGain();master.gain.value=.45;master.connect(ctx.destination);
  ambientGain=ctx.createGain();ambientGain.gain.value=.18;ambientGain.connect(ctx.destination);
  return ctx;
}
function loadAmbient(){
  const c=audioContext();if(!c)return Promise.resolve();
  if(ambientBuffer)return Promise.resolve(ambientBuffer);
  if(!ambientLoad)ambientLoad=fetch('assets/audio/first-mars-sounds.m4a')
    .then(r=>{if(!r.ok)throw new Error('Mars audio: HTTP '+r.status);return r.arrayBuffer()})
    .then(data=>c.decodeAudioData(data)).then(buffer=>ambientBuffer=buffer).catch(()=>null);
  return ambientLoad;
}
function startAmbient(){
  if(!enabled||!started||!ambientBuffer||ambientSource)return;
  ambientSource=ctx.createBufferSource();ambientSource.buffer=ambientBuffer;ambientSource.loop=true;
  ambientSource.connect(ambientGain);ambientSource.start();
}
function stopAmbient(){
  if(!ambientSource)return;
  try{ambientSource.stop()}catch(e){}ambientSource.disconnect();ambientSource=null;
}
function start(){
  if(!enabled)return;
  started=true;const c=audioContext();if(c&&c.state==='suspended')c.resume().catch(()=>{});
  loadAmbient().then(()=>startAmbient());render();
}
function render(){
  const b=document.querySelector('#sound');if(!b)return;
  b.textContent=enabled?UI.soundOn:UI.soundOff;
  b.setAttribute('aria-pressed',String(enabled));
  b.title='Ambient recording: NASA Perseverance — first sounds recorded on Mars';
}
function toggle(){
  enabled=!enabled;try{localStorage.setItem(PREF,enabled?'on':'off')}catch(e){}
  if(enabled)start();else{stopAmbient();if(ctx&&ctx.state==='running')ctx.suspend().catch(()=>{})}
  render();
}
function tone(freq,duration=.12,kind='sine',gain=.12,delay=0,endFreq=freq){
  if(!enabled||!started)return;
  const c=audioContext();if(!c||c.state!=='running')return;
  const at=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();
  o.type=kind;o.frequency.setValueAtTime(freq,at);o.frequency.exponentialRampToValueAtTime(Math.max(20,endFreq),at+duration);
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(gain,at+.012);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(g);g.connect(master);o.start(at);o.stop(at+duration+.02);
}
function noise(duration=.18,gain=.07,delay=0){
  if(!enabled||!started)return;
  const c=audioContext();if(!c||c.state!=='running')return;
  const n=Math.ceil(c.sampleRate*duration),buf=c.createBuffer(1,n,c.sampleRate),d=buf.getChannelData(0);
  for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*(1-i/n);
  const src=c.createBufferSource(),filter=c.createBiquadFilter(),g=c.createGain(),at=c.currentTime+delay;
  src.buffer=buf;filter.type='bandpass';filter.frequency.value=900;filter.Q.value=.8;g.gain.value=gain;
  src.connect(filter);filter.connect(g);g.connect(master);src.start(at);
}
function cue(name){
  if(name==='detect'){tone(420,.09,'square',.08);tone(620,.11,'square',.07,.09)}
  else if(name==='install'){noise(.14,.05);tone(150,.2,'triangle',.12,0,85);tone(520,.12,'sine',.06,.14)}
  else if(name==='wake'){tone(110,.8,'sawtooth',.08,0,240);tone(440,.5,'sine',.07,.35,660)}
  else if(name==='transmit'){tone(760,.055,'square',.06);tone(920,.055,'square',.05,.075);tone(760,.055,'square',.05,.15)}
  else if(name==='receive'){tone(1040,.07,'sine',.05);tone(780,.13,'sine',.06,.08)}
  else if(name==='photo'){noise(.08,.08);tone(1280,.06,'square',.06,.03)}
  else if(name==='nav'){tone(330,.08,'sine',.045);tone(440,.1,'sine',.04,.06)}
  else if(name==='lost'){noise(.45,.1);tone(180,.6,'sawtooth',.07,0,55)}
  else if(name==='ending'){tone(220,1.5,'sine',.08,0,82);tone(165,1.7,'sine',.06,.22,55)}
  else if(name==='reset'){tone(520,.09,'sine',.05);tone(350,.12,'sine',.05,.08)}
}

addEventListener('pointerdown',e=>{if(!e.target.closest('#sound'))start()},{once:true});
addEventListener('keydown',()=>start(),{once:true});
addEventListener('DOMContentLoaded',()=>{const b=document.querySelector('#sound');if(b)b.onclick=toggle;render()});
return {start,toggle,cue,get enabled(){return enabled}};
})();
