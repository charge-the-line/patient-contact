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
  // aspirin before the checks, or after the checks said hold, goes in and is taught; the right way costs nothing
  {F({key:'classic'});const {api}=boot();api.loadCall('cp');F(null);const S=api.S();api.$('brief-go').onclick();S.h.abc=true;const s0=S.score;
    api.$('k-chew').onclick();for(let i=0;i<40;i++)api.tick(.25);const early=S.h.asaGiven&&S.h.asaEarly&&s0-S.score===5&&/before the four checks/.test(S.incidents.join(' '));
    F({key:'thin'});const b=boot().api;b.loadCall('cp');F(null);const T=b.S();b.$('brief-go').onclick();T.h.abc=true;Object.assign(T.h,{qall:true,qbleed:true,qthin:true,qtoday:true,asaDec:'good'});const t0=T.score;
    b.$('k-chew').onclick();for(let i=0;i<40;i++)b.tick(.25);const held=T.h.asaGiven&&T.h.asaWrong&&t0-T.score===10&&/blood thinner/.test(T.incidents.join(' '));
    F({key:'classic'});const c2=boot().api;c2.loadCall('cp');F(null);const U=c2.S();c2.$('brief-go').onclick();U.h.abc=true;Object.assign(U.h,{qall:true,qbleed:true,qthin:true,qtoday:true,asaDec:'good'});const u0=U.score;
    c2.$('k-chew').onclick();for(let i=0;i<40;i++)c2.tick(.25);
    report('chest','aspirin before the four checks goes in and costs 5; on a blood thinner after the checks said hold it costs 10; checked and clear, 324 mg chewed with the time, free',early&&held&&U.h.asaGiven&&U.score===u0&&/324 milligrams, chewed, at \d\d:\d\d/.test(c2.S().log.map(e=>e.msg).join(' ')),`early −${s0-S.score}, held −${t0-T.score}`);}
  // nitroglycerin: never assisted; ask about erection drugs; tell the medic
  {const btn=[...html.matchAll(/<button[^>]*id="k-[^"]+"[^>]*>([^<]*)</g)].map(m=>m[1]);const helps=btn.filter(t=>/nitro/i.test(t));
    const d=quiet(()=>{F({key:'classic'});const {api}=boot();api.loadCall('cp');F(null);return api.DEC.cpNitro;});
    report('chest','no button helps with nitroglycerin; the right answer is the cautions and the medic; the guide card is flagged for the MCA review',helps.length===0&&/erection drugs and tell the medic/.test(d.opts.find(o=>o.r==='good').t)&&/never assists with nitroglycerin/.test(d.why)&&/Pending MCA review/.test(global.__lastBoot.api.GUIDE.nitro.mca),helps.join(', '));
    F({key:'classic'});const b=quiet(()=>human.play('cp',0,{pick:{cpNitro:'bad'}}));F(null);const bb=global.__lastBoot.els['done-b'].innerHTML;
    report('chest','helping him take his nitro costs 10 and the debrief names it',b.finished&&b.score===90&&b.S.h.nitroTaken&&/taken with your help/.test(bb),`score ${b.score}`);
    F({key:'ed'});const g=quiet(()=>human.play('cp',0));F(null);
    report('chest','an erection drug: he is asked, the medic hears "no nitro with the Viagra", 100',g.finished&&g.score===100&&g.S.h.qed&&/no nitro with the Viagra/.test(g.S.log.map(e=>e.msg).join(' ')),`score ${g.score}`);}
  // oxygen: one setting; with a normal SpO₂ it goes on, costs 3 and Max's line teaches why; below the setting it is the right call
  {F({key:'classic'});const {api}=boot();api.loadCall('cp');F(null);const S=api.S();api.$('brief-go').onclick();S.h.abc=true;S.h.ox=true;
    const one=api.COUNTY.o2Min===94&&(block.match(/o2Min/g)||[]).length>=4&&!/spo2\s*[<>]=?\s*9[04]\b/i.test(block);const s0=S.score;
    api.$('k-o2').onclick();const wrong=S.h.o2&&s0-S.score===3&&S.incidents.includes("Not indicated with SpO₂ at or above 94 per protocol. Extra oxygen doesn't help a heart attack and may cause harm.");
    api.$('k-o2').onclick();const off=!S.h.o2;
    S.h.painT=S.t;S.h.spo2=91;const s1=S.score;api.$('k-o2').onclick();const right=S.h.o2&&S.score===s1;
    api.COUNTY.o2Min=90;const b=boot().api;F({key:'classic'});b.loadCall('cp');F(null);const T=b.S();b.$('brief-go').onclick();T.h.abc=true;T.h.ox=true;T.h.painT=T.t;T.h.spo2=91;b.COUNTY.o2Min=90;const t0=T.score;b.$('k-o2').onclick();
    const moved=T.h.o2&&t0-T.score===3&&/at or above 90/.test(T.incidents.join(' '));b.tick(.25);const label=/under 90/.test(b.$('k-o2').textContent);b.COUNTY.o2Min=94;api.COUNTY.o2Min=94;
    report('chest','oxygen: one setting (COUNTY.o2Min, 94 until the MCA review); with a normal SpO₂ it goes on, costs 3 and says why; tap again to take it off; when the SpO₂ drops below the setting it is free; move the setting and the line moves',one&&wrong&&off&&right&&moved&&label,`wrong ${wrong}, off ${off}, right ${right}, moved ${moved}`);
    report('chest','the oxygen guide card says per protocol, names 90 or 94, and is flagged for the MCA review',/per protocol/.test(api.GUIDE.o2acs.mca)&&/90 or 94/.test(api.GUIDE.o2acs.mca)&&/MCA review/.test(api.GUIDE.o2acs.mca));}
  {F({key:'classic'});const g=quiet(()=>human.play('cp',0,{wrongO2:true}));F(null);
    report('chest','oxygen on a normal SpO₂ during a full run costs only the 3, the run finishes, and the debrief says not indicated',g.finished&&g.score===97&&/not indicated/.test(global.__lastBoot.els['done-b'].innerHTML)&&g.S.h.o2,`score ${g.score}`);}
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
    const s0=S.score;api.$('k-cpr').onclick();const early=S.h.cpr&&S.h.arrChecked&&s0-S.score===3&&/before the 10-second check/.test(S.incidents.join(' '));
    api.$('k-pads').onclick();for(let i=0;i<12;i++)api.tick(.25);api.$('k-analyze').onclick();api.tick(.25);const s1=S.score;api.$('k-cpr').onclick();const touch=s1-S.score===5&&S.h.aed==='analyzing'&&!S.h.cpr;
    for(let i=0;i<24;i++)api.tick(.25);const sc=S.score;api.$('k-shock').onclick();
    report('chest','VF arrest: compressions before the check go on and cost 3; touching him during analysis costs 5 and restarts it; shocking without calling clear costs 15',early&&touch&&S.h.shocks===1&&sc-S.score>=15,`early ${early}, touch ${touch}`);}
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
