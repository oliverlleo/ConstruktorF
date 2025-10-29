
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

        # Drag and drop a module to create it
        await page.drag_and_drop('[data-module-name="Módulo sem nome"]', '#flow-viewport')

        # Drag and drop another module to create it
        await page.mouse.move(200, 200)
        await page.drag_and_drop('[data-module-name="Módulo sem nome"]', '#flow-viewport')

        # Connect the two modules
        await page.hover('[data-module-id]')
        await page.mouse.down()
        await page.hover('div.flow-module:nth-child(2)')
        await page.mouse.up()

        # Take a screenshot
        await page.screenshot(path='jules-scratch/verification/verification.png')

        await browser.close()

if __name__ == '__main__':
    asyncio.run(main())
