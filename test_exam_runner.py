from playwright.sync_api import sync_playwright
import time
import os

def run_test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()
        
        print("Navigating to http://localhost:5175")
        page.goto('http://localhost:5175/admin/exam-center')
        page.wait_for_load_state('networkidle')
        
        # Take a screenshot to see what it looks like
        screenshot_path = os.path.abspath('artifacts/exam_runner_initial.png')
        os.makedirs('artifacts', exist_ok=True)
        page.screenshot(path=screenshot_path, full_page=True)
        print(f"Saved initial screenshot to {screenshot_path}")
        
        print("HTML Content excerpt:")
        print(page.content()[:1000])
        
        # See if there are buttons or inputs
        print("Buttons found:")
        for locator in page.locator('button').all():
            try:
                print(f" - {locator.text_content().strip()}")
            except:
                pass
                
        browser.close()

if __name__ == '__main__':
    run_test()
