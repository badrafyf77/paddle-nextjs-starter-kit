# Job Application Agent - Python Service

FastAPI service that wraps the browser automation agent for SaaS integration.

## Setup

1. **Create virtual environment:**

```bash
cd python-service
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. **Install dependencies:**

```bash
pip install -r requirements.txt
```

3. **Configure environment:**

```bash
cp .env.example .env
# Edit .env with your settings
```

4. **Run the service:**

```bash
python main.py
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## Endpoints

### `POST /connect-platform`

Connect user to a platform (LinkedIn, Indeed, etc.)

```json
{
  "user_id": "user_123",
  "platform": "linkedin",
  "credentials": null
}
```

### `POST /apply-job`

Apply to a single job

```json
{
  "user_id": "user_123",
  "platform": "linkedin",
  "job_url": "https://linkedin.com/jobs/view/123",
  "candidate_data": {...},
  "cv_path": "/path/to/cv.pdf"
}
```

### `GET /connection-status/{user_id}/{platform}`

Check if user is connected to a platform

### `DELETE /disconnect-platform/{user_id}/{platform}`

Disconnect user from a platform

## Testing

```bash
# Health check
curl http://localhost:8000/health

# List platforms
curl http://localhost:8000/platforms

# Check connection status
curl http://localhost:8000/connection-status/user_123/linkedin
```

## Development

The service automatically reloads when you make changes to the code.

## Storage

Browser sessions are stored in `./user_data/`:

```
user_data/
├── user_123/
│   ├── linkedin/
│   └── indeed/
└── user_456/
    └── linkedin/
```
