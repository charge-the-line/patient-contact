// Pediatric breathing (0.28.0): look before you touch, calm, oxygen he will accept, only his own in-date inhaler (Bay County MFR
// scope: assist, pending MCA review), the tiring child and bag-mask on the real clock, the epiglottitis red flags, nothing by mouth.
const {boot}=require('./pc_mock.js');const human=require('./human_bot.js');
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const F=f=>{global.window.FORCE_V=f?{pd:f}:null;};
const answer=(api,pick='good')=>{const D=api.DECO();if(!D)return null;let i=D.opts.findIndex(o=>o.r===pick);if(i<0)i=0;api.$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});api.$('dec-go').onclick();return D.key;};
const last=api=>api.S().log.slice(-1)[0].msg;
const start=api=>{api.$('brief-go').onclick();let g=0;while(!api.DECO()&&g++<40)api.tick(.25);answer(api);};
module.exports=function(report){
  // the inhaler: his own and in date is assisted; his brother's or an expired one is never used, and using it costs the decision
  for(const inh of ['sibling','expired']){
    F({kind:'asthma',inh});const g=quiet(()=>human.play('pd',0));F(null);const gb=g.api?g.api:global.__lastBoot.api;const body=global.__lastBoot.els['done-b'].innerHTML;
    report('peds',`${inh==='sibling'?'his brother\'s':'an expired'} inhaler: the right call is not to use it; no puffs, the help buttons stay hidden, the debrief says so, 100`,g.finished&&g.score===100&&g.S.p.puffs===0&&g.S.p.inhDec==='good'&&/correctly not used/.test(body),`score ${g.score}, puffs ${g.S.p.puffs}`);
    F({kind:'asthma',inh});const b=quiet(()=>human.play('pd',0,{pick:{pdInh:'bad'}}));F(null);const bb=global.__lastBoot.els['done-b'].innerHTML;
    report('peds',`${inh==='sibling'?'his brother\'s':'an expired'} inhaler used anyway: the decision costs 10 and the debrief names it`,b.finished&&b.score===90&&b.S.p.trapUsed&&/used (his brother's|an expired) inhaler/.test(bb),`score ${b.score}`);}
  // his own: helping before the label and date, or without the spacer, is allowed, costs points and is named; the checked way costs nothing
  {F({kind:'asthma',inh:'own',tire:false});const {api}=boot();api.loadCall('pd');F(null);const S=api.S();start(api);api.$('p-calm').onclick();const s0=S.score;
    api.$('p-puff').onclick();for(let i=0;i<40;i++)api.tick(.25);const inc=S.incidents.join(' | ');
    const early=S.p.puffs===1&&S.p.puffKind==='nospacer'&&/before reading the label and the date/.test(inc)&&/without the spacer/.test(inc)&&s0-S.score===8;
    F({kind:'asthma',inh:'own',tire:false});const b=boot().api;b.loadCall('pd');F(null);const T=b.S();start(b);b.$('p-calm').onclick();b.setM(b.M());T.p.label=true;T.p.date=true;T.p.inhDec='good';const t0=T.score;
    b.$('p-spacer').onclick();b.$('p-puff').onclick();for(let i=0;i<40;i++)b.tick(.25);
    report('peds','his own inhaler: a puff before the label and date and without the spacer goes in, costs 5 and 3 and is named; checked and through the spacer it costs nothing, with the time noted',early&&T.p.puffs===1&&T.score===t0&&/spacer at \d\d:\d\d/.test(T.log.map(e=>e.msg).join(' ')),`early: puffs ${S.p.puffs}, −${s0-S.score}`);}
  // croup: handling him before he is calm upsets him, a forced mask makes it worse, and calm brings it back
  {F({kind:'croup'});const {api}=boot();api.loadCall('pd');F(null);const S=api.S();start(api);const a0=S.p.agit;
    api.$('p-ox').onclick();const a1=S.p.agit;api.$('p-o2m').onclick();const fought=S.p.o2===null&&/won't keep the mask on/.test(S.log.map(e=>e.msg).join(' '));
    S.p.listen=true;for(let i=0;i<4;i++)api.tick(.25);const up=(S.dets||[]).some(x=>x.id==='upset'&&!x.closed);
    api.$('p-calm').onclick();api.$('p-o2b').onclick();for(let i=0;i<200;i++)api.tick(.25);
    report('peds','croup: a pulse oximeter before he is calm and a forced mask upset him (stridor at rest), calm on Mom\'s lap and blow-by settle him',a1>a0+.2&&fought&&up&&S.p.agit<.35&&S.p.o2==='blowby',`agitation ${a0.toFixed(2)} → ${a1.toFixed(2)} → ${S.p.agit.toFixed(2)}`);}
  // the bag-mask: refused on a child who is breathing for himself; on a tiring child one breath every 2 to 3 seconds counts, too fast and too late are named
  {F({kind:'asthma',inh:'own',tire:true});const {api}=boot();api.loadCall('pd');F(null);const S=api.S();start(api);api.$('p-calm').onclick();
    api.$('p-bvm').onclick();const refused=!S.p.bvm&&/fights the bag/.test(last(api));
    S.p.tired=true;S.p.fat=.4;api.$('p-bvm').onclick();const on=S.p.bvm;let good0=S.p.good;
    const breathe=(gap,n)=>{for(let k=0;k<n;k++){for(let t=0;t<gap;t+=.25)api.tick(.25);api.$('p-breath').onclick();}};
    breathe(2.5,6);const good=S.p.good-good0;breathe(.75,4);const fast=S.incidents.some(w=>/too fast for a child/.test(w));breathe(7,1);const late=/seconds late — one every 2 to 3/.test(S.log.map(e=>e.msg).join(' '));
    report('peds','bag-mask: refused while he breathes for himself; on a tiring child breaths every 2.5 s count, under 1.5 s is too fast, 7 s is named late',refused&&on&&good>=5&&fast&&late,`on-time ${good}, too fast ${fast}, late ${late}`);}
  // the tiring child is found by reassessing, and the debrief says whether you saw it
  {F({kind:'asthma',inh:'own',tire:true});const r=quiet(()=>human.play('pd',0));F(null);const body=global.__lastBoot.els['done-b'].innerHTML;
    report('peds','severe asthma: he tires out, the reassessment finds it, he is bagged, the debrief says recognized, 100',r.finished&&r.score===100&&r.S.p.tireFired&&r.S.p.tireFoundT!==null&&/recognized/.test(body)&&r.S.p.firstBagT!==null,`score ${r.score}`);}
  // the red flags, the throat, nothing by mouth, the ride, and the words of the scope
  {const {api}=boot();const D=api.DEC,G=api.GUIDE,js=require('fs').readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');
    const door=D.pdDoor.why,throat=D.pdThroat;
    report('peds','the doorway card names the epiglottitis red flags (drooling, high fever, upright leaning forward, very sick) and the rule: calm, no throat exam, tell the medic',/drooling/.test(door)&&/high fever/.test(door)&&/leaning forward/.test(door)&&/very sick/.test(door)&&/nobody examines the throat/.test(door)&&/tell the medic/.test(door)&&!!G.epiglottitis);
    report('peds','nobody looks in his throat; nothing by mouth; he rides sitting up in a child restraint',/nobody looks in his throat/.test(throat.opts.find(o=>o.r==='good').t)&&/nothing by mouth/i.test(D.pdSyrup.opts.find(o=>o.r==='good').t)&&/child restraint/.test(D.pdRide.opts.find(o=>o.r==='good').t));
    const pd=js.slice(js.indexOf('/* ================= Pediatric breathing'),js.indexOf('function pdDebrief'));
    report('peds','scope words: MFRs assist with his own prescribed inhaler, flagged for the MCA review; medic treatments per Medstar/MMR protocol; never "administer"',/may assist a patient/.test(G.inhaler.what)&&/MCA review/.test(G.inhaler.mca)&&/per Medstar\/MMR protocol/.test(pd)&&!/administer/i.test(pd));
    report('peds','pediatric bag-mask rate is one breath every 2 to 3 seconds everywhere it is taught',/every 2 to 3 seconds/.test(G.pbvm.tip)&&/every 2 to 3 seconds/.test(G.tiring.tip)&&/1 every 2–3 s/.test(js));}
  // fast-forward: offered while he waits for the medic, never while he needs breaths
  {let offered=0,bad=0;F({kind:'asthma',inh:'own',tire:true});quiet(()=>human.play('pd',0,{ff:true,stopAt:(S,api)=>{const w=api.ffWhy();if(!w&&S.mission===2&&!S.p.alsArr)offered++;if(!w&&S.p.tired)bad++;return false;}}));F(null);
    report('peds','fast-forward: offered while waiting for Medic 1, never while a tiring child needs breaths',offered>0&&bad===0,`offered ${offered}, while tiring ${bad}`);}
};
