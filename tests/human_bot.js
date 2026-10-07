// Plays every call at HUMAN pace: one tap per ~1.2 real seconds, breaths every ~6 real seconds,
// 2-second reaction to prompts. Ticks in real time (0.25 s), like the phone does.
const {boot}=require('./pc_mock.js');
function play(call,tier,opts={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall(call);
  const hid=id=>els[id]&&els[id]._cls.has('hidden');let rt=0,nextTap=0,lastBreath=-99,react={},missions=[],stuckAt=null,lastProgress=0,lastSig='';
  const tap=id=>{if(rt<nextTap)return false;const e=$(id);if(!e.onclick||hid(id)||e._cls.has('on')||e.disabled)return false;e.onclick();nextTap=rt+1.2;return true;};
  const after=(key,cond,delay=2)=>{if(!cond){delete react[key];return false;}if(react[key]===undefined)react[key]=rt;return rt-react[key]>=delay;};
  while(rt<1800){const S=api.S();if(opts.stopAt&&S.active&&opts.stopAt(S,api))return {stopped:true,api,els,S,rt};
    if(!hid('briefov')){if(after('brief',true,3))$('brief-go').onclick();rt+=.25;continue;}
    if(api.DECO()){if(after('dec',true,4)){const D=api.DECO();const want=opts.pick&&opts.pick[D.key]||'good';let i=D.opts.findIndex(o=>o.r===want);if(i<0)i=D.opts.findIndex(o=>o.r==='good');$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});$('dec-go').onclick();}rt+=.25;continue;}
    if(!S.running&&!hid('done')){if(after('done',true,2)){missions.push(Math.round(rt));if(S.mission>=api.M().length-1)break;$('b-next').onclick();}rt+=.25;continue;}
    const sig=S.mission+':'+api.stepsDone().join(',');if(sig!==lastSig){lastSig=sig;lastProgress=rt;}
    if(rt-lastProgress>150&&!stuckAt){const j=api.stepsDone().findIndex(x=>!x);stuckAt={mission:S.mission,step:api.M()[S.mission].steps[j]&&api.M()[S.mission].steps[j].t};}
    if(opts.probe&&S.incidents.length>(opts._n||0)){opts._n=S.incidents.length;const last=S.incidents[S.incidents.length-1];if(last==='Hint used'){const j=api.stepsDone().findIndex(x=>!x);console.log('   HINT in',call,'M'+(S.mission+1),'→',api.M()[S.mission].steps[j].t);}}
    if(opts.instChaos&&S.running&&Math.random()<.004){const ok=api.INJECTS.filter(x=>{try{return x.ok()&&['delay','family','worse','vomit','bridge'].includes(x.id);}catch(e){return false;}});if(ok.length){api.instAct({a:'inj',i:ok[Math.floor(Math.random()*ok.length)].id});opts._inj=(opts._inj||0)+1;}}
    if(opts.ff&&S.running){const w=api.ffWhy();
      if(!w&&rt>=nextTap){(opts.ffLog=opts.ffLog||[]).push(api.ffGo());nextTap=rt+1.2;rt+=.25;continue;}
      if(w==='due'&&!(S.dets||[]).some(x=>!x.closed)&&(call==='dm'||call==='pd'||call==='cp'&&S.mission===api.M().length-1||(call==='arrest'?(api.M()[S.mission]||{}).tag==='tx':S.mission===api.FFC[call].tx)))tap({mva:'m-reass',od:'o-reass',ep:'e-reass',st:'s-reass',fl:'f-reass',arrest:'a-reassess',dm:'d-glu',pd:'p-reass',cp:'k-reass',fr:'u-reass'}[call]);}
    // the rule of nines overlay pauses the call: tap the blistered areas at a human pace, then Done
    if(call==='fr'&&api.NN()){if(rt>=nextTap&&after('nn',true,1.5)){const N=api.NN(),V=api.V();const want=(opts.nines||api.FR_BURNS[V.key].filter(b=>b[1]!=='superficial').map(b=>b[0]));const r=want.find(q=>!N.mark[q]);
        if(r){N.side=r[0];$('nn-board').onclick({target:{closest:()=>({dataset:{r}})}});}else $('nn-done').onclick();nextTap=rt+1.2;}rt+=.25;continue;}
    if(S.running){
      if(call==='od'){const o=S.o;
        if(!o.checked)tap('o-check');
        else if(!o.open)tap('o-open');else if(o.gurgle)tap('o-suct');else if(!o.opa&&o.gcs<9)tap('o-opa');else if(!o.bvm)tap('o-bvm');else if(!o.o2)tap('o-o2');
        else if(o.doses===0)tap('o-nal');else if(!o.ox)tap('o-ox');else if(o.pulseChecks<1&&!o.act)tap('o-pulse');
        else if(o.nudged===o.doses&&o.rr<10&&o.doses<4)tap('o-nal');
        if(o.bvm&&o.rr<10&&rt-lastBreath>=(opts.breathEvery||(opts.sloppy?4.5+Math.random()*8:6))){const e=$('o-breath');e.onclick();lastBreath=rt;}
        if(!o.pulse&&!o.cpr)tap('o-cpr');
        {const dd=(S.dets||[]).filter(x=>x.id==='renarc').pop();if(dd&&!dd.closed&&!opts.noDet&&after('detod',true,2)){if(!dd.found)tap('o-reass');else if(!o.open)tap('o-open');else if(o.gurgle)tap('o-suct');else if(o.alsArr&&!dd.told)tap('o-tell');else if(!o.alsArr&&o.doseT.length&&S.t-o.doseT[o.doseT.length-1]>150&&o.rr<10)tap('o-nal');}else if(!dd||dd.closed)delete react.detod;}
        if(S.mission===1){if(!o.recov)tap('o-recov');else if(o.vitCount<1&&!o.act)tap('o-vitals');}
        if(S.mission===2)tap('o-load');if(S.mission===3&&rt%40<1)tap('o-reass');}
      if(call==='arrest'){const A=S.aed,V=api.V(),tag=(api.M()[S.mission]||{}).tag,canStart=!S.noRes&&!S.terminated&&(V.open!=='look'||S.startChoice==='start');if(S.air.vomit)tap('a-suction');
        if(!S.checked)tap('a-check');
        else if(!S.dnr.asked&&!S.act&&(V.open==='look'||S.compT>0))tap('a-dnr');
        else if(canStart&&(S.cpr.who==='Wife'||S.compT===0)&&!S.cpr.on&&!S.act)tap('a-cpr');
        else if(!S.cpr.met)tap('a-met');
        else if(!A.pads&&!A.padsAsked)tap('a-pads');
        if(A.pads&&!S.als.zoll&&S.arrest&&['off','idle'].includes(A.state)&&(!A.analyzedOnce||S.t-A.lastAnalyze>=120))tap('a-analyze');
        if(A.state==='ready'){if(!A.clear)tap('a-clear');else tap('a-shock');}
        if(after('resume',canStart&&S.arrest&&S.checked&&!S.cpr.on&&!S.act&&!['analyzing','charging','ready'].includes(A.state)&&!S.vent.waiting&&!(S.als.rc&&S.als.rc.phase==='check'),2))$('a-cpr').onclick();
        if(S.compT>5){if(!S.air.opa)tap('a-opa');else if(!S.air.bvm)tap('a-bvm');else if(!S.air.o2)tap('a-o2');}
        if(after('breaths',S.vent.waiting,2))$('a-breaths').onclick();
        if(S.cpr.on&&S.sinceSwitch>100)tap('a-switch');
        if(S.als.arrived&&!S.als.zoll&&tag==='als')tap('a-zoll');
        const rc=S.als.rc;if(after('hands',rc&&rc.phase==='call',1.5))$('a-hands').onclick();if(rc&&rc.phase==='check'&&S.als.lucas===0)tap('a-lucas1');
        if(after('rcres',rc&&rc.phase==='resume',1.5))$('a-cpr').onclick();
        if(S.als.lucas===1&&!rc&&!S.act)tap('a-lucas2');
        if(S.air.adv&&!S.terminated&&rt-lastBreath>=(opts.breathEvery||(opts.sloppy?4.5+Math.random()*8:6))){$('a-breath').onclick();lastBreath=rt;}
        if(tag==='pack'){tap('a-cot');tap('a-straps');tap('a-load');}if(tag==='tx')tap('a-reassess');}
      if(call==='mva'){const m=S.m;tap('m-size');if(m.extr.stage>=1)tap('m-enter');
        if(m.inside){for(const id of ['m-cspine','m-protect','m-survey','m-press','m-tq','m-mark','m-o2','m-warm'])if(tap(id))break;if(!m.act&&((S.mission===0&&m.vitCount<1)||(S.mission===1&&m.vitExtr<1)))tap('m-vitals');}
        if(m.extr.done)tap('m-move');tap('m-load');
        const dd=(S.dets||[]).filter(x=>x.id==='shock').pop();
        if(dd&&!opts.noDet&&S.mission>=2&&after('det',true,2)){if(!dd.found)tap('m-reass');else if(!m.recheck&&!m.act)tap('m-recheck');else if(!dd.told)tap('m-tell');else if(!m.stab)tap('m-thigh');else if(api.V().pelvis&&!m.binder)tap('m-binder');else if(!m.rigWarm)tap('m-heat');else if(!m.ivSet)tap('m-ivset');}
        else if(!dd)delete react.det;
        if(S.mission===3){if(m.tx.tqChecks<1)tap('m-tqcheck');else if(rt%40<1)tap('m-reass');}}
      if(call==='ep'){const e=S.e;if(!e.assessed)tap('e-assess');
        else for(const id of ['e-pos','e-sting','e-o2','e-ox'])if(tap(id))break;
        if(S.mission>=1){if(!e.ampOK){if(e.ampChecked&&e.ampBad)tap('e-another');else tap('e-check');}else if(!e.syr)tap('e-syr');
          else if(!e.drawn){if(e.vol<.3-.001)tap('e-p10');else tap('e-drawn');}else if(!e.xcheck&&!e.injected)tap('e-xcheck');else if(!e.swapped&&!e.injected)tap('e-swap');else if(!e.injected)tap('e-inject');else if(!e.timeNoted)tap('e-time');}
        if(e.injected&&S.mission>=2&&!(S.dets||[]).some(x=>x.id==='worse'&&!x.closed))tap('e-reass');
        {const dd=(S.dets||[]).filter(x=>x.id==='worse').pop(),last=e.doses.length?e.doses[e.doses.length-1].t:-1e9;if(dd&&!dd.closed&&!opts.noDet&&after('detep',true,2)){if(!dd.found)tap('e-reass');else if(e.alsArr&&!dd.told)tap('e-tell');else if(!e.o2)tap('e-o2');else if(S.t>=last+300&&!(e.d2&&!e.injected)&&!e.doses.some(q=>q.t>=dd.t0)&&(!e.alsArr||e.medSaysDraw))tap('e-second');}else if(!dd||dd.closed)delete react.detep;}}
      if(call==='fl'){const x=S.f;if(!x.act){for(const id of ['f-primary','f-why','f-head','f-meds','f-vitals','f-glu','f-neuro','f-warm','f-pad'])if(tap(id))break;}if(S.mission===2)tap('f-load');
        {const dd=(S.dets||[]).filter(q=>q.id==='decline').pop();if(x.vomit&&!opts.noDet)tap('f-suct');if(dd&&!dd.closed&&!opts.noDet){if(after('detfl',true,2)){if(!dd.found)tap('f-reass');else if(!dd.told)tap('f-tell');}}else{delete react.detfl;if(S.mission===3&&rt%40<1)tap('f-reass');}}}
      if(call==='dm'){const x=S.d;const dd=(S.dets||[]).find(q=>q.id==='falling'&&!q.closed);
        if(dd&&!opts.noDet&&!x.act){if(after('detdm',true,2)){if(!dd.found)tap('d-glu');else if(x.alsArr&&!dd.told)tap('d-tell');else if(x.alsArr&&!x.ivSet)tap('d-ivset');else if(!x.alsArr&&x.sw&&api.dmV().gcs>=13)tap('d-tube');else if(!x.pos)tap('d-pos');}}else delete react.detdm;
        if(!x.act){if(!x.keys)tap('d-keys');else if(!x.abc)tap('d-abc');else if(!x.id)tap('d-id');else if(!x.glu)tap('d-glu');else if(x.swT===null)tap('d-sw');else if(!x.vit)tap('d-vit');else if(x.doseT.length&&!x.recheck&&S.t-x.doseT[0]>=200&&S.t-(x.gluT||0)>100)tap('d-glu');else if(x.d10&&x.glu<2)tap('d-glu');}}
      if(call==='pd'){const x=S.p,V=api.V();const ti=(S.dets||[]).find(q=>q.id==='tiring'&&!q.closed),up=(S.dets||[]).find(q=>q.id==='upset'&&!q.closed);
        if(x.bvm&&x.tired&&rt-lastBreath>=(opts.breathEvery||(opts.sloppy?1.8+Math.random()*2.6:2.5))){$('p-breath').onclick();lastBreath=rt;}
        if((ti||up)&&!opts.noDet){if(after('detpd',true,2)&&!x.act){const d=ti||up;if(!d.found)tap('p-reass');else if(ti&&!x.bvm)tap('p-bvm');else if(up&&x.agit>=.35)tap('p-calm');else if(x.alsArr&&!d.told)tap('p-tell');}}else delete react.detpd;
        if(!x.act&&!ti&&!up){if(!x.calm)tap('p-calm');else if(!x.hist)tap('p-hist');else if(!x.listen)tap('p-listen');else if(!x.ox)tap('p-ox');else if(!x.o2)tap('p-o2b');
          else if(S.mission===1&&V.kind!=='croup'){if(!x.label)tap('p-label');else if(!x.date)tap('p-date');else if(V.inh==='own'&&x.inhDec==='good'&&!x.spacer)tap('p-spacer');else if(V.inh==='own'&&x.inhDec==='good'&&!x.puffs)tap('p-puff');else if(S.t-api.pdRef()>=120&&!x.reassAfter)tap('p-reass');}
          else if(S.mission===1&&V.kind==='croup'){if(S.t-api.pdRef()>=120&&!x.reassAfter)tap('p-reass');}
          else if(S.mission===2&&x.alsArr)tap('p-load');
          else if(S.mission===3&&S.t-x.tx.lastReass>=60)tap('p-reass');}}
      if(call==='cp'){const x=S.h,V=api.V();const open=id=>(S.dets||[]).find(q=>q.id===id&&!q.closed);const dv=open('vf'),dd=open('drop'),dp=open('pain');
        if(x.arr&&!x.rosc){
          if(!x.arrChecked){if(after('arr',true,opts.arrReact||2)&&!x.act)tap('k-chk');}
          else if(x.roscSign){if(!x.act&&after('rsign',true,1.5))tap('k-chk');}
          else if(x.aed==='ready'){if(!x.clear)tap('k-clear');else tap('k-shock');}
          else if(!x.cpr&&x.aed!=='analyzing')tap('k-cpr');
          else if(!x.pads&&!x.act)tap('k-pads');
          else if(x.pads&&x.shocks===0&&x.aed==='idle')tap('k-analyze');
          if(x.alsArr&&dv&&!dv.told)tap('k-tell2');}
        else{delete react.arr;delete react.rsign;
          if(dv&&x.alsArr&&!dv.told)tap('k-tell');
          if((dd||dp)&&!opts.noDet&&!x.act){if(after('detcp',true,2)){const d=dd||dp;if(!d.found)tap('k-reass');else if(dd&&!x.flat)tap('k-flat');else if(dp&&!x.o2)tap('k-o2');else if(x.alsArr&&!d.told)tap('k-tell');}}else delete react.detcp;
          if(!x.act&&!dd&&!dp){if(!x.abc)tap('k-abc');else if(!x.opq)tap('k-opq');else if(!x.sample)tap('k-sample');else if(!x.vit)tap('k-vit');
            else if(S.mission===1){if(!x.qall)tap('k-qall');else if(!x.qbleed)tap('k-qbleed');else if(!x.qthin)tap('k-qthin');else if(!x.qtoday)tap('k-qtoday');else if(x.asaDec==='good'&&!x.asaGiven&&!(V.allergy||V.thin||V.today))tap('k-chew');else if(V.nitro&&!x.qed)tap('k-qed');}
            else if(opts.wrongO2&&!x.o2&&!x.o2Wrong&&x.vit)tap('k-o2');else if(x.alsArr&&S.mon.twelve&&!x.moved)tap('k-move');else if(x.moved&&!x.loaded)tap('k-load');
            else if(S.mission===api.M().length-1&&S.t-x.tx.lastReass>=60)tap('k-reass');}}}
      if(call==='fr'){const x=S.b,V=api.V();const open=id=>(S.dets||[]).find(q=>q.id===id&&!q.closed);const ds=open('swell'),da=open('apnea'),dt=open('tox'),dc=open('cold');
        if(x.bvm&&x.apnea&&rt-lastBreath>=(opts.breathEvery||(opts.sloppy?4.5+Math.random()*8:6))){$('u-breath').onclick();lastBreath=rt;}
        if(!opts.noDet){
          if(da){if(!x.bvm)tap('u-bvm');else if(x.secr)tap('u-suct');else if(x.alsArr&&!da.told)tap('u-tell');}
          if(dt&&after('detfr',true,2)){if(x.seizing){if(!x.protect)tap('u-protect');}else if(x.secr){if(!x.apnea)tap('u-roll');else tap('u-suct');}else if(x.o2!=='nrb'&&!x.apnea)tap('u-nrb');else if(x.alsArr&&!dt.told)tap('u-tell');}else if(!dt)delete react.detfr;
          if(ds&&after('detfrs',true,2)){if(!ds.found){if(!x.act)tap('u-reass');}else if(!ds.told)tap(x.alsArr?'u-tell':'u-tellr');else if(V.key==='hoarse'&&!x.apnea&&!x.seizing&&!x.sit)tap('u-sit');else if((V.key!=='hoarse'||x.apnea)&&!x.jaw)tap('u-jaw');}else if(!ds)delete react.detfrs;
          if(dc&&after('detfrc',true,2)){if(!dc.found){if(!x.act)tap('u-reass');}else if(x.cooling)tap('u-cool');else if((!x.sheet||x.wet)&&!x.act)tap('u-sheet');else if(!x.warm)tap('u-warm');}else if(!dc)delete react.detfrc;}
        if(x.cooling&&x.coolT>=25&&!opts.coolLong)tap('u-cool');
        if(!x.act&&!x.seizing){if(!x.gloves)tap('u-gloves');else if(!x.strip)tap('u-strip');else if(!x.jewel)tap('u-jewel');else if(!x.abc)tap('u-abc');
          else if(x.apnea&&!x.bvm)tap('u-bvm');else if(!x.apnea&&x.o2!=='nrb'&&x.spo2Dec!=='bad'&&!x.o2Ding)tap('u-nrb');else if(!x.ox)tap('u-ox');
          else if(S.mission>=2&&!x.airway)tap('u-airway');else if(S.mission>=2&&!x.ready)tap('u-ready');
          else if(S.mission>=3&&x.coolT===0&&!x.cooling)tap('u-cool');else if(S.mission>=3&&x.coolT>=20&&!x.sheet&&!x.cooling)tap('u-sheet');else if(S.mission>=3&&x.sheet&&!x.warm)tap('u-warm');
          else if(S.mission>=3&&x.warm&&x.est===null)tap('u-nines');
          else if(x.alsArr&&S.mon.four&&!x.loaded)tap('u-load');else if(x.loaded&&!x.heat)tap('u-heat');
          else if(S.mission===api.M().length-1&&S.t-x.tx.lastReass>=60)tap('u-reass');}}
      if(call==='st'){const x=S.s;if(!x.abc)tap('s-abc');else if(!x.act){const k=['B','E','F','A','S'].find(k=>!x.bf[k]);if(k)tap('s-'+k);else for(const id of ['s-time','s-glu','s-meds','s-vitals'])if(tap(id))break;}
        if(x.vomit)tap('s-suct');if(x.alsArr){tap('s-fam');tap('s-cot');}if(S.mission===2)tap('s-load');
        {const dd=(S.dets||[]).filter(q=>q.id==='worse').pop();if(dd&&!dd.closed&&!opts.noDet){if(after('detst',true,2)){if(!dd.found)tap('s-reass');else if(!dd.told)tap('s-tell');else if(x.secr&&!x.suct2)tap('s-suct');else if(!x.side)tap('s-side');else if(x.spo2<94&&!x.o2on)tap('s-o2');else if(!x.glu2&&!x.act)tap('s-glu2');}}else{delete react.detst;if(S.mission===3)tap('s-reass');}}}
      if(api.S().running)api.tick(.25);}
    rt+=.25;}
  const S=api.S();return {call,tier,finished:missions.length===api.M().length,missions,score:S.score,stuckAt,incidents:S.incidents,outcome:call==='arrest'?api.arrestOutcome():null,S};}
module.exports={play};
if(require.main===module){for(const call of ['arrest','mva','od','ep','st','fl','dm'])for(const tier of [0,1,2]){const r=play(call,tier);
  console.log((r.finished?'PASS':'FAIL').padEnd(5),call.padEnd(7),['Guided','Recall','Chaos'][tier].padEnd(7),'score',String(r.score).padStart(3),'real-time min',r.missions.map(x=>(x/60).toFixed(1)).join('/'),r.stuckAt?'  STALLED >150s at: M'+(r.stuckAt.mission+1)+' "'+r.stuckAt.step+'"':'',r.incidents.length?'\n        feedback: '+[...new Set(r.incidents)].slice(0,6).join(' | '):'');}}
