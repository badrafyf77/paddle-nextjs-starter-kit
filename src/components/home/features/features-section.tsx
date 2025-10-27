'use client';

import { Mic, FileText, Zap, BarChart3, Calendar, Target } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const features = [
  {
    icon: Mic,
    title: 'AI voice interview practice',
    description:
      'Practice interviews with our real-time AI interviewer. Get instant feedback, performance scores, and personalized improvement tips.',
  },
  {
    icon: FileText,
    title: 'Personalized application materials',
    description:
      'Generate tailored resumes and cover letters that match your unique writing style and the job requirements.',
  },
  {
    icon: Zap,
    title: 'Smart auto-apply',
    description: 'Let our browser agent automatically apply to relevant jobs while you focus on interview preparation.',
  },
  {
    icon: Target,
    title: 'Smart job matching',
    description:
      'Advanced filters and AI-powered recommendations to find jobs that perfectly match your skills and preferences.',
  },
  {
    icon: Calendar,
    title: 'Application tracker',
    description: 'Keep track of all your applications, interviews, and follow-ups in one organized dashboard.',
  },
  {
    icon: BarChart3,
    title: 'Performance analytics',
    description:
      'Track your application success rates, interview performance, and get insights to improve your job search strategy.',
  },
];

export function FeaturesSection() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            features.forEach((_, index) => {
              setTimeout(() => {
                setVisibleItems((prev) => [...prev, index]);
              }, index * 100);
            });
          }
        });
      },
      { threshold: 0.1 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="mx-auto max-w-7xl px-[32px] py-24" ref={sectionRef}>
      <div className="text-center mb-20">
        <h2 className="text-[40px] leading-[44px] md:text-[56px] md:leading-[60px] tracking-[-1.2px] font-medium mb-6">
          Ship and scale fast
        </h2>
        <p className="text-[18px] leading-[27px] text-muted-foreground max-w-2xl mx-auto">
          Everything you need to succeed in your job search, powered by AI.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isVisible = visibleItems.includes(index);
          return (
            <div
              key={index}
              className={`group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-muted/30 flex items-center justify-center mb-6 group-hover:bg-muted/50 group-hover:scale-110 transition-all duration-300">
                <Icon className="w-7 h-7 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
              <p className="text-base leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
