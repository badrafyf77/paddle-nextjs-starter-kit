# LinkedIn Job Application Automation

## Quick Start

### Step 1: Run the Script

```bash
python linkedin_job_applier.py
```

### Step 2: Login to LinkedIn (One-Time)

1. Browser will open LinkedIn login page
2. **Login manually** with your credentials
3. Complete 2FA if required
4. Wait for the page to load
5. Session will be saved automatically

### Step 3: Automatic Job Applications

The agent will:

1. Search for "mobile developer" jobs in Morocco
2. Filter for "Easy Apply" jobs
3. Apply to 5 jobs automatically
4. Fill forms with your information
5. Upload your CV
6. Submit applications

## What Happens

### First Run (Login Required)

```
🔐 Opening LinkedIn login page...
👉 Please login manually
⏳ Waiting for you to complete login...
✅ Login successful!
💾 Session saved to: linkedin_profiles/afyf_badreddine/
```

### Subsequent Runs (No Login Needed!)

```
✅ Found existing LinkedIn session!
💡 Skipping login step...
🔍 Searching for mobile developer jobs...
📝 Applying to job 1/5...
📝 Applying to job 2/5...
...
✅ All applications completed!
```

## Your Information

The agent will use this information from your CV:

- **Name**: Afyf Badreddine
- **Email**: afyfbadreddine@gmail.com
- **Phone**: +212-707314877
- **Location**: Berrechid, Maroc
- **LinkedIn**: linkedin.com/in/badrafyf77
- **Position**: AI Engineer
- **Experience**: 2 years
- **Education**: Licence d'Excellence en Intelligence Artificielle
- **Skills**: Python, Dart, Flutter, PyTorch, TensorFlow, etc.
- **CV**: CV.pdf

## Configuration

Edit `linkedin_job_applier.py` to change:

```python
JOB_TITLE = "mobile developer"  # Change to your target job
LOCATION = "Morocco"            # Change to your location
NUM_APPLICATIONS = 5            # Change number of applications
```

## How It Works

### Session Management

```
linkedin_profiles/
└── afyf_badreddine/
    ├── Default/
    │   ├── Cookies          # Your login session
    │   ├── Local Storage    # LinkedIn data
    │   └── ...
```

Your login session is saved here. You only need to login ONCE!

### Easy Apply Feature

The agent focuses on "Easy Apply" jobs because:

- ✅ Quick application (1-2 minutes per job)
- ✅ No external websites
- ✅ Standardized forms
- ✅ Higher success rate

### Application Process

For each job:

1. Click on job posting
2. Click "Easy Apply" button
3. Fill form fields:
   - Name, email, phone
   - Years of experience
   - Current company
   - Education
4. Upload CV (CV.pdf)
5. Write brief message if required
6. Submit application
7. Move to next job

## Troubleshooting

### "No existing session found"

**Solution**: You need to login first. The script will open LinkedIn login page.

### "Session expired"

**Solution**: Delete the profile folder and login again:

```bash
rm -rf linkedin_profiles/afyf_badreddine/
python linkedin_job_applier.py
```

### "CV file not found"

**Solution**: Make sure CV.pdf is in the same directory:

```bash
ls CV.pdf  # Should show the file
```

### "Easy Apply button not found"

**Solution**: The job doesn't support Easy Apply. Agent will skip it and move to next job.

### Agent is stuck

**Solution**:

- Press Ctrl+C to stop
- Check the browser window to see what's happening
- Restart the script

## Tips

### 1. Start Small

First run with 2-3 applications to test:

```python
NUM_APPLICATIONS = 2
```

### 2. Watch the First Run

Keep `headless=False` to watch the agent work:

```python
browser = Browser(
    headless=False,  # Watch the browser
    ...
)
```

### 3. Customize Job Search

```python
# Search for different roles
JOB_TITLE = "flutter developer"
JOB_TITLE = "mobile app developer"
JOB_TITLE = "AI engineer"

# Search in different locations
LOCATION = "Casablanca, Morocco"
LOCATION = "Remote"
LOCATION = "France"
```

### 4. Apply to More Jobs

```python
NUM_APPLICATIONS = 10  # Apply to 10 jobs
NUM_APPLICATIONS = 20  # Apply to 20 jobs
```

### 5. Run Multiple Times

```bash
# First run: Apply to 5 jobs
python linkedin_job_applier.py

# Wait a few hours, then run again
python linkedin_job_applier.py
```

## Advanced Usage

### Skip Login (If Already Logged In)

```python
await applier.run_full_process(
    job_title="mobile developer",
    location="Morocco",
    num_applications=5,
    skip_login=True  # Skip login step
)
```

### Apply to Multiple Job Types

```python
job_titles = [
    "mobile developer",
    "flutter developer",
    "react native developer",
    "iOS developer",
    "android developer"
]

for job_title in job_titles:
    await applier.search_and_apply_to_jobs(
        job_title=job_title,
        location="Morocco",
        num_applications=3
    )
```

### Different Locations

```python
locations = [
    "Morocco",
    "Remote",
    "France",
    "United Arab Emirates"
]

for location in locations:
    await applier.search_and_apply_to_jobs(
        job_title="mobile developer",
        location=location,
        num_applications=2
    )
```

## Expected Results

### Success Output

```
✅ JOB APPLICATION PROCESS COMPLETED!
================================================================================

Applied to 5 jobs:
1. Mobile Developer at Company A - ✅ Submitted
2. Flutter Developer at Company B - ✅ Submitted
3. iOS Developer at Company C - ✅ Submitted
4. React Native Developer at Company D - ✅ Submitted
5. Mobile App Developer at Company E - ✅ Submitted

Skipped 2 jobs:
- Job X: No Easy Apply option
- Job Y: Required external application
```

## Safety & Best Practices

### 1. Rate Limiting

LinkedIn may limit applications. Recommended:

- Max 10-20 applications per day
- Wait 2-3 hours between batches
- Don't apply to same company multiple times

### 2. Quality Over Quantity

- Review job descriptions before mass applying
- Customize your CV for different roles
- Write personalized messages when possible

### 3. Monitor Applications

Check LinkedIn to see:

- Which applications were submitted
- Company responses
- Interview invitations

### 4. Session Security

- Don't share your profile folder
- Keep your login credentials secure
- Logout from LinkedIn on shared computers

## Next Steps

1. **Test with 2 applications** first
2. **Review the results** on LinkedIn
3. **Increase to 5-10 applications** if successful
4. **Run daily** to apply to new jobs
5. **Track your success rate**

## Support

If you encounter issues:

1. Check the browser window to see what's happening
2. Read the error messages carefully
3. Try with fewer applications first
4. Make sure CV.pdf exists and is valid

---

**Good luck with your job search! 🚀**
