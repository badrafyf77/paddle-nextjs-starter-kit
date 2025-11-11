'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, Edit3, Sparkles } from 'lucide-react';

interface Props {
  onSelect: (method: 'cv' | 'manual') => void;
}

export function ProfileMethodSelector({ onSelect }: Props) {
  return (
    <div className="space-y-6">
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">How would you like to complete your profile?</CardTitle>
          <CardDescription className="mt-2">Choose the method that works best for you</CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CV Upload Option */}
        <Card
          className="bg-background/50 backdrop-blur-[24px] border-border hover:border-primary transition-all cursor-pointer group"
          onClick={() => onSelect('cv')}
        >
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Upload className="text-primary" size={32} />
            </div>
            <CardTitle className="text-xl flex items-center gap-2">
              Upload CV
              <Sparkles className="text-primary" size={18} />
            </CardTitle>
            <CardDescription className="mt-2">
              Let AI extract all your information from your CV automatically
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Fast and automatic extraction</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>AI-powered parsing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Review and edit after upload</span>
              </li>
            </ul>
            <Button className="w-full" size="lg">
              Upload CV
            </Button>
          </CardContent>
        </Card>

        {/* Manual Entry Option */}
        <Card
          className="bg-background/50 backdrop-blur-[24px] border-border hover:border-primary transition-all cursor-pointer group"
          onClick={() => onSelect('manual')}
        >
          <CardHeader>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
              <Edit3 className="text-primary" size={32} />
            </div>
            <CardTitle className="text-xl">Fill Manually</CardTitle>
            <CardDescription className="mt-2">Enter your information step by step using our form</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground mb-6">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Full control over your data</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>Guided step-by-step process</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">✓</span>
                <span>No CV required</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full" size="lg">
              Fill Manually
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
