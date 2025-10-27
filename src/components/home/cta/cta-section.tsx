import { Button } from '@/components/ui/button';
import Link from 'next/link';

export function CTASection() {
  return (
    <section className="mx-auto max-w-7xl px-[32px] py-24">
      <div className="relative overflow-hidden rounded-lg bg-muted/20 border border-border/50 p-16 md:p-20 text-center">
        <div className="relative z-10">
          <h2 className="text-[40px] leading-[44px] md:text-[56px] md:leading-[60px] tracking-[-1.2px] font-medium mb-6">
            Join the community
          </h2>
          <p className="text-[18px] leading-[27px] text-muted-foreground max-w-2xl mx-auto mb-10">
            Share your job search journey, ask questions, and collaborate with other professionals.
          </p>
          <Button asChild size="lg" className="text-base px-8 h-12">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
