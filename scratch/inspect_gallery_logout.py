from playwright.sync_api import sync_playwright

def inspect_gallery_logout():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/login')
        page.fill('input[name="username"]', 'admin')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Masuk ke Portal")')
        page.wait_for_timeout(1500)
        
        buttons = page.eval_on_selector_all('button', 'els => els.map(e => ({text: e.innerText.trim(), visible: e.offsetParent !== null}))')
        print('Gallery buttons:', buttons)
        forms = page.eval_on_selector_all('form', 'els => els.map(e => ({action: e.action, method: e.method}))')
        print('Gallery forms:', forms)
        browser.close()

if __name__ == '__main__':
    inspect_gallery_logout()
