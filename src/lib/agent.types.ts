// Types for Job Application Agent

export interface CandidateProfile {
  personal: {
    first_name: string;
    last_name: string;
    full_name: string;
    email: string;
    phone: string;
    city: string;
    country: string;
    linkedin?: string;
    github?: string;
  };
  experience: {
    years_of_experience: string;
    current_position: string;
    current_company: string;
  };
  education: {
    degree: string;
    major: string;
    university: string;
    graduation_year: string;
  };
  skills: {
    programming_languages: string;
    ai_frameworks?: string;
    frameworks?: string;
    tools?: string;
  };
}

export interface Platform {
  id: string;
  name: string;
  supported: boolean;
}

export interface PlatformConnection {
  user_id: string;
  platform: string;
  is_connected: boolean;
  profile_path?: string;
}

export interface JobApplication {
  user_id: string;
  platform: string;
  job_url: string;
  job_title?: string;
  company_name?: string;
  status: 'pending' | 'processing' | 'submitted' | 'failed';
  applied_at?: string;
  error_message?: string;
}

export interface AgentResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
}
