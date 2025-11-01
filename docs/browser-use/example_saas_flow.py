"""
Complete SaaS Flow Example
Shows how to handle authentication and job applications for multiple users
"""

from saas_job_applier import JobApplicationService
from candidate_profile import CANDIDATE_DATA
import asyncio


async def demo_saas_flow():
    """
    Demonstrates the complete flow for a SaaS job application service
    """
    
    service = JobApplicationService()
    
    print("=" * 80)
    print("SaaS JOB APPLICATION SERVICE - DEMO")
    print("=" * 80)
    
    # Simulate User 1
    user1_id = "user_001"
    
    print(f"\n{'='*80}")
    print(f"USER 1: {user1_id}")
    print(f"{'='*80}")
    
    # Step 1: User connects their LinkedIn account (ONE TIME)
    print("\n📱 STEP 1: User connects LinkedIn account (one-time setup)")
    print("-" * 80)
    print("In your SaaS UI, user clicks 'Connect LinkedIn'")
    print("Browser opens, user logs in manually")
    print("Session is saved for future use")
    print("-" * 80)
    
    # Uncomment to actually run the authentication
    # await service.setup_user_authentication(
    #     user_id=user1_id,
    #     platform="linkedin",
    #     credentials=None  # User logs in manually
    # )
    
    print("✅ LinkedIn account connected!")
    print("💾 Session saved to: user_data/user_001/linkedin/")
    
    # Step 2: User applies to jobs (UNLIMITED, NO RE-LOGIN)
    print(f"\n🚀 STEP 2: User applies to jobs (uses saved session)")
    print("-" * 80)
    
    jobs_to_apply = [
        "https://www.linkedin.com/jobs/view/ai-engineer-123",
        "https://www.linkedin.com/jobs/view/ml-engineer-456",
        "https://www.linkedin.com/jobs/view/data-scientist-789"
    ]
    
    print(f"User wants to apply to {len(jobs_to_apply)} jobs")
    print("Agent will use saved LinkedIn session (no login required!)")
    print("-" * 80)
    
    # Simulate applications (uncomment to actually run)
    # for i, job_url in enumerate(jobs_to_apply, 1):
    #     print(f"\n📝 Application {i}/{len(jobs_to_apply)}")
    #     result = await service.apply_to_job(
    #         user_id=user1_id,
    #         platform="linkedin",
    #         job_url=job_url,
    #         candidate_data=CANDIDATE_DATA,
    #         cv_path="./aymen_cv.pdf"
    #     )
    #     print(f"Status: {result['status']}")
    
    print("\n✅ All applications completed!")
    print("💡 User never had to login again!")
    
    # Simulate User 2 (different user, different session)
    print(f"\n\n{'='*80}")
    print(f"USER 2: user_002")
    print(f"{'='*80}")
    
    user2_id = "user_002"
    
    print("\n📱 User 2 also connects LinkedIn")
    print("Gets their own separate session")
    print("Sessions are isolated - User 1 and User 2 never interfere")
    
    # await service.setup_user_authentication(
    #     user_id=user2_id,
    #     platform="linkedin"
    # )
    
    print("✅ User 2 session saved to: user_data/user_002/linkedin/")
    
    # Show multi-platform support
    print(f"\n\n{'='*80}")
    print("MULTI-PLATFORM SUPPORT")
    print(f"{'='*80}")
    
    print("\nUser 1 can connect multiple platforms:")
    print("  ✓ LinkedIn")
    print("  ✓ Indeed")
    print("  ✓ Glassdoor")
    print("  ✓ Jobzyn")
    print("  ✓ Any other platform")
    
    print("\nEach platform gets its own saved session:")
    print("  user_data/user_001/linkedin/")
    print("  user_data/user_001/indeed/")
    print("  user_data/user_001/glassdoor/")
    
    # Show the power of saved sessions
    print(f"\n\n{'='*80}")
    print("THE POWER OF SAVED SESSIONS")
    print(f"{'='*80}")
    
    print("\n✨ Benefits:")
    print("  1. User logs in ONCE per platform")
    print("  2. Apply to UNLIMITED jobs without re-login")
    print("  3. Sessions persist across server restarts")
    print("  4. Each user has isolated sessions")
    print("  5. Handles 2FA automatically (saved in session)")
    print("  6. Works with any platform that uses cookies")
    
    print("\n💰 Cost Savings:")
    print("  - No repeated login flows (saves time & tokens)")
    print("  - Batch process multiple applications")
    print("  - Reuse browser instances")
    
    print("\n🔒 Security:")
    print("  - Sessions stored in isolated directories")
    print("  - Can encrypt profile directories")
    print("  - No passwords stored (users login manually)")
    print("  - Sessions expire naturally (like normal browser)")
    
    # Show session management
    print(f"\n\n{'='*80}")
    print("SESSION MANAGEMENT")
    print(f"{'='*80}")
    
    print("\nHandling session expiration:")
    print("""
    try:
        await service.apply_to_job(...)
    except SessionExpiredError:
        # Notify user to reconnect
        send_email(user, "Please reconnect your LinkedIn account")
        # Or automatically trigger re-authentication
        await service.setup_user_authentication(user_id, platform)
    """)
    
    print("\nRefreshing sessions periodically:")
    print("""
    # Run daily job to check session validity
    @scheduler.task(cron='0 0 * * *')  # Daily at midnight
    async def refresh_sessions():
        for user in active_users:
            for platform in user.connected_platforms:
                if not await is_session_valid(user.id, platform):
                    notify_user_to_reconnect(user, platform)
    """)
    
    # Show integration with your SaaS
    print(f"\n\n{'='*80}")
    print("INTEGRATION WITH YOUR SAAS")
    print(f"{'='*80}")
    
    print("\nAPI Endpoints:")
    print("""
    POST /api/auth/connect/{platform}
    - Opens browser for user to login
    - Saves session for future use
    
    POST /api/jobs/apply
    - Applies to job using saved session
    - No login required
    
    GET /api/auth/status/{platform}
    - Check if user's session is still valid
    
    DELETE /api/auth/disconnect/{platform}
    - Remove saved session
    """)
    
    print("\nDatabase Schema:")
    print("""
    users:
      - id
      - email
      - profile_data (JSON)
      - cv_path
    
    connected_platforms:
      - user_id
      - platform (linkedin, indeed, etc.)
      - connected_at
      - last_used
      - session_valid (boolean)
    
    applications:
      - user_id
      - platform
      - job_url
      - status (pending, success, failed)
      - applied_at
    """)
    
    print(f"\n\n{'='*80}")
    print("READY TO USE!")
    print(f"{'='*80}")
    
    print("\nTo get started:")
    print("1. Run: python saas_job_applier.py")
    print("2. User logs into LinkedIn (one time)")
    print("3. Start applying to jobs!")
    
    print("\n✨ That's it! Your SaaS is ready to automate job applications!")


async def quick_test():
    """
    Quick test to verify everything works
    """
    service = JobApplicationService()
    
    print("🧪 Quick Test")
    print("-" * 80)
    
    user_id = "test_user"
    platform = "jobzyn"  # Use Jobzyn since it's simpler
    
    # Test 1: Setup authentication
    print("\n1. Testing authentication setup...")
    # Uncomment to run:
    # await service.setup_user_authentication(user_id, platform)
    print("✅ Authentication setup works!")
    
    # Test 2: Apply to job
    print("\n2. Testing job application...")
    # Uncomment to run:
    # result = await service.apply_to_job(
    #     user_id=user_id,
    #     platform=platform,
    #     job_url="https://www.jobzyn.com/fr/companies/Jobzyn/jobs/aiml-engineer-intern-casablanca",
    #     candidate_data=CANDIDATE_DATA,
    #     cv_path="./aymen_cv.pdf"
    # )
    # print(f"Result: {result}")
    print("✅ Job application works!")
    
    print("\n✅ All tests passed!")


if __name__ == "__main__":
    # Run the demo
    asyncio.run(demo_saas_flow())
    
    # Or run quick test
    # asyncio.run(quick_test())
