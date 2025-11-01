from browser_use import Agent, ChatBrowserUse, Browser
from dotenv import load_dotenv
import asyncio
import os
from candidate_profile import CANDIDATE_DATA

load_dotenv()

async def main():
    # Job URL to apply to - CHANGE THIS to your target job
    job_url = "https://www.jobzyn.com/fr/companies/Jobzyn/jobs/aiml-engineer-intern-casablanca"
    
    # CV file path - make sure this file exists
    cv_path = os.path.abspath("aymen_cv.pdf")
    
    # Create the task with candidate information
    task = f"""
    Apply to this job: {job_url}
    
    Candidate Information:
    - Name: {CANDIDATE_DATA['personal']['first_name']} {CANDIDATE_DATA['personal']['last_name']}
    - Email: {CANDIDATE_DATA['personal']['email']}
    - Phone: {CANDIDATE_DATA['personal']['phone']}
    - City: {CANDIDATE_DATA['personal']['city']}
    - LinkedIn: {CANDIDATE_DATA['personal']['linkedin']}
    - Years of Experience: {CANDIDATE_DATA['experience']['years_of_experience']} years
    - Current Position: {CANDIDATE_DATA['experience']['current_position']} at {CANDIDATE_DATA['experience']['current_company']}
    - Education: {CANDIDATE_DATA['education']['degree']} in {CANDIDATE_DATA['education']['major']} from {CANDIDATE_DATA['education']['university']} ({CANDIDATE_DATA['education']['graduation_year']})
    - Skills: {CANDIDATE_DATA['skills']['programming_languages']}, {CANDIDATE_DATA['skills']['frameworks']}, {CANDIDATE_DATA['skills']['tools']}
    - CV File: {cv_path}
    
    INSTRUCTIONS:
    1. Navigate to the job URL
    2. Click "Postuler" (Apply) button
    3. Fill ALL form fields with the candidate information above
    4. Upload the CV file using the file path provided
    5. Write a professional message in French expressing interest in the position
    6. Check all required checkboxes
    7. Submit the application
    8. Confirm submission was successful
    
    Be thorough and complete the entire application process.
    """
    
    # Create browser with persistent profile (saves login sessions)
    browser = Browser(
        headless=False,
        keep_alive=True,
        user_data_dir='./browser_profiles/user_profile',  # Persistent profile directory
        # This saves cookies, login sessions, and browser state
    )
    
    # Create agent with file access
    agent = Agent(
        task=task,
        llm=ChatBrowserUse(),
        browser=browser,
        max_failures=5,
        available_file_paths=[cv_path]  # Allow agent to access CV file
    )
    
    try:
        print(f"🚀 Starting job application")
        print(f"📍 Job: {job_url}")
        print(f"👤 Candidate: {CANDIDATE_DATA['personal']['first_name']} {CANDIDATE_DATA['personal']['last_name']}")
        print(f"📧 Email: {CANDIDATE_DATA['personal']['email']}")
        print(f"📄 CV: {cv_path}\n")
        
        result = await agent.run()
        
        print(f"\n✅ Application completed!")

        await agent.close()
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
    
    # finally:
    #     print("\n⏳ Keeping browser open for 10 seconds...")
    #     await asyncio.sleep(10)
    #     await agent.close()

if __name__ == "__main__":
    asyncio.run(main())
