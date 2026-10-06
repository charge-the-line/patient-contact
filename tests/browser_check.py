#!/usr/bin/env python3
"""Real-browser check (optional). Needs:  pip install playwright && playwright install chromium
Opens every call and the drills at phone sizes; fails on any JavaScript error or anything off-screen.
Usage:  python3 tests/browser_check.py"""
import json, pathlib, sys
from playwright.sync_api import sync_playwright
URL = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
OVER = "(()=>{let m=0;document.querySelectorAll('body *').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();m=Math.max(m,r.right-window.innerWidth);});return Math.round(m);})()"
SMALL = "(()=>{let n=0;document.querySelectorAll('button').forEach(e=>{if(e.offsetParent===null)return;const r=e.getBoundingClientRect();if(r.width<2||r.height<2||r.bottom<0||r.top>innerHeight)return;if(r.height<44)n++;});return n;})()"
errs, rows = [], []
with sync_playwright() as p:
    b = p.chromium.launch()
    for w in (320, 390):
        for n in range(1, 9):
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
    def tap(pg, text, sel='button'):
        pg.locator(sel, has_text=text).first.click(delay=260); pg.wait_for_timeout(350)
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
    # Fast-forward in the trauma transport, with slow real taps on buttons found by their visible text: it skips to the next thing that matters
    for w in (320, 390):
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True); pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.click('#b-call2'); pg.wait_for_timeout(200)
        pg.evaluate("(()=>{Object.assign(S.m,{sized:true,inside:true,cspine:true,survey:true,ctrl:2,tqAsked:true,marked:true,o2:true,warm:true,protected:true,moved:true,loaded:true,alsArr:true,vitCount:1,vitExtr:1});Object.assign(S.m.extr,{done:true,stage:4});S.mon.four=true;loadMission(3);})()")
        pg.wait_for_timeout(300)
        if pg.is_visible('#briefov'): pg.click('#brief-go', delay=200); pg.wait_for_timeout(400)
        hidden_first = not pg.is_visible('#b-ff')
        tap(pg, 'Check tourniquet'); pg.wait_for_timeout(400)
        rows.append((w, 'fast-forward offered', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if hidden_first and pg.is_visible('#b-ff') else 99)))
        t0 = pg.evaluate('S.t'); tap(pg, 'Fast-forward')
        moved = pg.evaluate('S.t') - t0
        rows.append((w, 'fast-forward stops when due', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if moved > 100 and 'Fast-forward:' in pg.inner_text('#radio') and 'reassess' in pg.inner_text('#radio') and not pg.is_visible('#b-ff') else 99)))
        for _ in range(40):
            if pg.is_visible('#decov'): answer(pg)
            if pg.is_visible('#done'): break
            if pg.evaluate("ffWhy()==='due'"): tap(pg, 'Reassess vitals')
            if pg.is_visible('#b-ff'): tap(pg, 'Fast-forward')
            pg.wait_for_timeout(300)
        rows.append((w, 'transport with fast-forward (full)', pg.evaluate(OVER) + 1000 * pg.evaluate(SMALL) + (0 if pg.is_visible('#done') and pg.get_attribute('#done-s', 'data-final') == '100' and not any('without reassessing' in x for x in pg.evaluate('S.incidents')) else 99))); pg.close()
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
    b.close()
bad = [r for r in rows if r[2] > 1]
for r in rows: print(f"{'PASS' if r[2] <= 1 else 'FAIL'}  {r[0]}px  {r[1]:<26} overflow {r[2]%1000}px · buttons under 44px: {r[2]//1000}")
print('JavaScript errors:', errs or 'none')
sys.exit(1 if bad or errs else 0)
