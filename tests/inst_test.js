global.window={};const {play}=require('./human_bot.js');const {boot}=require('./pc_mock.js');
const out=[];
// 1) every inject in every call: when is it offered, and does it change the state?
const setups={
 arrest:[['early',S=>{S.checked=true;S.arrest=true;S.air.o2=true;S.o2psi=1000;}],['LUCAS running',S=>{S.checked=true;S.mission=1;S.als.arrived=true;S.als.lucas=2;S.cpr.on=true;}],['ROSC in transport',S=>{S.checked=true;S.mission=3;S.rosc=true;S.arrest=false;S.als.lucas=3;S.als.arrived=true;}]],
 mva:[['inside',S=>{S.m.sized=true;S.m.inside=true;}]],od:[['checked',S=>{S.o.checked=true;}]],ep:[['assessed',S=>{S.e.assessed=true;}]],st:[['assessed',S=>{S.s.abc=true;}]],
 fl:[['assessed',S=>{S.f.primary=true;}]],cb:[['born',S=>{S.c.born=true;S.c.birthRt=S.rt;}]],dm:[['assessed',S=>{S.d.abc=true;}]],pd:[['assessed',S=>{S.p.door='good';S.p.listen=true;}]],cp:[['assessed',S=>{S.h.abc=true;}]]};
for(const call in setups)for(const [label,fn] of setups[call]){const {api,els}=boot();api.loadCall(call);const S=api.S();api.$('brief-go').onclick();fn(S);
  const offered=api.INJECTS.filter(x=>{try{return x.ok();}catch(e){return 'ERR';}}).map(x=>x.id);
  const fired=[];for(const id of offered){const before=JSON.stringify([S.score,S.rosc,S.arrest,S.als&&S.als.lucas,S.o2psi,S.m&&S.m.lost,S.o&&S.o.extraA,S.e&&S.e.sev,S.s&&S.s.sev,S.f&&S.f.gcs,S.c&&S.c.hr,S.d&&S.d.gl,S.air&&S.air.vomit,S.o&&S.o.vomit,S.s&&S.s.vomit]);
    const nRadio=S.log.length;api.instAct({a:'inj',i:id});const changed=S.log.length>nRadio;fired.push(id+(changed?'✓':'✗'));}
  out.push([`${call} (${label})`,fired.join(' ')]);}
// 2) re-arrest recovers: LUCAS restarts on its own after a re-arrest in transport
{const {api}=boot();api.loadCall('arrest');const S=api.S();api.$('brief-go').onclick();Object.assign(S,{checked:true,mission:3,rosc:true,arrest:false,running:true});S.als.lucas=3;S.als.arrived=true;S.als.zoll=true;S.als.rcNext=S.t+999;
 api.instAct({a:'inj',i:'rearrest'});for(let i=0;i<8;i++)api.tick(.25);out.push(['Re-arrest with LUCAS on board',`arrest ${S.arrest}, LUCAS ${S.als.lucas===2?'running':'off'}, compressions ${S.cpr.on}`]);}
// 3) freeze & discuss pauses and resumes
{const {api,els}=boot();api.loadCall('st');const S=api.S();api.$('brief-go').onclick();S.running=true;api.instAct({a:'disc',q:'What could kill this patient?'});
 out.push(['Freeze and discuss',`clock stopped ${!S.running}, question on screen "${els['disc-q'].textContent}"`]);api.$('disc-go').onclick();out.push(['  → Resume',`clock running ${S.running}`]);}
// 4) crew credit + CSV
{const store={};const {api,els}=boot({'patient-contact':JSON.stringify({runs:[],crew:['Max','Jordan','Sam'],instName:'Capt. Lee',inst:true,seen:true})});api.setInst(true);api.loadCall('ep');api.record();
 let csv='';global.URL={createObjectURL:b=>{csv=b.parts.join('');return 'x';}};global.Blob=function(parts){this.parts=parts;};const orig=global.document.createElement;global.document.createElement=()=>({click(){}});api.$('prog-csv').onclick();global.document.createElement=orig;
 const lines=csv.split('\n');out.push(['CSV header',lines[0]]);out.push(['CSV rows for one drill-night call',lines.length-1+' (one per crew member)']);out.push(['  example',lines[1]]);}
// 5) a full call at human pace with an instructor injecting chaos along the way still completes
{let ok=0,n=0;for(const call of ['arrest','mva','od','ep','st','fl','dm','pd','cp']){n++;const r=play(call,0,{instChaos:true});if(r.finished)ok++;else out.push(['  incomplete with injects',call+' '+JSON.stringify(r.stuckAt)]);}out.push(['Full calls with random injects',`${ok}/${n} completed`]);}
out.forEach(([a,b])=>console.log(String(a).padEnd(34),b));
