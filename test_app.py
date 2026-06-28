from playwright.sync_api import sync_playwright
import time

def test_app():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # 收集控制台日志
        console_messages = []
        page.on("console", lambda msg: console_messages.append(f"{msg.type}: {msg.text}"))
        
        # 访问页面
        print("访问 http://localhost:3000/")
        page.goto('http://localhost:3000/')
        
        # 等待页面加载
        page.wait_for_load_state('networkidle')
        time.sleep(2)  # 等待 3D 场景初始化
        
        # 截图初始状态
        page.screenshot(path='/tmp/initial_state.png', full_page=True)
        print("✓ 初始截图已保存")
        
        # 检查是否有错误
        errors = [msg for msg in console_messages if msg.startswith('error:')]
        if errors:
            print(f"\n❌ 发现 {len(errors)} 个错误:")
            for error in errors[:5]:  # 只显示前5个
                print(f"  {error}")
        else:
            print("✓ 无控制台错误")
        
        # 检查 Canvas 是否存在
        canvas = page.locator('canvas')
        if canvas.count() > 0:
            print("✓ 3D Canvas 已渲染")
        else:
            print("❌ 3D Canvas 未找到")
        
        # 检查节点是否可见（通过查找球体元素）
        # 注意：Three.js 渲染的内容在 canvas 中，无法直接通过 DOM 选择器找到
        # 我们通过截图来人工判断
        
        # 尝试点击画布中心（假设那里有节点）
        canvas_box = canvas.bounding_box()
        if canvas_box:
            center_x = canvas_box['x'] + canvas_box['width'] / 2
            center_y = canvas_box['y'] + canvas_box['height'] / 2
            
            print(f"\n尝试点击画布中心 ({center_x:.0f}, {center_y:.0f})")
            page.mouse.click(center_x, center_y)
            time.sleep(1)
            
            # 截图点击后状态
            page.screenshot(path='/tmp/after_click.png', full_page=True)
            print("✓ 点击后截图已保存")
            
            # 尝试点击左侧区域
            print(f"\n尝试点击左侧区域 ({center_x - 200:.0f}, {center_y:.0f})")
            page.mouse.click(center_x - 200, center_y)
            time.sleep(1)
            
            page.screenshot(path='/tmp/after_click_left.png', full_page=True)
            print("✓ 左侧点击截图已保存")
        
        # 测试拖拽
        print(f"\n测试拖拽视角")
        page.mouse.move(center_x, center_y)
        page.mouse.down()
        page.mouse.move(center_x + 100, center_y, steps=10)
        page.mouse.up()
        time.sleep(1)
        
        page.screenshot(path='/tmp/after_drag.png', full_page=True)
        print("✓ 拖拽后截图已保存")
        
        # 打印所有控制台消息
        print(f"\n📋 控制台消息 ({len(console_messages)} 条):")
        for msg in console_messages[:10]:  # 只显示前10条
            print(f"  {msg}")
        
        browser.close()

if __name__ == "__main__":
    test_app()
