const {boot}=require('./pc_mock.js');
function play(tier,choice='good',o={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('od');
  const c=id=>{const e=$(id);e.onclick&&e.onclick();};const hid=id=>els[id]&&els[id]._cls.has('hidden');let t=0,missions=[],mT=0,dec=[];
  while(t<1500){let S=api.S();const x=S.o;
    if(!hid('briefov'))c('brief-go');
    if(api.DECO()){const D=api.DECO();let i=D.opts.findIndex(v=>v.r===choice);if(i<0)i=0;dec.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});c('dec-go');continue;}
    if(!S.running&&!hid('done')){missions.push(Math.round(S.t-mT));if(S.mission>=api.M().length-1)break;c('b-next');mT=api.S().t;continue;}
    if(S.running){
      if(!x.checked)c('o-check');
      if(x.checked&&!(o.slow&&S.t<o.slow)){c('o-open');if(x.gurgle)c('o-suct');c('o-opa');c('o-bvm');c('o-o2');}
      if(x.checked&&!o.noNal&&x.doses===0&&!(o.nalLate&&S.t<o.nalLate))c('o-nal');
      if(x.checked){c('o-ox');}
      if(x.bvm&&x.rr<10&&S.rt-x.lastBreathRt>=6&&!(o.slow&&S.t<o.slow))c('o-breath');
      if(!x.pulse&&!x.cpr)c('o-cpr');
      if(x.checked&&x.pulseChecks<1&&!x.act&&x.good>=3)c('o-pulse');
      if(x.nudged&&x.rr<10&&S.t-x.doseT[x.doseT.length-1]>240)c('o-nal');
      if(S.mission===1){c('o-recov');if(x.vitCount<1&&!x.act)c('o-vitals');if(x.gurgle)c('o-suct');}
      if(S.mission===2)c('o-load');
      if(S.mission===3){c('o-reass');if(x.bvm&&x.rr<10&&S.rt-x.lastBreathRt>=6)c('o-breath');}
      api.tick(.25);}
    t+=.25;}
  const S=api.S(),x=S.o;return {ok:missions.length===4,tier,choice,score:S.score,doses:x.doses,low:Math.round(x.lowSpo2),below90:Math.round(x.below90),wd:x.withdrawal,arrest:x.arrested,rr:Math.round(x.rr),missions,mission:S.mission,steps:api.stepsDone().map(v=>v?1:0).join(''),incidents:S.incidents,dec};}
module.exports={play};
if(require.main===module){
 for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'doses',r.doses,'lowSpO2',r.low,'<90%',r.below90+'s','withdrawal',r.wd,'arrest',r.arrest,'| missions',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good: incidents',g.incidents,'\n decisions',g.dec.join(', '));
 const s=play(0,'good',{slow:240});console.log('slow airway (4 min):',s.ok?'finished':'STUCK','arrest',s.arrest,'lowSpO2',s.low,'score',s.score);
 const n=play(0,'good',{nalLate:200});console.log('naloxone late, bagging well:',s.ok?'finished':'STUCK','lowSpO2',n.low,'arrest',n.arrest,'score',n.score);}
