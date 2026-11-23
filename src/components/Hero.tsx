import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative overflow-hidden gradient-hero py-16 md:py-24 lg:py-32">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="sun-orb" style={{ width: '480px', height: '480px', top: '20%', left: '50%', transform: 'translateX(-50%)', filter: 'blur(8px)', opacity: 0.5 }} />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[hsl(33_93%_45%/0.25)] blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[hsl(16_100%_45%/0.22)] blur-3xl animate-pulse-soft" />
        <div className="absolute inset-0 bg-[hsl(212_75%_6%/0.35)]" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(212_75%_6%/0.7)] to-transparent" />
      </div>


      <div className="container relative px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-hero-foreground mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Making real friends as an adult{' '}
            <span className="text-hero-accent font-normal">shouldn't feel like a full-time job.</span>
          </h1>

          <p className="text-lg md:text-xl text-hero-muted mb-3 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Find the right events, connect with compatible people, form crews to make plans and see each other again.
          </p>

          <p className="text-lg md:text-xl font-medium text-hero-foreground mb-8 animate-fade-in-up" style={{ animationDelay: '0.22s' }}>
            Get in SYNC.
          </p>

          <p className="text-2xl md:text-3xl lg:text-4xl font-semibold tracking-tight text-hero-accent mb-10 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
            Less searching. More belonging.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/onboarding">
              <Button variant="hero" size="xl">
                See your matches
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <a href="#how-sync-works">
              <Button variant="outline" size="xl" className="bg-transparent text-hero-foreground border-hero-foreground/40 hover:bg-[hsl(0_0%_100%/0.12)] hover:text-hero-foreground">How it works</Button>
            </a>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Hero;
