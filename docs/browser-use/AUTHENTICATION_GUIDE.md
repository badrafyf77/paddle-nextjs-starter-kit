# Authentication Guide for SaaS Job Application

## The Problem

When applying to jobs on platforms like LinkedIn, Indeed, Glassdoor, etc., users need to be logged in. In a SaaS environment with multiple users, you need to:

1. Store each user's login session separately
2. Reuse sessions across multiple job applications
3. Handle 2FA and security challenges
4. Keep sessions secure and isolated

## The Solution: Persistent Browser Profiles

Browser-Use supports persistent browser profiles that save:

- Cookies (login sessions)
- LocalStorage
- Session data
- Browser state

Each user gets their own profile directory, keeping their sessions isolated and secure.

## Architecture

```
user_data/
├── user_12345/
│   ├── linkedin/          # LinkedIn session for user 12345
│   ├── indeed/            # Indeed session for user 12345
│   └── glassdoor/         # Glassdoor session for user 12345
├── user_67890/
│   ├── linkedin/          # LinkedIn session for user 67890
│   └── indeed/            # Indeed session for user 67890
```

## Implementation Flow

### Step 1: One-Time Authentication Setup

When a user first connects a platform in your SaaS:

```python
from saas_job_applier import JobApplicationService

service = JobApplicationService()

# User connects LinkedIn account
await service.setup_user_authentication(
    user_id="user_12345",
    platform="linkedin",
    credentials=None  # User logs in manually (recommended)
)
```

**What happens:**

1. Browser opens with a persistent profile for this user
2. User logs into LinkedIn manually
3. Browser saves the session (cookies, tokens, etc.)
4. Session is stored in `user_data/user_12345/linkedin/`
5. User only needs to do this ONCE per platform

### Step 2: Apply to Jobs (Reuses Session)

Now the user can apply to unlimited jobs without logging in again:

```python
# Apply to job - automatically uses saved login
await service.apply_to_job(
    user_id="user_12345",
    platform="linkedin",
    job_url="https://www.linkedin.com/jobs/view/123456789",
    candidate_data=CANDIDATE_DATA,
    cv_path="./resume.pdf"
)
```

**What happens:**

1. Browser loads the saved profile (already logged in)
2. Agent navigates to job URL
3. Agent fills application form
4. Agent submits application
5. No login required!

## Security Best Practices

### 1. Encrypt Profile Directories

```python
# Use encryption for stored profiles
import cryptography

# Encrypt user profile directory
encrypt_directory(f"user_data/user_{user_id}")
```

### 2. Session Expiration

```python
# Check if session is still valid
async def is_session_valid(user_id: str, platform: str) -> bool:
    # Try to access a protected page
    # If redirected to login, session expired
    pass
```

### 3. Secure Credential Storage

```python
# NEVER store passwords in plain text
# Use your SaaS's secure credential storage

# Option A: Let users login manually (most secure)
credentials = None

# Option B: If you must store credentials, encrypt them
from cryptography.fernet import Fernet
key = Fernet.generate_key()
cipher = Fernet(key)
encrypted_password = cipher.encrypt(password.encode())
```

### 4. User Isolation

```python
# Each user gets their own profile directory
# Profiles are never shared between users
user_profile = f"user_data/user_{user_id}/{platform}/"
```

## Handling Different Platforms

### LinkedIn

```python
await service.setup_user_authentication(
    user_id=user_id,
    platform="linkedin",
    credentials=None  # Manual login recommended
)
```

**Challenges:**

- 2FA is common
- Security checks for automation
- Session expires after ~30 days

**Solutions:**

- Let users login manually
- Handle 2FA prompts
- Refresh sessions periodically

### Indeed

```python
await service.setup_user_authentication(
    user_id=user_id,
    platform="indeed",
    credentials={'email': 'user@example.com', 'password': 'pass'}
)
```

**Challenges:**

- Email verification sometimes required
- Resume upload required

**Solutions:**

- Store resume in user profile
- Handle email verification flow

### Glassdoor

```python
await service.setup_user_authentication(
    user_id=user_id,
    platform="glassdoor",
    credentials={'email': 'user@example.com', 'password': 'pass'}
)
```

**Challenges:**

- Requires profile completion
- Company reviews required sometimes

**Solutions:**

- Complete profile during setup
- Skip review prompts

## SaaS Integration Example

### User Onboarding Flow

```python
# 1. User signs up to your SaaS
user_id = create_user(email="user@example.com")

# 2. User connects LinkedIn account
@app.route('/connect/linkedin')
async def connect_linkedin():
    await service.setup_user_authentication(
        user_id=current_user.id,
        platform="linkedin"
    )
    return {"status": "connected"}

# 3. User applies to jobs
@app.route('/apply')
async def apply_to_job():
    result = await service.apply_to_job(
        user_id=current_user.id,
        platform=request.json['platform'],
        job_url=request.json['job_url'],
        candidate_data=current_user.profile_data,
        cv_path=current_user.cv_path
    )
    return result
```

### Background Job Processing

```python
# Process applications in background queue
from celery import Celery

app = Celery('job_applications')

@app.task
async def process_application(user_id, platform, job_url):
    service = JobApplicationService()
    result = await service.apply_to_job(
        user_id=user_id,
        platform=platform,
        job_url=job_url,
        candidate_data=get_user_data(user_id),
        cv_path=get_user_cv(user_id)
    )

    # Notify user
    send_notification(user_id, result)
```

## Troubleshooting

### Session Expired

**Problem:** User's session expired, application fails

**Solution:**

```python
try:
    await service.apply_to_job(...)
except SessionExpiredError:
    # Notify user to re-authenticate
    send_notification(user_id, "Please reconnect your LinkedIn account")
```

### 2FA Required

**Problem:** Platform requires 2FA during login

**Solution:**

```python
# Give user time to complete 2FA
task = """
Login to platform.
If 2FA is required, wait 60 seconds for user to complete it.
"""
```

### Rate Limiting

**Problem:** Too many applications trigger rate limits

**Solution:**

```python
# Add delays between applications
await asyncio.sleep(random.randint(30, 60))

# Rotate between different user sessions
# Use different browser profiles
```

## Cost Optimization

### Reuse Browser Instances

```python
# Keep browser alive for multiple applications
browser = Browser(
    keep_alive=True,
    user_data_dir=profile_dir
)

# Apply to multiple jobs with same browser
for job in jobs:
    await apply_to_job(browser, job)
```

### Batch Processing

```python
# Process multiple applications in one session
results = await service.batch_apply(
    user_id=user_id,
    applications=[job1, job2, job3, ...]
)
```

## Monitoring & Analytics

```python
# Track application success rates
@app.task
async def track_application(user_id, platform, result):
    analytics.track({
        'user_id': user_id,
        'platform': platform,
        'status': result['status'],
        'timestamp': datetime.now()
    })
```

## Next Steps

1. **Test with one platform** (e.g., LinkedIn)
2. **Add session validation** (check if still logged in)
3. **Implement session refresh** (re-authenticate when expired)
4. **Add error handling** (handle platform-specific errors)
5. **Scale to multiple platforms** (Indeed, Glassdoor, etc.)
6. **Add monitoring** (track success rates, errors)

## Example: Complete SaaS Flow

```python
# 1. User Setup (One-time)
service = JobApplicationService()
await service.setup_user_authentication("user_123", "linkedin")

# 2. Apply to Jobs (Unlimited)
jobs = [
    "https://www.linkedin.com/jobs/view/123",
    "https://www.linkedin.com/jobs/view/456",
    "https://www.linkedin.com/jobs/view/789"
]

for job_url in jobs:
    result = await service.apply_to_job(
        user_id="user_123",
        platform="linkedin",
        job_url=job_url,
        candidate_data=CANDIDATE_DATA,
        cv_path="./resume.pdf"
    )
    print(f"Applied to {job_url}: {result['status']}")
```

## Summary

✅ **One-time authentication** per user per platform  
✅ **Persistent sessions** saved in isolated profiles  
✅ **Unlimited applications** without re-authentication  
✅ **Multi-user support** with isolated profiles  
✅ **Secure** with encryption and proper isolation  
✅ **Scalable** for SaaS with thousands of users

The key is using `user_data_dir` to create persistent browser profiles that save login sessions!
