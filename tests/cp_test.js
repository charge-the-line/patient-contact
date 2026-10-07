// Chest pain (0.29.0): heart attack until proven otherwise, including the woman with no chest pain. Bay County MFR scope (Max,
// October 7, 2026; pending MCA review): assist with aspirin, 324 mg as four 81 mg chewables, chewed, after four checks; any aspirin
// already today or a blood thinner goes to the medic first; an allergy means none; the MFR never assists with nitroglycerin;
// oxygen only below the protocol's SpO₂ threshold; nobody walks; the medic finds the STEMI; one patient arrests in front of you.
const fs=require('fs'),path=require('path');const {boot}=require('./pc_mock.js');const human=require('./human_bot.js');
const quiet=fn=>{const l=console.log;console.log=()=>{};try{return fn();}finally{console.log=l;}};
const F=f=>{global.window.FORCE_V=f?{cp:f}:null;};
const answer=(api,pick='good')=>{const D=api.DECO();if(!D)return null;let i=D.opts.findIndex(o=>o.r===pick);if(i<0)i=0;api.$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});api.$('dec-go').onclick();return D.key;};
const logText=api=>api.S().log.map(e=>e.who+': '+e.msg).join(' | ');
const html=fs.readFileSync(path.join(__dirname,'..','index.html'),'utf8');
const block=html.slice(html.indexOf('/* ================= Chest pain'),html.indexOf('const OPT_TEXT={'));
const VS=[['classic',{key:'classic'}],['no chest pain',{key:'atypical'}],['aspirin from his wife',{today:'pain'}],['his daily aspirin',{today:'daily'}],['a blood thinner',{key:'thin'}],['an erection drug',{key:'ed'}],['VF arrest',{key:'vf'}],['an aspirin allergy',{key:'allergy'}]];
module.exports=function(report){
  // every patient, played well on every tier, scores 100
  {const bad=[];for(const [lab,f] of VS)for(const t of [0,1,2]){F(f);const r=quiet(()=>human.play('cp',t));F(null);if(!(r.finished&&r.score===100))bad.push(`${lab} ${t}: ${r.score}`);}
    report('chest','every patient on every tier, played well at human pace, scores 100',bad.length===0,bad.join('; ')||`${VS.length*3} runs`);}
  // the four checks decide the aspirin
  const asa=[['classic',{key:'classic'},/324 mg chewed at \d\d:\d\d/,true],['an aspirin allergy',{key:'allergy'},/withheld: allergy/,false],['a blood thinner',{key:'thin'},/held for the medic \(blood thinner\)/,false],
    ['four baby aspirin from his wife',{today:'pain'},/held for the medic \(aspirin already today\)/,false],['his daily baby aspirin',{today:'daily'},/held for the medic \(aspirin already today\)/,false]];
  for(const [lab,f,rx,given] of asa){F(f);const g=quiet(()=>human.play('cp',0));F(null);const body=global.__lastBoot.els['done-b'].innerHTML;
    report('chest',`aspirin with ${lab}: the right call ${given?'is 324 mg, four 81 mg chewed, with the time':'holds it'}, the debrief says so, 100`,g.finished&&g.score===100&&g.S.h.asaGiven===given&&rx.test(body),`score ${g.score}, given ${g.S.h.asaGiven}`);
    F(f);const b=quiet(()=>human.play('cp',0,{pick:{cpAsa:'bad'}}));F(null);const bb=global.__lastBoot.els['done-b'].innerHTML;
    report('chest',`aspirin with ${lab}: the wrong call costs 10 and the debrief names it`,b.finished&&b.score===90&&b.S.h.asaWrong&&/given despite|swallowed whole/.test(bb),`score ${b.score}`);}
  // the medic's answer to a held aspirin: per protocol, never the MFR's call
  {F({key:'thin'});const g=quiet(()=>human.play('cp',0));F(null);const t=g.S.log.map(e=>e.msg).join(' ');
    report('chest','a blood thinner: the medic decides on the aspirin with medical control, per Medstar/MMR protocol',/Eliquis — I'll decide on aspirin with medical control, per Medstar\/MMR protocol/.test(t));}
  // no aspirin before all four checks and the decision; the chewables are chewed
  {F({key:'classic'});const {api}=boot();api.loadCall('cp');F(null);const S=api.S();api.$('brief-go').onclick();S.h.abc=true;
    api.$('k-chew').onclick();const early=!S.h.asaGiven&&!S.h.act&&/hold it/.test(logText(api));
    const hidden=api.$('k-chew')._cls.has('hidden')||(api.tick(.25),api.$('k-chew')._cls.has('hidden'));
    S.h.asaDec='good';api.$('k-chew').onclick();for(let i=0;i<40;i++)api.tick(.25);
    report('chest','the chew button is hidden and refused until the four checks and the decision clear it; then 324 mg chewed, the time noted',early&&hidden&&S.h.asaGiven&&/324 milligrams, chewed, at \d\d:\d\d/.test(logText(api)));}
  // nitroglycerin: never assisted; ask about erection drugs; tell the medic
  {const btn=[...html.matchAll(/<button[^>]*id="k-[^"]+"[^>]*>([^<]*)</g)].map(m=>m[1]);const helps=btn.filter(t=>/nitro/i.test(t));
    const d=quiet(()=>{F({key:'classic'});const {api}=boot();api.loadCall('cp');F(null);return api.DEC.cpNitro;});
    report('chest','no button helps with nitroglycerin; the right answer is the cautions and the medic; the guide card is flagged for the MCA review',helps.length===0&&/erection drugs and tell the medic/.test(d.opts.find(o=>o.r==='good').t)&&/never assists with nitroglycerin/.test(d.why)&&/Pending MCA review/.test(global.__lastBoot.api.GUIDE.nitro.mca),helps.join(', '));
    F({key:'classic'});const b=quiet(()=>human.play('cp',0,{pick:{cpNitro:'bad'}}));F(null);const bb=global.__lastBoot.els['done-b'].innerHTML;
    report('chest','helping him take his nitro costs 10 and the debrief names it',b.finished&&b.score===90&&b.S.h.nitroTaken&&/taken with your help/.test(bb),`score ${b.score}`);
    F({key:'ed'});const g=quiet(()=>human.play('cp',0));F(null);
    report('chest','an erection drug: he is asked, the medic hears "no nitro with the Viagra", 100',g.finished&&g.score===100&&g.S.h.qed&&/no nitro with the Viagra/.test(g.S.log.map(e=>e.msg).join(' ')),`score ${g.score}`);}
  // oxygen: one setting, only below it
  {F({key:'classic'});const {api}=boot();api.loadCall('cp');F(null);const S=api.S();api.$('brief-go').onclick();S.h.abc=true;S.h.ox=true;
    const one=api.COUNTY.o2Min===94&&(block.match(/o2Min/g)||[]).length>=4&&!/spo2\s*[<>]=?\s*9[04]\b/i.test(block);
    api.$('k-o2').onclick();const refused=!S.h.o2&&/no oxygen needed per protocol/.test(logText(api));
    S.h.spo2=91;api.$('k-o2').onclick();const given=S.h.o2&&/per protocol/.test(S.log.slice(-1)[0].msg);
    api.COUNTY.o2Min=90;S.h.o2=false;S.h.spo2=92;api.$('k-o2').onclick();const moved=!S.h.o2;api.tick(.25);const label=/under 90/.test(api.$('k-o2').textContent);api.COUNTY.o2Min=94;
    report('chest','oxygen: one setting (COUNTY.o2Min, 94 until the MCA review), refused at or above it, given below it; change the setting and the threshold moves',one&&refused&&given&&moved&&label);
    report('chest','the oxygen guide card says per protocol, names 90 or 94, and is flagged for the MCA review',/per protocol/.test(api.GUIDE.o2acs.mca)&&/90 or 94/.test(api.GUIDE.o2acs.mca)&&/MCA review/.test(api.GUIDE.o2acs.mca));}
  // nobody walks
  {F({key:'classic'});const b=quiet(()=>human.play('cp',0,{pick:{cpWalk:'bad'}}));F(null);const bb=global.__lastBoot.els['done-b'].innerHTML;
    report('chest','letting him walk to the ambulance costs 10 and the debrief says he walked',b.finished&&b.score===90&&/Walked to the ambulance<\/span><b>yes/.test(bb),`score ${b.score}`);}
  // the medic finds the STEMI on the 12-lead the MFR helped place; the woman with no chest pain too
  for(const [lab,f,rx] of [['classic',{key:'classic'},/Inferior STEMI\. Dispatch, Medic 1: cath lab alert/],['no chest pain',{key:'atypical'},/no chest pain, and it's a heart attack/]]){F(f);const g=quiet(()=>human.play('cp',0));F(null);
    report('chest',`${lab}: the 12-lead goes on after the handoff and the medic calls the STEMI and the cath lab alert`,g.S.h.stemi&&rx.test(g.S.log.map(e=>e.msg).join(' ')),`stemi ${g.S.h.stemi}`);}
  {F({key:'atypical'});const b=quiet(()=>human.play('cp',0,{pick:{cpWhat:'bad'}}));F(null);
    report('chest','no chest pain: calling it the flu costs 10; her pain reads "none"; the pain never comes back for her',b.finished&&b.score===90&&b.S.h.painT===null&&global.__lastBoot.els['kv-pain'].textContent==='none',`score ${b.score}`);}
  // VF in front of the crew, measured on the real clock
  {F({key:'vf'});const g=quiet(()=>human.play('cp',1));F(null);const x=g.S.h;const body=global.__lastBoot.els['done-b'].innerHTML;
    report('chest','VF arrest played well: compressions within 15 real seconds, a shock within 90, no pause over 10, pulse back, the debrief shows the times',g.score===100&&x.rosc&&x.cprStartRt-x.arrRt<=15&&x.firstShockRt-x.arrRt<=90&&x.longest<=10&&/Collapse to first shock/.test(body),`compressions ${(x.cprStartRt-x.arrRt).toFixed(1)} s, shock ${(x.firstShockRt-x.arrRt).toFixed(1)} s, pause ${x.longest.toFixed(1)} s`);
    F({key:'vf'});const s=quiet(()=>human.play('cp',1,{arrReact:20}));F(null);
    report('chest','VF arrest: freezing for 20 real seconds before checking him costs the slow start',s.finished&&s.incidents.some(i=>/Slow to start compressions/.test(i))&&s.score<=90,`score ${s.score}`);
    F({key:'vf'});const {api}=boot();api.loadCall('cp');F(null);const S=api.S();api.$('brief-go').onclick();S.h.abc=true;S.h.arr=true;S.h.arrRt=S.rt;S.h.arrT=S.t;
    api.$('k-cpr').onclick();const noCheck=!S.h.cpr;api.$('k-chk').onclick();for(let i=0;i<8;i++)api.tick(.25);api.$('k-pads').onclick();for(let i=0;i<12;i++)api.tick(.25);
    api.$('k-cpr').onclick();api.$('k-analyze').onclick();for(let i=0;i<24;i++)api.tick(.25);const sc=S.score;api.$('k-shock').onclick();
    report('chest','VF arrest: no CPR before the check; shocking without calling clear costs 15',noCheck&&S.h.shocks===1&&sc-S.score>=15);}
  // the arrest inject on the woman with no chest pain speaks of her, not him
  {F({key:'atypical'});const {api}=boot();api.loadCall('cp');F(null);const S=api.S();api.$('brief-go').onclick();S.h.abc=true;api.INJECTS.find(q=>q.id==='vf').run();api.$('k-chk').onclick();for(let i=0;i<8;i++)api.tick(.25);const t=logText(api);
    report('chest','the arrest inject on her: "She just slumped over", "She\'s in arrest", never "he"',/She just slumped over/.test(t)&&/She's in arrest!/.test(t)&&!/He just slumped|He's in arrest/.test(t)&&(S.dets||[]).some(x=>x.id==='vf'&&x.found));}
  // the dynamic cards: the right answer is neither the longest nor the shortest, for every patient
  {let n=0;const bad=[];for(const [lab,f] of VS){F(f);const {api}=boot();api.loadCall('cp');F(null);const S=api.S();for(const g of [false,true]){S.h.asaGiven=g;
      for(const k of ['cpWhat','cpAsa','cpNitro','cpWalk','cpHand','fam_cp']){const d=api.DEC[k];const o=d.opts||d.optsFn();const L=o.map(q=>q.t.length),i=o.findIndex(q=>q.r==='good');n++;if(L[i]===Math.max(...L)||L[i]===Math.min(...L))bad.push(lab+' '+k);}}}
    report('chest','answer length: on every chest pain card, for every patient, the right answer is neither the longest nor the shortest',bad.length===0,bad.slice(0,4).join(', ')||`${n} cards`);}
  // scope words
  {const words=/administer/i.test(block)===false&&/assist/.test(block)&&(block.match(/per Medstar\/MMR protocol/g)||[]).length>=4&&/324 mg/.test(block)&&/four 81 mg chewables, chewed/.test(block);
    const {api}=boot();const mca=['asa','nitro','o2acs'].every(k=>/MCA review/.test(api.GUIDE[k].mca||''));
    report('chest','scope words: the MFR assists with aspirin (324 mg, four 81 mg, chewed), never "administer"; medic treatments per Medstar/MMR protocol; the aspirin, nitro and oxygen cards are flagged for the MCA review',words&&mca);}
  // fast-forward waits for Medic 1, never during the arrest
  {F({key:'vf'});let during=0,offered=0;quiet(()=>human.play('cp',0,{ff:true,stopAt:(S,api)=>{if(!api.ffWhy()){offered++;if(S.h.arr&&!S.h.rosc)during++;}return false;}}));F(null);
    report('chest','fast-forward: offered while waiting for Medic 1, never during the arrest',offered>0&&during===0,`offered ${offered}, during the arrest ${during}`);}
};
