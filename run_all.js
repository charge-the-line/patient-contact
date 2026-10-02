#!/usr/bin/env node
/* Patient Contact — full test suite.
   Usage:  node tests/run_all.js            (everything, ~4–6 minutes)
           node tests/run_all.js quick      (syntax, balance, drills, instructor, a short fuzz — under a minute)
           node tests/run_all.js fast human variants   (pick sections)
   Sections: syntax balance fast human sloppy variants drills instructor fuzz
   Exit code 0 = all passed. */
global.window=global.window||{};
const path=require('path'),fs=require('fs'),vm=require('vm');
const ALL=['syntax','balance','fast','human','sloppy','variants','drills','instructor','fuzz'];
let want=process.argv.slice(2);if(!want.length)want=ALL;if(want.includes('quick'))want=['syntax','balance','drills','instructor','fuzz'];
const results=[];let failed=0;const T0=Date.now();
function report(section,name,ok,detail=''){results.push({section,name,ok,detail});if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'}  ${section.padEnd(10)} ${name}${detail?'  — '+detail:''}`);}
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

if(want.includes('syntax')){try{new vm.Script(html.split('<script>')[1].split('</script>')[0]);report('syntax','index.html script compiles',true);}catch(e){report('syntax','index.html script compiles',false,e.message);}
  const ver=(html.match(/APP_VERSION='([^']+)'/)||[])[1],sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),cache=(sw.match(/CACHE = '([^']+)'/)||[])[1];
  report('syntax','service-worker cache matches app version',cache===`patient-contact-v${ver}`,`app ${ver}, cache ${cache}`);}

if(want.includes('balance')){const {boot}=require('./pc_mock.js');const {api}=boot();const D=api.DEC;let longest=0,total=0;
  const chk=o=>{const L=o.map(x=>x.t.length),g=o.findIndex(x=>x.r==='good');if(g<0)return;total++;if(L[g]===Math.max(...L))longest++;};
  for(const k in D)if(D[k].opts)chk(D[k].opts);const ratio=longest/total;
  report('balance','right answer is not usually the longest',ratio<=.45,`${longest} of ${total} decisions (${Math.round(ratio*100)}%, limit 45%)`);
  let missing=0;for(const k in D){const g=D[k].g;if(g&&!api.GUIDE[g])missing++;}report('balance','every decision links to a guide card',missing===0,missing?missing+' missing':'');}

if(want.includes('fast')){for(const [file,call] of [['pc_bot','arrest'],['mva_bot','mva'],['od_bot','od'],['ep_bot','ep'],['st_bot','stroke'],['fl_bot','fall']]){const {play}=require('./'+file);let ok=0,n=0;
  for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){n++;const r=quiet(()=>play(tier,ch));if(r.finished||r.ok)ok++;}report('fast',`${call}: every tier × every decision path completes`,ok===n,`${ok}/${n}`);}}

if(want.includes('human')){const {play}=require('./human_bot.js');for(const call of ['arrest','mva','od','ep','st','fl','dm']){let ok=0,perfect=0;
  for(const tier of [0,1,2]){const r=quiet(()=>play(call,tier));if(r.finished)ok++;if(r.score===100)perfect++;}report('human',`${call}: completes at human pace, scores 100 when played well`,ok===3&&perfect===3,`${ok}/3 complete, ${perfect}/3 perfect`);}
  for(const [file,call] of [['cb_bot','childbirth'],['dm_bot','diabetic']]){const {play}=require('./'+file);let ok=0;for(const tier of [0,1,2])for(const ch of ['good','partial','bad'])if(quiet(()=>play(tier,ch)).ok)ok++;report('human',`${call}: every tier × decision path at human pace`,ok===9,`${ok}/9`);}}

if(want.includes('sloppy')){const {play}=require('./human_bot.js');const {play:cb}=require('./cb_bot.js');
  for(const call of ['arrest','od']){let ok=0;for(let i=0;i<6;i++)if(quiet(()=>play(call,i%3,{sloppy:true})).finished)ok++;report('sloppy',`${call}: irregular breathing (4.5–12.5 s) still progresses`,ok===6,`${ok}/6`);}
  let ok=0;for(let i=0;i<6;i++)if(quiet(()=>cb(i%3,'good',{sloppy:true})).ok)ok++;report('sloppy','newborn: irregular breaths still progress',ok===6,`${ok}/6`);
  // Deterministic: a busy rescuer bagging every 11 seconds must still progress (the v0.8.1 bug).
  for(const call of ['arrest','od']){const r=quiet(()=>play(call,0,{breathEvery:11}));report('sloppy',`${call}: breaths every 11 s (late) still count`,!!r.finished,r.finished?'':'stuck: '+JSON.stringify(r.stuckAt));}}

if(want.includes('variants')){const {play}=require('./human_bot.js');const {play:cbp}=require('./cb_bot.js');const {play:dmp}=require('./dm_bot.js');
  const cases={arrest:[{shock:true},{shock:false}],od:[{L:.65},{L:1},{L:1.3}],ep:[{rebound:true},{rebound:false},{sev:.55}],st:[{side:'R',wake:false,lvo:false},{side:'L',wake:true,lvo:true},{side:'R',wake:false,lvo:true}],mva:[{warm:true},{warm:false,loss:600}],dm:[{pill:false,low:false},{pill:true,low:true}],cb:[{nuchal:true,vig:false},{nuchal:false,vig:true}]};
  for(const call in cases)for(const F of cases[call]){global.window.FORCE_V={[call]:F};const r=quiet(()=>call==='cb'?cbp(0,'good'):call==='dm'?dmp(0,'good'):play(call,0));const ok=r.ok||r.finished;report('variants',`${call} ${JSON.stringify(F)}`,ok&&r.score===100,`score ${r.score}`);}
  global.window.FORCE_V=null;}

if(want.includes('drills')){let NOW=0;const realPerf=global.performance;const {boot}=require('./pc_mock.js');const {api,els}=boot();global.performance={now:()=>NOW};const {$}=api;
  const click=ds=>$('dr-body').onclick({target:{closest:()=>({dataset:ds})}}),foot=ds=>$('dr-foot').onclick({target:{closest:()=>({dataset:ds})}}),big=()=>{const m=els['dr-body'].innerHTML.match(/class="big">(\d+)/);return m?+m[1]:null;};
  let bad=0;for(const g of [api.genMed,api.genO2,api.genApgar])for(let i=0;i<300;i++){const q=g(),all=[q.a,...q.d];if(new Set(all).size!==all.length||all.length<3||all.some(x=>/NaN|Infinity|undefined/.test(x)))bad++;}
  report('drills','900 generated questions are well-formed',bad===0,bad?bad+' malformed':'');
  // Independent answer check: recompute every answer from the question text, never from the drill's own key.
  let wrongKey=0;const num=x=>parseFloat(String(x));
  for(let i=0;i<300;i++){const q=api.genApgar();const parts=q.q.match(/Color: ([^.]+)\. (.+?)\. (.+?)\. Tone: ([^.]+)\. Breathing: ([^.]+)\./);
    const A={'blue or pale all over':0,'pink body, blue hands and feet':1,'pink all over':2}[parts[1]],P={'No heart rate':0,'Heart rate about 80':1,'Heart rate about 140':2}[parts[2]],
      G=/^No response/.test(parts[3])?0:/^Grimaces/.test(parts[3])?1:2,Ac={'limp':0,'some flexion of the arms and legs':1,'active, moving all four limbs':2}[parts[4]],R={'not breathing':0,'weak, irregular breaths':1,'strong cry':2}[parts[5]];
    if(A+P+G+Ac+R!==num(q.a))wrongKey++;}
  for(let i=0;i<300;i++){const q=api.genO2();const m=q.q.match(/(D|E|M) cylinder at (\d+) psi, flowing (\d+) LPM/);const f={D:.16,E:.28,M:1.56}[m[1]];if(Math.floor((+m[2]-200)*f/+m[3])!==num(q.a))wrongKey++;}
  for(let i=0;i<300;i++){const q=api.genMed();let m;
    if((m=q.q.match(/([\d.]+) mg\/mL\.? .*?need ([\d.]+) mg/))&&/How many mL/.test(q.q)){if(Math.abs(+m[2]/+m[1]-num(q.a))>.011)wrongKey++;}
    else if((m=q.q.match(/0\.01 mg\/kg for a (\d+) kg child, maximum 0\.3 mg/))){if(Math.abs(Math.min(.3,.01*+m[1])-num(q.a))>.001)wrongKey++;}
    else if(/You drew 1\.0 mL/.test(q.q)){if(num(q.a)!==1)wrongKey++;}}
  report('drills','answer keys verified by independent recalculation (900 questions)',wrongKey===0,wrongKey?wrongKey+' wrong answer keys':'');
  for(const id of ['rhythm','med','o2','apgar','lkw']){const sc={};for(const mode of ['right','wrong']){api.drillMenu();click({a:'go',d:id});let g=0;while(api.DR()&&api.DR().qs&&api.DR().i<api.DR().qs.length&&g++<20){const q=api.DR().qs[api.DR().i];click({a:'ans',i:String(mode==='right'?q.opts.indexOf(q.a):q.opts.findIndex(o=>o!==q.a))});foot({a:'next'});}sc[mode]=big();}
    report('drills',`${id}: all right = 100, all wrong = 0`,sc.right===100&&sc.wrong===0,`${sc.right} / ${sc.wrong}`);}
  const cpr=ms=>{api.drillMenu();click({a:'go',d:'cpr'});NOW=1000;while(NOW<22000){click({a:'tap'});NOW+=ms;}if(api.DR()&&api.DR().id==='cpr')api.cprTick();return big();};
  const a=cpr(545),b=cpr(444),c=cpr(667);report('drills','CPR tempo: 110/min = 100, 135/min = 0, 90/min = 0',a===100&&b===0&&c===0,`${a} / ${b} / ${c}`);
  api.drillMenu();click({a:'go',d:'leads'});while(api.DR().i<api.DR().seq.length){NOW+=2000;$('dr-body').onclick({target:{closest:()=>({dataset:{p:api.DR().seq[api.DR().i].p}})}});}report('drills','lead placement: perfect run scores 100',big()===100,String(big()));
  global.performance=realPerf;}

if(want.includes('instructor')){const {boot}=require('./pc_mock.js');
  const setups={arrest:S=>{S.checked=true;S.arrest=true;S.air.o2=true;S.o2psi=1000;},mva:S=>{S.m.sized=true;S.m.inside=true;},od:S=>{S.o.checked=true;},ep:S=>{S.e.assessed=true;},st:S=>{S.s.abc=true;},fl:S=>{S.f.primary=true;},cb:S=>{S.c.born=true;S.c.birthRt=S.rt;},dm:S=>{S.d.abc=true;}};
  for(const call in setups){const {api}=boot();api.loadCall(call);const S=api.S();api.$('brief-go').onclick();setups[call](S);const offered=api.INJECTS.filter(x=>x.ok());let fired=0;
    for(const x of offered){const n=S.log.length;api.instAct({a:'inj',i:x.id});if(S.log.length>n)fired++;}report('instructor',`${call}: every offered complication fires`,offered.length>0&&fired===offered.length,`${fired}/${offered.length}`);}
  {const {api}=boot();api.loadCall('arrest');const S=api.S();api.$('brief-go').onclick();Object.assign(S,{checked:true,mission:3,rosc:true,arrest:false,running:true});S.als.lucas=3;S.als.arrived=true;S.als.zoll=true;S.als.rcNext=S.t+999;
    api.instAct({a:'inj',i:'rearrest'});for(let i=0;i<8;i++)api.tick(.25);report('instructor','re-arrest restarts the LUCAS',S.arrest&&S.als.lucas===2&&S.cpr.on);}}

if(want.includes('fuzz')){const {boot}=require('./pc_mock.js');const prevNoMon=boot.noMon;boot.noMon=true;let crashes=0,runs=want.length<=5?24:80;const errs=[];
  const ids=['a-cpr','a-analyze','a-clear','a-shock','a-breath','a-breaths','a-suction','m-size','m-enter','m-tq','o-check','o-breath','o-nal','e-check','e-syr','e-p10','e-drawn','e-xcheck','e-inject','s-abc','s-B','s-time','f-primary','f-head','c-push','c-shoulders','b-breath','b-cut','d-glu','d-sw','mon-4','mon-12','inst-fab','disc-go','brief-go','brief-menu','b-resume','b-next','b-restart'];
  for(let run=0;run<runs;run++){const {api}=boot();const {$}=api;api.setTier(run%3);api.setInst(run%2===0);api.loadCall(['arrest','mva','od','ep','st','fl','cb','dm'][run%8]);
    try{for(let i=0;i<1200;i++){if(i%4===0)api.monSync();if(api.DECO()){$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i%3)}})}});$('dec-go').onclick();}
      if(Math.random()<.45){const b=$(ids[Math.floor(Math.random()*ids.length)]);b.onclick&&b.onclick();}if(api.S().running)api.tick(.25);const s=api.S();if(!Number.isFinite(s.t)||!Number.isFinite(s.score))throw new Error('non-finite state');}}
    catch(e){crashes++;errs.push(e.message);}}
  boot.noMon=prevNoMon;report('fuzz',`${runs} runs × 1200 random taps, no crashes`,crashes===0,crashes?[...new Set(errs)].slice(0,3).join(' | '):'');}

console.log(`\n${results.length-failed}/${results.length} checks passed · ${Math.round((Date.now()-T0)/1000)} s`);process.exit(failed?1:0);
