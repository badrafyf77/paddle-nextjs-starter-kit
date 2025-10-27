export function StatsSection() {
  return (
    <section className="mx-auto max-w-7xl px-[32px] py-16 mb-16">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-12 text-center">
        <div>
          <div className="text-5xl md:text-6xl font-bold mb-3">50K+</div>
          <div className="text-base text-muted-foreground">Active users</div>
        </div>
        <div>
          <div className="text-5xl md:text-6xl font-bold mb-3">10K+</div>
          <div className="text-base text-muted-foreground">Jobs found</div>
        </div>
        <div>
          <div className="text-5xl md:text-6xl font-bold mb-3">95%</div>
          <div className="text-base text-muted-foreground">Success rate</div>
        </div>
        <div>
          <div className="text-5xl md:text-6xl font-bold mb-3">4.9/5</div>
          <div className="text-base text-muted-foreground">User rating</div>
        </div>
      </div>
    </section>
  );
}
