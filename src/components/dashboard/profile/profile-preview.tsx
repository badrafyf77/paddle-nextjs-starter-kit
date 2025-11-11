'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle2, Edit, Briefcase, GraduationCap, Code, Languages, User, MapPin, Phone, Mail } from 'lucide-react';
import Link from 'next/link';

interface Props {
  profileData: any;
}

export function ProfilePreview({ profileData }: Props) {
  const profile = profileData?.profile || {};
  const experiences = profileData?.experiences || [];
  const education = profileData?.education || [];
  const skills = profileData?.skills || [];
  const languages = profileData?.languages || [];

  return (
    <div className="space-y-6">
      {/* Success Message */}
      <Card className="bg-green-500/10 border-green-500/20">
        <CardContent className="flex items-center gap-4 p-6">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="text-green-500" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">Profile Complete!</h3>
            <p className="text-sm text-muted-foreground">Your profile is ready. You can now start applying to jobs.</p>
          </div>
          <Link href="/dashboard/agent">
            <Button size="lg">Start Applying</Button>
          </Link>
        </CardContent>
      </Card>

      {/* Personal Info */}
      <Card className="bg-background/50 backdrop-blur-[24px] border-border">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="text-primary" size={24} />
              </div>
              <div>
                <CardTitle className="text-2xl">
                  {profile.first_name} {profile.last_name}
                </CardTitle>
                <CardDescription className="mt-1">
                  {profile.current_position && `${profile.current_position} at ${profile.current_company}`}
                </CardDescription>
              </div>
            </div>
            <Link href="/dashboard/profile/edit">
              <Button variant="outline" size="sm">
                <Edit size={16} className="mr-2" />
                Edit Profile
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {profile.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone size={16} className="text-muted-foreground" />
                <span>{profile.phone}</span>
              </div>
            )}
            {profile.city && (
              <div className="flex items-center gap-2 text-sm">
                <MapPin size={16} className="text-muted-foreground" />
                <span>
                  {profile.city}
                  {profile.country && `, ${profile.country}`}
                </span>
              </div>
            )}
          </div>

          {(profile.linkedin_url || profile.github_url || profile.portfolio_url) && (
            <div className="flex flex-wrap gap-2 pt-2">
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline">LinkedIn</Badge>
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline">GitHub</Badge>
                </a>
              )}
              {profile.portfolio_url && (
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer">
                  <Badge variant="outline">Portfolio</Badge>
                </a>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Experience */}
      {experiences.length > 0 && (
        <Card className="bg-background/50 backdrop-blur-[24px] border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Briefcase className="text-primary" size={24} />
              <CardTitle className="text-xl">Work Experience</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {experiences.map((exp: any, index: number) => (
              <div key={index}>
                {index > 0 && <Separator className="my-6" />}
                <div>
                  <h4 className="font-semibold text-lg">{exp.title}</h4>
                  <p className="text-muted-foreground">
                    {exp.company} {exp.location && `• ${exp.location}`}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {exp.start_date} - {exp.end_date || 'Present'}
                  </p>
                  {exp.description && <p className="mt-3 text-sm">{exp.description}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {education.length > 0 && (
        <Card className="bg-background/50 backdrop-blur-[24px] border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <GraduationCap className="text-primary" size={24} />
              <CardTitle className="text-xl">Education</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {education.map((edu: any, index: number) => (
              <div key={index}>
                {index > 0 && <Separator className="my-6" />}
                <div>
                  <h4 className="font-semibold text-lg">{edu.degree}</h4>
                  <p className="text-muted-foreground">{edu.institution}</p>
                  {edu.major && <p className="text-sm text-muted-foreground">{edu.major}</p>}
                  {edu.graduation_year && <p className="text-sm text-muted-foreground mt-1">{edu.graduation_year}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      {skills.length > 0 && (
        <Card className="bg-background/50 backdrop-blur-[24px] border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Code className="text-primary" size={24} />
              <CardTitle className="text-xl">Skills</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {skills.map((skill: any, index: number) => (
                <Badge key={index} variant="secondary">
                  {skill.skill_name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Languages */}
      {languages.length > 0 && (
        <Card className="bg-background/50 backdrop-blur-[24px] border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Languages className="text-primary" size={24} />
              <CardTitle className="text-xl">Languages</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {languages.map((lang: any, index: number) => (
                <div key={index}>
                  <p className="font-medium">{lang.language}</p>
                  <p className="text-sm text-muted-foreground">{lang.proficiency}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
