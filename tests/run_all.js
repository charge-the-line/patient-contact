#!/usr/bin/env node
/* Patient Contact — full test suite.
   Usage:  node tests/run_all.js            (everything, ~4–6 minutes)
           node tests/run_all.js quick      (syntax, balance, drills, instructor, a short fuzz — under a minute)
           node tests/run_all.js fast human variants   (pick sections)
   Sections: syntax balance fast human sloppy variants drills instructor fuzz
   Exit code 0 = all passed. */
global.window=global.window||{};
const path=require('path'),fs=require('fs'),vm=require('vm');
const ALL=['syntax','balance','fast','human','sloppy','variants','drills','instructor','drill','home','fuzz'];
let want=process.argv.slice(2);if(!want.length)want=ALL;if(want.includes('quick'))want=['syntax','balance','drills','instructor','fuzz'];
const results=[];let failed=0;const T0=Date.now();
function report(section,name,ok,detail=''){results.push({section,name,ok,detail});if(!ok)failed++;console.log(`${ok?'PASS':'FAIL'}  ${section.padEnd(10)} ${name}${detail?'  — '+detail:''}`);}
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');

if(want.includes('syntax')){try{new vm.Script(html.split('<script>')[1].split('</script>')[0]);report('syntax','index.html script compiles',true);}catch(e){report('syntax','index.html script compiles',false,e.message);}
  const ver=(html.match(/APP_VERSION='([^']+)'/)||[])[1],sw=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8'),cache=(sw.match(/CACHE = '([^']+)'/)||[])[1];
  report('syntax','service-worker cache matches app version',cache===`patient-contact-v${ver}`,`app ${ver}, cache ${cache}`);
  {// Milestone 3: the shared core is loaded before the app, listed in the offline cache, and its header hash matches its body (edit without re-hashing = fail)
   const cp=path.join(__dirname,'..','preconnect-core.js');const ct=fs.existsSync(cp)?fs.readFileSync(cp,'utf8'):'';const first=ct.split('\n')[0]||'';const body=ct.slice(first.length+1);
   const want=(first.match(/sha256:([0-9a-f]{64})/)||[])[1];const got=require('crypto').createHash('sha256').update(body,'utf8').digest('hex');const sw4=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');
   const tagOK=html.indexOf('<script src="preconnect-core.js"></script>')>-1&&html.indexOf('<script src="preconnect-core.js"></script>')<html.indexOf('\n<script>\n');
   report('syntax','shared core loaded first, cached offline, header hash matches body',!!ct&&want===got&&sw4.includes("'preconnect-core.js'")&&tagOK,want===got?'hash ok':`hash expected ${got.slice(0,12)}`);}
  {// Milestone 3: due-again spacing and the debrief body are pure functions; prove them here
   const {boot}=require('./pc_mock.js');const {api}=boot();const d=n=>new Date(Date.now()-n*864e5).toISOString();
   const never=api.pcSpacing([]).status==='never',one=api.pcSpacing([{d:d(0),score:90}]),two=api.pcSpacing([{d:d(5),score:90},{d:d(4),score:90}]),miss=api.pcSpacing([{d:d(5),score:90},{d:d(1),score:40}]),due=api.pcSpacing([{d:d(10),score:95}]);
   report('syntax','spacing: 1, 3, 7, 14, 30 days after each clear at 70+; a miss resets; overdue reads as due',never&&one.level===1&&one.dueIn===1&&one.status==='ok'&&two.level===2&&two.status==='due'&&miss.status==='missed'&&due.status==='due'&&due.level===1,`one ${one.status}/${one.dueIn}d, two ${two.status}, miss ${miss.status}, due ${due.status}`);
   const bp=api.pcBestPrev([{d:d(3),score:80},{d:d(1),score:60}]);const h=api.pcDebriefBody({score:90,compare:bp,metrics:[['Rate','110 / min']],feedback:['Late breath'],lessons:[{k:'x',name:'Breaths'}],steps:[{name:'Check pulse',ok:true,at:'0:05'},{name:'Shock',ok:false,missed:true}]});
   report('syntax','debrief body: compare line, metrics table, what cost points, lessons, steps table',bp.best===80&&bp.prev===60&&/Best 80 · last time 60 · new best/.test(h)&&/pc-metrics/.test(h)&&/What cost points/.test(h)&&/data-k="x"/.test(h)&&/pc-steps/.test(h)&&/✗/.test(h));}

  {const {boot}=require('./pc_mock.js');const b3=boot();b3.api.$('b-call1').onclick();b3.api.$('brief-go').onclick();b3.api.finish();report('syntax','call debrief uses Debrief 2.0 (steps table, score count-up)',/pc-steps/.test(b3.els['done-b'].innerHTML)&&b3.els['done-s'].dataset.final==='100');}
  {const intro=(html.match(/<div class="overlay" id="intro">([\s\S]*?)<\/div><\/div>/)||[])[1]||'';const words=intro.replace(/<[^>]+>/g,' ').trim().split(/\s+/).length;const {boot}=require('./pc_mock.js');const b5=boot();b5.api.setSetting('sound','on');
   report('syntax','first-run card is short, settings sheet wired, sound follows the shared setting',words<120&&/id="howov"/.test(html)&&/id="setov"/.test(html)&&/id="h-set"/.test(html)&&b5.api.settings().sound==='on'&&!/b-sound/.test(html),`${words} words`);}
  {const lits=[...html.matchAll(/(?:Version |>v)(\d+\.\d+\.\d+)/g)].map(m=>m[1]);report('syntax','intro shows the current version',lits.length>=1&&lits.every(v=>v===ver),`found ${lits.join(', ')}; app ${ver}`);}
  {// Milestone 1: fonts are served from this site; nothing loads from Google (offline fidelity + privacy). Every font file exists and is in the offline cache list.
   const sw3=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');const urls=[...html.matchAll(/url\((fonts\/[^)]+)\)/g)].map(m=>m[1]);
   const ok=!/fonts\.googleapis|gstatic\.com/.test(html)&&urls.length>=5&&urls.every(u=>fs.existsSync(path.join(__dirname,'..',u))&&sw3.includes(`'${u}'`));
   report('syntax','fonts served from this site, cached offline, no request to Google',ok,`${urls.length} font files`);}
  {// Milestone 1: the screen stays awake while an activity runs and is released after (stubbed wake lock; the real one is async)
   const {boot}=require('./pc_mock.js');const {api}=boot();let req=0,rel=0;const lock={addEventListener(){},release(){rel++;return Promise.resolve();}};navigator.wakeLock={request(){req++;return {then(f){f(lock);return {catch(){}};}};}};
   try{api.$('b-call1').onclick();api.$('brief-go').onclick();}catch(e){report('syntax','screen stays awake during an activity, released after',false,e.message);}
   const a=req>=1;api.showMenu();report('syntax','screen stays awake during an activity, released after',a&&rel>=1&&rel===req,`requests ${req}, releases ${rel}`);delete navigator.wakeLock;}

  report('syntax','offline helper only clears its own old caches',/k\.startsWith\('patient-contact-v'\)/.test(fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8')));
  {const sw2=fs.readFileSync(path.join(__dirname,'..','sw.js'),'utf8');report('syntax','offline helper never caches anonymous statistics',/goatcounter\\\.com\$\|\(\^\|\\\.\)zgo\\\.at/.test(sw2)||sw2.includes('goatcounter')&&sw2.includes('zgo'));}}

if(want.includes('balance')){const {boot}=require('./pc_mock.js');const {api}=boot();const D=api.DEC;let longest=0,total=0;
  let shortest=0;const chk=o=>{const L=o.map(x=>x.t.length),g=o.findIndex(x=>x.r==='good');if(g<0)return;total++;if(L[g]===Math.max(...L))longest++;else if(L[g]===Math.min(...L))shortest++;};
  for(const k in D)if(D[k].opts)chk(D[k].opts);
  report('balance','right answer is not usually the longest',longest/total<=.45,`${longest} of ${total} decisions (${Math.round(longest/total*100)}%, limit 45%)`);
  report('balance','right answer is not usually the shortest',shortest/total<=.45,`${shortest} of ${total} decisions (${Math.round(shortest/total*100)}%, limit 45%)`);
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

if(want.includes('drill')){const {boot}=require('./pc_mock.js');const start=new Date().toISOString();const {api,els}=boot({'preconnect-drill':JSON.stringify({on:true,inst:'Max',roster:['Jo','Sam'],who:'Jo',start})});
  const labels=new Set();for(let k=0;k<8;k++){api.loadCall('arrest');labels.add(api.V().label);}api.record();const runs=api.load().runs;const r=runs[runs.length-1];
  report('drill','Drill Night: standard patient every time, instructor on without the switch, bar shows who is up, the saved call names them with the instructor and the night',!api.RANDOM()&&labels.size===1&&api.instOn()&&/Up: Jo/.test(els['pc-drill'].innerHTML)&&(r.who||[])[0]==='Jo'&&r.inst==='Max'&&r.night===start&&/Drill Night/.test(els['b-rand'].textContent)&&/Drill Night/.test(els['b-inst'].textContent),`who ${r.who}, inst ${r.inst}, patients ${[...labels].join('|')}`);}

if(want.includes('drill')){const {boot}=require('./pc_mock.js');const fakeAudio=()=>{const log=[];const AC=function(){this.currentTime=0;this.state='running';this.destination={};this.resume=()=>{};this.createOscillator=()=>({type:'sine',frequency:{value:0},connect(){},start(t){log.push({f:this.frequency.value,t});},stop(){}});this.createGain=()=>({gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}});};const buzz=[];const F={log,buzz,fs:()=>log.map(x=>x.f),arm(){global.window=global.window||{};global.window.AudioContext=AC;navigator.vibrate=p=>{buzz.push(JSON.stringify(p));return true;};}};F.arm();return F;};const F=fakeAudio();const {api}=boot();F.arm();api.setSetting('sound','on');api.loadCall('arrest');api.$('brief-go').onclick();F.log.length=0;F.buzz.length=0;api.ding(5,'test');const bad=F.fs().includes(220)&&F.buzz.includes('[30,40,30]');F.log.length=0;api.finish();const done=F.fs().join().includes('523,659,784');delete global.window.AudioContext;delete navigator.vibrate;
  report('drill','sound and haptics: a penalty plays the bad tone and buzzes, finishing a call chimes',bad&&done,`bad ${bad}, done ${done}`);}

if(want.includes('home')){const {boot}=require('./pc_mock.js');
  {// the home list: readiness card, a chip per call and for the lesson, Due/Again from the shared spacing
   const old=new Date(Date.now()-10*864e5).toISOString();const {api,els}=boot({'patient-contact':JSON.stringify({runs:[{call:'arrest',score:95,d:new Date().toISOString(),tier:0},{call:'st',score:60,d:old,tier:1},{call:'fl',score:88,d:old,tier:0}],drillRuns:[{drill:'cpr',score:100,d:old}]})});api.showMenu();const R=api.readiness();
   report('home','home list: readiness counts lesson + 8 calls + 7 drills (16), chips show best, Due and Again, the empty lesson chip reads —',R.total===16&&R.done===4&&els['chip-arrest'].textContent==='95'&&els['chip-st'].textContent==='Again'&&els['chip-fl'].textContent==='Due'&&els['chip-lesson'].textContent==='—'&&els['rdy-t'].textContent==='4 of 16 activities'&&els['rdy-n'].textContent==='25%'&&/2 due for review/.test(els['rdy-s'].textContent)&&/id="b-lesson"/.test(html)&&/class="sec"[^>]*>1 · Learn/.test(html)&&/3 · Drills and tools/.test(html),`${R.done}/${R.total} · arrest ${els['chip-arrest'].textContent}, st ${els['chip-st'].textContent}, fl ${els['chip-fl'].textContent}`);
   const e=boot();e.api.showMenu();report('home','empty phone: 0 of 16, the card points at the lesson or a call',e.els['rdy-t'].textContent==='0 of 16 activities'&&/Start with the lesson/.test(e.els['rdy-s'].textContent));}
  {// the lesson: 12 slides, first-try scoring, no skipping, saved under drillRuns as 'lesson' and credited on the chip
   const {api,els,store}=boot();api.lessonStart();const L=api.LESSON;let skipped=false;
   for(let i=0;i<L.length;i++){const before=api.LS().i;api.lessonAct({l:'next'});if(api.LS()&&api.LS().i!==before)skipped=true;api.lessonAct({l:'ans',k:L[i].o.findIndex(o=>o[1]==='good')});api.lessonAct({l:'next'});}
   const dr=api.load().drillRuns||[];api.showMenu();report('home',`lesson: all ${L.length} checks right scores 100, cannot skip, recorded, chip shows 100`,!skipped&&dr.length===1&&dr[0].drill==='lesson'&&dr[0].score===100&&api.LS()===null&&els['chip-lesson'].textContent==='100'&&!els.ldone.classList.contains('hidden'),`score ${dr[0]&&dr[0].score}`);
   const b=boot();b.api.lessonStart();for(let i=0;i<L.length;i++){b.api.lessonAct({l:'ans',k:L[i].o.findIndex(o=>o[1]!=='good')});b.api.lessonAct({l:'ans',k:L[i].o.findIndex(o=>o[1]==='good')});b.api.lessonAct({l:'next'});}const dr2=b.api.load().drillRuns||[];
   report('home','lesson: a wrong first answer on every slide scores 0 (retry still lets you continue)',dr2.length===1&&dr2[0].score===0);
   const lo=L.filter(s=>{const n=s.o.map(o=>o[0].length);return n[s.o.findIndex(o=>o[1]==='good')]===Math.max(...n);}).length,sh=L.filter(s=>{const n=s.o.map(o=>o[0].length);return n[s.o.findIndex(o=>o[1]==='good')]===Math.min(...n);}).length;
   report('home','lesson checks: right answer is not usually the longest or the shortest',lo/L.length<=.45&&sh/L.length<=.45,`longest ${lo}/${L.length}, shortest ${sh}/${L.length}`);
   report('home','lesson: every check has one right answer and three distinct options; generic names and a protocol caveat',L.every(s=>s.o.filter(o=>o[1]==='good').length===1&&new Set(s.o.map(o=>o[0])).size===3)&&/Medical Control Authority/.test(JSON.stringify(L))&&!/Medstar|MMR|McLaren|Covenant/.test(JSON.stringify(L)));}}

if(want.includes('drill')){const {boot}=require('./pc_mock.js');global.__loc={search:'?drill=apgar'};const {api,els}=boot();global.__loc={search:'?drill=nope'};const b=boot();global.__loc=undefined;
  report('drill','daily-drill deep link: ?drill=apgar opens the APGAR drill on load with the intro hidden; an unknown id is ignored',!!api.DR()&&api.DR().id==='apgar'&&els.intro.classList.contains('hidden')&&!els.drillov.classList.contains('hidden')&&!b.api.DR(),`drill ${api.DR()&&api.DR().id}`);}

if(want.includes('fuzz')){const {boot}=require('./pc_mock.js');const prevNoMon=boot.noMon;boot.noMon=true;let crashes=0,runs=want.length<=5?24:80;const errs=[];
  const ids=['a-cpr','a-analyze','a-clear','a-shock','a-breath','a-breaths','a-suction','m-size','m-enter','m-tq','o-check','o-breath','o-nal','e-check','e-syr','e-p10','e-drawn','e-xcheck','e-inject','s-abc','s-B','s-time','f-primary','f-head','c-push','c-shoulders','b-breath','b-cut','d-glu','d-sw','mon-4','mon-12','inst-fab','disc-go','brief-go','brief-menu','b-resume','b-next','b-restart'];
  for(let run=0;run<runs;run++){const {api}=boot();const {$}=api;api.setTier(run%3);api.setInst(run%2===0);api.loadCall(['arrest','mva','od','ep','st','fl','cb','dm'][run%8]);
    try{for(let i=0;i<1200;i++){if(i%4===0)api.monSync();if(api.DECO()){$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i%3)}})}});$('dec-go').onclick();}
      if(Math.random()<.45){const b=$(ids[Math.floor(Math.random()*ids.length)]);b.onclick&&b.onclick();}if(api.S().running)api.tick(.25);const s=api.S();if(!Number.isFinite(s.t)||!Number.isFinite(s.score))throw new Error('non-finite state');}}
    catch(e){crashes++;errs.push(e.message);}}
  boot.noMon=prevNoMon;report('fuzz',`${runs} runs × 1200 random taps, no crashes`,crashes===0,crashes?[...new Set(errs)].slice(0,3).join(' | '):'');}

console.log(`\n${results.length-failed}/${results.length} checks passed · ${Math.round((Date.now()-T0)/1000)} s`);process.exit(failed?1:0);
