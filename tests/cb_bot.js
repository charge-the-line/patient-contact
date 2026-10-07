const {boot}=require('./pc_mock.js');
// Childbirth is rhythm-heavy, so this bot plays at HUMAN pace in real time.
function play(tier,choice='good',o={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('cb');
  const hid=id=>els[id]&&els[id]._cls.has('hidden');let rt=0,nextTap=0,lastB=-99,missions=[],react={},dec=[];
  const tap=id=>{if(rt<nextTap)return false;const e=$(id);if(!e.onclick||hid(id)||e._cls.has('on'))return false;e.onclick();nextTap=rt+1.1;return true;};
  const after=(k,c,d)=>{if(!c){delete react[k];return false;}if(react[k]===undefined)react[k]=rt;return rt-react[k]>=d;};
  while(rt<1600){const S=api.S(),x=S.c;if(o.stopAt&&S.active&&o.stopAt(S,api))return {stopped:true,api,els,S};
    if(!hid('briefov')){if(after('b',true,2))$('brief-go').onclick();rt+=.25;continue;}
    if(api.DECO()){if(after('d',true,3)){const D=api.DECO();let i=D.opts.findIndex(v=>v.r===choice);if(i<0)i=0;dec.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});$('dec-go').onclick();}rt+=.25;continue;}
    if(!S.running&&!hid('done')){if(after('n',true,2)){missions.push(Math.round(rt));if(S.mission>=api.M().length-1)break;$('b-next').onclick();}rt+=.25;continue;}
    if(o.ff&&S.running){const w=api.ffWhy();if(!w&&rt>=nextTap){(o.ffLog=o.ffLog||[]).push(api.ffGo());nextTap=rt+1.1;rt+=.25;continue;}if(w==='due'&&S.mission===4)tap('c-reass');}
    if(S.running){
      if(S.mission===0)for(const id of ['c-hist','c-look','c-kit','c-warm','c-pos'])if(tap(id))break;
      if(S.mission===1){if($('c-push')._cls.has('hot'))tap('c-push');if(x.crown&&!x.head&&!o.noHead)tap('c-head');if($('c-shoulders')._cls.has('hot'))tap('c-shoulders');if(x.born)tap('c-tob');}
      if(S.mission===2&&!(o.slow&&rt-(x.birthRt||rt)<o.slow)){if(!x.act)for(const id of ['b-dry','b-wrap','b-pos','b-suct'])if(tap(id))break;if(x.vigorous&&x.wrapped)tap('b-sts');if(x.posA&&!x.gurgly&&x.hrChecks<1)tap('b-hr');if(x.hrChecks>=1)tap('b-bvm');
        if(x.bvm&&!x.vigorous&&rt-lastB>=(o.sloppy?.8+Math.random()*2.8:1.2)){$('b-breath').onclick();lastB=rt;}if(x.good>=14&&x.hrChecks<2&&!x.act)tap('b-hr');if(x.vigorous)tap('b-sts');if(x.vigorous&&!x.cut&&rt-(x.birthRt||rt)>35)tap('b-cut');}
      if(S.mission===3){for(const id of (x.placenta?['c-massage','c-nurse']:['c-nurse']))if(tap(id))break;if(x.mvit<1&&!x.act)tap('c-mvitals');}
      if(S.mission===4&&rt%40<1)tap('c-reass');
      api.tick(.25);}
    rt+=.25;}
  const S=api.S(),x=S.c;return {ok:missions.length===5,tier,choice,score:S.score,first:x.firstEffRt!==null?Math.round(x.firstEffRt-x.birthRt):null,vig:x.vigRt?Math.round(x.vigRt-x.birthRt):null,loss:Math.round(x.loss),missions:missions.map(m=>(m/60).toFixed(1)),mission:S.mission,steps:api.stepsDone().map(v=>v?1:0).join(''),incidents:S.incidents,dec,ff:S.ff,ffLog:o.ffLog};}
module.exports={play};
if(require.main===module){for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'1st breath',r.first+'s','crying at',r.vig+'s','mom loss',r.loss,'| real min',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good incidents:',g.incidents);
 const s=play(0,'good',{slow:75});console.log('slow to bag (75s):',s.ok?'finished':'STUCK','1st breath',s.first,'score',s.score,s.incidents);
 const h=play(0,'good',{noHead:true});console.log('no head support:',h.incidents.filter(x=>/head/.test(x)));}
