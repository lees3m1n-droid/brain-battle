import subprocess,time,re,os,itertools,sys,json
from fractions import Fraction
from playwright.sync_api import sync_playwright
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT=os.environ.get('PORT','3988')
if os.environ.get('STATIC'): srv=subprocess.Popen(['python3','-m','http.server',PORT],cwd=os.path.join(ROOT,'public'),stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
else: srv=subprocess.Popen(['node','server.js'],cwd=ROOT,env={**os.environ,'PORT':PORT},stdout=subprocess.DEVNULL)
time.sleep(1)
base=f'http://127.0.0.1:{PORT}/'
MODE=sys.argv[1] if len(sys.argv)>1 else 'multi'
errors=[];seen=set()
def solve(nums,target):
    def rec(items):
        if len(items)==1: return items[0][1] if items[0][0]==target else None
        for i,j in itertools.combinations(range(len(items)),2):
            a,b=items[i],items[j];rest=[items[k] for k in range(len(items)) if k not in(i,j)]
            c=[(a[0]+b[0],f'({a[1]}+{b[1]})'),(a[0]-b[0],f'({a[1]}-{b[1]})'),(b[0]-a[0],f'({b[1]}-{a[1]})'),(a[0]*b[0],f'({a[1]}*{b[1]})')]
            if b[0]!=0:c.append((a[0]/b[0],f'({a[1]}/{b[1]})'))
            if a[0]!=0:c.append((b[0]/a[0],f'({b[1]}/{a[1]})'))
            for x in c:
                r=rec(rest+[x])
                if r:return r
    return rec([(Fraction(n),str(n)) for n in nums])
def has(pg,s): return pg.locator(s).count()>0
def snap(pg,name,shot):
    if shot and name not in seen: seen.add(name); pg.screenshot(path=f'/tmp/shots3/{name}.png')
def drive(pg,shot):
    try:
        if has(pg,'#stage'):
            if has(pg,'.done'): return False
            lab=pg.locator('.topbar .badge').first.inner_text()
            if has(pg,'.expr'):
                snap(pg,'calc24',shot)
                nums=[int(x) for x in pg.locator('.nums button').all_inner_texts()];target=int(pg.locator('.target').inner_text())
                used=set()
                for tk in re.findall(r'\d+|[+\-*/()]',solve(nums,target)):
                    if tk.isdigit():
                        for i,n in enumerate(nums):
                            if n==int(tk) and i not in used: used.add(i);pg.locator(f'[data-n="{i}"]').click();break
                    else: pg.locator(f'[data-o="{ {"*":"×","/":"÷","-":"−"}.get(tk,tk)}"]').click()
                pg.locator('#ok').click();return True
            if has(pg,'.grid4'):
                lit=[int(c.get_attribute('data-i')) for c in pg.locator('.cell.lit').all()]
                if lit:
                    snap(pg,'memory',shot);pg.wait_for_selector('.cell.lit',state='detached',timeout=8000)
                    for i in lit: pg.locator(f'.cell[data-i="{i}"]').click()
                    pg.locator('#ok').click();return True
                return False
            if '숫자 기억' in lab:
                if has(pg,'.bignum'):
                    d=pg.locator('.bignum').inner_text().strip(); snap(pg,'digits',shot)
                    rev='거꾸로' in pg.locator('.q').inner_text()
                    pg.wait_for_selector('#in',timeout=8000); pg.fill('#in',d[::-1] if rev else d); pg.locator('#ok').click();return True
                return False
            if '색깔 함정' in lab:
                snap(pg,'stroop',shot)
                for _ in range(8):
                    if not has(pg,'.opt'): break
                    pg.locator('.opt').nth(1).click()
                return True
            if '암산' in lab:
                snap(pg,'mental',shot)
                for _ in range(5):
                    if not has(pg,'#in'): break
                    e=pg.locator('.bignum').inner_text().replace('−','-').replace('×','*').replace('÷','//')
                    pg.fill('#in',str(eval(e)));pg.locator('#ok').click()
                return True
            if '역사' in lab:
                snap(pg,'timeline',shot)
                for i in range(4): pg.locator(f'.opt[data-i="{i}"]').click()
                pg.locator('#ok').click();return True
            if '금고' in lab:
                snap(pg,'code',shot);pg.fill('#in','123');pg.locator('#ok').click();return True
            if '초성' in lab:
                snap(pg,'chosung',shot);pg.fill('#in','대한민국');pg.locator('#ok').click();return True
            if has(pg,'.opt'): snap(pg,'choice_'+lab[-6:],shot);pg.locator('.opt').first.click();return True
            if has(pg,'#sl'): snap(pg,'beauty',shot);pg.locator('#ok').click();return True
            if has(pg,'.two'): snap(pg,'two_'+lab[-5:],shot);pg.locator('.two button').last.click();pg.locator('#ok').click();return True
            if has(pg,'.nums button[data-i]'): snap(pg,'lowest',shot);pg.locator('.nums button[data-i="2"]').click();pg.locator('#ok').click();return True
            if has(pg,'#in'): snap(pg,'input_'+lab[-6:],shot);pg.fill('#in','42');pg.locator('#ok').click();return True
        if has(pg,'#rd'):
            snap(pg,'reveal',shot)
            if has(pg,'#fire'):
                pg.locator('[data-k="steal"]').click();pg.locator('[data-t]').first.click();snap(pg,'card',shot);pg.locator('#fire').click();return True
            if pg.locator('#rd').is_enabled(): pg.locator('#rd').click();return True
    except Exception as e:
        errors.append(('drive',str(e)[:200]))
    return False
os.makedirs('/tmp/shots3',exist_ok=True)
with sync_playwright() as p:
    br=p.chromium.launch(executable_path='/usr/bin/google-chrome',args=['--no-sandbox'])
    ctx=br.new_context(viewport={'width':390,'height':844},device_scale_factor=2)
    ctxs=[ctx]+[br.new_context(viewport={'width':390,'height':844}) for _ in range(2)]
    pages=[ctxs[i].new_page() for i in range(3 if MODE=='multi' else 1)]
    for i,pg in enumerate(pages):
        pg.on('pageerror',lambda e,i=i:errors.append((i,'pageerror',str(e))))
        pg.on('console',lambda m,i=i:errors.append((i,m.type,m.text)) if m.type in('error','warning') else None)
        pg.goto(base)
    A=pages[0]
    A.fill('#nm','민수')
    if MODE=='multi':
        A.wait_for_selector('#mk');A.screenshot(path='/tmp/shots3/home.png');A.click('#mk');A.wait_for_selector('.code')
        code=A.locator('.code').inner_text().strip();print('code',code)
        for nm,pg in zip(['지은','철수'],pages[1:]):
            pg.fill('#nm',nm);pg.wait_for_selector(f'[data-code="{code}"]',timeout=8000)
        pages[1].screenshot(path='/tmp/shots3/home_list.png')
        pages[1].click(f'[data-code="{code}"]')
        pages[2].fill('#cd',code);pages[2].click('#jn')
        time.sleep(2.5);A.screenshot(path='/tmp/shots3/lobby.png')
        print('lobby players',A.locator('#pl .chip').count())
        A.locator('[data-r="16"]').click();time.sleep(0.4);A.click('#go')
    else:
        A.wait_for_timeout(500);A.click('#solo')
    t0=time.time()
    while time.time()-t0<600:
        if has(A,'.podium'): break
        acted=[drive(pg,i==0) for i,pg in enumerate(pages)]
        if not any(acted): time.sleep(0.3)
    time.sleep(1);A.screenshot(path='/tmp/shots3/final.png')
    print('final:',has(A,'.podium'),[has(pg,'.podium') for pg in pages])
    print('rows:',A.locator('.board .brow').all_inner_texts())
    print('screens:',sorted(seen))
    if MODE=='multi':
        A.click('#rm');time.sleep(2);print('rematch lobby on B:',has(pages[1],'#pl'))
    br.close()
srv.terminate()
print('ERRORS:',errors[:20])
