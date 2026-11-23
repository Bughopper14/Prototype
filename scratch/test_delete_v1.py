from playwright.sync_api import sync_playwright

def test_del_v1():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/login')
        page.fill('input[name="username"]', 'admin')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Masuk ke Portal")')
        page.wait_for_timeout(1000)
        page.goto('http://localhost:3000/user-management')
        page.wait_for_timeout(1500)
        res = page.evaluate('''async () => {
            const r = await fetch('/api/v1/um/users/25', { method: 'DELETE' });
            const text = await r.text();
            return { status: r.status, body: text };
        }''')
        print('Delete response:', res)
        browser.close()

if __name__ == '__main__':
    test_del_v1()
