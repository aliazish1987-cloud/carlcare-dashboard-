const test=require('node:test');
const assert=require('node:assert/strict');
const {TextEncoder}=require('node:util');
const importer=require('../tbis-importer.js');
const header=['JS No','Reference From','Created On','Document Status Name','ShopCode','ShopName','Warranty Status','Repair Complete Date','PO/APCode1','PO/APDate1','PO/APCode2','PO/APDate2','PO/APCode3','PO/APDate3','Other CRM field'];
const row=(id,created='2026-10-01 09:00:00',status='Returned',complete='2026-10-01 09:30:00')=>[id,'Walk-in',created,status,'ISB01','Islamabad','In Warranty',complete,'','','','','','',''];
const enc=s=>new TextEncoder().encode(s);
const csv=(rows,sep=',',eol='\n')=>rows.map(r=>r.map(v=>{v=String(v??'');return /["\r\n]/.test(v)||v.includes(sep)?'"'+v.replace(/"/g,'""')+'"':v}).join(sep)).join(eol);
function parsed(text){return importer.parseBytes(enc(text))}
test('supplied tab-separated CRM header and representative rows',()=>{const x=parsed('Monthly report\n'+csv([header,row('JS001'),row('JS002')],'\t'));assert.equal(x.delimiter,'\t');assert.equal(x.rowCount,2);assert.equal(x.columns,header.length)});
test('comma-delimited CRM report',()=>{const x=parsed(csv([header,row('JS001')],','));assert.equal(x.delimiter,',');assert.equal(x.rowCount,1)});
test('semicolon and pipe delimiters are detected',()=>{for(const sep of [';','|']){const x=parsed(csv([header,row('JS001')],sep));assert.equal(x.delimiter,sep);assert.equal(x.rowCount,1)}});
test('UTF-8 BOM is detected and decoded',()=>{const body=csv([header,row('JS001')],'\t');const bytes=Buffer.concat([Buffer.from([0xEF,0xBB,0xBF]),Buffer.from(body,'utf8')]);const x=importer.parseBytes(bytes);assert.equal(x.encoding,'utf-8-sig');assert.equal(x.rowCount,1)});
test('UTF-16 LE and BE are detected',()=>{const body=csv([header,row('JS001')],'\t');for(const [encoding,bom] of [['utf16le',[0xFF,0xFE]],['utf16be',[0xFE,0xFF]]]){let b=Buffer.from(body,'utf16le');if(encoding==='utf16be'){for(let i=0;i<b.length;i+=2){const t=b[i];b[i]=b[i+1];b[i+1]=t}}const bytes=Buffer.concat([Buffer.from(bom),b]);const x=importer.parseBytes(bytes);assert.equal(x.rowCount,1);assert.match(x.encoding,/utf-16/) }});
test('CRLF and LF line endings',()=>{for(const eol of ['\r\n','\n'])assert.equal(parsed(csv([header,row('JS001')],'\t',eol)).rowCount,1)});
test('quoted delimiters, escaped quotes, and quoted newlines',()=>{const r=row('JS001');r[1]='Referral, via "dealer"\nsecond line';const x=parsed(csv([header,r],','));assert.equal(x.rowCount,1);assert.equal(x.rows[x.headerIndex+1][1],r[1])});
test('blank/title rows before header are searched',()=>{const x=parsed('Carlcare monthly report\nBranch: Islamabad\n\n'+csv([header,row('JS001')],'\t'));assert.equal(x.headerIndex,3);assert.equal(x.rowCount,1)});
test('empty cells and trailing empty columns are preserved',()=>{const h=header.concat(['Trailing empty']);const r=row('JS001').concat(['']);const x=parsed(csv([h,r],'\t'));assert.equal(x.columns,h.length);assert.equal(x.rows[x.headerIndex+1].length,h.length);assert.equal(x.rows[x.headerIndex+1].at(-1),'')});
test('568 non-empty JS No records are counted',()=>{const rows=[header,...Array.from({length:568},(_,i)=>row('JS'+String(i+1).padStart(4,'0')))];const x=parsed(csv(rows,'\t'));assert.equal(x.rowCount,568);assert.equal(x.uniqueCount,568);assert.equal(x.duplicateCount,0)});
test('duplicate JS No values are counted, not deduplicated',()=>{const x=parsed(csv([header,row('DUP1'),row('DUP1'),row('UNIQUE')],'\t'));assert.equal(x.rowCount,3);assert.equal(x.uniqueCount,2);assert.equal(x.duplicateCount,1)});
test('incorrect header produces a helpful error',()=>{assert.throws(()=>parsed(csv([['Name','Date','Notes'],['a','b','c']],',')),/CRM header not found/)});
test('malformed quoted field produces a helpful error',()=>{assert.throws(()=>parsed('"JS No","Reference From","Created On","Document Status Name","ShopCode","ShopName","Warranty Status","Repair Complete Date","PO/APCode1","PO/APDate1\n"unterminated'),/Malformed/)});

test('semicolon and pipe delimiters are detected',()=>{for(const sep of [';','|']){const x=parsed(csv([header,row('JS001')],sep));assert.equal(x.delimiter,sep);assert.equal(x.rowCount,1)}});
test('header search continues beyond 1,000 physical rows',()=>{const prefix=Array.from({length:1105},(_,i)=>'Title row '+i).join('\n')+'\n';const x=parsed(prefix+csv([header,row('JS001')],'\t'));assert.equal(x.headerIndex,1105);assert.equal(x.rowCount,1)});
test('unsupported file extensions have a helpful error',()=>{assert.throws(()=>importer.validateExtension('report.pdf'),/Unsupported file format/);assert.equal(importer.validateExtension('report.xlsx'),'xlsx')});
