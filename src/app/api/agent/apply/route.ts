import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { platform, job_url, job_title, company_name, candidate_data, cv_path } = body;

    if (!platform || !job_url || !candidate_data) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Create job application record
    const { data: jobApp, error: insertError } = await supabase
      .from('job_applications')
      .insert({
        user_id: user.id,
        platform: platform,
        job_url: job_url,
        job_title: job_title,
        company_name: company_name,
        status: 'pending',
      })
      .select()
      .single();

    if (insertError) {
      throw insertError;
    }

    // Call Python agent service to apply
    const response = await fetch(`${AGENT_API_URL}/apply-job`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        platform: platform,
        job_url: job_url,
        candidate_data: candidate_data,
        cv_path: cv_path,
      }),
    });

    const data = await response.json();

    // Update job application status
    const newStatus = data.status === 'success' ? 'submitted' : 'failed';
    await supabase
      .from('job_applications')
      .update({
        status: newStatus,
        applied_at: newStatus === 'submitted' ? new Date().toISOString() : null,
        error_message: data.status === 'error' ? data.message : null,
      })
      .eq('id', jobApp.id);

    return NextResponse.json({
      ...data,
      application_id: jobApp.id,
    });
  } catch (error) {
    console.error('Error applying to job:', error);
    return NextResponse.json({ error: 'Failed to apply to job' }, { status: 500 });
  }
}
