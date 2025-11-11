'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PersonalInfoForm } from './personal-info-form';
import { ProfileMethodSelector } from './profile-method-selector';
import { ManualProfileForm } from './manual-profile-form';
import { CVUploadForm } from './cv-upload-form';
import { ProfilePreview } from './profile-preview';
import { useToast } from '@/components/ui/use-toast';
import { CheckCircle2 } from 'lucide-react';

type ProfileMethod = 'none' | 'cv' | 'manual';
type SetupStep = 'personal' | 'method' | 'details' | 'preview';

export function ProfileSetup() {
  const [currentStep, setCurrentStep] = useState<SetupStep>('personal');
  const [profileMethod, setProfileMethod] = useState<ProfileMethod>('none');
  const [personalInfo, setPersonalInfo] = useState<any>(null);
  const [profileData, setProfileData] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Check if user already has a profile
    checkExistingProfile();
  }, []);

  const checkExistingProfile = async () => {
    try {
      const response = await fetch('/api/profile');
      if (response.ok) {
        const data = await response.json();
        if (data.profile) {
          setPersonalInfo(data.profile);
          setProfileData(data);
          setCurrentStep('preview');
        }
      }
    } catch (error) {
      console.error('Error checking profile:', error);
    }
  };

  const handlePersonalInfoComplete = (data: any) => {
    setPersonalInfo(data);
    setCurrentStep('method');
  };

  const handleMethodSelect = (method: ProfileMethod) => {
    setProfileMethod(method);
    setCurrentStep('details');
  };

  const handleProfileComplete = (data: any) => {
    setProfileData(data);
    setCurrentStep('preview');
    toast({
      title: 'Success',
      description: 'Profile completed successfully!',
    });
  };

  return (
    <div className="max-w-5xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[
            { key: 'personal', label: 'Personal Info' },
            { key: 'method', label: 'Choose Method' },
            { key: 'details', label: 'Profile Details' },
            { key: 'preview', label: 'Preview' },
          ].map((step, index) => (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                    currentStep === step.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : index < ['personal', 'method', 'details', 'preview'].indexOf(currentStep)
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground'
                  }`}
                >
                  {index < ['personal', 'method', 'details', 'preview'].indexOf(currentStep) ? (
                    <CheckCircle2 size={20} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span className="text-xs mt-2 text-center">{step.label}</span>
              </div>
              {index < 3 && (
                <div
                  className={`h-[2px] flex-1 ${
                    index < ['personal', 'method', 'details', 'preview'].indexOf(currentStep)
                      ? 'bg-primary'
                      : 'bg-border'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      {currentStep === 'personal' && <PersonalInfoForm onComplete={handlePersonalInfoComplete} />}

      {currentStep === 'method' && <ProfileMethodSelector onSelect={handleMethodSelect} />}

      {currentStep === 'details' && profileMethod === 'cv' && (
        <CVUploadForm personalInfo={personalInfo} onComplete={handleProfileComplete} />
      )}

      {currentStep === 'details' && profileMethod === 'manual' && (
        <ManualProfileForm personalInfo={personalInfo} onComplete={handleProfileComplete} />
      )}

      {currentStep === 'preview' && <ProfilePreview profileData={profileData} />}
    </div>
  );
}
