// Headless test harness: loads ../index.html into a fake DOM so bots can play the real game logic.
const fs=require('fs');
function boot(storeInit){
const html=fs.readFileSync(require('path').join(__dirname,'..','index.html'),'utf8');const js=html.split('<script>')[1].split('</script>')[0];const els={};
function mk(id){const e={id,getContext:()=>new Proxy({},{get:(t,k)=>k==='canvas'?{}:(typeof k==='string'?(()=>{}):undefined),set:()=>true}),getBoundingClientRect:()=>({width:320,height:96}),_cls:new Set(),style:{},dataset:{},textContent:'',innerHTML:'',value:'',disabled:false,children:[],classList:{add:c=>e._cls.add(c),remove:c=>e._cls.delete(c),toggle:(c,v)=>{(v===undefined?!e._cls.has(c):v)?e._cls.add(c):e._cls.delete(c)},contains:c=>e._cls.has(c)},querySelector(){return mk('q')},querySelectorAll:()=>[],prepend(){},setAttribute(){},closest:()=>null};Object.defineProperty(e,'lastChild',{get:()=>({remove(){}})});return e;}
for(const m of html.matchAll(/<[a-z0-9]+([^>]*?)id="([^"]+)"([^>]*)>/g)){const e=mk(m[2]);const cm=(m[1]+' '+m[3]).match(/class="([^"]*)"/);if(cm)cm[1].split(/\s+/).forEach(c=>c&&e._cls.add(c));els[m[2]]=e;}
const store=Object.assign({},storeInit||{});
global.localStorage={getItem:k=>k in store?store[k]:null,setItem:(k,v)=>{store[k]=String(v);}};
global.document={body:mk('body'),addEventListener(){},getElementById:i=>{if(!els[i])els[i]=mk(i);return els[i];},querySelectorAll:()=>[],createElement:()=>mk('x')};
global.window=Object.assign(global.window||{},{addEventListener(){},devicePixelRatio:1});global.location={protocol:'file:'};Object.defineProperty(globalThis,'navigator',{value:{userAgent:'qa',clipboard:{writeText:async t=>{global.__clip=t;}}},configurable:true,writable:true});
global.performance={now:()=>0};global.setInterval=()=>{};global.requestAnimationFrame=()=>{};
const api=new Function(require('fs').readFileSync(require('path').join(__dirname,'..','preconnect-core.js'),'utf8')+'\n'+js+';return {pcCue,pcBuzz,pcFx,ding,finish,pcDrill,pcDrillStart,pcDrillWho,pcDrillStamp,pcDrillBind,instOn,RANDOM:()=>RANDOM,settings,setSetting,pcSpacing,pcBestPrev,pcDebriefBody,showMenu,showBrief,finish,S:()=>S,M:()=>M,DEC,GUIDE,loadCall,tick,stepsDone:()=>stepsDone,DECO:()=>DEC_OPEN,$,setTier:t=>{TIER=t},snapshot,incidentKey,load,mvaV,openDecision,epV:()=>epV(),dmV:()=>dmV(),monState,monCfg,monSync,LG:()=>LG,progressShow,timelineHTML,twelveShow,DR:()=>DR,drillMenu,drillStart,genMed,genO2,genApgar,cprTick,INJECTS,instOpen,instAct,instClose,V:()=>V,setInst:v=>{INST=v},record};')();
// Test assistant: places electrodes through the real game handlers, the way a player would.
const assist=()=>{if(!api.S().active||boot.noMon||api.DECO()||api.S().briefing)return;api.monSync();
  for(let k=0;k<20;k++){api.monSync();const L=api.LG();if(L){const exp=L.seq[L.i].p;els['lead-board'].onclick({target:{closest:()=>({dataset:{p:exp}})}});continue;}
    if(!els['twelveov']._cls.has('hidden')){els['tw-close'].onclick();continue;}
    if(!els['g-monitor']._cls.has('hidden')){if(!els['mon-4']._cls.has('hidden')){els['mon-4'].onclick();continue;}if(!els['mon-12']._cls.has('hidden')){els['mon-12'].onclick();continue;}}
    break;}};
const rawTick=api.tick;api.tick=(dt)=>{assist();const r=rawTick(dt);assist();return r;};
global.__lastBoot={api,els};return {api,els};}
module.exports={boot};
