import { Button } from '@/components/ui/button';
import { ArrowRight, Users, Calendar, MapPin } from 'lucide-react';

const Hero = () => {
  return (
    <section className="relative overflow-hidden gradient-hero py-16 md:py-24 lg:py-32">
      {/* Animated sunset background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="sun-orb" style={{ width: '480px', height: '480px', top: '20%', left: '50%', transform: 'translateX(-50%)', filter: 'blur(8px)' }} />
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-[hsl(35_95%_70%/0.35)] blur-3xl animate-pulse-soft" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-[hsl(345_70%_55%/0.3)] blur-3xl animate-pulse-soft" />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[hsl(275_50%_30%/0.4)] to-transparent" />
      </div>

      <div className="container relative px-4 md:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6 animate-fade-in">
            <Users className="h-4 w-4" />
            <span>Join 10,000+ expats finding their crew</span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-tight text-foreground mb-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Find Your People,{' '}
            <span className="text-gradient-primary font-normal">Sync Your Life</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            Built for everyone — especially if you're tired of struggling to find your people. Discover curated events from Meetup, Eventbrite, and Lu.ma. Filter by vibe, connect with attendees before you go, and build real friendships.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Button variant="hero" size="xl">
              Start Exploring
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button variant="outline" size="xl">
              How It Works
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium">500+ Weekly Events</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium">50+ Cities</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-success" />
              <span className="text-sm font-medium">Real Connections</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
