export function experienceFromEstablishmentDate(value:any,now=new Date()):{experienceYears:number,experienceMonths:number}{
 const parts=String(value||'').slice(0,10).split('-').map(Number);
 if(parts.length!==3||parts.some(n=>!Number.isInteger(n)||n<1))return {experienceYears:0,experienceMonths:0};
 const [year,month,day]=parts;
 const today=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jakarta',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)])) as {year:number,month:number,day:number};
 const monthEnd=new Date(Date.UTC(year,month,0)).getUTCDate();
 if(month>12||day>monthEnd)return {experienceYears:0,experienceMonths:0};
 let elapsed=(today.year-year)*12+today.month-month;
 if(today.day<day)elapsed--;
 elapsed=Math.max(0,elapsed);
 return {experienceYears:Math.floor(elapsed/12),experienceMonths:elapsed%12};
}
