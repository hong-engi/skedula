let weekOffset=0, editingBooking=null;
const bookingKey='skedula-calendar-v1';
function localDate(key){return new Date(key+'T12:00:00')}
function datePlus(key,n){
  const d=localDate(key);d.setDate(d.getDate()+n);return d.toLocaleDateString('sv-SE')
}
function weekStart(){return datePlus(dayKey,weekOffset*7-(localDate(dayKey).getDay()+6)%7)}
function loadBookings(){
  const saved=localStorage.getItem(bookingKey);
  if(saved)return JSON.parse(saved);
  const initial=[{title:'치과 예약',date:dayKey,at:900,len:30,repeat:'',travel:0}];
  localStorage.setItem(bookingKey,JSON.stringify(initial));return initial
}
function occurs(b,date){
  return date===b.date || (date>b.date && (b.repeat==='daily' ||
    (b.repeat==='weekly' && localDate(date).getDay()===localDate(b.date).getDay())))
}
function calendarBlocks(date){
  const blocks=[];
  for(const b of bookings){
    if(occurs(b,date)){
      blocks.push({...b,fixed:true,source:b});
      const length=Math.min(b.at,b.travel);
      if(length)blocks.push({title:'이동 · '+b.title,at:b.at-length,len:length,buffer:true,fixed:true,source:b})
    }
    if(b.travel>b.at && occurs(b,datePlus(date,1))){
      const length=b.travel-b.at;
      blocks.push({title:'이동 · '+b.title,at:1440-length,len:length,buffer:true,fixed:true,source:b})
    }
  }
  return blocks
}
function renderWeek(){
  const start=weekStart(),end=datePlus(start,6);
  const format=k=>localDate(k).toLocaleDateString('ko-KR',{month:'short',day:'numeric'});
  const sameMonth=start.slice(0,7)===end.slice(0,7);
  el('weekRange').textContent=format(start)+' – '+(sameMonth?Number(end.slice(-2))+'일':format(end));
  el('thisWeek').hidden=weekOffset===0;
  const days=el('weekDays');days.replaceChildren();
  for(let i=0;i<7;i++){
    const date=datePlus(start,i),row=node('div',null,'week-day'),day=node('div',null,'day-label');
    day.append(node('strong',date.slice(-2)),node('small',localDate(date).toLocaleDateString('ko-KR',{weekday:'short'})));
    if(date===dayKey)row.classList.add('is-today');
    const items=node('div',null,'agenda');
    const events=calendarBlocks(date);
    if(date===dayKey)events.push(...tasks.filter(t=>t.at!=null&&!t.inbox));
    events.sort((a,b)=>a.at-b.at);
    for(const t of events){
      const line=button(range(t)+'　'+t.title+(t.repeat==='daily'?' · 매일':t.repeat==='weekly'?' · 매주':''),()=>{
        if(t.fixed)editBooking(t.source);else editDetails(t)
      });
      if(t.buffer)line.className='travel-item';items.append(line)
    }
    for(const t of tasks.filter(t=>!t.inbox&&!t.done&&t.due===date)){
      items.append(button('마감 '+(t.dueTime||'')+'　'+t.title,()=>editDetails(t)))
    }
    const add=icon('＋',date+' 약속 추가',()=>editBooking(null,date));
    row.append(day,items,add);days.append(row)
  }
}
function editBooking(b,date){
  editingBooking=b;
  el('bookingTitle').textContent=b?(b.repeat?'반복 일정 전체 편집':'약속 편집'):'새 약속';
  el('bookingName').value=b?.title??'';el('bookingDate').value=b?.date??date;
  el('bookingStart').value=clock(b?.at??600);el('bookingEnd').value=clock(b?b.at+b.len:660);
  el('repeat').value=b?.repeat??'';el('travel').value=b?.travel??0;
  el('removeBooking').hidden=!b;el('bookingEnd').setCustomValidity('');
  el('appointment').showModal();el('bookingName').focus()
}
function commitBookings(){
  localStorage.setItem(bookingKey,JSON.stringify(bookings));el('appointment').close();render()
}
function renderInbox(){
  const list=el('ideas');list.replaceChildren();
  const items=tasks.filter(t=>t.inbox);
  if(!items.length)list.append(node('p','아직 담아 둔 메모가 없습니다.'));
  for(const t of items){
    const row=node('div',null,'idea-row');row.append(node('span',t.title));
    for(const group of ['할 일','버킷리스트']){
      row.append(button(group+'로',()=>{delete t.inbox;t.group=group==='할 일'?'내 할 일':group;save()}))
    }
    row.append(icon('×','메모 삭제',()=>{tasks.splice(tasks.indexOf(t),1);save()}));list.append(row)
  }
}
document.addEventListener('DOMContentLoaded',()=>{
  el('prevWeek').onclick=()=>{weekOffset--;renderWeek()};
  el('nextWeek').onclick=()=>{weekOffset++;renderWeek()};
  el('thisWeek').onclick=()=>{weekOffset=0;renderWeek();el('nextWeek').focus({preventScroll:true})};
  el('booking').oninput=()=>el('bookingEnd').setCustomValidity('');
  el('closeBooking').onclick=()=>el('appointment').close();
  el('removeBooking').onclick=()=>{
    if(!confirm(editingBooking.repeat?'반복 일정 전체를 삭제할까요?':'약속을 삭제할까요?'))return;
    bookings.splice(bookings.indexOf(editingBooking),1);commitBookings()
  };
  el('booking').onsubmit=e=>{
    e.preventDefault();
    const minutes=id=>{const [h,m]=el(id).value.split(':').map(Number);return h*60+m};
    const at=minutes('bookingStart'),len=minutes('bookingEnd')-at;
    if(len<=0){el('bookingEnd').setCustomValidity('같은 날의 더 늦은 종료 시각을 선택하세요.');el('bookingEnd').reportValidity();return}
    const title=el('bookingName').value.trim();if(!title)return el('bookingName').focus();
    const b=editingBooking??{};Object.assign(b,{title,date:el('bookingDate').value,at,len,repeat:el('repeat').value,travel:Number(el('travel').value)});
    if(!editingBooking)bookings.push(b);commitBookings()
  };
  el('capture').onsubmit=e=>{
    e.preventDefault();const title=el('idea').value.trim();if(!title)return;
    tasks.push({title,inbox:true,level:5,due:'',dueTime:''});el('idea').value='';save();el('idea').focus()
  }
});
