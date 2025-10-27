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
    const { platform } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform is required' }, { status: 400 });
    }

    // Call Python agent service
    const response = await fetch(`${AGENT_API_URL}/connect-platform`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        user_id: user.id,
        platform: platform,
        credentials: null, // Manual login for security
      }),
    });

    const data = await response.json();

    if (data.status === 'success') {
      // Update Supabase with connection status
      await supabase.from('platform_connections').upsert({
        user_id: user.id,
        platform: platform,
        is_connected: true,
        connected_at: new Date().toISOString(),
      });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error connecting platform:', error);
    return NextResponse.json({ error: 'Failed to connect platform' }, { status: 500 });
  }
}
