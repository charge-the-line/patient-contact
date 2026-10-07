// Fire victim (0.30.0): "We pulled him out of the back bedroom." The crew carries him out; the MFR takes him at the curb.
// Gloves; smoke-soaked clothes off at the curb (off-gassing protects the MFR too); high-flow oxygen whatever the pulse ox says
// (it can't see carbon monoxide); airway burn signs to Medic 1 early; cyanide recognized and told (the antidote is the medic's,
// per Medstar/MMR protocol); brief cooling, a dry sheet, blankets; the rule of nines; no ice, nothing on the burns, blisters left.
const fs=require('fs'),path=require('path');const {boot}=require('./pc_mock.js');const human=require('./human_bot.js');
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const F=f=>{global.window.FORCE_V=f?{fr:f}:null;};
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=html.slice(html.indexOf('/* ================= Fire victim'),html.indexOf('const OPT_TEXT={'));
const logText=api=>api.S().log.map(e=>e.who+': '+e.msg).join(' | ');
const answer=(api,pick='good')=>{const D=api.DECO();if(!D)return null;let i=D.opts.findIndex(o=>o.r===pick);if(i<0)i=0;api.$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});api.$('dec-go').onclick();return D.key;};
// the test's own rule of nines, written out from the adult chart (not read from the app): front and back halves
const NINE={head:9,arm:9,trunkFront:18,trunkBack:18,leg:18,groin:1};
const MINE={fHead:NINE.head/2,bHead:NINE.head/2,fRArm:NINE.arm/2,bRArm:NINE.arm/2,fLArm:NINE.arm/2,bLArm:NINE.arm/2,fChest:NINE.trunkFront/2,fAbd:NINE.trunkFront/2,bUBack:NINE.trunkBack/2,bLBack:NINE.trunkBack/2,
  fRLeg:NINE.leg/2,bRLeg:NINE.leg/2,fLLeg:NINE.leg/2,bLLeg:NINE.leg/2,fGroin:NINE.groin};
// what each patient's blisters are, read from the description the player sees, and what the total must be
const BLIST={trap:['fRArm','fLArm'],hoarse:['fChest'],gasp:['bUBack','bRArm','bLArm']},RED={trap:[],hoarse:['fHead'],gasp:['bLBack']};
const open=(key,tier=0)=>{F({key});const {api,els}=boot();api.setTier(tier);api.loadCall('fr');F(null);api.$('brief-go').onclick();return {api,els,S:api.S()};};
const tapR=(api,r)=>api.$('nn-board').onclick({target:{closest:()=>({dataset:{r}})}});
module.exports=function(report){
  // every patient, played well on every tier, scores 100
  {const bad=[];for(const key of ['trap','hoarse','gasp'])for(const t of [0,1,2]){F({key});const r=quiet(()=>human.play('fr',t));F(null);if(!(r.finished&&r.score===100))bad.push(`${key} ${t}: ${r.score}`);}
    report('fire','every patient on every tier, played well at human pace, scores 100',bad.length===0,bad.join('; ')||'9 runs');}
  // the rule of nines against the test's own chart
  {const total=Object.values(MINE).reduce((a,b)=>a+b,0);const {api}=boot();const appKeys=Object.keys(api.FR_REG).sort().join(),mine=Object.keys(MINE).sort().join();
    const same=appKeys===mine&&Object.keys(MINE).every(r=>api.FR_REG[r][1]===MINE[r]);
    report('fire','rule of nines: the app\'s regions match the adult chart (head 9, arms 9, front 18, back 18, legs 18, groin 1) and add up to 100',total===100&&same,`total ${total}, regions ${same?'match':'differ'}`);}
  for(const key of ['trap','hoarse','gasp']){const want=BLIST[key].reduce((a,r)=>a+MINE[r],0);
    const {api,S}=open(key);S.b.abc=true;api.$('u-nines').onclick();const shown=/What you see:/.test(api.$('nn-see').textContent)&&!api.$('ninesov')._cls.has('hidden')&&!S.running;
    for(const r of BLIST[key])tapR(api,r);const sum=api.$('nn-sum').textContent;const s0=S.score;api.$('nn-done').onclick();
    report('fire',`rule of nines (${key}): tapping the blistered areas shows ${want}% (independent), the estimate is right, no deduction, the call resumes`,shown&&sum===`Marked: ${want}% of his body`&&S.b.est===want&&S.b.estOK&&S.score===s0&&S.running,`${sum}, est ${S.b.est}, score −${s0-S.score}`);}
  {const {api,S}=open('hoarse');api.$('u-nines').onclick();tapR(api,'fChest');tapR(api,'fHead');const s0=S.score;api.$('nn-done').onclick();
    const red=S.score===s0-3&&S.b.est===13.5&&/Counted redness as burn/.test(S.incidents.join(' '));
    const g=open('gasp');g.api.$('u-nines').onclick();tapR(g.api,'fRArm');tapR(g.api,'fLArm');const g0=g.S.score;g.api.$('nn-done').onclick();g.api.$('u-nines').onclick();tapR(g.api,'fChest');g.api.$('nn-done').onclick();
    const back=g.S.score===g0-3&&/Check the front and the back/.test(g.S.incidents.join(' '));
    const c=open('trap');c.api.$('u-nines').onclick();tapR(c.api,'fRArm');c.api.$('nn-cancel').onclick();const way=c.S.b.est===null&&c.S.running&&c.api.$('ninesov')._cls.has('hidden');
    report('fire','rule of nines: counting the red face costs 3 and names redness; mapping the front when the burns are on the back costs 3 once; Step away closes it with nothing saved',red&&back&&way,`red ${red}, back ${back}, step away ${way}`);}
  {let bad=0;for(let i=0;i<300;i++){const {api,S}=open(['trap','hoarse','gasp'][i%3]);api.$('u-nines').onclick();const m={};for(const r of Object.keys(MINE))if(Math.random()<.3){tapR(api,r);m[r]=true;}
      if(Math.random()<.3){const r=Object.keys(m)[0];if(r){tapR(api,r);delete m[r];}}const want=Object.keys(m).reduce((a,r)=>a+MINE[r],0);const want1=Math.round(want*10)/10;
      if(api.$('nn-sum').textContent!==`Marked: ${want1}% of his body`)bad++;}
    report('fire','rule of nines: 300 random markings (taps and untaps), the shown total always equals the independent sum',bad===0,bad?bad+' wrong':'300 markings');}
  // the pulse oximeter can't see carbon monoxide
  {const {api,S}=open('trap');S.b.abc=true;api.$('u-ox').onclick();const reads=+api.$('uv-spo2').textContent||Math.round(S.b.spo2);api.tick(.25);const v=api.frV();
    report('fire','the trap: an unresponsive smoke victim with a high carbon monoxide level reads 98% or more on the pulse ox; Guided labels it "can\'t see CO"',S.b.co>.3&&v.spo2>=98&&/can't see CO/.test(api.$('uv-spo2l').textContent),`CO ${S.b.co.toFixed(2)}, SpO₂ ${v.spo2}`);
    const s0=S.score;S.b.o2='nrb';api.$('u-nrb').onclick();const off=S.b.o2===null&&s0-S.score===5&&/pulse oximeter can't see carbon monoxide/.test(S.incidents.join(' '));
    report('fire','taking the non-rebreather off goes ahead, costs 5 and says the pulse oximeter can\'t see carbon monoxide',off,`score −${s0-S.score}`);}
  {F({key:'trap'});const b=quiet(()=>human.play('fr',0,{pick:{frSpo2:'bad'}}));F(null);const body=global.__lastBoot.els['done-b'].innerHTML;
    report('fire','dropping him to a cannula at 98% costs 10, the poisoning catches up (a seizure), and the debrief says the oxygen came down',b.finished&&b.S.b.toxT!==null&&/turned down or off at a normal SpO₂/.test(body)&&b.incidents.includes('Decision — The pulse ox can\'t see CO'),`score ${b.score}, seizure ${b.S.b.toxT!==null}`);}
  // gloves, and the clothes off at the curb
  {const {api,S}=open('trap');const s0=S.score;api.$('u-strip').onclick();for(let i=0;i<40;i++)api.tick(.25);api.$('u-jewel').onclick();
    const gl=s0-S.score===3&&S.incidents.filter(x=>/without gloves/.test(x)).length===1&&S.b.strip;const t=logText(api);
    report('fire','hands on him without gloves: it happens, costs 3 once, and says gloves before you touch',gl,`score −${s0-S.score}`);
    report('fire','the clothes come off at the curb: it stops the smoldering and the off-gassing "on him and on us"; the guide card says it protects you and the crew too',/smoke-soaked clothes keep giving off gases, on him and on us/.test(t)&&/protects you and the crew too/.test(api.GUIDE.offgas.tip)&&/off-gassing/.test(api.GUIDE.offgas.what));
    const b=open('trap');b.api.$('u-gloves').onclick();for(let i=0;i<170;i++)b.api.tick(.25);
    report('fire','leaving the smoldering clothes on past two minutes costs 3 and says why',b.S.incidents.some(x=>/Smoldering clothing left on/.test(x)),b.S.incidents.join('; '));}
  // the airway: early word to Medic 1, the medic secures it sooner
  {F({key:'hoarse'});const g=quiet(()=>human.play('fr',0));F(null);const t=g.S.log.map(e=>e.who+': '+e.msg).join(' | ');const x=g.S.b;
    const early=t.indexOf('Medic 1, Engine 10-2: possible airway burns')>=0&&t.indexOf('Medic 1, Engine 10-2: possible airway burns')<t.indexOf('Medic 1 at the curb');
    report('fire','awake and hoarse: the airway signs go to Medic 1 by radio before they arrive; the swelling is radioed in; the medic secures it per Medstar/MMR protocol; 100',g.score===100&&early&&x.swFired&&x.swRadio&&x.airSec&&/securing|secured, per Medstar\/MMR protocol/.test(t),`score ${g.score}, early ${early}, secured ${x.airSec}`);
    F({key:'hoarse'});const b=quiet(()=>human.play('fr',0,{pick:{frAirway:'partial'}}));F(null);
    report('fire','saving the airway signs for the handoff costs 5 and the debrief says "at the handoff"',b.finished&&b.score===95&&/at the handoff/.test(global.__lastBoot.els['done-b'].innerHTML),`score ${b.score}`);
    const u=open('trap');u.S.b.abc=true;u.S.b.gloves=true;const s0=u.S.score;u.api.$('u-sit').onclick();
    report('fire','sitting up an unresponsive patient: it is tried, costs 3, he slumps back and the line says why',!u.S.b.sit&&s0-u.S.score===3&&/can't protect his own airway/.test(u.S.incidents.join(' ')),`score −${s0-u.S.score}`);}
  // the breathing: bag-mask only when he isn't breathing; one every 6 real seconds
  {const {api,S}=open('trap');S.b.abc=true;S.b.gloves=true;const s0=S.score;api.$('u-bvm').onclick();const no=!S.b.bvm&&s0-S.score===3&&/breathing well enough on his own/.test(S.incidents.join(' '));
    const g=open('gasp');g.S.b.gloves=true;g.S.b.strip=true;g.api.$('u-abc').onclick();for(let i=0;i<20;i++)g.api.tick(.25);g.api.$('u-bvm').onclick();const g0=g.S.score;
    for(let i=0;i<6;i++){g.api.$('u-breath').onclick();for(let k=0;k<24;k++)g.api.tick(.25);}const ok6=g.S.b.good>=5&&g.S.b.hyper===0&&g.S.score===g0;
    for(let i=0;i<3;i++){g.api.$('u-breath').onclick();g.api.tick(.25);}const fast=g.S.b.hyper>=2&&g.S.incidents.some(x=>/Bagging too fast/.test(x));
    report('fire','bag-mask on a man breathing on his own costs 3; gasping, a breath every 6 real seconds counts, too fast is named',no&&ok6&&fast,`no ${no}, on time ${g.S.b.good}, fast ${fast}`);}
  // the seizure
  {const {api,S}=open('hoarse');S.b.abc=true;api.INJECTS.find(q=>q.id==='worse').run();const found=(S.dets||[]).some(d=>d.id==='tox'&&d.found);api.$('u-protect').onclick();
    for(let i=0;i<60;i++)api.tick(.25);const p=!S.b.headHit&&S.b.secr&&!S.b.seizing;api.$('u-roll').onclick();const clear=!S.b.secr;
    const b=open('hoarse');b.S.b.abc=true;b.api.INJECTS.find(q=>q.id==='worse').run();const s0=b.S.score;for(let i=0;i<60;i++)b.api.tick(.25);
    report('fire','a seizure: seen at once; protecting his head keeps him from hitting the curb; rolling him clears the airway; unprotected costs 3 and names it',found&&p&&clear&&b.S.b.headHit&&b.S.incidents.some(x=>/Seizure without protecting his head/.test(x)),`protected ${p}, cleared ${clear}`);}
  // the cooling
  {const {api,S}=open('trap');S.b.gloves=true;api.$('u-cool').onclick();let n=0;while(!(S.dets||[]).some(d=>d.id==='cold')&&n++<2000){if(api.DECO())answer(api);else api.tick(.25);}
    const coolS=Math.round(S.b.coolT);api.$('u-reass').onclick();for(let i=0;i<12;i++)api.tick(.25);const found=(S.dets||[]).some(d=>d.id==='cold'&&d.found);
    api.$('u-cool').onclick();api.$('u-sheet').onclick();for(let i=0;i<16;i++)api.tick(.25);api.$('u-warm').onclick();const t0=S.b.temp;for(let i=0;i<200;i++){if(api.DECO())answer(api);else api.tick(.25);}
    report('fire','cooling left running: he gets cold after about 80 seconds, a reassessment finds it, stop / dry sheet / blankets warm him back',coolS>=70&&coolS<=100&&found&&S.b.temp>t0,`cold after ${coolS} s, ${t0.toFixed(2)} → ${S.b.temp.toFixed(2)}°C`);
    const big=open('gasp');big.S.b.gloves=true;big.api.$('u-cool').onclick();let m=0;while(!(big.S.dets||[]).some(d=>d.id==='cold')&&m++<2000){if(big.api.DECO())answer(big.api);else big.api.tick(.25);}
    report('fire','on a larger burn (18%) he gets cold sooner: no long cooling on large burns',big.S.b.coolT<coolS-15,`18%: ${Math.round(big.S.b.coolT)} s, 9%: ${coolS} s`);}
  for(const [k,lab,rx] of [['frIce','ice on the burns',/ice/],['frButter','ointment on the burns',/ointment/],['frBlister','popping the blisters',/blisters popped/]]){F({key:'trap'});const b=quiet(()=>human.play('fr',0,{pick:{[k]:'bad'}}));F(null);const body=global.__lastBoot.els['done-b'].innerHTML;
    report('fire',`${lab}: the wrong call costs 10 and the debrief names it`,b.finished&&b.score===90&&rx.test(body.slice(body.indexOf('Ice, ointment, blisters'))),`score ${b.score}`);}
  // cyanide: recognized and told; the antidote is the medic's
  {F({key:'gasp'});const g=quiet(()=>human.play('fr',0));F(null);const t=g.S.log.map(e=>e.msg).join(' ');const btn=[...html.matchAll(/<button[^>]*id="u-[^"]+"[^>]*>([^<]*)</g)].map(m=>m[1]);
    const {api}=boot();
    report('fire','cyanide: the medic gives the antidote per Medstar/MMR protocol after hearing it; no MFR button gives an antidote; the cyanide card is flagged for the MCA review',g.S.b.cn&&/Cyanide antidote is running, per Medstar\/MMR protocol/.test(t)&&!btn.some(x=>/antidote|hydroxocobalamin|cyanokit/i.test(x))&&/Pending MCA review/.test(api.GUIDE.cyanide.mca),`antidote ${g.S.b.cn}`);
    report('fire','gasping: the bag-mask breathes for him until the antidote, then he breathes on his own again',g.score===100&&g.S.b.apneaEver&&!g.S.b.apnea&&/breathing on his own again/.test(t),`score ${g.score}`);}
  // the debrief teaches the pulse oximeter lesson, with Max's line, and points to Upwind's meter drill
  {F({key:'trap'});quiet(()=>human.play('fr',0));F(null);const body=global.__lastBoot.els['done-b'].innerHTML;
    report('fire','the debrief: the pulse oximeter can\'t tell carbon monoxide from oxygen; "Some monitors can measure carbon monoxide directly; ask your medics if theirs does."; a link to Upwind\'s 4-gas meter drill',/can't tell carbon monoxide from oxygen/.test(body)&&body.includes('Some monitors can measure carbon monoxide directly; ask your medics if theirs does.')&&/href="\.\.\/upwind\/\?drill=meter"/.test(body));
    const {api}=boot();report('fire','the medic\'s monitor is never assumed to read carbon monoxide; the guide card carries Max\'s line',!/monitor[^.]{0,40}(reads|shows|measures) (carbon monoxide|CO)/i.test(block.replace('Some monitors can measure carbon monoxide directly; ask your medics if theirs does.',''))&&api.GUIDE.coox.tip.includes('Some monitors can measure carbon monoxide directly; ask your medics if theirs does.'));}
  // the wife breathed the same smoke
  {F({key:'trap'});const r=quiet(()=>human.play('fr',0,{stopAt:S=>S.b&&S.b.abc&&S.mission===1&&S.running}));F(null);const api=r.api,S=api.S();api.INJECTS.find(q=>q.id==='family').run();let n=0;while(!api.DECO()&&n++<100)api.tick(.25);
    const k=api.DECO()&&api.DECO().key;answer(api);report('fire','the family inject: his wife says she\'s fine; the right call is oxygen for her and a second unit',k==='fam_fr'&&/second unit is coming for her/.test(logText(api)));}
  // answer length on every fire card, every patient
  {let n=0;const bad=[];for(const key of ['trap','hoarse','gasp']){const {api,S}=open(key);S.b.est=key==='gasp'?18:9;
      for(const k of ['frSpo2','frWhat','frAirway','frIce','frButter','frBlister','frHand','fam_fr']){const d=api.DEC[k];const o=d.opts||d.optsFn();const L=o.map(q=>q.t.length),i=o.findIndex(q=>q.r==='good');n++;if(L[i]===Math.max(...L)||L[i]===Math.min(...L))bad.push(key+' '+k);}}
    report('fire','answer length: on every fire card, for every patient, the right answer is neither the longest nor the shortest',bad.length===0,bad.slice(0,4).join(', ')||`${n} cards`);}
  // scope words
  {const {api}=boot();report('fire','scope words: medic treatments per Medstar/MMR protocol, never "administer"; the cyanide card is the MCA-flagged one',!/administer/i.test(block)&&(block.match(/per Medstar\/MMR protocol/g)||[]).length>=5&&/MCA review/.test(api.GUIDE.cyanide.mca||''));}
  // fast-forward waits for Medic 1, never while he's barely breathing or seizing
  {F({key:'gasp'});let during=0,offered=0;quiet(()=>human.play('fr',0,{ff:true,stopAt:(S,api)=>{if(!api.ffWhy()){offered++;if(S.b.apnea||S.b.seizing)during++;}return false;}}));F(null);
    report('fire','fast-forward: offered while waiting for Medic 1, never while he is barely breathing or seizing',offered>0&&during===0,`offered ${offered}, during ${during}`);}
  // every call sends exactly one dispatch line (the chest pain call used to get the arrest's too)
  {const n={};for(const c of ['arrest','mva','od','ep','st','fl','cb','dm','pd','cp','fr']){const {api}=boot();api.loadCall(c);n[c]=api.S().log.filter(e=>e.who==='Dispatch').length;}
    report('fire','every call opens with exactly one dispatch line',Object.values(n).every(v=>v===1),JSON.stringify(n));}
};
