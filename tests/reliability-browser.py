"""Regression checks for public-page recovery; no remote writes."""
import json
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:4186/'
passed = []
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    for tab in ['entries', 'standings']:
        page = browser.new_page()
        page.route('**/api/competitions/makefun-frontend-01/leaderboard?**', lambda r: r.fulfill(status=503, headers={'Access-Control-Allow-Origin':'*','Retry-After':'1','Content-Type':'application/json'}, body='{}'))
        page.goto(BASE + '#/bounty/makefun-frontend-01?tab=' + tab)
        page.wait_for_function('window.__shotReady===true', timeout=22000)
        assert page.get_by_role('heading', name='Build the best make.fun frontend', exact=True).count()
        assert page.get_by_text('This section is temporarily unavailable', exact=True).count()
        assert page.locator('.tabs a').count() == 5
        passed.append(tab + ': 503 preserves bounty and navigation')
        page.close()
    page = browser.new_page()
    page.goto(BASE + '#/')
    page.wait_for_function('window.__shotReady===true', timeout=22000)
    assert page.locator('.bounty-row').count()
    assert page.evaluate('!!localStorage.getItem("makefun-workbench-cache")')
    page.evaluate('document.querySelector("main").textContent="Failed view"')
    page.locator('#board-nav').click()
    page.wait_for_function('window.__shotReady===true && document.querySelectorAll(".bounty-row").length>0', timeout=22000)
    passed.append('same-route board click recovers content')
    page.route('**/api/**', lambda r: r.fulfill(status=503, headers={'Access-Control-Allow-Origin':'*','Retry-After':'1','Content-Type':'application/json'}, body='{}'))
    page.reload()
    page.wait_for_function('window.__shotReady===true', timeout=22000)
    assert page.locator('.bounty-row').count()
    assert 'Saved data' in page.locator('main').inner_text()
    passed.append('reload retains persisted board and labels saved data')
    page.close()
    browser.close()
print(json.dumps({'passed':passed}, indent=2))
