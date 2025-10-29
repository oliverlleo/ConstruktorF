
import asyncio
from playwright.async_api import async_playwright
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Navigate to the local HTML file
        file_path = os.path.abspath('pages/flow-designer.html')
        await page.goto(f'file://{file_path}')

        # Wait for the app to load
        await page.wait_for_selector('#app', state='visible')

        # Drag and drop a module
        await page.drag_and_drop('[data-module-name="Módulo sem nome"]', '#flow-viewport')

        # Take a screenshot
        await page.screenshot(path='jules-scratch/verification/verification.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
