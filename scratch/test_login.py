from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.goto('http://localhost:3000/login')
        page.fill('input[name="username"]', 'admin')
        page.fill('input[name="password"]', 'admin123')
        page.click('button:has-text("Masuk ke Portal")')
        page.wait_for_timeout(2000)
        print('Post login URL:', page.url)
        print('Page title:', page.title())
        links = page.eval_on_selector_all('a', 'els => els.map(e => ({href: e.href, text: e.innerText.trim()})).filter(x => x.text)')
        print('Links found:', links)
        browser.close()

if __name__ == '__main__':
    test()
