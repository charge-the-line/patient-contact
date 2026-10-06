const {boot}=require('./pc_mock.js');
function play(tier,choice='good',o={}){const {api,els}=boot();const {$}=api;api.setTier(tier);api.loadCall('dm');
  const hid=id=>els[id]&&els[id]._cls.has('hidden');let rt=0,nextTap=0,missions=[],react={},dec=[];
  const tap=id=>{if(rt<nextTap)return false;const e=$(id);if(!e.onclick||hid(id)||e._cls.has('on'))return false;e.onclick();nextTap=rt+1.1;return true;};
  const after=(k,c,d)=>{if(!c){delete react[k];return false;}if(react[k]===undefined)react[k]=rt;return rt-react[k]>=d;};
  while(rt<1600){const S=api.S(),x=S.d;
    if(!hid('briefov')){if(after('b',true,2))$('brief-go').onclick();rt+=.25;continue;}
    if(api.DECO()){if(after('d',true,3)){const D=api.DECO();let i=D.opts.findIndex(v=>v.r===choice);if(i<0)i=0;dec.push(api.DEC[D.key].tag+':'+D.opts[i].r);$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});$('dec-go').onclick();}rt+=.25;continue;}
    if(!S.running&&!hid('done')){if(after('n',true,2)){missions.push(Math.round(rt));if(S.mission>=api.M().length-1)break;$('b-next').onclick();}rt+=.25;continue;}
    if(S.running&&!(o.slow&&rt<o.slow)){if(!x.act){
        if(!x.keys)tap('d-keys');else if(!x.abc)tap('d-abc');else if(!x.id)tap('d-id');else if(!x.glu)tap('d-glu');else if(x.swT===null)tap('d-sw');else if(!x.vit)tap('d-vit');
        else if(x.doseT.length&&!x.recheck&&S.t-x.doseT[0]>=200&&S.t-(x.gluT||0)>100)tap('d-glu');
        else if(x.d10&&x.glu<2)tap('d-glu');
        const dd=(S.dets||[]).find(q=>q.id==='falling'&&!q.closed);if(dd&&!o.noDet&&!x.act){if(!dd.found)tap('d-glu');else if(x.alsArr&&!dd.told)tap('d-tell');else if(x.alsArr&&!x.ivSet)tap('d-ivset');else if(!x.alsArr&&x.sw&&api.dmV().gcs>=13)tap('d-tube');else if(!x.pos)tap('d-pos');}}}
    if(S.running)api.tick(.25);
    rt+=.25;}
  const S=api.S(),x=S.d;return {ok:missions.length===3,tier,choice,score:S.score,sw:x.sw,tubes:x.tubes,low:Math.round(x.lowGl),seized:x.seized,asp:x.aspiration,d10:x.d10,missions:missions.map(m=>(m/60).toFixed(1)),mission:S.mission,steps:api.stepsDone().map(v=>v?1:0).join(''),incidents:S.incidents,dec};}
module.exports={play};
if(require.main===module){for(const tier of [0,1,2])for(const ch of ['good','partial','bad']){const r=play(tier,ch);console.log(r.ok?'PASS':'FAIL',['Guided','Recall','Chaos'][tier].padEnd(7),ch.padEnd(8),'score',String(r.score).padStart(3),'swallow',r.sw,'tubes',r.tubes,'low',r.low,'seized',r.seized,'aspiration',r.asp,'IV D10',r.d10,'| real min',r.missions.join('/'),r.ok?'':'STUCK m'+r.mission+' '+r.steps);}
 const g=play(0,'good');console.log('good:',g.incidents,'\n ',g.dec.join(', '));
 const s=play(0,'good',{slow:150});console.log('slow (2.5 min before acting):',s.ok?'finished':'STUCK','swallow',s.sw,'low',s.low,'seized',s.seized,'D10',s.d10,'score',s.score,'\n ',s.dec.join(', '));
 const c=play(2,'good',{slow:60});console.log('Chaos + slow 1 min:',c.ok?'finished':'STUCK','swallow',c.sw,'low',c.low,'seized',c.seized,'D10',c.d10,'score',c.score);}
