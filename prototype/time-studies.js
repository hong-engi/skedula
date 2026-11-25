const panels=[...document.querySelectorAll('section')];
const state=panels.map(()=>({at:810,len:30,saved:false}));
const start=780,end=1020;
const clock=m=>Math.floor(m/60)+':'+String(m%60).padStart(2,'0');
function overlaps(at,len){return at<930&&at+len>900}
function btn(text,selected,click){
  const b=document.createElement('button');b.textContent=text;b.setAttribute('aria-pressed',selected);b.onclick=click;return b
}
function result(i){
  const p=panels[i],s=state[i], conflict=overlaps(s.at,s.len);
  p.querySelector('.result').textContent=clock(s.at)+' – '+clock(s.at+s.len);
  p.querySelector('.apply').disabled=conflict;
  p.querySelector('output').textContent=conflict?'치과 예약과 겹침':s.saved?'배정됨 ✓':s.len+'분';
}
panels.forEach((p,i)=>p.querySelector('.apply').onclick=()=>{state[i].saved=true;result(i)});
function set(i,at,len){
  Object.assign(state[i],{at:Math.max(start,Math.min(at,end-len)),len,saved:false});result(i)
}
const track=document.querySelector('.track');
for(let h=13;h<=17;h++){
  const tick=document.createElement('div');tick.className='line';tick.style.top=(h-13)*25+'%';
  const label=document.createElement('span');label.textContent=clock(h*60);tick.append(label);track.append(tick)
}
function block(name,at,len,cls){
  const b=document.createElement('div');b.className='block '+cls;b.textContent=name;
  b.style.top=(at-start)/240*100+'%';b.style.height=len/240*100+'%';track.append(b);return b
}
block('치과 예약',900,30,'fixed');
let work=block('회신 보내기',810,30,''),anchor=null;
function draw(at,len){set(0,at,len);work.remove();work=block('회신 보내기',state[0].at,len,'')}
function minute(e){const r=track.getBoundingClientRect();return start+15*Math.max(0,Math.min(16,Math.round((e.clientY-r.top)/r.height*16)))}
track.onpointerdown=e=>{if(e.button!==0)return;anchor=minute(e);track.setPointerCapture(e.pointerId);track.onpointermove(e)};
track.onpointermove=e=>{if(anchor!==null){const m=minute(e);draw(Math.min(m,anchor),Math.max(15,Math.abs(m-anchor)))}};
track.onpointerup=track.onpointercancel=()=>anchor=null;
track.onkeydown=e=>{if(!['ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const delta=e.key==='ArrowUp'?-15:15,s=state[0];draw(s.at+(e.shiftKey?0:delta),e.shiftKey?Math.max(15,Math.min(end-s.at,s.len+delta)):s.len)};
let mode='hour';
function chips(i,action){
  const container=panels[i].querySelector('.chips');
  container.replaceChildren(...[15,30,60].map(n=>btn(n+'분',state[i].len===n,()=>action(n))))
}
function dial(){
  const p=panels[1],s=state[1],h=Math.floor(s.at/60),m=s.at%60;
  p.querySelector('.segments').replaceChildren(...[['hour','오후 '+(h-12)+'시'],['minute',m+'분']].map(([key,label])=>btn(label,mode===key,()=>{mode=key;dial()})));
  const face=p.querySelector('.dial');face.replaceChildren();const isHour=mode==='hour';
  face.style.setProperty('--angle',(isHour?h%12*30:m*6)+'deg');
  for(let j=0;j<12;j++){const value=isHour?j||12:j*5;
    const at=isHour?(12+value)*60+m:h*60+value;
    const b=btn(isHour?value:String(value).padStart(2,'0'),isHour?value===h-12:value===m,()=>{
      set(1,at,s.len);if(isHour)mode='minute';dial()
    });b.disabled=at<start||at+s.len>end;b.style.left=50+39*Math.sin(j*Math.PI/6)+'%';b.style.top=50-39*Math.cos(j*Math.PI/6)+'%';face.append(b)
  }
  chips(1,n=>{set(1,s.at,n);dial()})
}
function slots(){
  const s=state[2],box=panels[2].querySelector('.slots');box.replaceChildren();
  for(let t=start;t+s.len<=end;t+=30)if(!overlaps(t,s.len))box.append(btn(clock(t),t===s.at,()=>{set(2,t,s.len);slots()}));
  chips(2,n=>{let at=s.at;if(at+n>end||overlaps(at,n))at=start;set(2,at,n);slots()})
}
dial();slots();panels.forEach((_,i)=>result(i))
