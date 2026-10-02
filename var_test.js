// Plays every forced variant of every call at human pace, Guided + Recall, choosing good answers.
global.window=global.window||{};const {play}=require('./human_bot.js');const {play:cbp}=require('./cb_bot.js');const {play:dmp}=require('./dm_bot.js');
const cases={arrest:[{shock:true},{shock:false}],od:[{L:.65},{L:1},{L:1.3}],ep:[{rebound:true},{rebound:false},{sev:.55}],
 st:[{side:'R',wake:false,lvo:false},{side:'L',wake:false,lvo:false},{side:'R',wake:true,lvo:false},{side:'L',wake:true,lvo:true},{side:'R',wake:false,lvo:true}],
 fl:[{}],mva:[{warm:true},{warm:false,loss:600}],dm:[{pill:false,low:false},{pill:true,low:false},{pill:false,low:true},{pill:true,low:true}],cb:[{nuchal:true,vig:false},{nuchal:false,vig:false},{nuchal:true,vig:true},{nuchal:false,vig:true}]};
let pass=0,fail=0;
for(const call in cases)for(const F of cases[call])for(const tier of [0,1]){global.window.FORCE_V={[call]:F};
  const r=call==='cb'?cbp(tier,'good'):call==='dm'?dmp(tier,'good'):play(call,tier);const ok=call==='cb'||call==='dm'?r.ok:r.finished;
  ok?pass++:fail++;if(!ok||r.score<100)console.log((ok?'ok  ':'FAIL'),call.padEnd(7),JSON.stringify(F).padEnd(40),['Guided','Recall'][tier],'score',r.score,ok?'':'stuck: '+(r.stuckAt?JSON.stringify(r.stuckAt):r.mission+' '+r.steps),(r.incidents||[]).filter(x=>x!=='Hint used').slice(0,3).join(' | '));}
global.window.FORCE_V=null;console.log(`\nForced variants at human pace: ${pass} passed, ${fail} failed`);
