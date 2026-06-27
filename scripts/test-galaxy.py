from playwright.sync_api import sync_playwright

console_msgs = []
page_errors = []

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    page.on('console', lambda msg: console_msgs.append(f'[{msg.type}] {msg.text}'))
    page.on('pageerror', lambda err: page_errors.append(str(err)))
    
    print('=== 1. 访问首页 ===')
    page.goto('http://localhost:3001', timeout=30000)
    page.wait_for_load_state('networkidle', timeout=15000)
    page.wait_for_timeout(3000)
    
    print('=== 2. 截图：3D 星云层 ===')
    page.screenshot(path='/workspace/scripts/galaxy.png', full_page=False)
    
    print('=== 3. 检查页面 ===')
    canvases = page.locator('canvas').all()
    print(f'Canvas 数量: {len(canvases)}')
    body_text = page.locator('body').text_content()[:300]
    print(f'页面文本: {body_text}')
    
    print('\n=== 4. 控制台消息 ===')
    for msg in console_msgs[-15:]:
        print(f'  {msg}')
    
    print('\n=== 5. 页面错误 ===')
    if page_errors:
        for err in page_errors:
            print(f'  ERR: {err[:200]}')
    else:
        print('  无页面错误')
    
    print('\n=== 6. 测试点击切换 ===')
    canvas = page.locator('canvas').first
    if canvas.count() > 0:
        box = canvas.bounding_box()
        if box:
            for offset in [0.5, 0.4, 0.6, 0.3, 0.45, 0.55]:
                cx = box['x'] + box['width'] * offset
                cy = box['y'] + box['height'] * 0.5
                page.mouse.click(cx, cy)
                page.wait_for_timeout(1500)
                if page.locator('text=返回星云').count() > 0:
                    print(f'  offset={offset} 点击切换到2D成功')
                    page.screenshot(path='/workspace/scripts/detail.png')
                    break
            else:
                print('  多处点击均未切换（节点可能太小或 raycaster 未命中）')
    
    browser.close()
    print('\n=== 完成 ===')
