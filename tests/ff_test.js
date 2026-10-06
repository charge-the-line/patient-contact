// Fast-forward: offered only when everything left is waiting, never during a real-time skill,
// stops the moment anything happens, and the physics keep running (skipping never dodges a problem).
const {boot}=require('./pc_mock.js');
const human=require('./human_bot.js'),cbBot=require('./cb_bot.js');
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const F=f=>{global.window.FORCE_V=f;};
const REASONS=['radio','event','step','patient','due','skill'];
module.exports=function(report){
  // 1. every call, greedy fast-forward at human pace: finishes clean, skips real waiting, never a hint, never a runaway skip
  const reasons=[],offeredBad=[];let cap=0;
  const watch=(call)=>(S,api)=>{const w=api.ffWhy();if(!w){
      const pend=api.M()[S.mission].steps.filter((s,j)=>!api.stepsDone()[j]);
      if(pend.some(s=>s.rt))offeredBad.push(call+': real-time step pending');
      if(call==='arrest'&&S.arrest&&S.checked&&!S.terminated&&!S.noRes)offeredBad.push('arrest: CPR running');
      if(call==='od'&&S.o.checked&&(!S.o.pulse||S.o.rr<10||S.o.gurgle))offeredBad.push('od: not breathing adequately');}
    return false;};
  const calls=[['mva'],['od'],['ep'],['st'],['fl'],['dm'],['arrest',{open:'cpr',outcome:'rosc',shock:true}],['arrest',{look:'obvious'}],['arrest',{dnr:'valid'}],['arrest',{look:'cold'}]];
  for(const [call,force] of calls)for(const tier of [0,2]){F(force?{arrest:force}:null);const o={ff:true,stopAt:watch(call)};const r=quiet(()=>human.play(call,tier,o));F(null);
    (o.ffLog||[]).forEach(w=>{reasons.push(w);if(w==='cap')cap++;});
    const skipped=r.S.ff?r.S.ff.t:0;
    report('ff',`${call}${force?' '+JSON.stringify(force):''} ${['Guided','Recall','Chaos'][tier]}: greedy fast-forward finishes at 100 and skips the waiting`,r.finished&&r.score===100&&skipped>=90&&!r.incidents.includes('Hint used'),`score ${r.score}, skipped ${Math.round(skipped)} s in ${r.S.ff?r.S.ff.n:0}${r.incidents.length?', '+[...new Set(r.incidents)].join('; '):''}`);}
  for(const tier of [0,2]){let bad=0;const o={ff:true};const r=quiet(()=>cbBot.play(tier,'good',o));
    report('ff',`cb ${['Guided','Recall','Chaos'][tier]}: greedy fast-forward finishes at 100 and skips the waiting`,r.ok&&r.score===100&&r.ff&&r.ff.t>=90,`score ${r.score}, skipped ${r.ff?Math.round(r.ff.t):0} s`);(o.ffLog||[]).forEach(w=>reasons.push(w));}
  report('ff','never offered during a real-time skill (CPR, breathing for a patient, the delivery, the newborn)',offeredBad.length===0,offeredBad.slice(0,3).join(' | ')||`${reasons.length} skips checked`);
  report('ff','every skip stops on an event, never runs to the cap',cap===0&&reasons.every(w=>REASONS.includes(w)),[...new Set(reasons)].join(', '));
  // the childbirth delivery and golden minute, and every arrest patient: never offered while it matters
  {let bad=0;for(const force of [{open:'cpr',outcome:'rosc',shock:false},{open:'cpr',outcome:'tor',shock:true,dnr:null},{open:'cpr',outcome:'extend'},{dnr:'late'},{look:'warm'},{dnr:'missing'}]){F({arrest:force});
      quiet(()=>human.play('arrest',0,{ff:true,stopAt:(S,api)=>{if(!api.ffWhy()&&S.arrest&&S.checked&&!S.terminated&&!S.noRes)bad++;return false;}}));F(null);}
    const {api}=boot();api.setTier(0);api.loadCall('cb');const S=api.S();api.$('brief-go').onclick();let cbBad=0;
    for(const m of [1,2]){api.setM(api.M());S.mission=m;if(!api.ffWhy())cbBad++;}
    report('ff','not offered while CPR runs in any arrest patient, nor in the delivery or the golden minute',bad===0&&cbBad===0,`arrest ${bad}, childbirth ${cbBad}`);}
  // 2. the physics keep running: a skip lands exactly where the same number of ordinary ticks would
  {F({mva:{loss:300,pelvis:false}});const o={stopAt:(S,api)=>S.mission===3&&S.m.tx.tqChecks>=1&&!api.ffWhy()};const r=quiet(()=>human.play('mva',0,o));F(null);const api=r.api,S=api.S();
    const snap=JSON.stringify(S),done=api.stepsDone().slice(),t0=S.t,lost0=S.m.lost;const why=api.ffGo();const a={t:S.t,lost:S.m.lost,why};
    const back=JSON.parse(snap);for(const k of Object.keys(S))delete S[k];Object.assign(S,back);done.forEach((v,j)=>api.stepsDone()[j]=v);
    let n=0;while(S.t<a.t-1e-9&&n<5000){api.tick(.25);n++;}
    report('ff','the physics keep running: a skip ends where ordinary ticks would (blood loss identical)',Math.abs(S.m.lost-a.lost)<1e-6&&a.lost>lost0&&a.t>t0,`skipped ${Math.round(a.t-t0)} s (${a.why}), blood lost ${Math.round(a.lost-lost0)} mL either way`);
    // it stopped for the reassessment, before the five-minute penalty, and reassessing makes it available again
    const S2=api.S();const hiddenWhenDue=(api.ffWhy()==='due');api.$('m-reass').onclick();
    report('ff','in the trauma transport it stops when a reassessment is due, before the penalty; reassessing offers it again',a.why==='due'&&hiddenWhenDue&&api.ffWhy()===''&&!S2.incidents.some(x=>/without reassessing/.test(x)),`stopped: ${a.why}, then ${api.ffWhy()||'available'}`);}
  // 3. skipping never dodges a problem: the overdose patient who nods off again in the ambulance stops the skip at the decision
  {const o={stopAt:(S,api)=>S.mission===3&&!api.ffWhy()};const r=quiet(()=>human.play('od',0,o));const api=r.api,S=api.S();let why='',g=0;
    while(g++<20&&!api.DECO()){why=api.ffGo()||'unavailable';if(api.ffWhy()==='due')api.$('o-reass').onclick();if(why==='unavailable')api.tick(.25);}
    report('ff','skipping never dodges a problem: the overdose renarcotizing in the ambulance still happens and stops the skip',!!api.DECO()&&api.DECO().key==='odRenarc'&&S.o.renarcDone,`stopped: ${why}, decision ${api.DECO()&&api.DECO().key}`);}
  // the diabetic whose sugar keeps falling: the seizure still happens under fast-forward, and stops it
  {const o={stopAt:(S,api)=>S.mission===1&&!api.ffWhy()&&!S.d.d10};F({dm:{low:false}});const r=quiet(()=>human.play('dm',2,o));F(null);
    if(r.stopped){const api=r.api,S=api.S();const gl0=S.d.gl;const why=api.ffGo();report('ff','his blood sugar keeps moving during a skip (the physics run), and the skip stops when he changes',S.d.gl!==gl0&&REASONS.includes(why),`glucose ${Math.round(gl0)} → ${Math.round(S.d.gl)}, stopped: ${why}`);}
    else report('ff','his blood sugar keeps moving during a skip (the physics run), and the skip stops when he changes',true,'no waiting window before treatment in this run');}
  // 4. stops on radio (a Chaos delay), on a step, on a decision; and every instructor inject announces itself, so no skip can pass one silently
  {report('ff','Chaos events and arrivals on the radio stop a skip',reasons.includes('radio'),`${reasons.filter(w=>w==='radio').length} radio stops`);
    report('ff','a decision or the end of a part stops a skip',reasons.includes('event'),`${reasons.filter(w=>w==='event').length} event stops`);
    report('ff','a change in the patient stops a skip',reasons.includes('patient'),`${reasons.filter(w=>w==='patient').length} patient stops`);
    let silent=[],tried=0;
    for(const call of ['arrest','mva','od','ep','st','fl','cb','dm']){const {api}=boot();api.setTier(0);api.loadCall(call);api.$('brief-go').onclick();
      for(let i=0;i<4000;i++){const S=api.S();if(api.DECO()){const D=api.DECO();const k=D.opts.findIndex(x=>x.r==='good');api.$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(k)}})}});api.$('dec-go').onclick();continue;}
        if(!S.running)break;
        for(const x of api.INJECTS){let ok=false;try{ok=x.ok();}catch(e){}if(ok&&!x._seen){x._seen=1;tried++;const n0=api.RN();x.run();if(api.RN()===n0)silent.push(call+':'+x.id);}}
        api.tick(.25);}}
    report('ff','every instructor inject announces itself on the radio, so a skip always stops for it',silent.length===0&&tried>=6,silent.join(', ')||`${tried} injects`);}
  // 5. the button: hidden unless available, and a tap skips
  {F({fl:{}});const o={stopAt:(S,api)=>S.mission===3&&!api.ffWhy()};const r=quiet(()=>human.play('fl',0,o));F(null);const api=r.api,S=api.S();const b=api.$('b-ff');
    api.ffSync();const shown=!b._cls.has('ffoff');const t0=S.t;b.onclick();const moved=S.t>t0;
    S.running=false;api.ffSync();const hidden=b._cls.has('ffoff');S.running=true;
    report('ff','the Fast-forward button shows only when it is available, and a tap skips ahead',shown&&moved&&hidden,`shown ${shown}, moved ${Math.round(S.t-t0)} s, hidden when paused ${hidden}`);}
  // 6. at the doors with a reassessment still owed: waiting can't finish it, so it is never offered there
  {const o={stopAt:(S,api)=>S.mission===3};const r=quiet(()=>human.play('st',0,o));const api=r.api,S=api.S();let g=0;if(S.briefing)api.$('brief-go').onclick();
    while(!S.s.tx.arrived&&g++<4000){if(S.s.tx.reass<1&&S.s.tx.t>=S.s.tx.total-40)api.$('s-reass').onclick();if(api.DECO()){const D=api.DECO();const k=D.opts.findIndex(x=>x.r==='good');api.$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(k)}})}});api.$('dec-go').onclick();}api.tick(.25);}
    report('ff','arriving with a reassessment still owed (one done just before the doors): not offered, it would wait forever',S.s.tx.arrived&&S.s.tx.reass===1&&api.ffWhy()==='due',`arrived ${S.s.tx.arrived}, rechecks ${S.s.tx.reass}, ${api.ffWhy()||'offered'}`);}
  // 7. waiting on the medic counts as waiting: the monitor step can't start until Medic 1 is there, and no hint penalty while you wait
  {let offered=0;const o={ff:true,stopAt:(S,api)=>{if(S.mission===1&&!S.o.alsArr&&!api.ffWhy())offered++;return false;}};F({od:{L:1}});const r=quiet(()=>human.play('od',1,o));F(null);
    report('ff','waiting for Medic 1 (the 4-lead step) offers fast-forward, with no hint penalty in Recall',offered>0&&!r.incidents.includes('Hint used')&&r.score===100,`offered ${offered} times before the medic, score ${r.score}`);}
};
