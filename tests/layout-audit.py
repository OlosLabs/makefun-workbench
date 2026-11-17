"""Check public layouts and failure recovery without modifying remote state."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4186/'
OUT = Path(__file__).resolve().parents[2] / 'build-ops' / 'layout-audit'
OUT.mkdir(parents=True, exist_ok=True)
results = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for width in [360, 390, 768, 1024, 1280, 1440]:
        for route in ['#/', '#/bounty/btc-race-24h-20261117-0603', '#/bounty/makefun-frontend-01', '#/leaderboard/makefun-frontend-01', '#/profile/superskie']:
            page = browser.new_page(viewport={'width': width, 'height': 900})
            errors = []
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(BASE + route)
            page.wait_for_function('window.__shotReady===true', timeout=22000)
            metrics = page.evaluate('''() => ({overflow:document.documentElement.scrollWidth>innerWidth,loading:!!document.querySelector('.loading'),filters:[...document.querySelectorAll('.master-filters .filter')].filter(e=>e.getBoundingClientRect().width>0).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})})''')
            boxes = metrics['filters']
            overlaps = any(a['x'] < b['x']+b['w']-1 and a['x']+a['w'] > b['x']+1 and a['y'] < b['y']+b['h']-1 and a['y']+a['h'] > b['y']+1 for i,a in enumerate(boxes) for b in boxes[i+1:])
            result = {'width':width,'route':route,'overflow':metrics['overflow'],'loading':metrics['loading'],'filter_overlap':overlaps,'errors':errors}
            results.append(result)
            if width in [390,1280] and '/bounty/btc-' in route:
                page.screenshot(path=str(OUT / f'btc-{width}.png'), full_page=True)
            page.close()
    browser.close()
(OUT / 'results.json').write_text(json.dumps(results, indent=2))
failures = [r for r in results if r['overflow'] or r['loading'] or r['filter_overlap'] or r['errors']]
print(json.dumps({'cases':len(results),'failures':failures,'output':str(OUT)}, indent=2))
raise SystemExit(bool(failures))
