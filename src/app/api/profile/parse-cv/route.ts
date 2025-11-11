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
    const { file_path, personal_info } = body;

    if (!file_path) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // Download the file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage.from('user-documents').download(file_path);

    if (downloadError) {
      throw downloadError;
    }

    // Convert file to base64 or text for AI parsing
    const arrayBuffer = await fileData.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // TODO: Integrate with your AI service to parse the CV
    // For now, we'll use a placeholder that you'll need to implement
    // You can use OpenAI, Anthropic, or your own AI service

    const parsedData = await parseCV(buffer, personal_info);

    // Update profile with parsed data
    await supabase
      .from('user_profiles')
      .update({
        is_profile_complete: true,
        profile_source: 'cv_upload',
        years_of_experience: parsedData.years_of_experience,
        current_position: parsedData.current_position,
        current_company: parsedData.current_company,
        profile_summary: parsedData.profile_summary,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id);

    // Insert experiences
    if (parsedData.experiences && parsedData.experiences.length > 0) {
      const experiencesData = parsedData.experiences.map((exp: any, index: number) => ({
        user_id: user.id,
        ...exp,
        display_order: index,
      }));

      await supabase.from('work_experiences').delete().eq('user_id', user.id);
      await supabase.from('work_experiences').insert(experiencesData);
    }

    // Insert education
    if (parsedData.education && parsedData.education.length > 0) {
      const educationData = parsedData.education.map((edu: any, index: number) => ({
        user_id: user.id,
        ...edu,
        display_order: index,
      }));

      await supabase.from('education').delete().eq('user_id', user.id);
      await supabase.from('education').insert(educationData);
    }

    // Insert skills
    if (parsedData.skills && parsedData.skills.length > 0) {
      const skillsData = parsedData.skills.map((skill: any) => ({
        user_id: user.id,
        ...skill,
      }));

      await supabase.from('user_skills').delete().eq('user_id', user.id);
      await supabase.from('user_skills').insert(skillsData);
    }

    // Insert languages
    if (parsedData.languages && parsedData.languages.length > 0) {
      const languagesData = parsedData.languages.map((lang: any) => ({
        user_id: user.id,
        ...lang,
      }));

      await supabase.from('user_languages').delete().eq('user_id', user.id);
      await supabase.from('user_languages').insert(languagesData);
    }

    // Insert projects
    if (parsedData.projects && parsedData.projects.length > 0) {
      const projectsData = parsedData.projects.map((project: any, index: number) => ({
        user_id: user.id,
        ...project,
        display_order: index,
      }));

      await supabase.from('user_projects').delete().eq('user_id', user.id);
      await supabase.from('user_projects').insert(projectsData);
    }

    // Update document with parsed timestamp
    await supabase
      .from('user_documents')
      .update({ parsed_at: new Date().toISOString() })
      .eq('file_path', file_path)
      .eq('user_id', user.id);

    // Fetch complete profile
    const { data: profile } = await supabase.from('user_profiles').select('*').eq('user_id', user.id).single();

    const { data: experiences } = await supabase
      .from('work_experiences')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    const { data: education } = await supabase
      .from('education')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    const { data: skills } = await supabase.from('user_skills').select('*').eq('user_id', user.id);

    const { data: languages } = await supabase.from('user_languages').select('*').eq('user_id', user.id);

    const { data: projects } = await supabase
      .from('user_projects')
      .select('*')
      .eq('user_id', user.id)
      .order('display_order');

    return NextResponse.json({
      success: true,
      profile,
      experiences,
      education,
      skills,
      languages,
      projects,
    });
  } catch (error) {
    console.error('Error parsing CV:', error);
    return NextResponse.json({ error: 'Failed to parse CV' }, { status: 500 });
  }
}

// Placeholder function - you need to implement this with your AI service
async function parseCV(buffer: Buffer, personalInfo: any) {
  // TODO: Implement CV parsing with AI
  // You can use OpenAI GPT-4, Anthropic Claude, or your own service
  // For now, returning a mock structure

  // Example implementation with OpenAI:
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const pdfText = await extractTextFromPDF(buffer);
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4",
  //   messages: [
  //     { role: "system", content: "You are a CV parser. Extract structured data from the CV text." },
  //     { role: "user", content: `Parse this CV and return JSON: ${pdfText}` }
  //   ]
  // });

  return {
    years_of_experience: 2,
    current_position: 'Software Engineer',
    current_company: 'Tech Company',
    profile_summary: 'Experienced software engineer...',
    experiences: [
      {
        title: 'Software Engineer',
        company: 'Tech Company',
        location: 'City, Country',
        start_date: '2022',
        end_date: 'Present',
        is_current: true,
        description: 'Working on various projects...',
      },
    ],
    education: [
      {
        degree: "Bachelor's Degree",
        major: 'Computer Science',
        institution: 'University',
        graduation_year: '2022',
      },
    ],
    skills: [
      { category: 'programming', skill_name: 'JavaScript' },
      { category: 'programming', skill_name: 'Python' },
      { category: 'frameworks', skill_name: 'React' },
    ],
    languages: [
      { language: 'English', proficiency: 'Native' },
      { language: 'French', proficiency: 'B2' },
    ],
    projects: [],
  };
}
