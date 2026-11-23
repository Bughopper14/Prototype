from playwright.sync_api import sync_playwright

def inspect_um():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        # Login
        page.goto('http://localhost:3000/login')
        page.fill('input[name="username"]', 'admin')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Masuk ke Portal")')
        page.wait_for_timeout(1500)
        
        # Navigate to User Management
        page.goto('http://localhost:3000/user-management')
        page.wait_for_timeout(2000)
        print('UM URL:', page.url)
        buttons = page.eval_on_selector_all('button', 'els => els.map(e => e.innerText.trim()).filter(Boolean)')
        print('UM Buttons:', buttons)
        headings = page.eval_on_selector_all('h1, h2, h3', 'els => els.map(e => e.innerText.trim()).filter(Boolean)')
        print('UM Headings:', headings)
        tables = page.eval_on_selector_all('table th', 'els => els.map(e => e.innerText.trim()).filter(Boolean)')
        print('Table headers:', tables)
        
        # Also navigate to CRM Dashboard
        page.goto('http://localhost:3000/crm-dashboard/')
        page.wait_for_timeout(2000)
        print('CRM URL:', page.url)
        crm_nav = page.eval_on_selector_all('nav a, header a, aside a', 'els => els.map(e => ({href: e.href, text: e.innerText.trim()})).filter(x => x.text)')
        print('CRM Nav Links:', crm_nav[:10])
        browser.close()

if __name__ == '__main__':
    inspect_um()
