const {boot}=require('./pc_mock.js');
function play(tier,choice='good',o={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('mva');
  const c=id=>{const e=$(id);e.onclick&&e.onclick();};const hid=id=>els[id]&&els[id]._cls.has('hidden');let t=0,missions=[],mT=0,decLog=[];
  while(t<1500){let S=api.S();const m=S.m;
    if(!hid('briefov'))c('brief-go');
    if(api.DECO()){const D=api.DECO();let i=D.opts.findIndex(x=>x.r===choice);if(i<0)i=0;decLog.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});c('dec-go');continue;}
    if(!S.running&&!hid('done')){missions.push(Math.round(S.t-mT));if(S.mission>=api.M().length-1)break;c('b-next');mT=api.S().t;continue;}
    if(S.running){
      if(o.slowX&&S.t<(o.slowX))(()=>{})(); 
      c('m-size');
      if(m.extr.stage>=1||o.rush)c('m-enter');
      if(m.inside){c('m-cspine');c('m-protect');
        if(!(o.slowX&&S.t<o.slowX)){c('m-survey');c('m-press');c('m-tq');c('m-mark');}
        c('m-o2');if(!o.noWarm)c('m-warm');
        if(!m.act&&((S.mission===0&&m.vitCount<1)||(S.mission===1&&m.vitExtr<1)))c('m-vitals');}
      if(m.extr.done)c('m-move');c('m-load');
      {const dd=(S.dets||[]).filter(x=>x.id==='shock').pop();if(dd&&!o.noDet){if(!dd.found)c('m-reass');if(!m.recheck&&!m.act)c('m-recheck');c('m-tell');c('m-thigh');if(api.V().pelvis)c('m-binder');c('m-heat');c('m-ivset');}}
      if(S.mission===3){c('m-reass');if(m.tx.tqChecks<1)c('m-tqcheck');}
      api.tick(.25);}
    t+=.25;}
  const S=api.S(),v=api.mvaV();return {ok:missions.length===4,tier,choice,score:S.score,loss:Math.round(v.loss*100),hr:v.hr,sbp:v.sbp,rapid:S.m.extr.rapid,missions,mission:S.mission,steps:api.stepsDone().map(x=>x?1:0).join(''),incidents:S.incidents,decLog,scene:S.m.txStart&&Math.round(S.m.txStart)};}
module.exports={play};
if(require.main===module){
 for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'loss',r.loss+'%','HR',r.hr,'BP',r.sbp,'rapid',r.rapid,'scene',r.scene+'s','| missions',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good incidents:',g.incidents,'\n decisions:',g.decLog.join(', '));
 const s=play(0,'good',{slowX:400});console.log('slow bleeding control (6+ min):',s.ok?'finished':'STUCK','loss',s.loss+'%','score',s.score,'rapid',s.rapid);
 const w=play(0,'good',{noWarm:true});console.log('never warmed:',w.ok?'finished':'STUCK','loss',w.loss+'%','score',w.score);
 const r=play(0,'good',{rush:true});console.log('entered before stabilized:',r.incidents.filter(x=>/stabilized/.test(x)));}
