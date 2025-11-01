"""
SaaS Job Application Service
Multi-user job application automation with authentication management
"""

from browser_use import Browser, Agent, ChatBrowserUse
import asyncio
from pathlib import Path
from typing import Dict, Optional
import json


class JobApplicationService:
    """
    Production-ready job application service for SaaS
    Handles authentication, session management, and multi-user support
    """
    
    def __init__(self, base_storage_dir='./user_data'):
        self.base_storage_dir = Path(base_storage_dir)
        self.base_storage_dir.mkdir(exist_ok=True)
    
    def get_user_profile_dir(self, user_id: str, platform: str) -> str:
        """Get browser profile directory for a specific user and platform"""
        profile_dir = self.base_storage_dir / f"user_{user_id}" / platform
        profile_dir.mkdir(parents=True, exist_ok=True)
        return str(profile_dir)
    
    async def setup_user_authentication(
        self, 
        user_id: str, 
        platform: str, 
        credentials: Optional[Dict[str, str]] = None
    ):
        """
        Setup authentication for a user on a platform
        
        This should be called once per user per platform.
        The user will login manually and the session will be saved.
        
        Args:
            user_id: Unique user identifier
            platform: Platform name (linkedin, indeed, glassdoor, etc.)
            credentials: Optional credentials for automated login
        """
        profile_dir = self.get_user_profile_dir(user_id, platform)
        
        # Create browser with persistent profile
        browser = Browser(
            headless=False,  # Show browser so user can login
            keep_alive=True,
            user_data_dir=profile_dir
        )
        
        # Platform login URLs
        login_urls = {
            'linkedin': 'https://www.linkedin.com/login',
            'indeed': 'https://secure.indeed.com/account/login',
            'glassdoor': 'https://www.glassdoor.com/profile/login_input.htm',
            'jobzyn': 'https://www.jobzyn.com/login',
            'wellfound': 'https://wellfound.com/login',
        }
        
        login_url = login_urls.get(platform, f'https://{platform}.com/login')
        
        if credentials:
            # Automated login with credentials
            task = f"""
            Login to {platform}:
            1. Navigate to {login_url}
            2. Fill email/username field with: {credentials.get('email')}
            3. Fill password field with: {credentials.get('password')}
            4. Click the sign in/login button
            5. Wait for successful login
            6. If 2FA is required, wait 60 seconds for user to complete it
            7. Verify you are logged in (check for profile/dashboard)
            """
        else:
            # Manual login - just navigate and wait
            task = f"""
            Navigate to {login_url} and wait for user to login manually.
            Once logged in, confirm by checking the page title or URL.
            """
        
        agent = Agent(
            task=task,
            llm=ChatBrowserUse(),
            browser=browser,
            max_failures=3
        )
        
        try:
            print(f"🔐 Setting up authentication for user {user_id} on {platform}...")
            print(f"📂 Profile will be saved to: {profile_dir}")
            
            await agent.run()
            
            print(f"✅ Authentication setup complete!")
            print(f"💾 Session saved. Future applications will use this login.")
            
            # Keep browser open for a moment
            await asyncio.sleep(5)
            
            return True
            
        except Exception as e:
            print(f"❌ Authentication setup failed: {e}")
            return False
    
    async def apply_to_job(
        self,
        user_id: str,
        platform: str,
        job_url: str,
        candidate_data: Dict,
        cv_path: Optional[str] = None
    ):
        """
        Apply to a job using saved authentication session
        
        Args:
            user_id: Unique user identifier
            platform: Platform name
            job_url: URL of the job posting
            candidate_data: Candidate information dictionary
            cv_path: Optional path to CV file
        """
        profile_dir = self.get_user_profile_dir(user_id, platform)
        
        # Check if profile exists
        if not Path(profile_dir).exists():
            raise Exception(
                f"No authentication found for user {user_id} on {platform}. "
                f"Please run setup_user_authentication first."
            )
        
        # Create browser with saved profile (already logged in)
        browser = Browser(
            headless=False,
            keep_alive=True,
            user_data_dir=profile_dir  # This loads the saved login session
        )
        
        # Build task with candidate info
        task = f"""
        Apply to this job: {job_url}
        
        You are already logged in to {platform}.
        
        Candidate Information:
        - Name: {candidate_data['personal']['first_name']} {candidate_data['personal']['last_name']}
        - Email: {candidate_data['personal']['email']}
        - Phone: {candidate_data['personal']['phone']}
        - LinkedIn: {candidate_data['personal'].get('linkedin', 'N/A')}
        - Years of Experience: {candidate_data['experience']['years_of_experience']}
        - Current Position: {candidate_data['experience']['current_position']}
        - Current Company: {candidate_data['experience']['current_company']}
        - Education: {candidate_data['education']['degree']} in {candidate_data['education']['major']}
        - University: {candidate_data['education']['university']}
        - Skills: {candidate_data['skills']['programming_languages']}
        {f"- CV File: {cv_path}" if cv_path else ""}
        
        INSTRUCTIONS:
        1. Navigate to the job URL
        2. Click the apply button (Easy Apply, Apply Now, Postuler, etc.)
        3. Fill ALL form fields with the candidate information above
        4. {"Upload the CV file" if cv_path else "Skip CV upload if not required"}
        5. Write a professional message if there's a cover letter field
        6. Submit the application
        7. Confirm submission was successful
        
        IMPORTANT: You are already logged in, so don't try to login again.
        """
        
        agent = Agent(
            task=task,
            llm=ChatBrowserUse(),
            browser=browser,
            max_failures=5,
            available_file_paths=[cv_path] if cv_path else []
        )
        
        try:
            print(f"🚀 Applying to job for user {user_id} on {platform}")
            print(f"📍 Job: {job_url}")
            
            result = await agent.run()
            
            print(f"✅ Application completed!")
            return {
                'status': 'success',
                'user_id': user_id,
                'platform': platform,
                'job_url': job_url,
                'result': str(result)
            }
            
        except Exception as e:
            print(f"❌ Application failed: {e}")
            return {
                'status': 'failed',
                'user_id': user_id,
                'platform': platform,
                'job_url': job_url,
                'error': str(e)
            }
        
        finally:
            await asyncio.sleep(2)
    
    async def batch_apply(
        self,
        user_id: str,
        applications: list[Dict]
    ):
        """
        Apply to multiple jobs for a user
        
        Args:
            user_id: Unique user identifier
            applications: List of dicts with keys: platform, job_url, candidate_data, cv_path
        """
        results = []
        
        for i, app in enumerate(applications, 1):
            print(f"\n{'='*60}")
            print(f"Application {i}/{len(applications)}")
            print(f"{'='*60}\n")
            
            result = await self.apply_to_job(
                user_id=user_id,
                platform=app['platform'],
                job_url=app['job_url'],
                candidate_data=app['candidate_data'],
                cv_path=app.get('cv_path')
            )
            
            results.append(result)
            
            # Wait between applications
            if i < len(applications):
                print("\n⏳ Waiting 5 seconds before next application...")
                await asyncio.sleep(5)
        
        return results


# Example usage for SaaS
async def main():
    service = JobApplicationService()
    
    # Simulate a user in your SaaS
    user_id = "user_12345"
    platform = "linkedin"
    
    # Step 1: One-time setup - User logs in manually
    # This should be done in your SaaS onboarding flow
    print("=" * 60)
    print("STEP 1: Authentication Setup (One-time per platform)")
    print("=" * 60)
    
    # Option A: Manual login (recommended for security)
    await service.setup_user_authentication(
        user_id=user_id,
        platform=platform,
        credentials=None  # User logs in manually
    )
    
    # Option B: Automated login (if you store credentials securely)
    # await service.setup_user_authentication(
    #     user_id=user_id,
    #     platform=platform,
    #     credentials={
    #         'email': 'user@example.com',
    #         'password': 'secure_password'
    #     }
    # )
    
    # Step 2: Apply to jobs using saved session
    print("\n" + "=" * 60)
    print("STEP 2: Applying to Jobs (Uses saved login)")
    print("=" * 60)
    
    from candidate_profile import CANDIDATE_DATA
    
    # Single application
    result = await service.apply_to_job(
        user_id=user_id,
        platform=platform,
        job_url="https://www.linkedin.com/jobs/view/123456789",
        candidate_data=CANDIDATE_DATA,
        cv_path="./aymen_cv.pdf"
    )
    
    print(f"\nResult: {result}")
    
    # Batch applications
    # applications = [
    #     {
    #         'platform': 'linkedin',
    #         'job_url': 'https://www.linkedin.com/jobs/view/123',
    #         'candidate_data': CANDIDATE_DATA,
    #         'cv_path': './aymen_cv.pdf'
    #     },
    #     {
    #         'platform': 'linkedin',
    #         'job_url': 'https://www.linkedin.com/jobs/view/456',
    #         'candidate_data': CANDIDATE_DATA,
    #         'cv_path': './aymen_cv.pdf'
    #     }
    # ]
    # 
    # results = await service.batch_apply(user_id, applications)


if __name__ == "__main__":
    asyncio.run(main())
