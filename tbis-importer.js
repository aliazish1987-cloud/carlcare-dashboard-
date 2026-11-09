(function(root){
'use strict';
const ALIASES={
 job:['jsno','jsnumber','jobsheetno','jobsheetnumber','jobno','jobnumber'],
 created:['createdon','createddate','createdat','created'],
 complete:['repaircompletedate','repaircompleteddate','repaircompletiondate'],
 status:['documentstatusname','documentstatus','jobstatus','statusname'],
 warranty:['warrantystatus'], shop:['shopcode','branchcode'], shopName:['shopname','branchname']
};
function clean(v){return String(v??'').replace(/^\uFEFF/,'').replace(/\u00a0/g,' ').replace(/\0/g,'').replace(/[\u200B-\u200D\uFEFF]/g,'').trim()}
function norm(v){return clean(v).replace(/^['"\s]+|['"\s]+$/g,'').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ')}
function compact(v){return norm(v).replace(/\s/g,'')}
function columnIndex(row,keys){for(let i=0;i<row.length;i++)if(keys.includes(compact(row[i])))return i;return -1}
function validHeader(row){return Array.isArray(row)&&row.length>=10&&columnIndex(row,ALIASES.job)>=0&&columnIndex(row,ALIASES.created)>=0&&[ALIASES.complete,ALIASES.status,ALIASES.shop,ALIASES.shopName].some(k=>columnIndex(row,k)>=0)}
function detectFileKind(input,filename=''){
 const b=input instanceof Uint8Array?input:new Uint8Array(input);
 if(b.length>=4&&b[0]===0x50&&b[1]===0x4B&&b[2]===0x03&&b[3]===0x04)return 'xlsx';
 if(b.length>=8&&[0xD0,0xCF,0x11,0xE0,0xA1,0xB1,0x1A,0xE1].every((v,i)=>b[i]===v))return 'xls';
 const ext=String(filename).split('.').pop().toLowerCase();
 if(['csv','tsv','txt'].includes(ext))return 'text';
 if(ext==='xlsx'||ext==='xls')return ext;
 return 'unknown';
}
function validateExtension(name){const ext=String(name||'').split('.').pop().toLowerCase();if(!['csv','tsv','txt','xls','xlsx'].includes(ext))throw new Error('Unsupported file format. Choose CSV, TSV, TXT, XLS, or XLSX.');return ext}
function decodeCandidates(bytes){
 const out=[];
 if(bytes.length>=3&&bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)out.push('utf-8-sig');
 if(bytes.length>=2&&bytes[0]===0xFF&&bytes[1]===0xFE)out.push('utf-16le');
 if(bytes.length>=2&&bytes[0]===0xFE&&bytes[1]===0xFF)out.push('utf-16be');
 let even=0,odd=0;for(let i=0;i<Math.min(bytes.length,8192);i++)if(bytes[i]===0)(i%2?odd++:even++);
 if(odd>8&&odd>even*2)out.push('utf-16le');if(even>8&&even>odd*2)out.push('utf-16be');
 out.push('utf-8','windows-1252');return [...new Set(out)];
}
function decode(bytes,encoding){
 if(encoding==='utf-8-sig')return new TextDecoder('utf-8').decode(bytes.subarray(3));
 return new TextDecoder(encoding,{fatal:encoding!=='windows-1252'}).decode(bytes);
}
function parseDelimited(text,delimiter){
 const rows=[];let row=[],field='',quoted=false,afterQuote=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){if(ch==='"'&&text[i+1]==='"'){field+='"';i++}else if(ch==='"'){quoted=false;afterQuote=true}else field+=ch;continue}
  if(afterQuote){
   if(ch===delimiter){row.push(field);field='';afterQuote=false;continue}
   if(ch==='\r'||ch==='\n'){row.push(field);if(row.some(v=>clean(v)))rows.push(row);row=[];field='';afterQuote=false;if(ch==='\r'&&text[i+1]==='\n')i++;continue}
   if(ch===' '||ch==='\t')continue;
   throw new Error('Malformed delimited file: unexpected character after a closing quote.');
  }
  if(ch==='"'&&field===''){quoted=true;continue}
  if(ch==='"')throw new Error('Malformed delimited file: quote found inside an unquoted field.');
  if(ch===delimiter){row.push(field);field='';continue}
  if(ch==='\r'||ch==='\n'){row.push(field);if(row.some(v=>clean(v)))rows.push(row);row=[];field='';if(ch==='\r'&&text[i+1]==='\n')i++;continue}
  field+=ch;
 }
 if(quoted)throw new Error('Malformed delimited file: quoted field was not closed.');
 if(field.length||row.length){row.push(field);if(row.some(v=>clean(v)))rows.push(row)}
 return rows;
}
function findHeader(rows){
 let best=null;
 for(let i=0;i<rows.length;i++){
  const h=rows[i];if(!validHeader(h))continue;
  const ji=columnIndex(h,ALIASES.job),ci=columnIndex(h,ALIASES.created);
  const following=rows.slice(i+1),jobRows=following.filter(r=>clean(r[ji])).length;
  const plausible=following.some(r=>clean(r[ji])&&r.length>=Math.min(h.length,10));
  if(!plausible)continue;
  const other=[ALIASES.complete,ALIASES.status,ALIASES.shop,ALIASES.shopName,ALIASES.warranty].filter(k=>columnIndex(h,k)>=0).length;
  const score=h.length*100+other*25+Math.min(jobRows,1000)/1000-i/100000;
  if(!best||score>best.score)best={headerIndex:i,header:h,jobIndex:ji,createdIndex:ci,jobRows,score};
 }
 if(!best)throw new Error('CRM header not found. Expected JS No, Created On, and at least one additional CRM column such as Repair Complete Date, Document Status Name, ShopCode, or ShopName.');
 return best;
}
function parseBytes(input,filename=''){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!bytes.length)throw new Error('Selected file is empty.');
 const kind=detectFileKind(bytes,filename);
 if(kind==='xlsx'||kind==='xls')return {kind,bytes,encoding:'binary'};
 if(kind==='unknown')throw new Error('Unsupported or unrecognized file format. Choose CSV, TSV, TXT, XLS, or XLSX.');
 let best=null,lastError=null;
 for(const encoding of decodeCandidates(bytes)){
  let text;try{text=decode(bytes,encoding)}catch(e){lastError=e;continue}
  for(const delimiter of ['\t',',',';','|']){
   let rows;try{rows=parseDelimited(text,delimiter)}catch(e){lastError=e;continue}
   try{
    const h=findHeader(rows),ids=rows.slice(h.headerIndex+1).map(r=>clean(r[h.jobIndex])).filter(Boolean),unique=new Set(ids);
    const score=h.score+(delimiter==='\t'?1:0);
    if(!best||score>best.score)best={kind:'text',encoding,delimiter,rows,...h,rowCount:ids.length,uniqueCount:unique.size,duplicateCount:ids.length-unique.size,columns:h.header.length,physicalDataRows:rows.length-h.headerIndex-1,score};
   }catch(e){lastError=e}
  }
 }
 if(!best){if(lastError&&/Malformed/.test(lastError.message))throw lastError;throw lastError||new Error('Could not identify the CRM report header.')}
 return best;
}
function normalizeHeaders(row){return row.map((v,i)=>clean(v)||'Column '+(i+1))}
root.TBISImporter={clean,norm,compact,columnIndex,validHeader,detectFileKind,validateExtension,decodeCandidates,decode,parseDelimited,findHeader,parseBytes,normalizeHeaders};
if(typeof module!=='undefined'&&module.exports)module.exports=root.TBISImporter;
})(typeof window!=='undefined'?window:globalThis);
