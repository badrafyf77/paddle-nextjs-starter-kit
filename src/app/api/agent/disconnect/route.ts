import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const AGENT_API_URL = process.env.AGENT_API_URL || 'http://localhost:8000';

export async function DELETE(request: NextRequest) {
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

    // Call Python agent service to disconnect
    const response = await fetch(`${AGENT_API_URL}/disconnect-platform/${user.id}/${platform}`, {
      method: 'DELETE',
    });

    const data = await response.json();

    if (data.status === 'success') {
      // Update Supabase
      await supabase
        .from('platform_connections')
        .update({
          is_connected: false,
        })
        .eq('user_id', user.id)
        .eq('platform', platform);
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error disconnecting platform:', error);
    return NextResponse.json({ error: 'Failed to disconnect platform' }, { status: 500 });
  }
}
