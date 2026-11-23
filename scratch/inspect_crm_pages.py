from playwright.sync_api import sync_playwright

def inspect_crm_pages():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/login')
        page.fill('input[name="username"]', 'admin')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Masuk ke Portal")')
        page.wait_for_timeout(1000)
        
        # Test Document Desk
        page.goto('http://localhost:3000/crm-dashboard/document-desk')
        page.wait_for_timeout(2000)
        print('Doc Desk URL:', page.url)
        print('Doc Desk elements:', page.eval_on_selector_all('h1, h2, h3, button', 'els => els.map(e => e.innerText.trim()).filter(Boolean)')[:15])
        
        # Test Overview
        page.goto('http://localhost:3000/crm-dashboard')
        page.wait_for_timeout(2000)
        print('CRM Overview URL:', page.url)
        print('CRM Overview elements:', page.eval_on_selector_all('h1, h2, h3, .metric, .card', 'els => els.map(e => e.innerText.trim()).filter(Boolean)')[:10])

        browser.close()

if __name__ == '__main__':
    inspect_crm_pages()
