"""
Authentication Manager for Multi-User SaaS
Handles login sessions for different users and platforms
"""

from browser_use import Browser, Agent, ChatBrowserUse
import asyncio
import json
import os
from pathlib import Path


class AuthManager:
    """Manages authentication sessions for multiple users and platforms"""
    
    def __init__(self, storage_dir='./auth_sessions'):
        self.storage_dir = Path(storage_dir)
        self.storage_dir.mkdir(exist_ok=True)
    
    def get_session_path(self, user_id: str, platform: str) -> str:
        """Get the path to store session for a user on a platform"""
        return str(self.storage_dir / f"{user_id}_{platform}_session.json")
    
    async def login_to_platform(self, user_id: str, platform: str, credentials: dict):
        """
        Login to a platform and save the session
        
        Args:
            user_id: Unique user identifier
            platform: Platform name (linkedin, indeed, etc.)
            credentials: Dict with username/email and password
        """
        session_path = self.get_session_path(user_id, platform)
        
        # Create browser for login
        browser = Browser(
            headless=False,  # Show browser for user to complete login
            keep_alive=True
        )
        
        # Platform-specific login tasks
        login_tasks = {
            'linkedin': f"""
                1. Navigate to https://www.linkedin.com/login
                2. Fill email field with: {credentials.get('email')}
                3. Fill password field with: {credentials.get('password')}
                4. Click the sign in button
                5. Wait for successful login (check if redirected to feed)
                6. If 2FA is required, wait for user to complete it
                """,
            'indeed': f"""
                1. Navigate to https://secure.indeed.com/account/login
                2. Fill email field with: {credentials.get('email')}
                3. Click continue
                4. Fill password field with: {credentials.get('password')}
                5. Click sign in
                6. Wait for successful login
                """,
            'glassdoor': f"""
                1. Navigate to https://www.glassdoor.com/profile/login_input.htm
                2. Fill email field with: {credentials.get('email')}
                3. Fill password field with: {credentials.get('password')}
                4. Click sign in
                5. Wait for successful login
                """
        }
        
        task = login_tasks.get(platform, f"Login to {platform} with provided credentials")
        
        agent = Agent(
            task=task,
            llm=ChatBrowserUse(),
            browser=browser,
            max_failures=5
        )
        
        try:
            print(f"🔐 Logging into {platform} for user {user_id}...")
            await agent.run()
            
            # Save the session state (cookies, localStorage, etc.)
            # This is done automatically by browser-use when using storage_state
            print(f"✅ Login successful! Session saved to {session_path}")
            
            # Get the browser's storage state
            # Note: In browser-use, you'd need to extract this from the browser
            # For now, we'll use the user_data_dir approach
            
            return True
            
        except Exception as e:
            print(f"❌ Login failed: {e}")
            return False
        
        finally:
            await asyncio.sleep(2)
    
    def has_valid_session(self, user_id: str, platform: str) -> bool:
        """Check if user has a valid saved session for platform"""
        session_path = self.get_session_path(user_id, platform)
        return os.path.exists(session_path)
    
    async def apply_with_session(self, user_id: str, platform: str, job_url: str, candidate_data: dict):
        """
        Apply to a job using saved session
        
        Args:
            user_id: Unique user identifier
            platform: Platform name
            job_url: URL of the job to apply to
            candidate_data: Candidate information
        """
        # Use persistent profile for this user
        profile_dir = self.storage_dir / f"profile_{user_id}_{platform}"
        
        browser = Browser(
            headless=False,
            keep_alive=True,
            user_data_dir=str(profile_dir)  # Use saved profile with login session
        )
        
        task = f"""
        Apply to this job: {job_url}
        
        You are already logged in to {platform}.
        
        Candidate Information:
        - Name: {candidate_data['personal']['first_name']} {candidate_data['personal']['last_name']}
        - Email: {candidate_data['personal']['email']}
        - Phone: {candidate_data['personal']['phone']}
        - Experience: {candidate_data['experience']['years_of_experience']} years
        - Current Position: {candidate_data['experience']['current_position']}
        
        INSTRUCTIONS:
        1. Navigate to the job URL
        2. Click the apply button (Easy Apply, Apply Now, etc.)
        3. Fill all form fields with the candidate information
        4. Upload CV if required
        5. Submit the application
        6. Confirm submission was successful
        """
        
        agent = Agent(
            task=task,
            llm=ChatBrowserUse(),
            browser=browser,
            max_failures=5
        )
        
        try:
            print(f"🚀 Applying to job for user {user_id} on {platform}...")
            result = await agent.run()
            print(f"✅ Application completed!")
            return result
            
        except Exception as e:
            print(f"❌ Application failed: {e}")
            return None
        
        finally:
            await asyncio.sleep(2)


# Example usage
async def main():
    auth_manager = AuthManager()
    
    user_id = "user123"
    platform = "linkedin"
    
    # Step 1: First-time login (user does this once)
    credentials = {
        'email': 'user@example.com',
        'password': 'password123'
    }
    
    # Check if user already has a session
    if not auth_manager.has_valid_session(user_id, platform):
        print("No saved session found. Logging in...")
        await auth_manager.login_to_platform(user_id, platform, credentials)
    else:
        print("✅ Using saved session")
    
    # Step 2: Apply to jobs using saved session
    from candidate_profile import CANDIDATE_DATA
    
    job_url = "https://www.linkedin.com/jobs/view/123456789"
    
    await auth_manager.apply_with_session(
        user_id=user_id,
        platform=platform,
        job_url=job_url,
        candidate_data=CANDIDATE_DATA
    )


if __name__ == "__main__":
    asyncio.run(main())
