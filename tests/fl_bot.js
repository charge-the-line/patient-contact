const {boot}=require('./pc_mock.js');
function play(tier,choice='good'){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('fl');
  const c=id=>{const e=$(id);e.onclick&&e.onclick();};const hid=id=>els[id]&&els[id]._cls.has('hidden');let t=0,missions=[],dec=[];
  while(t<1500){let S=api.S();const x=S.f;
    if(!hid('briefov'))c('brief-go');
    if(api.DECO()){const D=api.DECO();let i=D.opts.findIndex(v=>v.r===choice);if(i<0)i=0;dec.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});c('dec-go');continue;}
    if(!S.running&&!hid('done')){missions.push(Math.round(S.t));if(S.mission>=api.M().length-1)break;c('b-next');continue;}
    if(S.running){if(!x.act){for(const id of ['f-primary','f-why','f-head','f-meds','f-vitals','f-glu','f-neuro'])if(!$(id)._cls.has('on')){c(id);break;}}
      c('f-warm');c('f-pad');if(S.mission===2)c('f-load');if(S.mission===3)c('f-reass');api.tick(.25);}
    t+=.25;}
  const S=api.S();return {ok:missions.length===4,score:S.score,missions,mission:S.mission,steps:api.stepsDone().map(v=>v?1:0).join(''),incidents:S.incidents,dec,diverted:S.f.tx.diverted};}
module.exports={play};
if(require.main===module){for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'diverted',r.diverted,'| sim',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good:',g.incidents,'\n',g.dec.join(', '));}
