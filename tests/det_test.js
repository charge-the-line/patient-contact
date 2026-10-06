// Every deterioration and every instructor inject needs a response: something to find by reassessing, actions a person can
// actually tap when it happens, at least one that changes the patient (or a scored card for a logistics inject), and a cost
// for doing nothing. The app's table is DET; PLAN below is the approved audit (October 6, 2026), built in three passes.
const {boot}=require('./pc_mock.js');
const human=require('./human_bot.js');
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const F=f=>{global.window.FORCE_V=f;};
const PASS=1;   // passes built so far: 1 = car versus tree
// [call, id, sources, pass]. 'existing' entries already had a response before the audit and are registered in pass 3.
const PLAN=[
 ['mva','shock',['natural','inject:worse'],1],['mva','fuel',['chaos'],1],['mva','delay',['inject:delay','chaos'],1],['mva','family',['inject:family'],1],
 ['od','renarc',['natural','inject:worse'],2],['od','vomit',['inject:vomit','chaos'],3],['od','bridge',['inject:bridge'],3],['od','delay',['inject:delay','chaos'],3],['od','family',['inject:family'],3],
 ['ep','worse',['inject:worse','natural'],2],['ep','overdose',['natural'],3],['ep','bridge',['inject:bridge'],3],['ep','delay',['inject:delay','chaos'],3],['ep','family',['inject:family'],3],
 ['st','worse',['natural','inject:worse'],2],['st','vomit',['inject:vomit','chaos'],2],['st','bridge',['inject:bridge'],3],['st','delay',['inject:delay'],3],['st','family',['inject:family'],3],
 ['fl','decline',['natural','inject:worse'],2],['fl','delay',['inject:delay','chaos'],3],['fl','family',['inject:family'],3],
 ['cb','mom',['inject:worse'],2],['cb','baby',['inject:worse'],2],['cb','delay',['inject:delay','chaos'],3],['cb','family',['inject:family'],3],
 ['dm','falling',['natural','inject:worse'],3],['dm','seizure',['natural'],3],['dm','delay',['inject:delay','chaos'],3],['dm','family',['inject:family'],3],
 ['arrest','vomit',['inject:vomit','chaos'],3],['arrest','lucas',['inject:lucas'],3],['arrest','rearrest',['inject:rearrest'],3],['arrest','o2',['inject:o2'],3],
 ['arrest','delay',['inject:delay','chaos'],3],['arrest','bridge',['inject:bridge'],3],['arrest','family',['inject:family'],3]];
const answer=(api,pick='good')=>{const D=api.DECO();if(!D)return null;let i=D.opts.findIndex(o=>o.r===pick);if(i<0)i=0;const key=D.key;api.$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});api.$('dec-go').onclick();return key;};
const HTML=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
const groupOf=id=>{const m=[...HTML.matchAll(/<div class="grp hidden" id="([^"]+)">([\s\S]*?)<\/div><\/div>/g)].find(g=>g[2].includes(`id="${id}"`));return m?m[1]:null;};
// a button a person could tap right now: it exists, has a handler, isn't hidden, and its group is on screen
const shown=(api,id)=>{const e=api.$(id);if(!e||!e.onclick||e._cls.has('hidden'))return false;const g=groupOf(id);return !g||!api.$(g)._cls.has('hidden');};
function snap(api){return {S:JSON.stringify(api.S()),done:api.stepsDone().slice()};}
function restore(api,x){const S=api.S(),b=JSON.parse(x.S);for(const k of Object.keys(S))delete S[k];Object.assign(S,b);x.done.forEach((v,j)=>api.stepsDone()[j]=v);}
// play to arrival: ordinary ticks, every decision answered well; `respond` taps the shock care at about 1.2 seconds a tap
function ride(api,respond){const S=api.S();let g=0,i=0;const seq=['m-reass','m-recheck','m-tell','m-thigh','m-binder','m-heat','m-ivset'];
  while(!S.m.tx.arrived&&g++<20000){if(api.DECO()){answer(api);continue;}if(!S.running){if(S.briefing)api.$('brief-go').onclick();else api.$('b-next').onclick();continue;}
    if(S.mission===2)api.$('m-load').onclick();if(S.mission===3&&S.m.tx.tqChecks<1)api.$('m-tqcheck').onclick();
    if(respond&&g%5===0&&i<seq.length){const id=seq[i];if(id==='m-recheck'&&S.m.act){}else{api.$(id).onclick();i++;}}
    api.tick(.25);}
  for(let k=0;k<4;k++){if(api.DECO())answer(api);else if(S.running)api.tick(.25);}
  const v=api.mvaV();return {sbp:v.sbp,hr:v.hr,lost:S.m.lost,score:S.score,inc:S.incidents.slice(),log:(S.log||[]).map(e=>e.msg).join(' ')};}
module.exports=function(report){
  const {api:a0}=boot();const DET=a0.DET();
  // 1. the response table: every audited item for the built passes is in it; the rest are named, not forgotten
  {const missing=PLAN.filter(p=>p[3]<=PASS&&!DET.some(d=>d.call===p[0]&&d.id===p[1]));
    report('deter',`response table: every item for pass ${PASS} (car versus tree) has a response`,missing.length===0,missing.map(p=>p.join(':')).join(', ')||`${DET.length} entries; ${PLAN.filter(p=>p[3]>PASS).length} audited items left for passes 2 and 3`);
    const bad=DET.filter(d=>!(d.dec||(d.acts&&d.acts.length>=2&&d.acts.some(z=>z[1]==='patient')&&d.find&&d.noAct&&d.tell)));
    report('deter','every entry answers with a decision card, or with two or more actions including one that changes the patient, a finding and a penalty for ignoring it',bad.length===0,bad.map(d=>d.call+':'+d.id).join(', ')||`${DET.length} entries`);
    const decs=DET.filter(d=>d.dec).filter(d=>!a0.DEC[d.dec]);report('deter','every decision card in the table exists',decs.length===0,decs.map(d=>d.dec).join(', '));}
  // 2. every inject that can fire in a call is in the audit plan (so a new inject can't arrive without a planned response)
  {const seen={};for(const call of ['mva','od','ep','st','fl','dm','arrest'])for(const tier of [0,2])quiet(()=>human.play(call,tier,{stopAt:(S,api)=>{for(const x of api.INJECTS){let ok=false;try{ok=x.ok();}catch(e){}if(ok)(seen[call]=seen[call]||new Set()).add(x.id);}return false;}}));
    const lost=[];for(const call in seen)for(const id of seen[call])if(!PLAN.some(p=>p[0]===call&&p[2].includes('inject:'+id)))lost.push(call+':'+id);
    report('deter','every instructor inject that can fire in a call has a planned response',lost.length===0,lost.join(', ')||Object.keys(seen).map(c=>c+' '+seen[c].size).join(', '));}
  // 3. car versus tree: her shock gets worse on the cot, on its own and as an inject, with and without an unstable pelvis
  const cases=[['natural',{loss:600,pelvis:false},0],['natural',{loss:600,pelvis:true},0],['natural',{loss:300,pelvis:true},2],['inject',{loss:300,pelvis:false},0],['inject',{loss:600,pelvis:true},1]];
  for(const [how,v,tier] of cases){F({mva:v});const stop=how==='natural'?(S=>(S.dets||[]).some(x=>x.id==='shock')):(S=>S.mission===3&&S.running&&!S.briefing);
    const r=quiet(()=>human.play('mva',tier,{noDet:true,stopAt:stop}));F(null);const api=r.api,S=api.S();const label=`${how} · ${v.loss>300?'heavier bleed':'recent bleed'}${v.pelvis?' · unstable pelvis':''} · ${['Guided','Recall','Chaos'][tier]}`;
    if(!r.stopped){report('deter',`car versus tree, shock ${label}: it happens`,false,'never fired');continue;}
    if(how==='inject'){const x=api.INJECTS.find(y=>y.id==='worse');if(!x.ok()){report('deter',`car versus tree, shock ${label}: the inject is offered on the cot`,false);continue;}x.run();api.tick(.25);}
    api.tick(.25);api.tick(.25);
    const cue=(S.log||[]).slice(-3).map(e=>e.who+': '+e.msg).join(' ');
    const det=api.DET().find(d=>d.call==='mva'&&d.id==='shock');const tappable=det.acts.filter(z=>shown(api,z[0])).map(z=>z[0]);
    const ffBlocked=api.ffWhy()!=='';
    const x=snap(api);const A=quiet(()=>ride(api,false));restore(api,x);const B=quiet(()=>ride(api,true));
    report('deter',`car versus tree, shock ${label}: a cue, then reassessing finds the cause`,/alarm|paler/.test(cue)&&det.find.test(B.log),cue.slice(0,90));
    report('deter',`car versus tree, shock ${label}: at least two actions can be tapped right then, and no fast-forward until it's handled`,tappable.length>=2&&ffBlocked,`${tappable.length} tappable: ${tappable.join(', ')}`);
    report('deter',`car versus tree, shock ${label}: responding changes her (pressure at the doors, blood lost) and doing nothing costs points`,B.sbp>=A.sbp+8&&B.lost<A.lost&&B.score>A.score,`BP at the doors ${A.sbp} → ${B.sbp}, blood lost ${Math.round(A.lost)} → ${Math.round(B.lost)} mL, score ${A.score} → ${B.score}`);
    if(v.pelvis)report('deter',`car versus tree, shock ${label}: the pelvis needs the binder (helping the medic), found on the recheck`,A.inc.some(w=>/without a binder/.test(w))&&!B.inc.some(w=>/without a binder/.test(w))&&/unstable/.test(B.log),'');}
  // the binder waits for the recheck, and a stable pelvis gets none
  {F({mva:{loss:600,pelvis:false}});const r=quiet(()=>human.play('mva',0,{noDet:true,stopAt:S=>(S.dets||[]).some(x=>x.id==='shock')}));F(null);const api=r.api,S=api.S();
    api.$('m-binder').onclick();const early=!S.m.binder&&/check her pelvis/.test(S.log.slice(-1)[0].msg);api.$('m-recheck').onclick();for(let i=0;i<40;i++)api.tick(.25);api.$('m-binder').onclick();
    report('deter','car versus tree: the binder waits for the pelvis recheck, and a stable pelvis gets none',early&&!S.m.binder&&/stable/.test(S.log.slice(-1)[0].msg),'');}
  // 4. the logistics events answer with a card: right call free, wrong call costs
  const cardCase=(name,key,setup,fire)=>{for(const pick of ['good','bad']){F({mva:{loss:300,pelvis:false}});const r=quiet(()=>human.play('mva',setup.tier,{noDet:true,stopAt:setup.at}));F(null);if(!r.stopped){report('deter',`car versus tree, ${name}: reaches the moment`,false);return;}
      const api=r.api,S=api.S();fire(api);let g=0;while(!(api.DECO()&&api.DECO().key===key)&&g++<2000){if(api.DECO()){answer(api);continue;}if(!S.running){if(S.briefing)api.$('brief-go').onclick();else api.$('b-next').onclick();continue;}api.tick(.25);}
      const s0=S.score;const got=answer(api,pick);report('deter',`car versus tree, ${name}: a card asks for a response (${pick} answer ${pick==='good'?'costs nothing':'costs 10'})`,got===key&&(pick==='good'?S.score===s0:S.score===s0-10),`card ${got}, score ${s0} → ${S.score}`);}};
  cardCase('Medic 1 delayed (inject)','mvaDelay',{tier:0,at:S=>S.mission===0&&S.m.inside&&!S.m.alsArr},api=>api.INJECTS.find(x=>x.id==='delay').run());
  cardCase('a bystander nurse (inject)','mvaNurse',{tier:0,at:S=>S.mission===1&&S.running},api=>api.INJECTS.find(x=>x.id==='family').run());
  cardCase('fuel leak on Chaos','mvaFuel',{tier:2,at:S=>S.m.extr.stage===2},()=>{});
  // a card raised while another one is open waits its turn instead of being lost
  {F({mva:{loss:300,pelvis:false}});const r=quiet(()=>human.play('mva',0,{noDet:true,stopAt:S=>S.mission===1&&S.running}));F(null);const api=r.api;
    api.INJECTS.find(x=>x.id==='family').run();api.INJECTS.find(x=>x.id==='delay').ok()&&api.INJECTS.find(x=>x.id==='delay').run();const keys=[];let g=0;
    while(keys.length<2&&g++<400){if(api.DECO())keys.push(answer(api));else api.tick(.25);}
    report('deter','two cards raised at once both get answered, one after the other',keys.includes('mvaNurse')&&(keys.includes('mvaDelay')||!api.S().m||api.S().m.alsArr),keys.join(', '));}
};
