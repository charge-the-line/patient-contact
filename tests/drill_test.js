global.window={};let NOW=0;
const {boot}=require('./pc_mock.js');const {api,els}=boot();global.performance={now:()=>NOW};
const {$}=api;const click=(ds)=>$('dr-body').onclick({target:{closest:()=>({dataset:ds})}});const foot=(ds)=>$('dr-foot').onclick({target:{closest:()=>({dataset:ds})}});
const out=[];
// 1) generator sanity: 300 of each — right answer present exactly once, no duplicate options, numbers finite
let bad=0;for(const g of [api.genMed,api.genO2,api.genApgar])for(let i=0;i<300;i++){const q=g();const all=[q.a,...q.d];if(new Set(all).size!==all.length||all.length<3||all.some(x=>/NaN|Infinity|undefined/.test(x)))bad++;}
out.push(['Question generators (900 random questions)',bad?`${bad} malformed`:'all well-formed']);
// 2) every quiz drill, all right then all wrong
for(const id of ['rhythm','med','o2','apgar','lkw']){for(const mode of ['right','wrong']){api.drillMenu();click({a:'go',d:id});let guard=0;
  while(api.DR()&&api.DR().qs&&api.DR().i<api.DR().qs.length&&guard++<20){const q=api.DR().qs[api.DR().i];const i=mode==='right'?q.opts.indexOf(q.a):q.opts.findIndex(o=>o!==q.a);click({a:'ans',i:String(i)});foot({a:'next'});}
  out.push([`${id} — all ${mode}`,els['dr-body'].innerHTML.match(/class="big">(\d+)/)[1]]);}}
// 3) lead placement: perfect, then with 3 wrong taps
api.drillMenu();click({a:'go',d:'leads'});NOW=0;while(api.DR().i<api.DR().seq.length){NOW+=2000;$('dr-body').onclick({target:{closest:()=>({dataset:{p:api.DR().seq[api.DR().i].p}})}});}
out.push(['Lead placement — perfect, 20 s',els['dr-body'].innerHTML.match(/class="big">(\d+)/)[1]]);
api.drillMenu();click({a:'go',d:'leads'});NOW=0;let w=0;while(api.DR().i<api.DR().seq.length){NOW+=2000;if(w<3){w++;$('dr-body').onclick({target:{closest:()=>({dataset:{p:'L2'}})}});}$('dr-body').onclick({target:{closest:()=>({dataset:{p:api.DR().seq[api.DR().i].p}})}});}
out.push(['Lead placement — 3 errors',els['dr-body'].innerHTML.match(/class="big">(\d+)/)[1]+'  ('+els['dr-body'].innerHTML.match(/<p[^>]*>([^<]*)/)[1]+')']);
// 4) CPR tempo at three rates (taps simulated with exact timing; the drill's own timer is ticked manually)
for(const [label,ms] of [['110/min (perfect)',545],['135/min (too fast)',444],['90/min (too slow)',667],['irregular 95–125',null]]){api.drillMenu();click({a:'go',d:'cpr'});NOW=1000;
  for(let k=0;NOW<1000+21000;k++){click({a:'tap'});NOW+=ms||Math.round(60000/(95+Math.random()*30));}
  if(api.DR()&&api.DR().id==='cpr')api.cprTick();const m=els['dr-body'].innerHTML.match(/class="big">(\d+)/);out.push([`CPR tempo — ${label}`,m?m[1]+'  ('+els['dr-body'].innerHTML.match(/<p[^>]*>([^<]*)/)[1]+')':'did not finish']);}
// 5) records saved
const p=api.load();out.push(['Personal bests saved',Object.keys(p.drills||{}).map(k=>k+' '+p.drills[k].best).join(', ')]);out.push(['Drill runs in training record',(p.drillRuns||[]).length]);
out.forEach(([a,b])=>console.log(a.padEnd(42),b));
