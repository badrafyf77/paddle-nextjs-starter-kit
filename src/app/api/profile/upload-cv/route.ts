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

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 });
    }

    // Generate unique file name
    const timestamp = Date.now();
    const fileName = `${user.id}/cv/${timestamp}_${file.name}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(fileName, file, {
        contentType: 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('user-documents').getPublicUrl(fileName);

    // Save document record
    const { data: document, error: docError } = await supabase
      .from('user_documents')
      .insert({
        user_id: user.id,
        document_type: 'cv',
        file_name: file.name,
        file_path: fileName,
        file_size: file.size,
        is_default: true,
      })
      .select()
      .single();

    if (docError) {
      throw docError;
    }

    return NextResponse.json({
      success: true,
      file_path: fileName,
      public_url: publicUrl,
      document_id: document.id,
    });
  } catch (error) {
    console.error('Error uploading CV:', error);
    return NextResponse.json({ error: 'Failed to upload CV' }, { status: 500 });
  }
}
