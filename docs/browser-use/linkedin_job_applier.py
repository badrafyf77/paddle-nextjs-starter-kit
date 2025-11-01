"""
LinkedIn Job Application Automation
1. Login to LinkedIn (manual, one-time)
2. Save session for future use
3. Search for jobs
4. Apply to jobs automatically
"""

from browser_use import Browser, Agent, ChatBrowserUse
from candidate_profile import CANDIDATE_DATA
import asyncio
import os
from pathlib import Path


class LinkedInJobApplier:
    """Automate LinkedIn job applications with saved sessions"""
    
    def __init__(self, user_id="afyf_badreddine"):
        self.user_id = user_id
        self.profile_dir = Path(f"./linkedin_profiles/{user_id}")
        self.profile_dir.mkdir(parents=True, exist_ok=True)
        self.cv_path = os.path.abspath("CV.pdf")
    
    async def setup_linkedin_login(self):
        """
        Step 1: Login to LinkedIn and save session
        This only needs to be done ONCE
        """
        print("=" * 80)
        print("STEP 1: LinkedIn Login Setup (One-Time)")
        print("=" * 80)
        print(f"\n📂 Session will be saved to: {self.profile_dir}")
        print("\n🔐 Instructions:")
        print("1. Browser will open LinkedIn login page")
        print("2. Login manually with your credentials")
        print("3. Complete 2FA if required")
        print("4. Wait for the page to load completely")
        print("5. Session will be saved automatically")
        print("\n⏳ Starting in 3 seconds...")
        await asyncio.sleep(3)
        
        # Create browser with persistent profile
        browser = Browser(
            headless=False,
            keep_alive=True,
            user_data_dir=str(self.profile_dir)
        )
        
        task = """
        1. Navigate to https://www.linkedin.com/login
        2. Wait for user to login manually
        3. After login, verify you are on LinkedIn feed or home page
        4. Confirm login was successful by checking the page URL contains 'linkedin.com/feed' or 'linkedin.com/in/'
        """
        
        agent = Agent(
            task=task,
            llm=ChatBrowserUse(),
            browser=browser,
            max_failures=3
        )
        
        try:
            print("\n🌐 Opening LinkedIn login page...")
            await agent.run()
            
            print("\n✅ Login successful!")
            print("💾 Session saved!")
            print("🎉 You can now apply to jobs without logging in again!")
            
            # Keep browser open for a moment
            await asyncio.sleep(5)
            return True
            
        except Exception as e:
            print(f"\n❌ Login failed: {e}")
            return False
    
    async def search_and_apply_to_jobs(
        self,
        job_title="mobile developer",
        location="Morocco",
        num_applications=5
    ):
        """
        Step 2: Search for jobs and apply automatically
        Uses saved LinkedIn session (no login required)
        """
        print("\n" + "=" * 80)
        print(f"STEP 2: Searching and Applying to {num_applications} Jobs")
        print("=" * 80)
        print(f"\n🔍 Search: {job_title}")
        print(f"📍 Location: {location}")
        print(f"📄 CV: {self.cv_path}")
        print(f"\n⏳ Starting job search...")
        
        # Create browser with saved profile (already logged in!)
        browser = Browser(
            headless=False,
            keep_alive=True,
            user_data_dir=str(self.profile_dir)
        )
        
        # Build comprehensive task with improved instructions
        task = f"""
        You are already logged into LinkedIn. Apply to {num_applications} jobs efficiently.
        
        CANDIDATE INFORMATION:
        - Name: {CANDIDATE_DATA['personal']['full_name']}
        - Email: {CANDIDATE_DATA['personal']['email']}
        - Phone: {CANDIDATE_DATA['personal']['phone']}
        - Location: {CANDIDATE_DATA['personal']['city']}, {CANDIDATE_DATA['personal']['country']}
        - LinkedIn: {CANDIDATE_DATA['personal']['linkedin']}
        - Current Position: {CANDIDATE_DATA['experience']['current_position']}
        - Years of Experience: {CANDIDATE_DATA['experience']['years_of_experience']} years
        - Education: {CANDIDATE_DATA['education']['degree']} in {CANDIDATE_DATA['education']['major']}
        - University: {CANDIDATE_DATA['education']['university']}
        - Skills: {CANDIDATE_DATA['skills']['programming_languages']}, {CANDIDATE_DATA['skills']['ai_frameworks']}
        - Mobile Development: {CANDIDATE_DATA['skills']['mobile']}
        - CV File: {self.cv_path}
        
        CRITICAL INSTRUCTIONS - FOLLOW EXACTLY:
        
        1. INITIAL SEARCH (DO THIS ONCE):
           - Go to LinkedIn Jobs: https://www.linkedin.com/jobs/
           - Search for: "{job_title}"
           - Location: "{location}"
           - Click search
           - Apply "Easy Apply" filter
        
        2. EFFICIENT APPLICATION WORKFLOW:
           
           FOR EACH JOB IN THE LIST:
           
           a) CHECK IF ALREADY APPLIED (VERY IMPORTANT):
              - Look at the job listing
              - If you see "Applied" or "Applied X minutes/hours ago" text
              - IMMEDIATELY skip this job
              - DO NOT click on it
              - DO NOT waste time analyzing it
              - Scroll down and move to the NEXT job below it
              - This saves tokens and time!
           
           b) FIND EASY APPLY BUTTON:
              - Look at jobs that DON'T have "Applied" status
              - Find the "Easy Apply" button in the job listing (LEFT side)
              - Click "Easy Apply" button directly from the list
              - DO NOT click the job title first
           
           c) FILL THE APPLICATION FORM:
              - Use candidate information provided above
              - Upload CV when asked: {self.cv_path}
              - For years of experience: {CANDIDATE_DATA['experience']['years_of_experience']}
              - For current company: {CANDIDATE_DATA['experience']['current_company']}
              - Answer all questions
              - If asked about salary: 10000
           
           d) HANDLE RADIO BUTTONS (IMPORTANT):
              - Radio buttons are questions with "Yes/No" or "Oui/Non" options
              - To click them, use this evaluate code:
                evaluate: code: (function(){{try{{const dialog=document.querySelector('div[role="dialog"]');const option=Array.from(dialog.querySelectorAll('label,div')).find(el=>el.textContent.includes('Yes')||el.textContent.includes('Oui'));if(option){{option.click();return 'Clicked'}}return 'Not found'}}catch(e){{return 'Error'}}}})()
              - Replace 'Yes'/'Oui' with 'No'/'Non' if needed
              - This method works better than clicking spans
           
           e) SUBMIT THE APPLICATION:
              - Click through all steps (Next, Next, Review)
              - Click "Submit application"
              - Wait for confirmation
           
           f) MOVE TO NEXT JOB (CRITICAL):
              - After submitting, close any confirmation dialogs
              - You will be back on the job list
              - DO NOT search again
              - DO NOT type in search bar
              - Look at the job list on the LEFT
              - Scroll down if needed
              - Find the NEXT job that:
                * Does NOT have "Applied" status
                * Has "Easy Apply" button
              - Click "Easy Apply" on that job
              - Repeat the process
        
        3. SKIP ALREADY APPLIED JOBS IMMEDIATELY:
           - If you see "Applied" text on a job, skip it instantly
           - Don't click on it, don't analyze it
           - Just scroll down to the next job
           - This is critical for efficiency
        
        4. WHEN TO SEARCH AGAIN:
           - ONLY if you scroll to the bottom and run out of jobs
           - ONLY if you need to change filters
           - Otherwise, STAY on the same results page
        
        5. HANDLING ISSUES:
           - Radio buttons: Use the evaluate code provided above
           - Already applied jobs: Skip immediately
           - No Easy Apply: Skip and move to next
           - Stuck on a question: Try evaluate code, if fails, dismiss and move on
           - After 2 failed attempts on same job: Dismiss and move to next
        
        6. TRACK YOUR PROGRESS:
           - Count successful applications
           - Stop when you reach {num_applications} successful applications
           - Report which jobs you applied to
        
        SPEED & EFFICIENCY RULES:
        - Skip "Applied" jobs IMMEDIATELY (don't waste time)
        - Click "Easy Apply" directly from list (don't open job details)
        - Stay on same results page (don't search again)
        - Use evaluate code for radio buttons
        - Scroll down to see more jobs
        - Apply to {num_applications} jobs as fast as possible
        """
        
        agent = Agent(
            task=task,
            llm=ChatBrowserUse(),
            browser=browser,
            max_failures=5,
            available_file_paths=[self.cv_path]
        )
        
        try:
            print("\n🚀 Starting automated job applications...")
            result = await agent.run(max_steps=100)  # Allow more steps for multiple applications
            
            print("\n" + "=" * 80)
            print("✅ JOB APPLICATION PROCESS COMPLETED!")
            print("=" * 80)
            print(f"\nResult: {result}")
            
            return result
            
        except Exception as e:
            print(f"\n❌ Application process failed: {e}")
            return None
        
        finally:
            print("\n⏳ Keeping browser open for 10 seconds...")
            await asyncio.sleep(10)
    
    async def run_full_process(
        self,
        job_title="mobile developer",
        location="Morocco",
        num_applications=5,
        skip_login=False
    ):
        """
        Complete process: Login + Apply to jobs
        
        Args:
            job_title: Job title to search for
            location: Location to search in
            num_applications: Number of jobs to apply to
            skip_login: Skip login if already done before
        """
        print("\n" + "=" * 80)
        print("LINKEDIN JOB APPLICATION AUTOMATION")
        print("=" * 80)
        print(f"\n👤 Candidate: {CANDIDATE_DATA['personal']['full_name']}")
        print(f"📧 Email: {CANDIDATE_DATA['personal']['email']}")
        print(f"🔍 Target: {job_title} in {location}")
        print(f"📊 Applications: {num_applications}")
        
        # Check if already logged in
        if not skip_login:
            print("\n" + "=" * 80)
            print("Checking if you need to login...")
            print("=" * 80)
            
            if self.profile_dir.exists() and list(self.profile_dir.iterdir()):
                print("✅ Found existing LinkedIn session!")
                print("💡 Skipping login step...")
                skip_login = True
            else:
                print("❌ No existing session found")
                print("🔐 You need to login first...")
        
        # Step 1: Login (if needed)
        if not skip_login:
            success = await self.setup_linkedin_login()
            if not success:
                print("\n❌ Login failed. Cannot proceed with applications.")
                return
            
            print("\n⏳ Session saved! You're now logged in.")
            print("💡 Next time you run this script, it will skip the login step.")
            print("\n🎉 Login complete! Now run the script again to start applying to jobs.")
            return  # Exit after login, user should run again
        
        # Step 2: Search and apply to jobs
        await self.search_and_apply_to_jobs(
            job_title=job_title,
            location=location,
            num_applications=num_applications
        )


async def main():
    """Main function"""
    applier = LinkedInJobApplier()
    
    # Configuration
    JOB_TITLE = "mobile developer"  # Change this to your target job
    LOCATION = "Morocco"            # Change this to your target location
    NUM_APPLICATIONS = 5            # Number of jobs to apply to
    
    # Run the complete process
    await applier.run_full_process(
        job_title=JOB_TITLE,
        location=LOCATION,
        num_applications=NUM_APPLICATIONS,
        skip_login=False  # Set to True if you already logged in before
    )


if __name__ == "__main__":
    asyncio.run(main())
