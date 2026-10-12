#!/usr/bin/env python3
"""Real-browser check (optional). Needs:  pip install playwright && playwright install chromium
Opens every call and the drills at phone sizes; fails on any JavaScript error or anything off-screen.
Usage:  python3 tests/browser_check.py"""
import json, os, pathlib, re, sys, time, threading, functools
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from playwright.sync_api import sync_playwright
URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
OVER = "(()=>{let m=0;const vis=e=>e.checkVisibility?e.checkVisibility({visibilityProperty:true}):e.offsetParent!==null;document.querySelectorAll('body *').forEach(e=>{if(!vis(e))return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;m=Math.max(m,r.right-window.innerWidth);});return Math.round(m);})()"   # fixed elements count too (the hub header slipped past offsetParent)
TEXT = "(()=>{let n=0;const vis=e=>e.checkVisibility?e.checkVisibility({visibilityProperty:true}):e.offsetParent!==null;document.querySelectorAll('body *').forEach(e=>{if(e.closest('svg')||!vis(e))return;const t=[...e.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent).join(' ').replace(/\\s+/g,' ').trim();if(t.length<2)return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;const fs=parseFloat(getComputedStyle(e).fontSize),w=t.split(' ').filter(x=>/[A-Za-z0-9]/.test(x)).length;if(fs<(w>=6?15:13)-.01)n++;});return n;})()"   # the text floor: 15 px for anything read as a sentence (six words or more), 13 px for captions; SVG numerals exempt
SMALL = "(()=>{let n=0;const vis=e=>e.checkVisibility?e.checkVisibility({visibilityProperty:true}):e.offsetParent!==null;document.querySelectorAll('button').forEach(e=>{if(!vis(e))return;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;if(r.height<44||r.width<44)n++;});return n+100*(()=>{let n=0;const vis=e=>e.checkVisibility?e.checkVisibility({visibilityProperty:true}):e.offsetParent!==null;document.querySelectorAll('body *').forEach(e=>{if(e.closest('svg')||!vis(e))return;const t=[...e.childNodes].filter(x=>x.nodeType===3).map(x=>x.textContent).join(' ').replace(/\\s+/g,' ').trim();if(t.length<2)return;const r=e.getBoundingClientRect();if(r.width<1||r.height<1)return;const fs=parseFloat(getComputedStyle(e).fontSize),w=t.split(' ').filter(x=>/[A-Za-z0-9]/.test(x)).length;if(fs<(w>=6?15:13)-.01)n++;});return n;})();})()"   # buttons under 44 px tall or wide, plus 100 per text under the floor
EXE = '/opt/pw-browsers/chromium' if os.path.exists('/opt/pw-browsers/chromium') else None   # the preinstalled Chromium, like the other modules' checks
PP = pathlib.Path(__file__).resolve().parent.parent.parent / 'purchase-point' / 'index.html'   # Purchase Point checked out next to this repo (the crew's-side link)
HTTP = None   # the crew's-side link is "../purchase-point/", a folder: it works on the web site, not under file://, so that one row is served the way GitHub Pages serves it
if PP.exists():
    class Quiet(SimpleHTTPRequestHandler):
        def log_message(self, *a): pass
    srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(Quiet, directory=str(PP.parent.parent))); threading.Thread(target=srv.serve_forever, daemon=True).start()
    HTTP = f'http://127.0.0.1:{srv.server_address[1]}/patient-contact/index.html'
errs, rows = [], []
with sync_playwright() as p:
    b = p.chromium.launch(executable_path=EXE) if EXE else p.chromium.launch()
    for w in (320, 390):
        for n in range(1, 12):
            pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.click(f'#b-call{n}'); pg.wait_for_timeout(200)
            pg.click('#brief-go'); pg.wait_for_timeout(1500)
            rows.append((w, f'call {n}', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)) + (0 if not pg.is_visible('#b-ff') else 99))); pg.close()   # nothing to wait for at the start: no Fast-forward
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.wait_for_timeout(200); rows.append((w, 'home', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#b-lesson'); pg.wait_for_timeout(200); rows.append((w, 'lesson', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('[data-l="quit"]'); pg.wait_for_timeout(150); pg.click('#h-set'); pg.wait_for_timeout(150); rows.append((w, 'settings', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#set-close'); pg.click('#b-drills'); pg.click('[data-d="rhythm"]'); pg.wait_for_timeout(300)
        rows.append((w, 'drills', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
        pg.goto(URL+'?drill=apgar'); pg.wait_for_timeout(300); rows.append((w, 'daily link', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)) + (0 if pg.is_visible('#drillov') else 99)))
        pg.evaluate("localStorage.setItem('preconnect-drill',JSON.stringify({on:true,inst:'Max',roster:['Jo','Sam'],who:'',start:new Date().toISOString()}))"); pg.goto(URL); pg.wait_for_timeout(300); rows.append((w, 'drill picker', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('.pc-drill-name'); pg.wait_for_timeout(200); rows.append((w, 'drill bar', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.close()
    # Bay County arrest flows, played with slow real taps on buttons found by their visible text
    def tap(pg, text, sel='button:visible'):   # only buttons a finger could reach: several calls share labels
        pg.locator(sel, has_text=text).first.click(delay=260); pg.wait_for_timeout(350)
    def try_ff(pg):   # the button can hide between looking and tapping (something just happened): that's a missed tap, not a failure
        try: pg.locator('#b-ff').click(delay=260, timeout=1500); pg.wait_for_timeout(350)
        except Exception: pass
    def answer(pg, key=None):   # tap the right option of the open decision by its visible text, then Continue
        ans = pg.evaluate("DEC_OPEN.opts.find(o=>o.r==='good').t"); pg.locator('#dec-opts button', has_text=ans).first.click(delay=260); pg.wait_for_timeout(300)
        pg.click('#dec-go', delay=200); pg.wait_for_timeout(400)
    for w, force, label in ((390, "{look:'obvious'}", 'obvious death'), (320, "{dnr:'valid'}", 'valid DNR')):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={arrest:%s}" % force); pg.click('#b-call1'); pg.wait_for_timeout(200); pg.click('#brief-go'); pg.wait_for_timeout(300)
        tap(pg, 'Check: responsive'); pg.wait_for_timeout(3200); tap(pg, 'Ask: is there a DNR?'); pg.wait_for_timeout(800)
        rows.append((w, label + ': start or not', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#decov') else 99))); answer(pg)
        for _ in range(30):
            if pg.is_visible('#done') and pg.is_visible('#b-next') and pg.evaluate("S.mission<M.length-1"): pg.click('#b-next', delay=200); pg.wait_for_timeout(400)
            if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(300)
            if pg.is_visible('#decov'): answer(pg)
            if pg.is_visible('#done') and pg.evaluate("S.mission===M.length-1"): break
            pg.wait_for_timeout(1500)
        rows.append((w, label + ' (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and 'nothing to resuscitate' in pg.inner_html('#done-b') else 99))); pg.close()
    # the medical-control ending at a phone's width: jump to the consult (the long CPR before it is covered by the suite at human pace), then play it with real taps
    pg = b.new_page(viewport={'width': 320, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={arrest:{open:'cpr',outcome:'tor',shock:true,dnr:null}}"); pg.click('#b-call1'); pg.wait_for_timeout(200)
    pg.evaluate("(()=>{Object.assign(S,{checked:true,arrest:true,resus0:0,compT:900,arrestT:1000,running:false});S.cpr.who='You';S.cpr.on=true;S.pause.on=false;S.aed.pads=true;S.als.arrived=true;S.als.arrT=S.t;S.als.zoll=true;S.als.lucas=2;S.air.adv=true;S.tor.calling=true;S.tor.callT=S.t;S.tor.comp0=S.compT;S.dnr.asked=true;M=[A_TOR()];loadMission(0);})()")
    pg.wait_for_timeout(300)
    if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(500)
    rows.append((320, 'consult decision', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#decov') else 99))); answer(pg)
    for _ in range(60):
        if pg.is_visible('#decov'): answer(pg)
        if pg.is_visible('#done'): break
        pg.wait_for_timeout(1500)
    rows.append((320, 'termination (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and 'never the outcome' in pg.inner_html('#done-b') and 'Time of death' in pg.evaluate("S.log.map(e=>e.msg).join(' ')") else 99))); pg.close()
    # the next piece of shock care a person would tap, by its visible text, while her shock is getting worse
    SHOCK_NEXT = "(()=>{const d=detOpen('shock');if(!d||S.m.act)return '';const m=S.m;if(!d.found)return 'Reassess vitals';if(!m.recheck)return 'Rapid recheck';if(!d.told)return 'Tell the medic';if(!m.stab)return 'Pad the thigh';if(V.pelvis&&!m.binder)return 'pelvic binder';if(!m.rigWarm)return 'Heat up';if(!m.ivSet)return 'Set up the IV';return '';})()"
    # car versus tree: her shock gets worse in the back (unstable pelvis), handled with slow real taps on the shock care, to the debrief
    for w, base in ((320, URL), (390, HTTP or URL)):   # the 390 px run is served over HTTP so the crew's-side link can be followed for real
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(base); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={mva:{loss:600,pelvis:true}}"); pg.click('#b-call2'); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{Object.assign(S.m,{sized:true,inside:true,cspine:true,survey:true,ctrl:2,tqAsked:true,marked:true,o2:true,warm:true,protected:true,moved:true,loaded:true,alsArr:true,vitCount:1,vitExtr:1});Object.assign(S.m.extr,{done:true,stage:4});S.mon.four=true;loadMission(3);})()")
        pg.wait_for_timeout(300)
        if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(400)
        tap(pg, 'Check tourniquet'); pg.evaluate("INJECTS.find(x=>x.id==='worse').run()"); pg.wait_for_timeout(600)
        rows.append((w, 'shock worse: shock care on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#g-mshock') and 'alarm' in pg.inner_text('#radio') and not pg.is_visible('#b-ff') else 99)))
        for _ in range(80):
            if pg.is_visible('#decov'): answer(pg)
            if pg.is_visible('#done'): break
            nxt = pg.evaluate(SHOCK_NEXT)
            if nxt: tap(pg, nxt); continue
            if pg.evaluate("ffWhy()==='due'"): tap(pg, 'Reassess vitals')
            if pg.is_visible('#b-ff'): try_ff(pg)
            pg.wait_for_timeout(300)
        log = pg.evaluate("S.log.map(e=>e.msg).join(' ')"); inc = pg.evaluate('S.incidents')
        rows.append((w, 'shock worse, handled (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#done') and 'bleeding into the thigh' in log and 'Binder going on' in log and 'Fluids are running' in log and 'Got worse in your care' in pg.inner_html('#done-b') and not any(('nothing changed' in x) or ('without a binder' in x) or ('getting worse' in x) for x in inc) else 99))); 
        # the last debrief ends with "See it from the crew's side": the unstable pelvis is Purchase Point's layout C; a real tap on the link opens that scenario's first card
        link = pg.locator('#done-b a', has_text="layout C")
        ok = pg.is_visible('#done') and link.count() == 1 and link.get_attribute('href') == '../purchase-point/?scn=tree&v=C' and (link.bounding_box() or {'height': 0})['height'] >= 20
        if ok and base == HTTP:
            link.first.click(delay=260)
            try: pg.wait_for_url('**/purchase-point/?scn=tree&v=C', timeout=8000); pg.wait_for_selector('#decov', state='visible', timeout=8000); pg.wait_for_timeout(300)
            except Exception as e: print('   detail: crew link navigation', str(e)[:120])
            ok = pg.url.endswith('/purchase-point/?scn=tree&v=C') and pg.is_visible('#decov') and pg.evaluate("typeof S!=='undefined'&&!!S&&S.mode==='scenario'&&S.id==='tree'&&S.v==='C'") and 'tree' in pg.inner_text('#pp-title').lower()
            if not ok: print('   detail: crew link landed on', pg.url, pg.evaluate("String(typeof S!=='undefined'&&S&&S.mode)"))
            rows.append((w, "crew's-side link (real tap)", 0 if ok else 99))
        elif ok and w == 390: print('   note: Purchase Point is not checked out next to this repo; the link was found but not followed')
        elif not ok: print('   detail: crew link', link.count(), link.get_attribute('href') if link.count() else None)
        rows.append((w, "crew's-side link on the debrief", 0 if ok else 99)); pg.close()
    # pass 2: each call's deterioration in the back (or on scene), answered with slow real taps on buttons found by their visible text
    def run_steps(pg, steps):
        for st in steps:
            if pg.is_visible('#decov'): answer(pg)
            if isinstance(st, int): pg.wait_for_timeout(st); continue
            if st.startswith('until:'):
                for _ in range(80):
                    if pg.is_visible('#decov'): answer(pg)
                    if pg.evaluate(st[6:]): break
                    pg.wait_for_timeout(400)
                continue
            if st.startswith('ffuntil:'):
                for _ in range(60):
                    if pg.is_visible('#decov'): answer(pg)
                    if pg.evaluate(st[8:]): break
                    if pg.is_visible('#b-ff'): try_ff(pg)
                    pg.wait_for_timeout(400)
                continue
            if st.startswith('breathe:'):
                for _ in range(int(st[8:])):
                    if pg.is_visible('#decov'): answer(pg)
                    pg.locator('button:visible', has_text='Breath (1 every 6 s)').first.click(delay=200); pg.wait_for_timeout(5800)
                continue
            tap(pg, st)
        for _ in range(4):
            if pg.is_visible('#decov'): answer(pg)
            pg.wait_for_timeout(300)
    P2 = [
     (390, 'overdose re-sedates in the back', 'od', "{L:1}", "Object.assign(S.o,{checked:true,open:true,gurgle:false,vomit:false,bvm:true,o2:true,ox:true,doses:1,doseT:[S.t-400],wake:true,alsArr:true,alsT:S.t-300,recov:true,loaded:true});S.mon.four=true;loadMission(3)",
      ['Reassess his breathing', 'Head-tilt, chin-lift', 'breathe:3', 'Tell the medic what changed', 'breathe:5', "until:S.o.rr>=10"], ['re-sedating', 'titrated to his breathing']),
     (320, 'allergic reaction: you draw the second dose', 'ep', "{rebound:false}", "Object.assign(S.e,{assessed:true,sting:true,pos:true,o2:true,ox:true,recogT:S.t-450,doses:[{t:S.t-400,mg:.3,site:'thigh'}],injected:true,injT:S.t-400,site:'thigh',ampOK:true,ampChecked:true,syr:true,vol:.3,drawn:true,xcheck:true,swapped:true,timeNoted:true,eta:900});loadMission(2)",
      ['Reassess', 'Draw up a second dose', 'Check the ampule', 2600, '1 mL syringe', '+0.1', '+0.1', '+0.1', 'Done', 'Cross-check', 'Swap to 1-inch', 'Inject', 3000, 'Note the time'], ['voice is back', 'Second dose: new ampule']),
     (390, 'allergic reaction: the medic gives it in the back', 'ep', "{rebound:false}", "Object.assign(S.e,{assessed:true,sting:true,pos:true,o2:true,ox:true,recogT:S.t-450,doses:[{t:S.t-400,mg:.3,site:'thigh'}],injected:true,injT:S.t-400,site:'thigh',ampOK:true,ampChecked:true,syr:true,vol:.3,drawn:true,xcheck:true,swapped:true,timeNoted:true,alsArr:true,alsT:S.t-200});S.mon.four=true;loadMission(3)",
      ['Reassess', 'Tell the medic what changed', "until:S.e.doses.length>=2"], ['voice is back', 'Second epi, 0.3 mg IM']),
     (320, 'stroke worse in the back', 'st', "{lvo:false,side:'R'}", "Object.assign(S.s,{abc:true,bf:{B:true,E:true,F:true,A:true,S:true},bfT:S.t-300,timeAsked:true,lkw:'good',lkwSec:CALL0-3600,glu:true,meds:true,fam:true,vitCount:1,ox:true,alsArr:true,alsT:S.t-200,cot:true,loaded:true,txStart:S.t-30});S.mon.four=true;S.mon.twelve=true;loadMission(3)",
      ['Recheck BE-FAST', 'Tell the medic what changed', 'Suction her mouth', 'Turn her toward her weak side', "until:S.s.tx.diverted&&!S.s.secr"], ['pooling in her mouth', 'Medical control says Regional']),
     (390, 'fall patient declines in the back', 'fl', "{}", "Object.assign(S.f,{primary:true,why:true,head:true,meds:true,vitCount:1,glu:true,neuro:1,warm:true,pad:true,smr:'good',moved:true,loaded:true,alsArr:true,alsT:S.t-200,txStart:S.t-30});S.mon.four=true;S.mon.twelve=true;loadMission(3)",
      ['Neuro recheck', 'Tell the medic what changed', "until:S.f.tx.diverted"], ['pupil slightly bigger', 'Regional for neurosurgery']),
     (320, 'childbirth: mom bleeds, then the baby gets dusky, in the ambulance', 'cb', "{vig:true}", "Object.assign(S.c,{hist:true,look:true,kit:true,warm:true,pos:true,crown:true,head:true,headOut:true,nuchal:'good',born:true,vigorous:true,birthRt:S.rt-600,birthT:S.t-600,tob:true,dried:true,wrapped:true,posA:true,gurgly:false,breath:'crying',tone:'active',color:'pink, hands blue',hr:150,sts:true,cut:true,placenta:true,massage:true,massT:S.t-200,nurse:true,mvit:1,alsArr:true,alsT:S.t-300});loadMission(4)",
      ['Reassess both', 'Fundal massage', 'Tell the medic what changed', "until:!detOpen('mom')", 'INJECT', 'Reassess both', 'Dry towel and hat', 'Heat up in the back', "until:!S.c.dusky"], ['boggy again', 'IV fluids going', 'lips and hands dusky', 'pinking back up'])]
    for w, label, call, force, setup, steps, want in P2:
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        idx = {'od': 3, 'ep': 4, 'st': 5, 'fl': 6, 'cb': 7}[call]
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={%s:%s}" % (call, force)); pg.click(f'#b-call{idx}'); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{%s})()" % setup); pg.wait_for_timeout(300)
        if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(400)
        for _ in range(4):
            if pg.is_visible('#decov'): answer(pg)
        pg.evaluate("INJECTS.find(x=>x.id==='worse').run()"); pg.wait_for_timeout(700)
        rows.append((w, label + ': on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.evaluate("(S.dets||[]).some(x=>!x.closed)") and not pg.is_visible('#b-ff') else 99)))
        if 'INJECT' in steps:
            i = steps.index('INJECT'); run_steps(pg, steps[:i]); pg.evaluate("INJECTS.find(x=>x.id==='worse').run()"); pg.wait_for_timeout(600); run_steps(pg, steps[i+1:])
        else: run_steps(pg, steps)
        log = pg.evaluate("S.log.map(e=>e.msg).join(' ')"); inc = pg.evaluate('S.incidents')
        bad = [x for x in inc if ('nothing changed' in x) or ("Didn't tell" in x) or ('no second dose' in x) or ('cross-check' in x) or ('too soon' in x)]
        ok = all(t in log for t in want) and not bad and pg.evaluate("(S.dets||[]).every(x=>x.closed)")
        if not ok: print('   detail:', label, [t for t in want if t not in log], bad, pg.evaluate("JSON.stringify((S.dets||[]).map(x=>[x.id,x.found,x.told,x.closed]))"))
        rows.append((w, label + ' (handled)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if ok else 99))); pg.close()
    # pass 3: the diabetic's falling sugar, the epinephrine dose error, and two of the cards, with slow real taps
    P3 = [
     (390, 'diabetic: sugar falling, can\'t swallow', 'dm', "{low:true,pill:true}", "Object.assign(S.d,{keys:true,abc:true,id:true,glu:1,gluT:S.t,gluVal:31,firstVal:31,firstGluT:S.t,swT:S.t,sw:false,vit:true,pos:true,og:'good'});loadMission(1)", "",
      ['Check blood glucose', 'ffuntil:S.d.alsArr', 'Tell the medic what changed', 'Set up the IV for the medic', "until:S.d.d10"], ['still falling', 'dextrose going'], ['nothing changed', "Didn't tell"]),
     (320, 'allergic reaction: too much epinephrine', 'ep', "{rebound:false}", "Object.assign(S.e,{assessed:true,sting:true,pos:true,o2:true,ox:true,recogT:S.t-60,ampOK:true,ampChecked:true});loadMission(1)", "",
      ['1 mL syringe', '+0.1', '+0.1', '+0.1', '+0.1', '+0.1', '+0.1', '+0.1', 'Done', 'Swap to 1-inch', 'Inject', "until:(S.dets||[]).some(x=>x.id==='overdose')", 'Vitals', 7500, 'Keep him still'], ['too much epinephrine', 'Slow breaths with me'], ['nothing changed']),
     (390, 'card: the officer says he\'s faking it', 'dm', "{low:false,pill:false}", "Object.assign(S.d,{keys:true,abc:true});", "INJECTS.find(x=>x.id==='family').run()",
      ["until:!!DEC_OPEN"], ['faking it'], ['Decision']),
     (320, 'card: stuck at the drawbridge with the overdose', 'od', "{L:1}", "Object.assign(S.o,{checked:true,open:true,gurgle:false,vomit:false,bvm:true,o2:true,ox:true,doses:1,doseT:[S.t-400],wake:true,alsArr:true,alsT:S.t-300,recov:true,loaded:true});S.mon.four=true;loadMission(3)", "INJECTS.find(x=>x.id==='bridge').run()",
      ["until:!!DEC_OPEN"], ['bridge is going up'], ['Decision'])]
    for w, label, call, force, setup, trig, steps, want, badw in P3:
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        idx = {'od': 3, 'ep': 4, 'st': 5, 'fl': 6, 'cb': 7, 'dm': 8}[call]
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={%s:%s}" % (call, force)); pg.click(f'#b-call{idx}'); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{%s})()" % setup); pg.wait_for_timeout(300)
        if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(400)
        for _ in range(4):
            if pg.is_visible('#decov') and not trig: answer(pg)
        if trig: pg.evaluate(trig); pg.wait_for_timeout(500)
        run_steps(pg, steps)
        log = pg.evaluate("S.log.map(e=>e.msg).join(' ')"); inc = pg.evaluate('S.incidents')
        bad = [x for x in inc if any(b_ in x for b_ in badw)]
        ok = all(t in log for t in want) and not bad and pg.evaluate("(S.dets||[]).every(x=>x.closed)")
        if not ok: print('   detail:', label, [t for t in want if t not in log], bad, pg.evaluate("JSON.stringify((S.dets||[]).map(x=>[x.id,x.found,x.told,x.closed]))"))
        rows.append((w, label, pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if ok else 99))); pg.close()
    # Fast-forward in the trauma transport, with slow real taps on buttons found by their visible text: it skips to the next thing that matters
    for w in (320, 390):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={mva:{loss:300,pelvis:false}}"); pg.click('#b-call2'); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{Object.assign(S.m,{sized:true,inside:true,cspine:true,survey:true,ctrl:2,tqAsked:true,marked:true,o2:true,warm:true,protected:true,moved:true,loaded:true,alsArr:true,vitCount:1,vitExtr:1});Object.assign(S.m.extr,{done:true,stage:4});S.mon.four=true;loadMission(3);})()")
        pg.wait_for_timeout(300)
        if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(400)
        hidden_first = not pg.is_visible('#b-ff')
        tap(pg, 'Check tourniquet'); pg.wait_for_timeout(400)
        rows.append((w, 'fast-forward offered', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if hidden_first and pg.is_visible('#b-ff') else 99)))
        t0 = pg.evaluate('S.t'); tap(pg, 'Fast-forward')
        moved = pg.evaluate('S.t') - t0
        rows.append((w, 'fast-forward stops when due', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if moved > 100 and 'Fast-forward:' in pg.inner_text('#radio') and 'reassess' in pg.inner_text('#radio') and not pg.is_visible('#b-ff') else 99)))
        for _ in range(60):
            if pg.is_visible('#decov'): answer(pg)
            if pg.is_visible('#done'): break
            nxt = pg.evaluate(SHOCK_NEXT)
            if nxt: tap(pg, nxt); continue
            if pg.evaluate("ffWhy()==='due'"): tap(pg, 'Reassess vitals')
            if pg.is_visible('#b-ff'): try_ff(pg)
            pg.wait_for_timeout(300)
        rows.append((w, 'transport with fast-forward (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and not any('without reassessing' in x for x in pg.evaluate('S.incidents')) else 99))); pg.close()
    # pediatric breathing, played from the start with slow real taps on buttons found by their visible text; the tiring child is bagged every 2 to 3 real seconds
    PD_NEXT = """(()=>{const x=S.p;if(!x||x.act||!S.running)return '';const ti=detOpen('tiring'),up=detOpen('upset');
      if(x.bvm&&x.tired)return S.rt-x.lastBreathRt>=2.3?'BREATH':'';
      if(ti||up){const d=ti||up;if(!d.found)return 'Reassess him';if(ti&&!x.bvm)return 'Child bag-mask';if(up&&x.agit>=.35&&!x.calm)return 'Calm: Mom holds him';if(x.alsArr&&!d.told)return 'Tell the medic what changed';return '';}
      if(!x.calm)return 'Calm: Mom holds him';if(!x.hist)return 'History from Mom';if(!x.listen)return 'Listen and count';if(!x.ox)return 'Pulse ox on his toe';if(!x.o2)return 'Blow-by O₂';
      if(S.mission===1&&V.kind!=='croup'){if(!x.label)return 'Read the label';if(!x.date)return 'Check the expiration';if(V.inh==='own'&&x.inhDec==='good'&&!x.spacer)return 'Shake it, spacer';if(V.inh==='own'&&x.inhDec==='good'&&!x.puffs)return 'Help him take it';}
      if((S.mission===1&&!x.reassAfter&&S.t-pdRef()>=120)||(S.mission===3&&ffWhy()==='due'))return 'Reassess him';
      if(S.mission===2&&x.alsArr&&!x.loaded)return 'Onto the cot with Mom';return '';})()"""
    for w, force, label, want in ((390, "{kind:'croup'}", 'pediatric croup', 'Times he got upset'), (320, "{kind:'asthma',inh:'own',tire:true}", 'pediatric asthma, tires out', 'recognized')):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={pd:%s}" % force); pg.click('#b-call9'); pg.wait_for_timeout(200); pg.click('#brief-go'); pg.wait_for_timeout(500)
        rows.append((w, label + ': doorway card', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#decov') and 'drooling' not in pg.inner_text('#dec-q') else 99))); answer(pg)
        shots = set()
        for _ in range(500):
            if pg.is_visible('#decov'): answer(pg); continue
            if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(300); continue
            if pg.is_visible('#done'):
                if pg.evaluate("S.mission<M.length-1"): pg.click('#b-next', delay=200); pg.wait_for_timeout(400); continue
                break
            nxt = pg.evaluate(PD_NEXT)
            if nxt == 'BREATH':
                if 'bagging' not in shots: shots.add('bagging'); rows.append((w, label + ': bagging on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                pg.locator('button:visible', has_text='Breath (1 every 2–3 s)').first.click(delay=200); continue
            if nxt:
                if pg.evaluate("S.mission")==1 and 'inhaler' not in shots and pg.is_visible('#g-pd-i'): shots.add('inhaler'); rows.append((w, label + ': inhaler on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                tap(pg, nxt); continue
            if pg.is_visible('#b-ff') and not pg.evaluate("S.p.tired"): try_ff(pg)
            pg.wait_for_timeout(300)
        ok = pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and want in pg.inner_html('#done-b')
        if not ok: print('   detail:', label, pg.evaluate('S.incidents'), pg.evaluate('S.mission'), pg.evaluate("S.p.tireFired"))
        rows.append((w, label + ' (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if ok else 99))); pg.close()
    # chest pain, played from the start with slow real taps on buttons found by their visible text; the VF arrest runs on the real clock
    CP_NEXT = """(()=>{const x=S.h;if(!x||!S.running)return '';const dd=detOpen('drop'),dp=detOpen('pain'),dv=detOpen('vf');
      if(x.arr&&!x.rosc){if(x.act)return '';if(!x.arrChecked||x.roscSign)return 'Check: responsive';if(x.aed==='ready')return x.clear?'Shock':'Call "Clear!"';
        if(!x.cpr&&x.aed!=='analyzing')return 'Start CPR';if(!x.pads)return 'AED pads on';if(x.shocks===0&&x.aed==='idle')return 'AED: analyze';if(x.alsArr&&dv&&!dv.told)return 'Tell the medic';return '';}
      if(x.act)return '';if(dv&&x.alsArr&&!dv.told)return 'Tell the medic what changed';
      if(dd||dp){const d=dd||dp;if(!d.found)return 'Reassess';if(dd&&!x.flat)return 'Lay flat';if(dp&&!x.o2)return 'O₂ only if';if(x.alsArr&&!d.told)return 'Tell the medic what changed';return '';}
      if(!x.abc)return 'Primary: ABCs';if(!x.opq)return 'OPQRST';if(!x.sample)return 'SAMPLE';if(!x.vit)return 'Vitals and pulse ox';
      if(S.mission===1){if(!x.qall)return 'Allergic to aspirin';if(!x.qbleed)return 'Any bleeding';if(!x.qthin)return 'Any blood thinners';if(!x.qtoday)return 'Any aspirin already today';if(x.asaDec==='good'&&!x.asaGiven&&!cpReason())return 'Help with aspirin';if(V.nitro&&!x.qed)return 'Erection drugs';}
      if(x.alsArr&&S.mon.twelve&&!x.moved)return 'Stair chair';if(x.moved&&!x.loaded)return 'Power load';
      if(S.mission===M.length-1&&ffWhy()==='due')return 'Reassess';return '';})()"""
    for w, force, label, want in ((390, "{key:'classic'}", 'chest pain, classic', '324 mg chewed'), (320, "{key:'vf'}", 'chest pain, VF arrest', 'Collapse to first shock')):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={cp:%s}" % force); pg.click('#b-call10'); pg.wait_for_timeout(200); pg.click('#brief-go'); pg.wait_for_timeout(500)
        shots = set()
        for _ in range(700):
            if pg.is_visible('#leadov'):
                p_ = pg.evaluate("LG&&LG.seq[LG.i].p")
                if p_: pg.locator('#lead-board [data-p="%s"]' % p_).first.click(delay=150); pg.wait_for_timeout(200)
                continue
            if pg.is_visible('#twelveov'):
                if '12-lead' not in shots: shots.add('12-lead'); rows.append((w, label + ': 12-lead', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                pg.click('#tw-close', delay=200); pg.wait_for_timeout(300); continue
            if pg.is_visible('#decov'): answer(pg); continue
            if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(300); continue
            if pg.is_visible('#done'):
                if pg.evaluate("S.mission<M.length-1"): pg.click('#b-next', delay=200); pg.wait_for_timeout(400); continue
                break
            if pg.is_visible('#g-monitor'):
                if pg.is_visible('#mon-4'): pg.click('#mon-4', delay=200); pg.wait_for_timeout(300); continue
                if pg.is_visible('#mon-12'): pg.click('#mon-12', delay=200); pg.wait_for_timeout(300); continue
            nxt = pg.evaluate(CP_NEXT)
            if nxt:
                if pg.evaluate("S.mission")==1 and 'aspirin' not in shots: shots.add('aspirin'); rows.append((w, label + ': aspirin checks', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                if pg.evaluate("S.h.arr&&!S.h.rosc") and 'arrest' not in shots: shots.add('arrest'); rows.append((w, label + ': arrest on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                tap(pg, nxt); continue
            if pg.is_visible('#b-ff') and not pg.evaluate("S.h.arr&&!S.h.rosc"): try_ff(pg)
            pg.wait_for_timeout(250)
        ok = pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and want in pg.inner_html('#done-b') and pg.evaluate("S.h.stemi")
        if not ok: print('   detail:', label, pg.evaluate('S.incidents'), pg.evaluate('S.mission'), pg.evaluate("JSON.stringify({rosc:S.h.rosc,longest:S.h.longest,stemi:S.h.stemi})"))
        rows.append((w, label + ' (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if ok else 99))); pg.close()
    # the fire victim, played from the start with slow real taps on buttons found by their visible text; the rule of nines
    # is mapped by tapping the body outline itself, front and back; the gasping patient is bagged every 6 real seconds
    FR_NEXT = """(()=>{const x=S.b;if(!x||!S.running)return '';const ds=detOpen('swell'),da=detOpen('apnea'),dt=detOpen('tox'),dc=detOpen('cold');
      if(x.bvm&&x.apnea){if(S.rt-x.lastBreathRt>=6)return 'BREATH';return x.alsArr&&da&&!da.told&&!x.act?'Tell the medic what changed':'';}
      if(x.act)return '';if(da&&!x.bvm)return 'Bag-mask, O₂ 15';
      if(dt){if(x.seizing)return x.protect?'':'Seizure: protect';if(x.secr)return 'Roll him';if(x.alsArr&&!dt.told)return 'Tell the medic what changed';}
      if(ds){if(!ds.found)return 'Reassess';if(!ds.told)return x.alsArr?'Tell the medic what changed':'Radio Medic 1';if(V.key==='hoarse'&&!x.sit)return 'Sit him up';if(V.key!=='hoarse'&&!x.jaw)return 'Jaw thrust';}
      if(dc){if(!dc.found)return 'Reassess';if(x.cooling)return 'Stop cooling';if(!x.sheet||x.wet)return 'Dry, clean burn sheet';if(!x.warm)return 'Blankets over the sheet';}
      if(x.cooling&&x.coolT>=25)return x.towels?'Wet towels off':'Stop cooling';
      if(!x.gloves)return 'Gloves on';if(!x.strip)return 'Stop the burning';if(!x.jewel)return 'Rings and watch';if(!x.abc)return 'Primary: ABCs';
      if(!x.apnea&&x.o2!=='nrb')return 'Non-rebreather';if(!x.ox)return 'Pulse oximeter';
      if(S.mission>=2&&!x.airway)return 'Look for airway burn';if(S.mission>=2&&!x.ready)return 'Suction and bag-mask ready';
      if(S.mission>=3&&x.coolT===0&&!x.cooling)return 'Cool briefly';if(S.mission>=3&&x.coolT>=20&&!x.sheet&&!x.cooling)return 'Dry, clean burn sheet';if(S.mission>=3&&x.sheet&&!x.warm)return 'Blankets over the sheet';if(S.mission>=3&&x.warm&&x.est===null)return 'Map the burns';
      if(x.alsArr&&S.mon.four&&!x.loaded)return 'Onto the cot, oxygen on';if(x.loaded&&!x.heat)return 'Heat on in the back';
      if(S.mission===M.length-1&&ffWhy()==='due')return 'Reassess';return '';})()"""
    for w, force, label, want in ((390, "{key:'trap'}", 'fire victim, the 98% trap', 'Some monitors can measure carbon monoxide directly; ask your medics if theirs does.'), (320, "{key:'gasp'}", 'fire victim, gasping', 'Bag-mask breaths')):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.evaluate("window.FORCE_V={fr:%s}" % force); pg.click('#b-call11'); pg.wait_for_timeout(200); pg.click('#brief-go'); pg.wait_for_timeout(500)
        shots = set()
        for _ in range(900):
            if pg.is_visible('#ninesov'):
                if 'nines' not in shots: shots.add('nines'); rows.append((w, label + ': rule of nines', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                r_ = pg.evaluate("(()=>{const want=FR_BURNS[V.key].filter(b=>b[1]!=='superficial').map(b=>b[0]);return want.find(r=>!NN.mark[r])||''})()")
                if not r_: pg.click('#nn-done', delay=200); pg.wait_for_timeout(300); continue
                side = 'f' if r_[0] == 'f' else 'b'
                if pg.evaluate("NN.side") != side: pg.click('#nn-front' if side == 'f' else '#nn-back', delay=200); pg.wait_for_timeout(250)
                pg.locator('#nn-board [data-r="%s"]' % r_).first.click(delay=200); pg.wait_for_timeout(300); continue
            if pg.is_visible('#leadov'):
                p_ = pg.evaluate("LG&&LG.seq[LG.i].p")
                if p_: pg.locator('#lead-board [data-p="%s"]' % p_).first.click(delay=150); pg.wait_for_timeout(200)
                continue
            if pg.is_visible('#decov'): answer(pg); continue
            if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(300); continue
            if pg.is_visible('#done'):
                if pg.evaluate("S.mission<M.length-1"): pg.click('#b-next', delay=200); pg.wait_for_timeout(400); continue
                break
            if pg.is_visible('#g-monitor') and pg.is_visible('#mon-4'): pg.click('#mon-4', delay=200); pg.wait_for_timeout(300); continue
            nxt = pg.evaluate(FR_NEXT)
            if nxt == 'BREATH':
                if 'bagging' not in shots: shots.add('bagging'); rows.append((w, label + ': bagging on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                pg.locator('button:visible', has_text='Breath (1 every 6 s)').first.click(delay=200); continue
            if nxt:
                if pg.evaluate("S.mission")==3 and 'burns' not in shots: shots.add('burns'); rows.append((w, label + ': burn care on screen', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
                tap(pg, nxt); continue
            if pg.is_visible('#b-ff') and not pg.evaluate("S.b.apnea||S.b.seizing"): try_ff(pg)
            pg.wait_for_timeout(250)
        ok = pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and want in pg.inner_html('#done-b') and pg.evaluate("S.b.estOK")
        if not ok: print('   detail:', label, pg.evaluate('S.incidents'), pg.evaluate('S.mission'), pg.evaluate("JSON.stringify({est:S.b.est,apnea:S.b.apnea,cn:S.b.cn})"))
        rows.append((w, label + ' (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if ok else 99))); pg.close()
    # the Start CPR or not? drill, answered by visible text
    pg = b.new_page(viewport={'width': 390, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.click('#b-drills'); pg.wait_for_timeout(200); tap(pg, 'Start CPR or not?')
    rows.append((390, 'start-or-not drill', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL)))
    for _ in range(8):
        a = pg.evaluate("DR.qs[DR.i].a"); pg.locator('#dr-body button', has_text=a).first.click(delay=260); pg.wait_for_timeout(250); pg.locator('#dr-foot button').first.click(delay=200); pg.wait_for_timeout(250)
    rows.append((390, 'start-or-not drill (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if '100' in pg.inner_text('#dr-body') else 99))); pg.close()
    pg = b.new_page(viewport={'width': 844, 'height': 390}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(URL); pg.wait_for_timeout(300)
    if pg.is_visible('#b-start'): pg.click('#b-start'); pg.wait_for_timeout(200)
    rows.append((844, 'landscape', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
    pg.evaluate("localStorage.setItem('preconnect-settings',JSON.stringify({contrast:'day'}))"); pg.goto(URL); pg.wait_for_timeout(300)
    if pg.is_visible('#b-start'): pg.click('#b-start'); pg.wait_for_timeout(200)
    rows.append((844, 'daylight', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
    pg.click('#h-set'); pg.wait_for_timeout(200)
    rows.append((844, 'settings land', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
    pg.close()
    # ---- Milestone 10 (lean finish): every activity to the end with real taps at 390 px, when PC_ALL=1 ----
    # The eleven calls are played by the suite's own human bot (tests/human_bot.js), moved into the page: it reads the live call
    # state and names the next button; this script taps that button for real, at a finger's pace, until the last debrief.
    if os.environ.get('PC_ALL'):
        def pc_policy():
            src = (pathlib.Path(__file__).resolve().parent / 'human_bot.js').read_text()
            body = src[src.index('while(rt<1800){') + len('while(rt<1800){'):src.rindex("if(api.S().running)api.tick(.25);}")]
            body = body.replace("$('dec-opts').onclick({target:{closest:()=>({dataset:{i:String(i)}})}});$('dec-go').onclick();", "Q.push({dec:i});Q.push('dec-go');")
            body = body.replace("N.side=r[0];$('nn-board').onclick({target:{closest:()=>({dataset:{r}})}});", "Q.push(r[0]==='f'?'nn-front':'nn-back');Q.push({nn:r});")
            body = body.replace("(opts.ffLog=opts.ffLog||[]).push(api.ffGo());", "Q.push('b-ff');")
            body = re.sub(r"const e=\$\('([a-z0-9-]+)'\);e\.onclick\(\);", r"Q.push('\1');", body)
            body = re.sub(r"\$\('([a-z0-9-]+)'\)\.onclick\(\);", r"Q.push('\1');", body)
            body = body.replace("rt+=.25;continue;", "return Q;").replace("length-1)break;", "length-1)return 'END';") + "}"   # the loop's continue is one decision made; the closing brace is the one cut off with the tick
            # childbirth has its own human-pace bot (tests/cb_bot.js): its running branch joins the policy under call==='cb'
            cb = (pathlib.Path(__file__).resolve().parent / 'cb_bot.js').read_text()
            cbb = cb[cb.index("    if(S.running){") + len("    if(S.running){"):cb.index("      api.tick(.25);}")]
            cbb = re.sub(r"\$\('([a-z0-9-]+)'\)\._cls\.has\('hot'\)", r"(document.getElementById('\1')||{classList:{contains:()=>false}}).classList.contains('hot')", cbb)
            cbb = cbb.replace("$('b-breath').onclick();lastB=rt;", "Q.push('b-breath');lastBreath=rt;").replace("rt-lastB>=", "rt-lastBreath>=").replace("o.", "opts.")
            assert "onclick" not in cbb and "$(" not in cbb, cbb
            body = body.replace("{mva:'m-reass',", "{cb:'c-reass',mva:'m-reass',", 1)
            body = body.replace("    if(S.running){", "    if(call==='cb'&&S.running){const x=S.c;" + cbb + "}\n    if(S.running){", 1)
            assert "onclick" not in body and "api.tick" not in body and "continue;" not in body, body
            return ("window.__pcPolicy=(function(){const api={S:()=>S,M:()=>M,DECO:()=>DEC_OPEN,V:()=>V,NN:()=>NN,stepsDone:()=>stepsDone,ffWhy,FR_BURNS,FFC,INJECTS,pdRef:()=>pdRef(),dmV:()=>dmV(),instAct,$};"
                    "const call=CALL,opts={ff:true};const hid=id=>{const e=document.getElementById(id);return !e||!e.getClientRects().length||!!e.closest('.hidden');};"
                    "let rt=0,nextTap=0,lastBreath=-99,react={},missions=[],stuckAt=null,lastProgress=0,lastSig='',Q=[];const T0=performance.now();"
                    "const tap=id=>{if(rt<nextTap)return false;const e=document.getElementById(id);if(!e||hid(id)||e.classList.contains('on')||e.disabled||e.classList.contains('cool'))return false;Q.push(id);nextTap=rt+1.2;return true;};"
                    "const after=(key,cond,delay=2)=>{if(!cond){delete react[key];return false;}if(react[key]===undefined)react[key]=rt;return rt-react[key]>=delay;};"
                    "return function(){Q=[];rt=(performance.now()-T0)/1000;" + body + "return Q;};})();")
        POLICY = pc_policy()
        def real_tap(pg, a):   # one real tap at a finger's pace; a button that hid or moved meanwhile is a missed tap, and the bot decides again
            sel = ('#' + a) if isinstance(a, str) else (f'#dec-opts button[data-i="{a["dec"]}"]' if 'dec' in a else f'#nn-board [data-r="{a["nn"]}"]')
            try: pg.locator(sel).first.click(delay=260, timeout=2500)
            except Exception: pass
        def call_full(pg, n, cid):
            pg.goto(URL); pg.wait_for_timeout(250)
            if pg.is_visible('#b-start'): pg.click('#b-start')
            pg.click(f'#b-call{n}'); pg.wait_for_timeout(300); pg.evaluate(POLICY)
            end = time.time() + 25 * 60; last = ''
            while time.time() < end:
                if pg.is_visible('#twelveov'): real_tap(pg, 'tw-close'); continue
                lead = pg.evaluate("(typeof LG!=='undefined'&&LG)?LG.seq[LG.i].p:null")
                if lead:
                    try: pg.locator(f'#lead-board [data-p="{lead}"]').first.click(delay=200, timeout=2500)
                    except Exception: pass
                    pg.wait_for_timeout(600); continue
                if pg.is_visible('#g-monitor') and not pg.is_visible('#decov') and not pg.is_visible('#done') and pg.evaluate('S.running'):   # the monitor group stays in the page under a mission result; a tap there would only time out
                    if pg.is_visible('#mon-4'): real_tap(pg, 'mon-4'); continue
                    if pg.is_visible('#mon-12'): real_tap(pg, 'mon-12'); continue
                acts = pg.evaluate("__pcPolicy()")
                if acts == 'END': break
                for a in acts: real_tap(pg, a)
                pg.wait_for_timeout(250)
            done = pg.is_visible('#done') and pg.evaluate("S.mission===M.length-1")
            score = pg.get_attribute('#done-s', 'data-final') if done else None
            ok = done and score is not None and int(score) >= 90
            if not ok: print('   detail:', cid, 'mission', pg.evaluate('S.mission'), 'of', pg.evaluate('M.length'), 'score', score, pg.evaluate('S.incidents.slice(-6)'), pg.evaluate("(()=>{const j=stepsDone.findIndex(x=>!x);return M[S.mission]&&M[S.mission].steps[j]&&M[S.mission].steps[j].t;})()"))
            rows.append((390, f'ALL call {cid} (full)', 0 if ok else 99)); print(f'   {cid}: score {score}, {int((time.time()-(end-25*60))/60)} min')
        pg = b.new_page(viewport={'width': 390, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        # the lesson: the right answer by its visible text, then Next
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.click('#b-lesson'); pg.wait_for_timeout(300)
        for _ in range(40):
            if not pg.evaluate("(typeof LS!=='undefined'&&!!(LS&&LS.cfg))"): break
            good = pg.evaluate("LS.cfg.slides[LS.i].o.find(o=>o[1]==='good')[0]")
            pg.locator('[data-l="ans"]', has_text=re.compile('^' + re.escape(good) + '$')).first.click(delay=120); pg.wait_for_timeout(150)
            pg.click('#l-next', delay=120); pg.wait_for_timeout(250)
        ok = pg.is_visible('#ldone') and pg.evaluate("(JSON.parse(localStorage.getItem('patient-contact')||'{}').drillRuns||[]).some(r=>r.drill==='lesson'&&r.score===100)")
        rows.append((390, 'ALL lesson (full)', 0 if ok else 99))
        # the eight quick drills
        def drill_open(did):
            pg.goto(URL); pg.wait_for_timeout(250)
            if pg.is_visible('#b-start'): pg.click('#b-start')
            pg.click('#b-drills'); pg.wait_for_timeout(200); pg.click(f'[data-a="go"][data-d="{did}"]', delay=200); pg.wait_for_timeout(300)
        def drill_score(did, floor):
            sc = pg.evaluate(f"(()=>{{const p=JSON.parse(localStorage.getItem('patient-contact')||'{{}}');const r=(p.drillRuns||[]).filter(r=>r.drill==='{did}').pop();return r?r.score:null;}})()")
            ok = sc is not None and sc >= floor
            if not ok: print('   detail: drill', did, 'score', sc, pg.inner_text('#dr-body')[:160])
            rows.append((390, f'ALL drill {did} (full)', 0 if ok else 99))
        for did in ('rhythm', 'med', 'o2', 'apgar', 'lkw', 'startcpr'):
            drill_open(did)
            for _ in range(10):
                if not pg.evaluate("!!(DR&&DR.qs&&DR.i<DR.qs.length)"): break
                i = pg.evaluate("DR.qs[DR.i].opts.indexOf(DR.qs[DR.i].a)"); pg.click(f'#dr-body button[data-i="{i}"]', delay=200); pg.wait_for_timeout(250); pg.click('#dr-foot button[data-a="next"]', delay=200); pg.wait_for_timeout(250)
            drill_score(did, 100)
        drill_open('cpr'); box = pg.locator('#dr-pad').bounding_box(); x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2   # 110 a minute on the real clock, like a thumb on the pad
        t0 = time.perf_counter(); k = 0
        while time.perf_counter() - t0 < 21.5:
            pg.mouse.click(x, y); k += 1
            while time.perf_counter() - t0 < k * 60 / 110: time.sleep(0.005)
        pg.wait_for_timeout(600); drill_score('cpr', 90)
        drill_open('leads')
        for _ in range(12):
            if not pg.evaluate("!!(DR&&DR.seq&&DR.i<DR.seq.length)"): break
            lead = pg.evaluate("DR.seq[DR.i].p"); pg.locator(f'#dr-body [data-p="{lead}"]').first.click(delay=200); pg.wait_for_timeout(500)
        pg.wait_for_timeout(400); drill_score('leads', 90)
        # the eleven calls from the start, random patients, Guided
        for n, cid in enumerate(('arrest', 'mva', 'od', 'ep', 'st', 'fl', 'cb', 'dm', 'pd', 'cp', 'fr'), 1): call_full(pg, n, cid)
        pg.close()
    b.close()
bad = [r for r in rows if r[2] > 1]
for r in rows: print(f"{'PASS' if r[2] <= 1 else 'FAIL'}  {r[0]}px  {r[1]:<26} overflow {r[2]%1000}px · buttons under 44px: {(r[2]//1000)%100} · text under floor: {r[2]//100000}")
print('JavaScript errors:', errs or 'none')
sys.exit(1 if bad or errs else 0)
