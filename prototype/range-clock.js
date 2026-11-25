// Both the daily planner and the comparison study use the same interval editor.
function createRangeClock(host, onChange) {
  host.classList.add('range-clock');
  let values = [0, 30], endpoint = 0, unit = 0, pointer = null;
  const periods = [], controls = [], fields = document.createElement('div');
  fields.className = 'clock-fields';
  for (const [i, title] of ['시작', '종료'].entries()) {
    const group = document.createElement('div'), caption = document.createElement('small');
    caption.textContent = title;
    group.append(caption);
    const period=document.createElement('button');
    period.type='button';period.className='clock-period';
    period.onclick=()=>{
      endpoint=i;unit=0;
      apply((Math.floor(values[i]/60)+12)%24);
    };
    group.append(period);periods.push(period);
    for (const [j, suffix] of ['시', '분'].entries()) {
      const part = document.createElement('button');
      part.type = 'button';
      part.onclick = () => { endpoint = i; unit = j; paint(); };
      if (j) group.append(':');
      group.append(part);
      controls.push({part, i, j, title, suffix});
    }
    fields.append(group);
  }
  const face = document.createElement('div'), hand = document.createElement('i');
  face.className = 'clock-face';
  face.tabIndex = 0;
  face.setAttribute('role', 'slider');
  face.append(hand);
  const marks = Array.from({length:12}, (_, i) => {
    const mark = document.createElement('span'), angle = i*Math.PI/6;
    mark.style.left = (50 + 39*Math.sin(angle))+'%';
    mark.style.top = (50 - 39*Math.cos(angle))+'%';
    face.append(mark);
    return mark;
  });
  host.append(fields, face);
  function paint() {
    periods.forEach((part,i)=>{
      part.textContent=values[i]%1440<720?'오전':'오후';
      part.setAttribute('aria-label',(i?'종료':'시작')+' '+part.textContent+' · 오전/오후 전환');
    });
    for (const {part,i,j,title,suffix} of controls) {
      const n = j ? values[i]%60 : Math.floor(values[i]/60);
      part.textContent = j ? String(n).padStart(2,'0') : String(n%12||12);
      part.setAttribute('aria-label', title+' '+periods[i].textContent+' '+part.textContent+suffix+' 조정');
      part.setAttribute('aria-pressed', i===endpoint && j===unit);
    }
    const limit = unit ? 60 : 24;
    const current = unit ? values[endpoint]%60 : Math.floor(values[endpoint]/60);
    hand.style.transform = 'rotate('+current*360/(unit?60:12)+'deg)';
    marks.forEach((mark,i) => { mark.textContent = unit?String(i*5).padStart(2,'0'):String(i||12); });
    face.setAttribute('aria-label', (endpoint?'종료':'시작')+(unit?' 분':' 시각'));
    face.setAttribute('aria-valuemin',0);
    face.setAttribute('aria-valuemax',limit-1);
    face.setAttribute('aria-valuenow',current%limit);
    face.setAttribute('aria-valuetext',unit?current+'분':periods[endpoint].textContent+' '+(current%12||12)+'시');
  }
  function apply(n) {
    const old = values[endpoint];
    // At the end of the day the top tick can represent 24:00.
    if(unit){
      values[endpoint] = old===1440 ? (n===0?1440:n) : Math.floor(old/60)*60+n;
    }else{
      values[endpoint] = n*60+old%60;
      if(endpoint && values[endpoint]===0)values[endpoint]=1440;
    }
    paint(); onChange(...values);
  }
  let lastTick=null;
  function point(e) {
    const r=face.getBoundingClientRect(), x=e.clientX-r.left-r.width/2, y=e.clientY-r.top-r.height/2;
    if(Math.hypot(x,y)<10)return;
    const count=unit?60:12;
    const tick=(Math.round(Math.atan2(x,-y)*count/(2*Math.PI))+count)%count;
    if(tick===lastTick)return;
    const hour=Math.floor(values[endpoint]/60)%24;
    if(unit)apply(tick);
    else if(lastTick===null)apply((hour>=12?12:0)+tick);
    else{
      const delta=(tick-lastTick+18)%12-6;
      apply((hour+delta+24)%24);
    }
    lastTick=tick;
  }
  face.onpointerdown = e => {
    if(e.button!==0||pointer!==null)return;
    pointer=e.pointerId;lastTick=null;face.setPointerCapture(pointer);face.focus({preventScroll:true});point(e);
  };
  face.onpointermove = e => { if(e.pointerId===pointer)point(e); };
  face.onpointerup = e => { if(e.pointerId===pointer)point(e); };
  face.onlostpointercapture = () => {pointer=null;lastTick=null;};
  face.onkeydown = e => {
    const step={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];
    if(!step)return;
    e.preventDefault();
    const count=unit?60:24, n=unit?values[endpoint]%60:Math.floor(values[endpoint]/60);
    apply((n+step+count)%count);
  };
  return (at,end) => {values=[at,end];endpoint=0;unit=0;paint();};
}
