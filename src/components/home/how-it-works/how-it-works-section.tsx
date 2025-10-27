'use client';

import { UserPlus, Search, Send, Briefcase } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const steps = [
  {
    icon: UserPlus,
    title: 'Create your profile',
    description: 'Sign up and let our AI learn your unique writing style and career preferences.',
  },
  {
    icon: Search,
    title: 'Find perfect jobs',
    description: 'Browse AI-curated job matches or let our auto-apply agent work for you.',
  },
  {
    icon: Send,
    title: 'Apply with confidence',
    description: 'Send personalized resumes and cover letters that stand out from the crowd.',
  },
  {
    icon: Briefcase,
    title: 'Ace your interviews',
    description: 'Practice with our AI voice interviewer and get real-time feedback to improve.',
  },
];

export function HowItWorksSection() {
  const [isVisible, setIsVisible] = useState(false);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
          }
        });
      },
      { threshold: 0.2 },
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-[32px] py-24" ref={sectionRef}>
      <div className="text-center mb-20">
        <h2 className="text-[40px] leading-[44px] md:text-[56px] md:leading-[60px] tracking-[-1.2px] font-medium mb-6">
          How it works
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {steps.map((step, index) => {
          const Icon = step.icon;
          return (
            <div
              key={index}
              className={`text-center transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              <div className="w-16 h-16 rounded-2xl bg-muted/30 flex items-center justify-center mb-6 mx-auto hover:bg-muted/50 hover:scale-110 transition-all duration-300">
                <Icon className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
