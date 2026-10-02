const base=process.env.SMOKE_BASE_URL||'http://production:3000';
const checks=[['/',200],['/stocks?q=7203',200],['/chart?code=7203',200],['/bot-trades',404],['/news',200],['/technicals',200],['/sign-in',200],['/dashboard/cms',307],['/api/stocks?search=7203',200],['/api/resend',410]];
let failed=false;
for(const [path,expected] of checks){
 try {
  const response=await fetch(base+path,{redirect:'manual'});
  const text=await response.text();
  const ok=response.status===expected;
  console.log(JSON.stringify({path,status:response.status,expected,ok,bytes:text.length}));
  if(!ok)failed=true;
 } catch {console.log(JSON.stringify({path,ok:false,error:'Request failed'}));failed=true;}
}
process.exitCode=failed?1:0;
