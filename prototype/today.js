
const el=id=>document.getElementById(id), now=new Date(), key='skedula-preview-v1-'+now.toLocaleDateString('sv-SE');
el('date').textContent=now.toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'});
const seeds=[['회신 보내기','마감 임박','오늘 17:00 마감'],['제품 방향 문서 쓰기','중요한 일','중요 · 다음 달 마감'],['포트폴리오 정리','중요한 일','중요 · 마감 없음'],['사진 산책','버킷리스트','하고 싶은 일']];
let tasks=JSON.parse(localStorage.getItem(key)||'null')||seeds.map(([title,group,reason])=>({title,group,reason}));
function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
function button(text,fn){const b=node('button',text);b.onclick=fn;return b}
function save(){localStorage.setItem(key,JSON.stringify(tasks));render()}
function clock(m){return [Math.floor(m/60),m%60].map(v=>String(v).padStart(2,'0')).join(':')}
function range(t){return clock(t.at)+'–'+clock(t.at+t.len)}
let page='오늘', drawing=null;
const fixed={title:'치과 예약',at:900,len:30,fixed:true};
function icon(symbol,name,action){
  const b=button(symbol,action); b.title=name;b.setAttribute('aria-label',name);return b
}
function navigate(next){page=next;render()}
document.querySelectorAll('nav button').forEach(b=>b.onclick=()=>navigate(b.dataset.page));
function render(){
  const today=page==='오늘', bucket=page==='버킷리스트';
  document.querySelectorAll('nav button').forEach(b=>b.setAttribute('aria-current',b.dataset.page===page?'page':'false'));
  el('page').textContent=page;el('layout').className=today?'today':'';
  el('schedule').hidden=!today;el('listTitle').textContent=today?'오늘 고른 일':page+' 목록';
  const items=tasks.filter(t=>today?t.today:(t.group==='버킷리스트')===bucket);
  const list=el('tasks');list.replaceChildren();
  if(!items.length)list.append(node('p',today?'할 일이나 버킷리스트에서 ☆를 눌러 오늘 할 일을 골라보세요.':'아직 항목이 없습니다.'));
  for(const t of items){
    const row=node('div',null,'row'), label=node('label'), check=node('input');
    check.type='checkbox';check.checked=!!t.done;check.onchange=()=>{t.done=check.checked;save()};
    label.append(check,' '+t.title,node('small',t.reason+(t.at!=null?' · '+range(t):'')));
    if(t.done)label.className='done';row.append(label);
    if(!t.done){
      if(t.at==null)row.append(icon(t.today?'★':'☆',t.today?'오늘 선택 해제':'오늘로 고르기',()=>{t.today=!t.today;save()}));
      row.append(icon('◷','작업 시간 편집',()=>openTime(t,t.at??660,t.len??30)));
      if(t.at!=null)row.append(icon('×','시간 배정 취소',()=>{delete t.at;save()}));
    }
    list.append(row)
  }
  if(today)drawTimeline()
}
const grid=el('timeline');
function drawTimeline(){
  grid.replaceChildren();
  for(let h=0;h<=24;h++){const tick=node('div',null,'tick');tick.style.top=h/24*100+'%';tick.append(node('time',clock(h*60)));grid.append(tick)}
  const events=[fixed,...tasks.filter(t=>t.at!=null)].sort((a,b)=>a.at-b.at);
  let cluster=[], ends=[];
  function place(){
    for(const [t,lane] of cluster){
      const card=t.fixed?node('div'):button('',()=>openTime(t,t.at,t.len));
      card.className='event'+(t.fixed?' fixed':'')+(t.done?' done':'');
      Object.assign(card.style,{top:t.at/1440*100+'%',height:t.len/1440*100+'%',left:lane/ends.length*100+'%',width:100/ends.length+'%'});
      card.title=t.title+' · '+range(t);card.textContent=card.title;grid.append(card)
    }
    cluster=[];ends=[]
  }
  for(const t of events){if(ends.length&&Math.max(...ends)<=t.at)place();let lane=ends.findIndex(end=>end<=t.at);if(lane<0)lane=ends.length;ends[lane]=t.at+t.len;cluster.push([t,lane])}place()
}
function snap(e){const rect=grid.getBoundingClientRect();return Math.max(0,Math.min(1440,Math.round((e.clientY-rect.top)/rect.height*96)*15))}
function bounds(a,b){const start=Math.min(a,b,1425);return [start,Math.max(15,Math.max(a,b)-start)]}
grid.onpointerdown=e=>{
  if(e.button!==0||e.target.closest('.event'))return;
  const ghost=node('div',null,'ghost');grid.append(ghost);drawing={anchor:snap(e),ghost};grid.setPointerCapture(e.pointerId);grid.onpointermove(e)
};
grid.onpointermove=e=>{if(!drawing)return;const [a,n]=bounds(drawing.anchor,snap(e));Object.assign(drawing.ghost.style,{top:a/1440*100+'%',height:n/1440*100+'%'});drawing.ghost.textContent=range({at:a,len:n})};
grid.onpointercancel=()=>{drawing?.ghost.remove();drawing=null};
grid.onpointerup=e=>{if(!drawing)return;const [a,n]=bounds(drawing.anchor,snap(e));grid.onpointercancel();openTime(null,a,n)};
function dialog(timed){
  el('timing').hidden=!timed;el('nameLabel').hidden=timed;
  el('titleInput').disabled=timed;el('titleInput').required=!timed;
  el('start').disabled=!timed;el('titleInput').value='';el('editor').showModal()
}
function openTime(task,at,len){
  const choice=el('choice');choice.replaceChildren();
  tasks.forEach((t,i)=>{if(!t.done){const option=node('option',t.title);option.value=i;choice.append(option)}});
  const fresh=node('option','새 작업…');fresh.value='new';choice.append(fresh);
  if(task)choice.value=tasks.indexOf(task);
  el('start').value=clock(at);el('minutes').max=Math.max(180,len);el('minutes').value=len;
  el('heading').textContent='작업 시간';dialog(true);choice.onchange();updateRange()
}
function startMinute(){const [h,m]=el('start').value.split(':').map(Number);return h*60+m}
function updateRange(){const at=startMinute();if(!Number.isFinite(at))return;el('minutes').max=Math.min(1440-at,Math.max(180,Number(el('minutes').value)));el('span').textContent=range({at,len:Number(el('minutes').value)})}
el('start').oninput=el('minutes').oninput=updateRange;
el('choice').onchange=()=>{const fresh=el('choice').value==='new';el('nameLabel').hidden=!fresh;el('titleInput').disabled=!fresh;el('titleInput').required=fresh};
el('add').onclick=()=>{el('heading').textContent=page==='버킷리스트'?'버킷리스트에 추가':'할 일 추가';dialog(false)};
el('cancel').onclick=()=>el('editor').close();
el('form').onsubmit=e=>{
  e.preventDefault();const timed=!el('timing').hidden;let t;
  if(!timed||el('choice').value==='new'){
    const title=el('titleInput').value.trim();if(!title)return el('titleInput').focus();
    t={title,group:page==='버킷리스트'?'버킷리스트':'내 할 일',reason:'직접 추가',today:page==='오늘'};tasks.push(t)
  }else t=tasks[Number(el('choice').value)];
  if(timed)Object.assign(t,{at:startMinute(),len:Number(el('minutes').value),today:true});
  el('editor').close();save()
};
render();
el('scroll').scrollTop=15*84-el('scroll').clientHeight*.65;
