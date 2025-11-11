'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Plus, Trash2, Briefcase, GraduationCap, Code, Languages } from 'lucide-react';

interface Props {
  personalInfo: any;
  onComplete: (data: any) => void;
}

export function ManualProfileForm({ personalInfo, onComplete }: Props) {
  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('experience');
  const { toast } = useToast();

  // Experience
  const [experiences, setExperiences] = useState([
    { title: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' },
  ]);

  // Education
  const [education, setEducation] = useState([
    { degree: '', major: '', institution: '', graduation_year: '', description: '' },
  ]);

  // Skills
  const [skills, setSkills] = useState({ programming: '', frameworks: '', tools: '', other: '' });

  // Languages
  const [languages, setLanguages] = useState([{ language: '', proficiency: '' }]);

  const addExperience = () => {
    setExperiences([
      ...experiences,
      { title: '', company: '', location: '', start_date: '', end_date: '', is_current: false, description: '' },
    ]);
  };

  const removeExperience = (index: number) => {
    setExperiences(experiences.filter((_, i) => i !== index));
  };

  const addEducation = () => {
    setEducation([...education, { degree: '', major: '', institution: '', graduation_year: '', description: '' }]);
  };

  const removeEducation = (index: number) => {
    setEducation(education.filter((_, i) => i !== index));
  };

  const addLanguage = () => {
    setLanguages([...languages, { language: '', proficiency: '' }]);
  };

  const removeLanguage = (index: number) => {
    setLanguages(languages.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    setLoading(true);

    try {
      const response = await fetch('/api/profile/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personal_info: personalInfo,
          experiences: experiences.filter((exp) => exp.title && exp.company),
          education: education.filter((edu) => edu.degree && edu.institution),
          skills,
          languages: languages.filter((lang) => lang.language && lang.proficiency),
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Profile saved successfully!',
        });
        onComplete(data);
      } else {
        toast({
          title: 'Error',
          description: data.error || 'Failed to save profile',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to save profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-background/50 backdrop-blur-[24px] border-border">
      <CardHeader>
        <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
        <CardDescription>Fill in your professional information</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="experience">Experience</TabsTrigger>
            <TabsTrigger value="education">Education</TabsTrigger>
            <TabsTrigger value="skills">Skills</TabsTrigger>
            <TabsTrigger value="languages">Languages</TabsTrigger>
          </TabsList>

          {/* Experience Tab */}
          <TabsContent value="experience" className="space-y-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Briefcase className="text-primary" size={24} />
              <div>
                <h3 className="font-semibold">Work Experience</h3>
                <p className="text-sm text-muted-foreground">Add your work history</p>
              </div>
            </div>

            {experiences.map((exp, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Experience {index + 1}</h4>
                  {experiences.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeExperience(index)}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Job Title</Label>
                    <Input
                      placeholder="Software Engineer"
                      value={exp.title}
                      onChange={(e) => {
                        const newExp = [...experiences];
                        newExp[index].title = e.target.value;
                        setExperiences(newExp);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Company</Label>
                    <Input
                      placeholder="Company Name"
                      value={exp.company}
                      onChange={(e) => {
                        const newExp = [...experiences];
                        newExp[index].company = e.target.value;
                        setExperiences(newExp);
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="City, Country"
                      value={exp.location}
                      onChange={(e) => {
                        const newExp = [...experiences];
                        newExp[index].location = e.target.value;
                        setExperiences(newExp);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      placeholder="Jan 2020"
                      value={exp.start_date}
                      onChange={(e) => {
                        const newExp = [...experiences];
                        newExp[index].start_date = e.target.value;
                        setExperiences(newExp);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      placeholder="Present"
                      value={exp.end_date}
                      onChange={(e) => {
                        const newExp = [...experiences];
                        newExp[index].end_date = e.target.value;
                        setExperiences(newExp);
                      }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 text-sm rounded-md border border-input bg-background"
                    placeholder="Describe your responsibilities and achievements..."
                    value={exp.description}
                    onChange={(e) => {
                      const newExp = [...experiences];
                      newExp[index].description = e.target.value;
                      setExperiences(newExp);
                    }}
                  />
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addExperience} className="w-full">
              <Plus size={16} className="mr-2" />
              Add Another Experience
            </Button>
          </TabsContent>

          {/* Education Tab */}
          <TabsContent value="education" className="space-y-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <GraduationCap className="text-primary" size={24} />
              <div>
                <h3 className="font-semibold">Education</h3>
                <p className="text-sm text-muted-foreground">Add your educational background</p>
              </div>
            </div>

            {education.map((edu, index) => (
              <div key={index} className="p-4 border border-border rounded-lg space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-medium">Education {index + 1}</h4>
                  {education.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeEducation(index)}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Degree</Label>
                    <Input
                      placeholder="Bachelor of Science"
                      value={edu.degree}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[index].degree = e.target.value;
                        setEducation(newEdu);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Major/Field</Label>
                    <Input
                      placeholder="Computer Science"
                      value={edu.major}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[index].major = e.target.value;
                        setEducation(newEdu);
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Institution</Label>
                    <Input
                      placeholder="University Name"
                      value={edu.institution}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[index].institution = e.target.value;
                        setEducation(newEdu);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Graduation Year</Label>
                    <Input
                      placeholder="2024"
                      value={edu.graduation_year}
                      onChange={(e) => {
                        const newEdu = [...education];
                        newEdu[index].graduation_year = e.target.value;
                        setEducation(newEdu);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addEducation} className="w-full">
              <Plus size={16} className="mr-2" />
              Add Another Education
            </Button>
          </TabsContent>

          {/* Skills Tab */}
          <TabsContent value="skills" className="space-y-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Code className="text-primary" size={24} />
              <div>
                <h3 className="font-semibold">Skills</h3>
                <p className="text-sm text-muted-foreground">List your technical and professional skills</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Programming Languages</Label>
                <Input
                  placeholder="JavaScript, Python, Java"
                  value={skills.programming}
                  onChange={(e) => setSkills({ ...skills, programming: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Frameworks & Libraries</Label>
                <Input
                  placeholder="React, Node.js, Django"
                  value={skills.frameworks}
                  onChange={(e) => setSkills({ ...skills, frameworks: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tools & Technologies</Label>
                <Input
                  placeholder="Git, Docker, AWS"
                  value={skills.tools}
                  onChange={(e) => setSkills({ ...skills, tools: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Other Skills</Label>
                <Input
                  placeholder="Project Management, Agile, etc."
                  value={skills.other}
                  onChange={(e) => setSkills({ ...skills, other: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>

          {/* Languages Tab */}
          <TabsContent value="languages" className="space-y-6 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <Languages className="text-primary" size={24} />
              <div>
                <h3 className="font-semibold">Languages</h3>
                <p className="text-sm text-muted-foreground">Add languages you speak</p>
              </div>
            </div>

            {languages.map((lang, index) => (
              <div key={index} className="p-4 border border-border rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-medium">Language {index + 1}</h4>
                  {languages.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => removeLanguage(index)}>
                      <Trash2 size={16} />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Input
                      placeholder="English"
                      value={lang.language}
                      onChange={(e) => {
                        const newLang = [...languages];
                        newLang[index].language = e.target.value;
                        setLanguages(newLang);
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Proficiency</Label>
                    <Input
                      placeholder="Native, C1, B2, etc."
                      value={lang.proficiency}
                      onChange={(e) => {
                        const newLang = [...languages];
                        newLang[index].proficiency = e.target.value;
                        setLanguages(newLang);
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}

            <Button variant="outline" onClick={addLanguage} className="w-full">
              <Plus size={16} className="mr-2" />
              Add Another Language
            </Button>
          </TabsContent>
        </Tabs>

        <div className="mt-8 pt-6 border-t border-border">
          <Button onClick={handleSubmit} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving Profile...
              </>
            ) : (
              'Complete Profile'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
