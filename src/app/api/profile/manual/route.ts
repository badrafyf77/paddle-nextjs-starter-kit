import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { personal_info, experiences, education, skills, languages } = body;

    // Update profile with completion status
    await supabase
      .from('user_profiles')
      .update({
        is_profile_complete: true,
        profile_source: 'manual',
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Insert experiences
    if (experiences && experiences.length > 0) {
      const experiencesData = experiences.map((exp: any, index: number) => ({
        user_id: user.id,
        title: exp.title,
        company: exp.company,
        location: exp.location,
        start_date: exp.start_date,
        end_date: exp.end_date,
        is_current: exp.is_current || false,
        description: exp.description,
        display_order: index,
      }));

      await supabase.from('work_experiences').delete().eq('user_id', user.id);
      await supabase.from('work_experiences').insert(experiencesData);
    }

    // Insert education
    if (education && education.length > 0) {
      const educationData = education.map((edu: any, index: number) => ({
        user_id: user.id,
        degree: edu.degree,
        major: edu.major,
        institution: edu.institution,
        graduation_year: edu.graduation_year,
        description: edu.description,
        display_order: index,
      }));

      await supabase.from('education').delete().eq('user_id', user.id);
      await supabase.from('education').insert(educationData);
    }

    // Insert skills
    if (skills) {
      const skillsData = [];
      if (skills.programming) {
        skills.programming.split(',').forEach((skill: string) => {
          skillsData.push({
            user_id: user.id,
            category: 'programming',
            skill_name: skill.trim(),
          });
        });
      }
      if (skills.frameworks) {
        skills.frameworks.split(',').forEach((skill: string) => {
          skillsData.push({
            user_id: user.id,
            category: 'frameworks',
            skill_name: skill.trim(),
          });
        });
      }
      if (skills.tools) {
        skills.tools.split(',').forEach((skill: string) => {
          skillsData.push({
            user_id: user.id,
            category: 'tools',
            skill_name: skill.trim(),
          });
        });
      }
      if (skills.other) {
        skills.other.split(',').forEach((skill: string) => {
          skillsData.push({
            user_id: user.id,
            category: 'other',
            skill_name: skill.trim(),
          });
        });
      }

      if (skillsData.length > 0) {
        await supabase.from('user_skills').delete().eq('user_id', user.id);
        await supabase.from('user_skills').insert(skillsData);
      }
    }

    // Insert languages
    if (languages && languages.length > 0) {
      const languagesData = languages.map((lang: any) => ({
        user_id: user.id,
        language: lang.language,
        proficiency: lang.proficiency,
      }));

      await supabase.from('user_languages').delete().eq('user_id', user.id);
      await supabase.from('user_languages').insert(languagesData);
    }

    // Fetch complete profile
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();

    const { data: experiencesData } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    const { data: educationData } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    const { data: skillsData } = await supabase.from('user_skills').select('*').eq('user_id', user.id);

    const { data: languagesData } = await supabase.from('user_languages').select('*').eq('user_id', user.id);

    return NextResponse.json({
      success: true,
      profile,
      experiences: experiencesData,
      education: educationData,
      skills: skillsData,
      languages: languagesData,
    });
  } catch (error) {
    console.error('Error saving manual profile:', error);
    return NextResponse.json({ error: 'Failed to save profile' }, { status: 500 });
  }
}
