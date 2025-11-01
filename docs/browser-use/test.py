from browser_use import Agent, Browser, ChatBrowserUse
from kernel import Kernel
import asyncio
from dotenv import load_dotenv

load_dotenv()

async def main():
    kernel = Kernel(api_key="sk_3dbf4e2f-04a2-4903-8626-5f3824c5e663.zYQ3/zfkCq4DFZycJV1b19Z0kb23wVfMvJl7itp6N80")
    kernel_browser = kernel.browsers.create()
    cdp_url = kernel_browser.cdp_ws_url
    print(cdp_url)
    browser = Browser(
        use_cloud=True,  # Automatically provisions a cloud browser
        cdp_url=cdp_url
    )
    llm = ChatBrowserUse()
    task = "Search for latest news about AI"
    agent = Agent(task=task, llm=llm, browser=browser)
    await agent.run()

if __name__ == "__main__":
    asyncio.run(main())