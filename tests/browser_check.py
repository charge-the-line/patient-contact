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
            rows.append((w, f'call {n}', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.close()
        pg = b.new_page(viewport={'width': w, 'height': 800}, device_scale_factor=2, is_mobile=True, has_touch=True)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(URL); pg.wait_for_timeout(250); pg.click('#b-start'); pg.wait_for_timeout(200); rows.append((w, 'home', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#b-lesson'); pg.wait_for_timeout(200); rows.append((w, 'lesson', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('[data-l="quit"]'); pg.wait_for_timeout(150); pg.click('#h-set'); pg.wait_for_timeout(150); rows.append((w, 'settings', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('#set-close'); pg.click('#b-drills'); pg.click('[data-d="rhythm"]'); pg.wait_for_timeout(300)
        rows.append((w, 'drills', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL))))
        pg.goto(URL+'?drill=apgar'); pg.wait_for_timeout(300); rows.append((w, 'daily link', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)) + (0 if pg.is_visible('#drillov') else 99)))
        pg.evaluate("localStorage.setItem('preconnect-drill',JSON.stringify({on:true,inst:'Max',roster:['Jo','Sam'],who:'',start:new Date().toISOString()}))"); pg.goto(URL); pg.wait_for_timeout(300); rows.append((w, 'drill picker', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.click('.pc-drill-name'); pg.wait_for_timeout(200); rows.append((w, 'drill bar', (pg.evaluate(OVER)+1000*pg.evaluate(SMALL)))); pg.close()
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
for r in rows: print(f"{'PASS' if r[2] <= 1 else 'FAIL'}  {r[0]}px  {r[1]:<8} overflow {r[2]%1000}px · buttons under 44px: {r[2]//1000}")
print('JavaScript errors:', errs or 'none')
sys.exit(1 if bad or errs else 0)
