from playwright.sync_api import sync_playwright

def inspect_modal():
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
        page.click('button:has-text("Add User")')
        page.wait_for_timeout(1000)
        inputs = page.eval_on_selector_all('input, select', 'els => els.map(e => ({tag: e.tagName, name: e.name, id: e.id, placeholder: e.placeholder, type: e.type}))')
        print('All inputs/selects:', inputs)
        buttons = page.eval_on_selector_all('button', 'els => els.map(e => e.innerText.trim()).filter(Boolean)')
        print('All buttons:', buttons)
        browser.close()

if __name__ == '__main__':
    inspect_modal()
