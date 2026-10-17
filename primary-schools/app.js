import {DEFAULT_FILTERS,RELATION_LABELS,programmes,hasIbProgression,matchesSchool,sortSchools,toCsv} from './model.js';

const $=selector=>document.querySelector(selector);
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=value=>value===null?'待核實':value===0?'免學費':'HK$'+value.toLocaleString('en-HK');
const genderLabel=value=>value==='男女'?'男女校':value==='男'?'男校':'女校';
const pypLabel=s=>s.pyp===true?'IB PYP':s.pyp===false?'非 PYP':'未列 PYP';
let schools=[],visible=[],filters={...DEFAULT_FILTERS},sort='name',selected=new Set(),preset='all',detailId=null;
let toastTimer;
const preferenceKey='hk-school-pathways-v1';
const notify=text=>{clearTimeout(toastTimer);$('#toast').textContent=text;$('#toast').hidden=false;toastTimer=setTimeout(()=>$('#toast').hidden=true,3000);};
const sourceLinks=s=>s.sources.map(x=>`<a href="${escape(x.url)}" target="_blank" rel="noopener noreferrer">${escape(x.label)}${x.year?'（'+escape(x.year)+'）':''}</a>`).join('<br>');
const badges=s=>programmes(s).map(p=>`<span class="tag ${p==='IBDP'||p==='MYP'?'ib':p==='A-Level'?'alevel':p==='DSE'?'dse':'subtle'}">${escape(p==='A-Level'?'A-Level／IAL':p)}</span>`).join('');
function applicableSecondaries(s){return s.secondaries.filter(x=>filters.gender==='boys'?x.gender!=='女':filters.gender==='girls'?x.gender!=='男':true);}
function secondaryText(s){const list=applicableSecondaries(s);return list.length?list.map(x=>x.name+(x.gender?'（'+genderLabel(x.gender)+'）':'')).join('、'):'沒有指定銜接中學';}
function readForm(){
  const form=$('#filters');
  filters={...DEFAULT_FILTERS,...Object.fromEntries(new FormData(form).entries()),feeMax:Number(form.feeMax.value),includeUnknown:form.includeUnknown.checked};
  delete filters.sort;
}
function fillForm(){
  for(const [key,value] of Object.entries(filters)){const control=$('#filters').elements.namedItem(key);if(!control)continue;if(control.type==='checkbox')control.checked=value;else control.value=String(value);}
  $('#sort').value=sort;
}
function persist(){
  try{localStorage.setItem(preferenceKey,JSON.stringify({filters,sort,selected:[...selected],preset}));}catch{}
  const params=new URLSearchParams();
  for(const [key,value] of Object.entries(filters))if(value!==DEFAULT_FILTERS[key])params.set(key,String(value));
  if(sort!=='name')params.set('sort',sort);
  if(preset!=='all')params.set('preset',preset);
  if(selected.size)params.set('compare',[...selected].join(','));
  history.replaceState(null,'',location.pathname+(params.size?'?'+params.toString():'')+location.hash);
}
function restore(){
  const params=new URLSearchParams(location.search);
  let saved={};
  try{saved=JSON.parse(localStorage.getItem(preferenceKey)||'{}');}catch{}
  if(params.size){
    for(const key of Object.keys(DEFAULT_FILTERS))if(params.has(key))filters[key]=key==='includeUnknown'?params.get(key)==='true':key==='feeMax'?Number(params.get(key)):params.get(key);
    sort=params.get('sort')||'name';preset=params.get('preset')||'all';selected=new Set((params.get('compare')||'').split(',').filter(Boolean));
  }else{
    if(saved.filters&&typeof saved.filters==='object')filters={...DEFAULT_FILTERS,...Object.fromEntries(Object.entries(saved.filters).filter(([key])=>key in DEFAULT_FILTERS))};
    sort=saved.sort||'name';preset=saved.preset||'all';selected=new Set(Array.isArray(saved.selected)?saved.selected:[]);
  }
  if(!['name','fee-low','fee-high'].includes(sort))sort='name';
  if(!['all','island','ib','through-ib','alevel','pyp'].includes(preset))preset='all';
  selected=new Set([...selected].filter(id=>schools.some(s=>s.id===id)).slice(0,4));
  filters.feeMax=Number.isFinite(Number(filters.feeMax))?Math.max(0,Math.min(300000,Number(filters.feeMax))):300000;
  fillForm();
  readForm();
}
function criteriaLabels(){
  const names=[];
  if(filters.query)names.push('搜尋：'+filters.query);
  if(filters.region)names.push(filters.region);
  if(filters.district)names.push(filters.district);
  if(filters.type)names.push(filters.type);
  if(filters.gender)names.push({boys:'男生可報',girls:'女生可報',coed:'只看男女校'}[filters.gender]);
  if(filters.relation)names.push(RELATION_LABELS[filters.relation]);
  if(filters.programme)names.push(filters.programme==='A-Level'?'完整 A-Level／IAL':filters.programme);
  if(preset==='ib')names.push('有 IBDP 銜接關係');
  if(preset==='through-ib')names.push('同校／一條龍＋IBDP');
  if(filters.language)names.push(filters.language);
  if(filters.pyp)names.push(filters.pyp==='yes'?'正式 PYP':'非 PYP／未列 PYP');
  if(filters.feeMax<300000)names.push(filters.feeMax===0?'只看免學費':'小一年費 ≤ '+money(filters.feeMax));
  if(!filters.includeUnknown)names.push('排除學費待核實');
  return names;
}
function render(){
  visible=schools.filter(s=>matchesSchool(s,filters));
  if(preset==='ib')visible=visible.filter(hasIbProgression);
  if(preset==='through-ib')visible=visible.filter(s=>hasIbProgression(s)&&['through','continuous'].includes(s.relation));
  visible=sortSchools(visible,sort);
  $('#result-count').textContent=visible.length+' / '+schools.length;
  $('#dataset-count').textContent=schools.length+'所小學 · '+schools.filter(s=>s.region==='香港島').length+'所位於港島';
  $('#fee-output').textContent=filters.feeMax>=300000?'不限':money(filters.feeMax);
  const labels=criteriaLabels();$('#criteria').innerHTML=labels.length?labels.map(x=>`<span class="criteria-chip">${escape(x)}</span>`).join(''):'全部學校';
  for(const button of document.querySelectorAll('[data-preset]')){button.classList.toggle('active',button.dataset.preset===preset);button.setAttribute('aria-pressed',String(button.dataset.preset===preset));}
  $('#school-rows').innerHTML=visible.map(s=>`<tr data-school-id="${escape(s.id)}">
    <td class="checkbox-cell" data-label="比較"><input type="checkbox" class="school-select" data-compare="${escape(s.id)}" aria-label="比較${escape(s.name)}" ${selected.has(s.id)?'checked':''}></td>
    <td><button type="button" class="school-name" data-detail="${escape(s.id)}">${escape(s.name)}</button><div class="school-meta"><span>${escape((s.regions||[s.region]).join('／'))} · ${escape(s.district)}</span>${s.added?'<span class="tag subtle">新增港島</span>':''}</div></td>
    <td data-label="類別／性別">${escape(s.type)}<div class="small">${genderLabel(s.gender)}</div></td>
    <td data-label="小學課程及語言"><span class="tag ${s.pyp===true?'pyp':'subtle'}">${pypLabel(s)}</span><div class="small">${escape(s.languageMode)}<br>${escape(s.primaryYears)}</div></td>
    <td data-label="升中安排"><div class="relation-name">${escape(s.relationLabel)}</div><div class="secondary-name">${escape(secondaryText(s))}</div></td>
    <td data-label="中學課程"><div class="badges">${badges(s)||'<span class="small">按實際獲取錄中學</span>'}</div>${s.secondaries.some(x=>x.programmes.includes('IAL補充'))?'<div class="small">IAL 補充與完整路線分列</div>':''}</td>
    <td data-label="小一年費"><div class="fee-amount">${money(s.fee.p1)}</div><div class="small">${escape(s.fee.year||'學年待確認')}</div></td>
    <td><button type="button" class="details-link" data-detail="${escape(s.id)}" aria-label="查看${escape(s.name)}詳細資料">›</button></td>
  </tr>`).join('');
  $('#loading').hidden=true;$('#empty').hidden=visible.length>0;$('#table-wrap').hidden=visible.length===0;
  $('#route-context').textContent=filters.programme==='A-Level'||preset==='alevel'?'此篩選只包括完整 A-Level／IAL 路線，個別科目補充課程另列。':preset==='through-ib'?'包括同校一貫及一條龍安排；同系銜接、直屬及優先面試可另行篩選。':'中學有 IBDP 課程，仍須留意升中及校內分流條件。';
  updateComparison();persist();
}
function updateComparison(){
  const chosen=schools.filter(s=>selected.has(s.id));
  $('#compare-tray').hidden=!chosen.length;document.body.classList.toggle('has-tray',!!chosen.length);
  $('#compare-count').textContent='已選 '+chosen.length+' / 4 校';
  $('#compare-names').textContent=chosen.map(s=>s.name).join('、');
  $('#open-comparison').disabled=chosen.length<2;
  for(const control of document.querySelectorAll('[data-compare]')){if(control.type==='checkbox')control.checked=selected.has(control.dataset.compare);else control.textContent=selected.has(control.dataset.compare)?'移出比較':'加入比較';}
}
function toggleComparison(id){
  if(selected.has(id))selected.delete(id);else if(selected.size<4)selected.add(id);else notify('最多可並排比較4所學校，請先移除一所。');
  updateComparison();persist();
}
function openDetail(id){
  const s=schools.find(x=>x.id===id);if(!s)return;detailId=id;
  const dt=(label,value)=>`<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`;
  const feeText=money(s.fee.p1)+(s.fee.year?'（'+s.fee.year+'）':'')+'\n'+(s.fee.bands||'')+(s.fee.note?'\n'+s.fee.note:'');
  $('#detail-content').innerHTML=`<div class="dialog-header"><div><p class="eyebrow">${escape(s.region)} · ${escape(s.district)}</p><h2 id="detail-title">${escape(s.name)}</h2><div class="small">${escape(s.en||'')}</div></div><button type="button" data-close-dialog class="close-button" aria-label="關閉詳細資料">×</button></div>
  <div class="detail-body"><div class="detail-intro"><span class="tag">${escape(s.type)}</span><span class="tag">${genderLabel(s.gender)}</span><span class="tag ${s.pyp?'pyp':'subtle'}">${pypLabel(s)}</span>${s.session?`<span class="tag">${escape(s.session)}</span>`:''}</div><div class="detail-grid">
    <section class="detail-section"><h3>小學階段</h3><dl>${dt('地址',s.address)}${dt('學制／年級',s.primaryYears)}${dt('小學課程',s.primaryCurriculum)}${dt('教學語言',s.language)}${dt('小一年費及收費帶',feeText)}${s.schoolNet?dt('小一校網',s.schoolNet+'網（須另看報讀資格）'):''}</dl></section>
    <section class="detail-section"><h3>中學銜接${filters.gender==='boys'?'（男生適用）':filters.gender==='girls'?'（女生適用）':''}</h3><dl>${dt('升中關係',s.relationLabel)}${applicableSecondaries(s).length?applicableSecondaries(s).map(x=>`${dt('中學',x.name+'（'+x.type+(x.gender?'、'+genderLabel(x.gender):'')+'）')}${dt('初中課程／MYP',x.junior+(x.myp===true?'\n正式 IB MYP':x.myp===null?'\n官方課程未列 MYP':''))}${dt('高中課程',x.senior)}${x.notes?dt('課程安排',x.notes):''}`).join(''):dt('升中安排','沒有指定銜接中學，按實際獲取錄中學課程。')}</dl></section>
  </div>${s.notes.length?`<div class="detail-note">${s.notes.map(n=>`<p>${escape(n)}</p>`).join('')}</div>`:''}<details class="source-details"><summary>學校資料與官方來源</summary><ul>${s.sources.map(x=>`<li><a href="${escape(x.url)}" target="_blank" rel="noopener noreferrer">${escape(x.label)}</a>${x.year?' · '+escape(x.year):''}</li>`).join('')}</ul><div class="source-meta">課程及升中資料核對：${escape(s.verifiedAt)}${s.fee.verifiedAt?'；學費核對：'+escape(s.fee.verifiedAt):''}。學費按已列年級及學年，不包含另收費項目。</div></details><div class="detail-bottom"><button type="button" class="button primary" data-compare="${escape(s.id)}">${selected.has(s.id)?'移出比較':'加入比較'}</button><a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s.name+' '+s.address)}" target="_blank" rel="noopener noreferrer" class="small">查看學校位置 ↗</a></div></div>`;
  $('#detail-dialog').showModal();
}
function openComparison(){
  const chosen=[...selected].map(id=>schools.find(s=>s.id===id)).filter(Boolean);if(chosen.length<2)return;
  const rows=[
    ['地區／地址',s=>s.region+' · '+s.district+'\n'+s.address],['類別／性別',s=>s.type+' · '+genderLabel(s.gender)+(s.session?' · '+s.session:'')],['小學學制',s=>s.primaryYears],['小學課程',s=>s.primaryCurriculum],['小學 PYP',pypLabel],['教學語言',s=>s.language],['小一年費',s=>money(s.fee.p1)+'\n'+(s.fee.year||'學年待確認')],['收費帶及其他費用',s=>s.fee.bands+(s.fee.note?'\n'+s.fee.note:'')],['升中關係',s=>s.relationLabel],['銜接中學',secondaryText],['初中／MYP',s=>s.secondaries.map(x=>x.name+'：'+x.junior).join('\n\n')||'按獲取錄中學'],['高中課程',s=>s.secondaries.map(x=>x.name+'：'+x.senior).join('\n\n')||'按獲取錄中學'],['升中及分流條件',s=>s.notes.join('\n\n')]
  ];
  $('#comparison-content').innerHTML=`<table class="comparison-table" style="min-width:${125+chosen.length*245}px"><thead><tr><th>比較項目</th>${chosen.map(s=>`<th scope="col">${escape(s.name)}</th>`).join('')}</tr></thead><tbody>${rows.map(([label,get])=>`<tr><th scope="row">${escape(label)}</th>${chosen.map(s=>`<td>${escape(get(s))}</td>`).join('')}</tr>`).join('')}<tr><th scope="row">官方來源</th>${chosen.map(s=>`<td><div class="source-links">${sourceLinks(s)}</div></td>`).join('')}</tr></tbody></table>`;
  $('#comparison-dialog').showModal();
}
function applyPreset(name){
  filters={...DEFAULT_FILTERS};preset=name;
  if(name==='island')filters.region='香港島';if(name==='ib')filters.programme='IBDP';if(name==='through-ib')filters.programme='IBDP';if(name==='alevel')filters.programme='A-Level';if(name==='pyp')filters.pyp='yes';
  fillForm();render();
}
function reset(){filters={...DEFAULT_FILTERS};preset='all';fillForm();render();}
function exportResults(){
  const rows=[['小學','類別','性別','地區','行政區','地址','小學學制','小學課程','PYP','教學語言','升中關係','中學','初中課程','高中課程','小一年費HKD','學費學年','學費收費帶','學費備註','升中及分流條件','官方來源']];
  for(const s of visible)rows.push([s.name,s.type,genderLabel(s.gender),s.region,s.district,s.address,s.primaryYears,s.primaryCurriculum,pypLabel(s),s.language,s.relationLabel,secondaryText(s),s.secondaries.map(x=>x.junior).join('\n'),s.secondaries.map(x=>x.senior).join('\n'),s.fee.p1===null?'待核實':s.fee.p1,s.fee.year,s.fee.bands,s.fee.note,s.notes.join('\n'),s.sources.map(x=>x.label+': '+x.url).join('\n')]);
  const blob=new Blob([toCsv(rows)],{type:'text/csv;charset=utf-8;'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='香港小學升中比較_'+visible.length+'校_20261017.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('已匯出目前篩選的 '+visible.length+' 所學校。');
}
async function start(){
  try{
    const response=await fetch('./schools.json');if(!response.ok)throw Error('資料載入失敗');const dataset=await response.json();schools=dataset.schools;
    if(!Array.isArray(schools)||!schools.length)throw Error('學校資料尚未齊備');
    $('#district').innerHTML='<option value="">全部行政區</option>'+[...new Set(schools.flatMap(s=>s.district.split('／')))].sort((a,b)=>a.localeCompare(b,'zh-Hant-HK')).map(x=>`<option>${escape(x)}</option>`).join('');
    restore();render();
    $('#filters').addEventListener('submit',event=>{event.preventDefault();readForm();render();});
    $('#filters').addEventListener('input',event=>{if(event.target.name==='programme'||event.target.name==='pyp'||(preset==='island'&&event.target.name==='region'))preset='all';readForm();render();});
    $('#sort').addEventListener('change',()=>{sort=$('#sort').value;render();});
    $('#presets').addEventListener('click',event=>{const button=event.target.closest('[data-preset]');if(button)applyPreset(button.dataset.preset);});
    $('#reset').addEventListener('click',reset);$('#empty-reset').addEventListener('click',reset);
    $('#export').addEventListener('click',exportResults);
    $('#open-comparison').addEventListener('click',openComparison);
    $('#clear-comparison').addEventListener('click',()=>{selected.clear();updateComparison();persist();});
    document.addEventListener('click',event=>{
      const detail=event.target.closest('[data-detail]');if(detail)openDetail(detail.dataset.detail);
      const compare=event.target.closest('button[data-compare]');if(compare)toggleComparison(compare.dataset.compare);
      const close=event.target.closest('[data-close-dialog]');if(close)close.closest('dialog').close();
    });
    document.addEventListener('change',event=>{if(event.target.matches('input[data-compare]'))toggleComparison(event.target.dataset.compare);});
    for(const dialog of document.querySelectorAll('dialog'))dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}});
  }catch(error){$('#loading').innerHTML='<h3>學校資料暫時未能載入</h3><p>請重新整理頁面再試。</p><button type="button" class="button outline error-button" id="retry">重新載入</button>';$('#retry').addEventListener('click',()=>location.reload());console.error(error);}
}
start();
