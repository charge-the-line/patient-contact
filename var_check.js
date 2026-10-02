global.window={};const {play}=require('./human_bot.js');const {play:cbp}=require('./cb_bot.js');const {play:dmp}=require('./dm_bot.js');
Object.defineProperty(global,'last',{get:()=>global.__lastBoot});
const run=(call,F,fn)=>{global.window.FORCE_V={[call]:F};const r=fn();const S=last.api.S();return {r,S,V:last.api.S()&&eval0()};};
function eval0(){return null;}
const out=[];
global.window.FORCE_V={arrest:{shock:false}};let r=play('arrest',0);let S=last.api.S();out.push(['Arrest PEA',`shocks ${S.aed.shocks}, "no shock" analyses ${S.aed.noShock}, ROSC ${S.rosc}, finished ${r.finished}`]);
global.window.FORCE_V={arrest:{shock:true}};r=play('arrest',0);S=last.api.S();out.push(['Arrest VF',`shocks ${S.aed.shocks}, ROSC ${S.rosc}`]);
for(const L of [.65,1,1.3]){global.window.FORCE_V={od:{L}};r=play('od',0);S=last.api.S();out.push([`Overdose L=${L}`,`naloxone doses ${S.o.doses}, withdrawal ${S.o.withdrawal}`]);}
global.window.FORCE_V={st:{side:'L',wake:true,lvo:true}};r=play('st',0);S=last.api.S();
out.push(['Stroke L/wake/LVO',`LKW "${last.els['sv-lkw'].textContent}", route ${S.s.tx.bridge===3?'I-75 to Regional':'bridge'}, finished ${r.finished}`]);
global.window.FORCE_V={st:{side:'R',wake:false,lvo:false}};r=play('st',0);S=last.api.S();out.push(['Stroke R/found/no LVO',`LKW "${last.els['sv-lkw'].textContent}", route ${S.s.tx.bridge===3?'I-75':'drawbridge'}`]);
global.window.FORCE_V={dm:{pill:true,low:true}};r=dmp(0,'good');S=last.api.S();out.push(['Diabetic pill+low',`first glucose ${S.d.firstVal}, could swallow ${S.d.sw}, IV dextrose ${S.d.d10}, refusal choice ${S.d.refuse}`]);
global.window.FORCE_V={cb:{nuchal:false,vig:true}};r=cbp(0,'good');S=last.api.S();out.push(['Childbirth vigorous',`breaths given ${S.c.delivered||0}, golden-minute penalty ${S.incidents.some(i=>/golden/.test(i))}, cord cut ${S.c.cut}`]);
global.window.FORCE_V={mva:{warm:true}};r=play('mva',0);S=last.api.S();out.push(['MVA warm day',`cold penalty ${S.incidents.some(i=>/cold/.test(i))}`]);
out.forEach(([a,b])=>console.log(a.padEnd(24),b));
