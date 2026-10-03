const {boot}=require('./pc_mock.js');
function play(tier,choice='good',opts={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('arrest');let S=api.S();
  const c=id=>{const e=$(id);e.onclick&&e.onclick();};const hid=id=>els[id]&&els[id]._cls.has('hidden');
  let t=0,lastBreath=-99;const log=[];let missions=[];let curM=0,mT=0;
  while(t<1200){S=api.S();
    if(!hid('briefov'))c('brief-go');
    if(api.DECO()){const d=api.DEC[api.DECO().key];let i=d.opts.findIndex(o=>o.r===choice);if(i<0)i=0;$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});c('dec-go');}
    if(!S.running&&!hid('done')){missions.push({m:curM,t:Math.round(S.t-mT)});if(S.mission>=api.M().length-1)break;c('b-next');curM=api.S().mission;mT=api.S().t;continue;}
    if(S.running){
      if(!S.checked)c('a-check');
      const A=S.aed;
      if(S.checked&&!S.act&&!S.cpr.on&&S.arrest&&!['analyzing','charging','ready'].includes(A.state)&&!S.vent.waiting&&!(S.als.rc&&S.als.rc.phase==='check')&&!opts.lazy)c('a-cpr');
      if(S.cpr.on&&!S.cpr.met&&!opts.noMet)c('a-met');
      if(opts.metOff&&S.cpr.met&&api.stepsDone()[3])c('a-met');
      if(S.cpr.on&&!A.pads&&!A.padsAsked)c('a-pads');
      if(A.pads&&!S.als.zoll&&S.arrest&&['off','idle'].includes(A.state)&&(!A.analyzedOnce||S.t-A.lastAnalyze>=120))c('a-analyze');
      if(A.state==='shocked'&&!S.cpr.on)c('a-cpr');
      if(A.state==='ready'){c('a-clear');c('a-shock');}
      if(S.checked&&S.compT>5){if(!S.air.opa)c('a-opa');if(!S.air.bvm)c('a-bvm');if(!S.air.o2)c('a-o2');}
      if(S.vent.waiting)c('a-breaths');
      if(S.air.vomit)c('a-suction');if(S.o2psi<500)c('a-swap');
      if(S.cpr.on&&S.sinceSwitch>(opts.noSwitch?230:100))c('a-switch');
      if(S.als.arrived&&!S.als.zoll&&S.mission===1)c('a-zoll');
      const rc=S.als.rc;if(rc&&rc.phase==='call')c('a-hands');if(rc&&rc.phase==='check'&&S.als.lucas===0)c('a-lucas1');if(rc&&rc.phase==='resume')c('a-cpr');
      if(S.als.lucas===1&&!rc&&!S.act)c('a-lucas2');
      if(S.air.adv&&(S.rt-(S.vent.lastRt>0?S.vent.lastRt:-99))>=6)c('a-breath');
      if(S.mission===2){c('a-cot');c('a-straps');c('a-load');}
      if(S.mission===3)c('a-reassess');
      api.tick(.25);}
    t+=.25;}
  S=api.S();global.__last={api,S:api.S()};return {mq:S.manT?+(S.Qm/S.manT).toFixed(2):0,tier,choice,score:S.score,rosc:S.rosc,ccf:S.arrestT?Math.round(S.compT/S.arrestT*100):0,firstShock:S.aed.firstShockT&&Math.round(S.aed.firstShockT),shocks:S.aed.shocks,longest:Math.round(S.pause.longest),over10:S.pause.over10,Q:Math.round(S.Q),missions,finished:missions.length===4,incidents:S.incidents,steps:api.stepsDone(),mission:S.mission,o2:Math.round(S.o2psi)};}
module.exports={play};
if(require.main===module){for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.finished?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'ROSC',r.rosc,'CCF',r.ccf+'%','1st shock',r.firstShock+'s','shocks',r.shocks,'longest',r.longest+'s','Q',r.Q,'O2',r.o2,'| missions',r.missions.map(m=>m.t+'s').join('/'),r.finished?'':' STUCK m'+r.mission+' steps '+r.steps.map(x=>x?1:0).join(''));if(tier===0&&ch==='good')console.log('   incidents:',r.incidents);}
  console.log('--- poor CPR (no metronome, never switch):');const r=play(0,'good',{noMet:true,noSwitch:true});console.log('  score',r.score,'ROSC',r.rosc,'CCF',r.ccf,'Q',r.Q,'finished',r.finished,'incidents',r.incidents.length);}
if(require.main===module){const r=play(0,'good',{noMet:true,noSwitch:true});console.log('POOR CPR →',r.finished?'finished':'STUCK','score',r.score,'ROSC',r.rosc,'CCF',r.ccf,'incidents',r.incidents);
 const r2=play(0,'good',{noSwitch:true});console.log('Metronome but late switches →',r2.finished?'finished':'STUCK','score',r2.score,'ROSC',r2.rosc);
 const r3=play(0,'good',{noMet:true});console.log('Switches but no metronome →',r3.finished?'finished':'STUCK','score',r3.score,'ROSC',r3.rosc);}
