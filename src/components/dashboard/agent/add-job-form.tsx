'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { Loader2 } from 'lucide-react';

export function AddJobForm() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    platform: '',
    job_url: '',
    job_title: '',
    company_name: '',
  });
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.platform || !formData.job_url) {
      toast({
        title: 'Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      // For now, just create the application record
      // The actual application will be processed by the agent
      const response = await fetch('/api/agent/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          candidate_data: {
            personal: {
              first_name: 'User',
              last_name: 'Name',
              email: 'user@example.com',
              phone: '+1234567890',
              city: 'City',
              country: 'Country',
            },
            experience: {
              years_of_experience: '2',
              current_position: 'Position',
              current_company: 'Company',
            },
            education: {
              degree: 'Degree',
              major: 'Major',
              university: 'University',
              graduation_year: '2024',
            },
            skills: {
              programming_languages: 'JavaScript, Python',
            },
          },
        }),
      });

      const data = await response.json();

      if (data.status === 'success' || response.ok) {
        toast({
          title: 'Success',
          description: 'Job application submitted successfully!',
        });

        // Reset form
        setFormData({
          platform: '',
          job_url: '',
          job_title: '',
          company_name: '',
        });
      } else {
        toast({
          title: 'Error',
          description: data.message || 'Failed to submit application',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit application',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Add Job Application</CardTitle>
        <CardDescription>Add a job URL and the AI agent will automatically apply on your behalf</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="platform">Platform *</Label>
            <Select value={formData.platform} onValueChange={(value) => setFormData({ ...formData, platform: value })}>
              <SelectTrigger id="platform">
                <SelectValue placeholder="Select platform" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="indeed">Indeed</SelectItem>
                <SelectItem value="glassdoor">Glassdoor</SelectItem>
                <SelectItem value="wellfound">Wellfound</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_url">Job URL *</Label>
            <Input
              id="job_url"
              type="url"
              placeholder="https://linkedin.com/jobs/view/123456789"
              value={formData.job_url}
              onChange={(e) => setFormData({ ...formData, job_url: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job_title">Job Title (Optional)</Label>
            <Input
              id="job_title"
              placeholder="e.g. Senior Software Engineer"
              value={formData.job_title}
              onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company_name">Company Name (Optional)</Label>
            <Input
              id="company_name"
              placeholder="e.g. Google"
              value={formData.company_name}
              onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Application'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
