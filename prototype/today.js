
const el=id=>document.getElementById(id), now=new Date(), key='skedula-preview-v1-'+now.toLocaleDateString('sv-SE');
el('date').textContent=now.toLocaleDateString('ko-KR',{month:'long',day:'numeric',weekday:'long'});
const seeds=[['회신 보내기','마감 임박','오늘 17:00 마감'],['제품 방향 문서 쓰기','중요한 일','중요 · 다음 달 마감'],['포트폴리오 정리','중요한 일','중요 · 마감 없음'],['사진 산책','버킷리스트','하고 싶은 일']];
const dayKey=now.toLocaleDateString('sv-SE');
const dataKey='skedula-tasks-v3';
const stored=JSON.parse(localStorage.getItem(dataKey)||'null');
const previous=stored??JSON.parse(localStorage.getItem('skedula-tasks-v2')||'null');
let tasks=previous?.tasks ?? JSON.parse(localStorage.getItem(key)||'null') ?? seeds.map(([title,group,reason])=>({title,group,reason}));
function dayAfter(days){
  const date=new Date(now);date.setDate(date.getDate()+days);return date.toLocaleDateString('sv-SE')
}
for(const t of tasks){
  if(t.level==null){
    t.level=t.group==='중요한 일'?3:2;
    t.due=t.reason==='오늘 17:00 마감'?dayKey:t.reason?.includes('다음 달')?dayAfter(30):'';
    t.dueTime=t.reason==='오늘 17:00 마감'?'17:00':'';
  }
  if(!stored)t.level=({1:1,2:5,3:10})[t.level]??5;
  if(previous && previous.day!==dayKey){t.today=false;delete t.at}
}
function daysLeft(t){return t.due?(Date.parse(t.due)-Date.parse(dayKey))/86400000:Infinity}
function dueText(t){
  const d=daysLeft(t);
  if(!Number.isFinite(d))return '마감 없음';
  const relative=d<0?Math.abs(d)+'일 지남':d===0?'오늘 마감':d===1?'내일 마감':'D−'+d;
  return relative+(t.dueTime?' '+t.dueTime:'')
}
function priorityBand(t){
  const days=daysLeft(t);return days<=0?0:days<=3?1:2
}
function compareTasks(a,b){
  return Number(!!a.done)-Number(!!b.done)||priorityBand(a)-priorityBand(b)||b.level-a.level||daysLeft(a)-daysLeft(b)||0
}
function persist(){localStorage.setItem(dataKey,JSON.stringify({day:dayKey,tasks}))}
persist();
function node(tag,text,cls){const n=document.createElement(tag);if(text!=null)n.textContent=text;if(cls)n.className=cls;return n}
function button(text,fn){const b=node('button',text);b.onclick=fn;return b}
function save(task){
  persist();render();
  if(task){
    const row=el('tasks').querySelector('[data-index="'+tasks.indexOf(task)+'"]');
    (row?.querySelector('.task-name')??document.querySelector('nav [aria-current="page"]')).focus({preventScroll:true})
  }
}
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
  const items=tasks.filter(t=>today?t.today:(t.group==='버킷리스트')===bucket).sort(compareTasks);
  const list=el('tasks');list.replaceChildren();
  if(!items.length){list.append(node('p',today?'오늘 하기로 고른 일이 없습니다.':'아직 항목이 없습니다.'));if(today)list.append(button('할 일에서 고르기',()=>navigate('할 일')))}
  for(const t of items){
    const row=node('div',null,'row'), label=node('label'), check=node('input');
    check.type='checkbox';check.checked=!!t.done;check.onchange=()=>{t.done=check.checked;save(t)};
    check.setAttribute('aria-label',t.title+' 완료');
    const name=button(t.title,()=>editDetails(t));name.className='task-name';name.title='이름, 중요도, 마감 편집';name.setAttribute('aria-label',t.title+' 편집');
    const meta=node('div',null,'meta');
    meta.append(node('span','중요도 '+t.level,'level'),node('span',dueText(t),daysLeft(t)<=3?'due urgent':'due'));
    if(t.at!=null)meta.append(node('span',range(t)));
    row.dataset.index=tasks.indexOf(t);row.style.setProperty('--importance',t.level/10);row.classList.toggle('finished',!!t.done);
    const info=node('div',null,'info');info.append(name,meta);row.append(check,info);
    if(!t.done){
      const actions=node('div',null,'actions');row.append(actions);
      if(t.at==null)actions.append(icon(t.today?'★':'☆',t.today?'오늘 선택 해제':'오늘로 고르기',()=>{t.today=!t.today;save(t)}));
      actions.append(icon('◷','작업 시간 편집',()=>openTime(t,t.at??660,t.len??30)));
      if(t.at!=null)actions.append(icon('×','시간 배정 취소',()=>{delete t.at;save(t)}));
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
  el('level').disabled=timed;el('details').hidden=timed;el('timing').hidden=!timed;el('nameLabel').hidden=timed;
  el('titleInput').disabled=timed;el('titleInput').required=!timed;
  el('minutes').disabled=!timed;el('start').disabled=!timed;el('titleInput').value='';el('editor').showModal()
}
function openTime(task,at,len){
  const choice=el('choice');choice.replaceChildren();
  tasks.forEach((t,i)=>{if(!t.done&&(!task||task===t)){const option=node('option',t.title+(t.at!=null?' · '+range(t):''));option.value=i;choice.append(option)}});
  const fresh=node('option','새 작업…');fresh.value='new';if(!task)choice.append(fresh);
  choice.disabled=!!task;if(task)choice.value=tasks.indexOf(task);else choice.value=Array.from(choice.options).find(o=>o.value!=='new' && tasks[o.value].at==null)?.value??'new';
  el('start').value=clock(at);el('minutes').max=Math.max(180,len);el('minutes').value=len;
  el('heading').textContent='작업 시간';dialog(true);choice.onchange();updateRange()
}
function startMinute(){const [h,m]=el('start').value.split(':').map(Number);return h*60+m}
function updateRange(){const at=startMinute();if(!Number.isFinite(at))return;el('minutes').max=1440-at;el('span').textContent=range({at,len:Number(el('minutes').value)});updateTimeHint()}
function updateTimeHint(){
  const chosen=el('choice').value;
  const task=chosen==='new'?null:tasks[Number(chosen)];
  const at=startMinute(),end=at+Number(el('minutes').value);
  const clash=[fixed,...tasks].find(t=>t!==task&&t.at!=null&&t.at<end&&at<t.at+t.len);
  el('hint').textContent=[task?.at!=null?'기존 배정 '+range(task):'',clash?'겹치는 일정 · '+clash.title:''].filter(Boolean).join(' / ')
}
el('start').oninput=el('minutes').oninput=updateRange;
el('choice').onchange=()=>{const fresh=el('choice').value==='new';el('nameLabel').hidden=!fresh;el('titleInput').disabled=!fresh;el('titleInput').required=fresh;updateTimeHint()};
let detailsTask=null;
function editDetails(t){
  detailsTask=t;
  el('heading').textContent=t?'항목 편집':page==='버킷리스트'?'버킷리스트에 추가':'할 일 추가';
  dialog(false);el('titleInput').value=t?.title??'';el('titleInput').focus();
  el('level').value=t?.level??5;el('due').value=t?.due??'';el('dueTime').value=t?.dueTime??'';
  el('due').oninput()
}
el('due').oninput=()=>{el('dueTime').disabled=!el('due').value;if(el('dueTime').disabled)el('dueTime').value=''};
el('add').onclick=()=>editDetails(null);
el('cancel').onclick=()=>el('editor').close();
el('form').onsubmit=e=>{
  e.preventDefault();const timed=!el('timing').hidden;let t;
  if(!timed||el('choice').value==='new'){
    const title=el('titleInput').value.trim();if(!title)return el('titleInput').focus();
    t=(!timed&&detailsTask)||{title,level:5,due:'',dueTime:'',group:page==='버킷리스트'?'버킷리스트':'내 할 일',reason:'직접 추가',today:page==='오늘'};t.title=title;if(!timed)Object.assign(t,{level:Number(el('level').value),due:el('due').value,dueTime:el('dueTime').value});if(!tasks.includes(t))tasks.push(t)
  }else t=tasks[Number(el('choice').value)];
  if(timed)Object.assign(t,{at:startMinute(),len:Number(el('minutes').value),today:true});
  el('editor').close();save(t)
};
render();
el('scroll').scrollTop=15*84-el('scroll').clientHeight*.65;
