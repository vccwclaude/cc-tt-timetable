export const DEFAULT_FILTERS={query:'',region:'',district:'',type:'',gender:'',relation:'',programme:'',language:'',pyp:'',feeMax:300000,includeUnknown:true};
export const RELATION_LABELS={through:'一條龍',continuous:'同校一貫／銜接',group:'同系銜接安排',direct:'直屬',linked:'聯繫',priority:'優先面試／評核',none:'沒有正式銜接'};
export function programmes(school){return [...new Set(school.secondaries.flatMap(s=>s.programmes))];}
export function hasIbProgression(school){return school.relation!=='none'&&programmes(school).includes('IBDP');}
export function matchesSchool(s,f){
  const text=[s.name,s.en,s.address,s.region,s.district,s.primaryCurriculum,s.language,s.relationLabel,...s.notes,...s.secondaries.map(x=>x.name)].join(' ').toLocaleLowerCase();
  if(f.query&&!text.includes(f.query.trim().toLocaleLowerCase()))return false;
  if(f.region&&!(s.regions||[s.region]).includes(f.region))return false;
  if(f.district&&!s.district.split('／').includes(f.district))return false;
  if(f.type&&s.type!==f.type)return false;
  if(f.gender==='boys'&&s.gender==='女')return false;
  if(f.gender==='girls'&&s.gender==='男')return false;
  if(f.gender==='coed'&&s.gender!=='男女')return false;
  if(f.relation&&s.relation!==f.relation)return false;
  if(f.programme&&!programmes(s).includes(f.programme))return false;
  if(f.language&&s.languageMode!==f.language)return false;
  if(f.pyp==='yes'&&s.pyp!==true)return false;
  if(f.pyp==='no'&&s.pyp===true)return false;
  if(!f.includeUnknown&&(s.fee.p1===null||s.fee.yearConfirmed===false))return false;
  if(s.fee.p1===null)return f.includeUnknown;
  if(Number(f.feeMax)<300000&&s.fee.p1>Number(f.feeMax))return false;
  return true;
}
export function sortSchools(schools,sort='name'){
  return [...schools].sort((a,b)=>{
    if(sort==='fee-low'||sort==='fee-high'){
      if(a.fee.p1===null&&b.fee.p1!==null)return 1;
      if(b.fee.p1===null&&a.fee.p1!==null)return -1;
      if(a.fee.p1!==b.fee.p1)return sort==='fee-low'?a.fee.p1-b.fee.p1:b.fee.p1-a.fee.p1;
    }
    return a.name.localeCompare(b.name,'zh-Hant-HK');
  });
}
export function toCsv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^[=+@-]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
