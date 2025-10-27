'use client';

import { useEffect, useRef, useState } from 'react';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Software Engineer',
    company: 'Tech Corp',
    text: 'Jobora helped me land my dream job in just 3 weeks. The AI interview practice was a game-changer. I felt so prepared and confident during my real interviews.',
  },
  {
    name: 'Michael Chen',
    role: 'Product Manager',
    company: 'StartupXYZ',
    text: 'The auto-apply feature saved me countless hours. I applied to 50+ jobs while focusing on interview prep. The personalized cover letters were spot-on.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Data Analyst',
    company: 'Analytics Inc',
    text: 'Best investment in my career. The voice interview simulator gave me real-time feedback that helped me improve dramatically. Got 3 offers in one month.',
  },
  {
    name: 'David Kim',
    role: 'UX Designer',
    company: 'Design Studio',
    text: 'The application tracker and analytics helped me understand what was working. I optimized my approach and doubled my interview callback rate.',
  },
  {
    name: 'Jessica Martinez',
    role: 'Marketing Manager',
    company: 'Brand Co',
    text: "Jobora's AI understood my writing style perfectly. The resumes and cover letters it generated felt authentic and personal. Highly recommend.",
  },
  {
    name: 'Alex Thompson',
    role: 'Full Stack Developer',
    company: 'WebDev Solutions',
    text: 'From job search to offer acceptance in 4 weeks. The interview practice with instant feedback was invaluable. This platform is a must-have for job seekers.',
  },
];

export function TestimonialsSection() {
  const [visibleItems, setVisibleItems] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            testimonials.forEach((_, index) => {
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
    <section className="mx-auto max-w-7xl px-[32px] py-24" ref={sectionRef}>
      <div className="text-center mb-20">
        <h2 className="text-[40px] leading-[44px] md:text-[56px] md:leading-[60px] tracking-[-1.2px] font-medium mb-6">
          Job seekers love us!
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {testimonials.map((testimonial, index) => {
          const isVisible = visibleItems.includes(index);
          return (
            <div
              key={index}
              className={`border border-border/50 rounded-lg p-6 bg-background/50 hover:border-border hover:bg-background/70 transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <p className="text-base leading-relaxed mb-6">{testimonial.text}</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center text-sm font-semibold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <div className="font-semibold text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
