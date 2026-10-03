const {boot}=require('./pc_mock.js');
function play(tier,choice='good',o={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('ep');
  const c=id=>{const e=$(id);e.onclick&&e.onclick();};const hid=id=>els[id]&&els[id]._cls.has('hidden');let t=0,missions=[],mT=0,dec=[];
  while(t<1500){let S=api.S();const e=S.e;
    if(!hid('briefov'))c('brief-go');
    if(api.DECO()){const D=api.DECO();let i=D.opts.findIndex(v=>v.r===choice);if(i<0)i=0;dec.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});c('dec-go');continue;}
    if(!S.running&&!hid('done')){missions.push(Math.round(S.t-mT));if(S.mission>=api.M().length-1)break;c('b-next');mT=api.S().t;continue;}
    if(S.running){
      if(!e.assessed)c('e-assess');
      if(e.assessed){c('e-pos');c('e-sting');c('e-o2');c('e-ox');}
      if(S.mission>=1&&!(o.slow&&S.t<o.slow)){
        if(!e.ampOK){if(e.ampChecked&&e.ampBad)c('e-another');else c('e-check');}
        c('e-syr');
        const target=o.vol!==undefined&&!e.redrew?o.vol:.3;
        if(e.syr&&!e.drawn){if(e.vol<target-.001)c(e.vol+.1<=target+.001?'e-p10':'e-p05');else if(e.vol>target+.001)c('e-m05');else c('e-drawn');}
        if(e.drawn&&!o.noX){c('e-xcheck');if(!e.drawn)e.redrew=true;}
        if(e.drawn&&!o.noSwap)c('e-swap');
        if(e.drawn&&(e.xcheck||o.noX))c('e-inject');
        c('e-time');}
      if(e.injected&&S.mission>=2)c('e-reass');
      api.tick(.25);}
    t+=.25;}
  const S=api.S(),e=S.e;return {ok:missions.length===4,tier,choice,score:S.score,dose:e.doses[0]&&e.doses[0].mg,site:e.doses[0]&&e.doses[0].site,epiAt:e.doses[0]&&Math.round(e.doses[0].t),lowSbp:e.lowSbp,lowSpo2:e.lowSpo2,od:e.overdose,missions,mission:S.mission,steps:api.stepsDone().map(v=>v?1:0).join(''),incidents:S.incidents,dec};}
module.exports={play};
if(require.main===module){
 for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'dose',r.dose,'site',r.site,'epi@',r.epiAt+'s','lowBP',r.lowSbp,'lowSpO2',r.lowSpo2,'| missions',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good incidents:',g.incidents,'\n decisions:',g.dec.join(', '));
 const w=play(0,'good',{vol:1.0});console.log('drew 1.0 mL (cross-check catches):',w.ok?'finished':'STUCK','dose',w.dose,'score',w.score,w.incidents);
 const x=play(0,'good',{vol:1.0,noX:true});console.log('drew 1.0 mL, NO cross-check:',x.ok?'finished':'STUCK','dose',x.dose,'overdose',x.od,'score',x.score);
 const s=play(0,'good',{slow:500});console.log('slow to draw up:',s.ok?'finished':'STUCK','epi@',s.epiAt,'lowBP',s.lowSbp,'score',s.score,s.incidents);}
