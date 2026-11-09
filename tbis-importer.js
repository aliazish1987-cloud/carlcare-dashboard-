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
function decodeCandidates(bytes){
 const out=[];
 if(bytes.length>=3&&bytes[0]===0xEF&&bytes[1]===0xBB&&bytes[2]===0xBF)out.push('utf-8-sig');
 if(bytes.length>=2&&bytes[0]===0xFF&&bytes[1]===0xFE)out.push('utf-16le');
 if(bytes.length>=2&&bytes[0]===0xFE&&bytes[1]===0xFF)out.push('utf-16be');
 let even=0,odd=0;for(let i=0;i<Math.min(bytes.length,8192);i++)if(bytes[i]===0)(i%2?odd++:even++);
 if(odd>8&&odd>even*2)out.push('utf-16le');if(even>8&&even>odd*2)out.push('utf-16be');
 out.push('utf-8','windows-1252');
 return [...new Set(out)];
}
function decode(bytes,encoding){
 if(encoding==='utf-8-sig')return new TextDecoder('utf-8').decode(bytes.subarray(3));
 const decoder=new TextDecoder(encoding,{fatal:encoding!=='windows-1252'});
 return decoder.decode(bytes);
}
function parseDelimited(text,delimiter){
 const rows=[];let row=[],field='',quoted=false,afterQuote=false;
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(quoted){
   if(ch==='"'&&text[i+1]==='"'){field+='"';i++}
   else if(ch==='"'){quoted=false;afterQuote=true}
   else field+=ch;
   continue;
  }
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
function detectFileKind(input,name=''){const b=input instanceof Uint8Array?input:new Uint8Array(input);if(b.length>=4&&b[0]===0x50&&b[1]===0x4B&&([0x03,0x05,0x07].includes(b[2])))return 'xlsx';if(b.length>=8&&b[0]===0xD0&&b[1]===0xCF&&b[2]===0x11&&b[3]===0xE0&&b[4]===0xA1&&b[5]===0xB1&&b[6]===0x1A&&b[7]===0xE1)return 'xls';validateExtension(name||'report.csv');return 'text'}
function validateExtension(name){const ext=String(name||'').split('.').pop().toLowerCase();if(!['csv','tsv','txt','xls','xlsx'].includes(ext))throw new Error('Unsupported file format. Choose CSV, TSV, TXT, XLS, or XLSX.');return ext}
function parseBytes(input){
 const bytes=input instanceof Uint8Array?input:new Uint8Array(input);
 if(!bytes.length)throw new Error('Selected file is empty.');
 let best=null,lastError=null;
 for(const encoding of decodeCandidates(bytes)){
  let text;try{text=decode(bytes,encoding)}catch(e){lastError=e;continue}
  for(const delimiter of ['\t',',',';','|']){
   let rows;try{rows=parseDelimited(text,delimiter)}catch(e){lastError=e;continue}
   for(let headerIndex=0;headerIndex<rows.length;headerIndex++){
    const header=rows[headerIndex];if(!validHeader(header))continue;
    const jobIndex=columnIndex(header,ALIASES.job),createdIndex=columnIndex(header,ALIASES.created);
    const dataRows=rows.slice(headerIndex+1);
    const jobRows=dataRows.filter(r=>clean(r[jobIndex])).length;
    const plausible=dataRows.some(r=>clean(r[jobIndex])&&r.length>=Math.min(header.length,10));
    if(!plausible)continue;
    const recognized=[ALIASES.complete,ALIASES.status,ALIASES.shop,ALIASES.shopName,ALIASES.warranty].filter(k=>columnIndex(header,k)>=0).length;
    const score=header.length*100+recognized*25+Math.min(jobRows,1000)/1000-headerIndex/100000;
    if(!best||score>best.score)best={encoding,delimiter,rows,headerIndex,header,jobRows,score,jobIndex,createdIndex};
    break;
   }
  }
 }
 if(!best){
  if(lastError&&/Malformed/.test(lastError.message))throw lastError;
  throw new Error('CRM header not found. A valid header must contain JS No, Created On, and other CRM columns (including a completion, status, or shop column). The entire file was checked.');
 }
 const ids=best.rows.slice(best.headerIndex+1).map(r=>clean(r[best.jobIndex])).filter(Boolean);
 const unique=new Set(ids);
 return {rows:best.rows,header:best.header,headerIndex:best.headerIndex,encoding:best.encoding,delimiter:best.delimiter,columns:best.header.length,rowCount:ids.length,uniqueCount:unique.size,duplicateCount:ids.length-unique.size,physicalDataRows:best.rows.length-best.headerIndex-1,required:{jsNo:true,createdOn:true}};
}
root.TBISImporter={clean,norm,compact,columnIndex,validHeader,parseDelimited,parseBytes,validateExtension,detectFileKind};
if(typeof module!=='undefined'&&module.exports)module.exports=root.TBISImporter;
})(typeof window!=='undefined'?window:globalThis);
