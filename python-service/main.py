"""
FastAPI Service for Job Application Automation
Wraps the browser-use agent for SaaS integration
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, List
import os
from pathlib import Path
from dotenv import load_dotenv

# Import your existing agent service
import sys
sys.path.append(str(Path(__file__).parent.parent / "docs" / "browser-use"))
from saas_job_applier import JobApplicationService

load_dotenv()

app = FastAPI(title="Job Application Agent API", version="1.0.0")

# CORS - Allow Next.js to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],  # Next.js dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize service
USER_DATA_DIR = os.getenv("USER_DATA_DIR", "./user_data")
job_service = JobApplicationService(base_storage_dir=USER_DATA_DIR)

# Track active sessions (in-memory for now)
active_sessions: Dict[str, dict] = {}


# ============================================================================
# Request/Response Models
# ============================================================================

class ConnectPlatformRequest(BaseModel):
    user_id: str
    platform: str  # 'linkedin', 'indeed', 'glassdoor'
    credentials: Optional[Dict[str, str]] = None  # Optional for manual login


class ApplyJobRequest(BaseModel):
    user_id: str
    platform: str
    job_url: str
    candidate_data: Dict
    cv_path: Optional[str] = None


class BatchApplyRequest(BaseModel):
    user_id: str
    applications: List[Dict]  # List of ApplyJobRequest-like dicts


class StatusResponse(BaseModel):
    status: str
    message: str
    data: Optional[Dict] = None


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/")
async def root():
    """Health check"""
    return {
        "service": "Job Application Agent API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "healthy"}


@app.post("/connect-platform")
async def connect_platform(request: ConnectPlatformRequest, background_tasks: BackgroundTasks):
    """
    Connect user to a platform (LinkedIn, Indeed, etc.)
    This opens a browser for the user to login manually
    Session is saved for future use
    """
    try:
        # Start authentication in background
        session_id = f"{request.user_id}_{request.platform}"
        active_sessions[session_id] = {
            "status": "connecting",
            "user_id": request.user_id,
            "platform": request.platform
        }
        
        # Run authentication
        success = await job_service.setup_user_authentication(
            user_id=request.user_id,
            platform=request.platform,
            credentials=request.credentials
        )
        
        if success:
            active_sessions[session_id]["status"] = "connected"
            return StatusResponse(
                status="success",
                message=f"Successfully connected to {request.platform}",
                data={"session_id": session_id}
            )
        else:
            active_sessions[session_id]["status"] = "failed"
            raise HTTPException(status_code=400, detail="Authentication failed")
            
    except Exception as e:
        return StatusResponse(
            status="error",
            message=str(e)
        )


@app.post("/apply-job")
async def apply_job(request: ApplyJobRequest):
    """
    Apply to a single job
    Uses saved session (user must be connected first)
    """
    try:
        # Check if user is connected to platform
        profile_dir = job_service.get_user_profile_dir(request.user_id, request.platform)
        if not Path(profile_dir).exists():
            raise HTTPException(
                status_code=400,
                detail=f"User not connected to {request.platform}. Please connect first."
            )
        
        # Apply to job
        result = await job_service.apply_to_job(
            user_id=request.user_id,
            platform=request.platform,
            job_url=request.job_url,
            candidate_data=request.candidate_data,
            cv_path=request.cv_path
        )
        
        return StatusResponse(
            status="success",
            message="Job application completed",
            data=result
        )
        
    except Exception as e:
        return StatusResponse(
            status="error",
            message=str(e)
        )


@app.post("/batch-apply")
async def batch_apply(request: BatchApplyRequest):
    """
    Apply to multiple jobs in batch
    """
    try:
        results = await job_service.batch_apply(
            user_id=request.user_id,
            applications=request.applications
        )
        
        return StatusResponse(
            status="success",
            message=f"Batch application completed. {len(results)} jobs processed.",
            data={"results": results}
        )
        
    except Exception as e:
        return StatusResponse(
            status="error",
            message=str(e)
        )


@app.get("/connection-status/{user_id}/{platform}")
async def connection_status(user_id: str, platform: str):
    """
    Check if user is connected to a platform
    """
    try:
        profile_dir = job_service.get_user_profile_dir(user_id, platform)
        is_connected = Path(profile_dir).exists() and any(Path(profile_dir).iterdir())
        
        return StatusResponse(
            status="success",
            message="Connection status retrieved",
            data={
                "user_id": user_id,
                "platform": platform,
                "is_connected": is_connected,
                "profile_path": profile_dir
            }
        )
        
    except Exception as e:
        return StatusResponse(
            status="error",
            message=str(e)
        )


@app.delete("/disconnect-platform/{user_id}/{platform}")
async def disconnect_platform(user_id: str, platform: str):
    """
    Disconnect user from a platform (delete saved session)
    """
    try:
        profile_dir = Path(job_service.get_user_profile_dir(user_id, platform))
        
        if profile_dir.exists():
            import shutil
            shutil.rmtree(profile_dir)
            
            return StatusResponse(
                status="success",
                message=f"Disconnected from {platform}"
            )
        else:
            raise HTTPException(status_code=404, detail="Connection not found")
            
    except Exception as e:
        return StatusResponse(
            status="error",
            message=str(e)
        )


@app.get("/platforms")
async def list_platforms():
    """
    List available platforms
    """
    return {
        "platforms": [
            {"id": "linkedin", "name": "LinkedIn", "supported": True},
            {"id": "indeed", "name": "Indeed", "supported": True},
            {"id": "glassdoor", "name": "Glassdoor", "supported": True},
            {"id": "wellfound", "name": "Wellfound", "supported": True},
        ]
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
