const {boot}=require('./pc_mock.js');
function play(tier,choice='good',o={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('st');
  const c=id=>{const e=$(id);e.onclick&&e.onclick();};const hid=id=>els[id]&&els[id]._cls.has('hidden');let t=0,missions=[],mT=0,dec=[];
  while(t<1500){let S=api.S();const x=S.s;
    if(!hid('briefov'))c('brief-go');
    if(api.DECO()){const D=api.DECO();let i=D.opts.findIndex(v=>v.r===choice);if(i<0)i=0;dec.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});c('dec-go');continue;}
    if(!S.running&&!hid('done')){missions.push(Math.round(S.t-mT));if(S.mission>=api.M().length-1)break;c('b-next');mT=api.S().t;continue;}
    if(S.running){
      if(!x.abc)c('s-abc');
      if(x.abc&&!x.act){for(const k of ['B','E','F','A','S'])if(!x.bf[k]){c('s-'+k);break;}}
      if(x.abc&&!x.act&&Object.values(x.bf).every(Boolean)){c('s-time');c('s-glu');c('s-meds');if(x.vitCount<1)c('s-vitals');}
      if(x.vomit)c('s-suct');
      if(x.alsArr){c('s-fam');c('s-cot');}
      if(S.mission===2)c('s-load');
      if(S.mission===3)c('s-reass');
      api.tick(.25);}
    t+=.25;}
  global.__last={api};const S=api.S(),x=S.s;return {ok:missions.length===4,tier,choice,score:S.score,lkw:x.lkw,scene:x.txStart&&Math.round(x.txStart),bridge:x.tx.lost,missions,mission:S.mission,steps:api.stepsDone().map(v=>v?1:0).join(''),incidents:S.incidents,dec};}
module.exports={play};
if(require.main===module){
 for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'LKW',r.lkw,'scene',r.scene+'s','bridge+'+r.bridge,'| missions',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good incidents:',g.incidents,'\n decisions:',g.dec.join(', '));}
