'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  personalInfo: any;
  onComplete: (data: any) => void;
}

export function CVUploadForm({ personalInfo, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'parsing' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: 'Error',
          description: 'Please upload a PDF file',
          variant: 'destructive',
        });
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: 'Error',
          description: 'File size must be less than 10MB',
          variant: 'destructive',
        });
        return;
      }
      setFile(selectedFile);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setUploadStatus('uploading');

    try {
      // Upload file to Supabase Storage
      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch('/api/profile/upload-cv', {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload CV');
      }

      const uploadData = await uploadResponse.json();
      setUploadStatus('parsing');

      // Parse CV with AI
      const parseResponse = await fetch('/api/profile/parse-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_path: uploadData.file_path,
          personal_info: personalInfo,
        }),
      });

      if (!parseResponse.ok) {
        throw new Error('Failed to parse CV');
      }

      const parsedData = await parseResponse.json();
      setUploadStatus('success');

      toast({
        title: 'Success',
        description: 'CV uploaded and parsed successfully!',
      });

      // Wait a moment to show success state
      setTimeout(() => {
        onComplete(parsedData);
      }, 1000);
    } catch (error) {
      console.error('Error uploading CV:', error);
      setUploadStatus('error');
      toast({
        title: 'Error',
        description: 'Failed to upload and parse CV',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="text-primary" size={24} />
          </div>
          <div>
            <CardTitle className="text-2xl">Upload Your CV</CardTitle>
            <CardDescription className="mt-1">Upload your CV and let AI extract all the information</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
            file ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
            disabled={loading}
          />

          {!file ? (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <FileText className="text-primary" size={32} />
              </div>
              <div>
                <p className="text-lg font-medium mb-2">Drop your CV here or click to browse</p>
                <p className="text-sm text-muted-foreground">PDF format, max 10MB</p>
              </div>
              <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="lg">
                Select File
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                {uploadStatus === 'success' ? (
                  <CheckCircle2 className="text-green-500" size={32} />
                ) : uploadStatus === 'error' ? (
                  <AlertCircle className="text-destructive" size={32} />
                ) : (
                  <FileText className="text-primary" size={32} />
                )}
              </div>
              <div>
                <p className="text-lg font-medium mb-1">{file.name}</p>
                <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
              </div>
              {uploadStatus === 'idle' && (
                <div className="flex gap-3 justify-center">
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                    Change File
                  </Button>
                  <Button onClick={handleUpload} disabled={loading}>
                    Upload & Parse
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Status Messages */}
        {uploadStatus === 'uploading' && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
            <Loader2 className="animate-spin text-primary" size={20} />
            <div>
              <p className="font-medium">Uploading your CV...</p>
              <p className="text-sm text-muted-foreground">Please wait</p>
            </div>
          </div>
        )}

        {uploadStatus === 'parsing' && (
          <div className="flex items-center gap-3 p-4 bg-primary/10 rounded-lg">
            <Loader2 className="animate-spin text-primary" size={20} />
            <div>
              <p className="font-medium">Parsing your CV with AI...</p>
              <p className="text-sm text-muted-foreground">Extracting experience, education, skills, and more</p>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="flex items-center gap-3 p-4 bg-green-500/10 rounded-lg">
            <CheckCircle2 className="text-green-500" size={20} />
            <div>
              <p className="font-medium">CV parsed successfully!</p>
              <p className="text-sm text-muted-foreground">Redirecting to preview...</p>
            </div>
          </div>
        )}

        {uploadStatus === 'error' && (
          <div className="flex items-center gap-3 p-4 bg-destructive/10 rounded-lg">
            <AlertCircle className="text-destructive" size={20} />
            <div>
              <p className="font-medium">Failed to parse CV</p>
              <p className="text-sm text-muted-foreground">Please try again or fill manually</p>
            </div>
          </div>
        )}

        {/* Info */}
        <div className="bg-muted/50 rounded-lg p-4 space-y-2">
          <p className="text-sm font-medium">What we'll extract:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Work experience and job history</li>
            <li>• Education and qualifications</li>
            <li>• Skills and technologies</li>
            <li>• Languages and proficiency levels</li>
            <li>• Projects and achievements</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
