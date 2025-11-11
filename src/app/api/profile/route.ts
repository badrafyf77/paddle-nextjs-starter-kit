import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    if (!profile) {
      return NextResponse.json({ profile: null });
    }

    // Get experiences
    const { data: experiences } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    // Get education
    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    // Get skills
    const { data: skills } = await supabase.from('user_skills').select('*').eq('user_id', user.id);

    // Get languages
    const { data: languages } = await supabase.from('user_languages').select('*').eq('user_id', user.id);

    // Get projects
    const { data: projects } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order', { ascending: true });

    // Get documents
    const { data: documents } = await supabase.from('user_documents').select('*').eq('user_id', user.id);

    return NextResponse.json({
      profile,
      experiences: experiences || [],
      education: education || [],
      skills: skills || [],
      languages: languages || [],
      projects: projects || [],
      documents: documents || [],
    });
  } catch (error) {
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
