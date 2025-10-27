'use client';

import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useEffect, useState } from 'react';

export function HeroSection() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  return (
    <section
      className={
        'mx-auto max-w-7xl px-[32px] relative flex items-center justify-between min-h-[calc(100vh-120px)] py-16'
      }
    >
      <div className={'text-center w-full '}>
        <h1
          className={`text-[48px] leading-[52px] md:text-[72px] md:leading-[80px] tracking-[-1.6px] font-medium transition-all duration-1000 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Land your dream job
          <br />
          with AI-powered search
        </h1>
        <p
          className={`mt-6 text-[18px] leading-[27px] md:text-[20px] md:leading-[30px] text-muted-foreground max-w-3xl mx-auto transition-all duration-1000 delay-200 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          Smart auto-apply • Real-time interview practice • Personalized resumes and cover letters
        </p>
        <div
          className={`flex gap-4 justify-center mt-10 transition-all duration-1000 delay-400 ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <Button asChild size="lg" className="text-base px-8 h-12 hover:scale-105 transition-transform">
            <Link href="/signup">Get started</Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="secondary"
            className="text-base px-8 h-12 hover:scale-105 transition-transform"
          >
            <Link href="#pricing">View pricing</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
