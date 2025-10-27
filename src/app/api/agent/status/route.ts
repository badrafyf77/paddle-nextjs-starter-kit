import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const platform = searchParams.get('platform');

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // Check connection status from Python service
    const response = await fetch(`${AGENT_API_URL}/connection-status/${user.id}/${platform}`);
    const data = await response.json();

    // Sync with Supabase
    if (data.status === 'success' && data.data) {
      await supabase.from('platform_connections').upsert({
        user_id: user.id,
        platform: platform,
        is_connected: data.data.is_connected,
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error checking status:', error);
    return NextResponse.json({ error: 'Failed to check status' }, { status: 500 });
  }
}
