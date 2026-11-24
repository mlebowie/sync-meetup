import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ChevronDown, Pause, Play } from 'lucide-react';
import { clamp, prefersReducedMotion, useScrollProgress } from '@/hooks/use-scroll-progress';

/**
 * Background clip, served from /public. Until hero.mp4 is added the video fails to load,
 * hides itself and the photo below shows instead.
 */
const VIDEO = { webm: '/hero.webm', mp4: '/hero.mp4', poster: '/hero-poster.jpg' };

/**
 * Placeholder still: sunset over the Douro from a Porto miradouro, people in silhouette.
 * Pavol Svantner on Unsplash (Unsplash License, free for commercial use):
 * https://unsplash.com/photos/IdlhTcYldV8
 */
const PHOTO = 'https://images.unsplash.com/photo-1619165165475-af0902f4124d?auto=format&fit=crop&q=70';
const photoSrcSet = [800, 1280, 1920, 2560].map(w => `${PHOTO}&w=${w} ${w}w`).join(', ');

const LINES = [
  "Find out what's going on in Porto.",
  "See who's going.",
  'Stay in touch with the people you actually meet.',
];

/** Scroll points (0–1) at which each piece fades in, in order: "in 90 days.", the three lines, the button. */
const REVEAL = { accent: 0.1, lines: [0.3, 0.45, 0.6], cta: 0.74 };
const FADE = 0.1;

const Hero = () => {
  const trackRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasVideo, setHasVideo] = useState(false);
  const [paused, setPaused] = useState(false);
  const still = prefersReducedMotion();
  const p = useScrollProgress(trackRef);

  // People who ask for reduced motion get the still poster frame only.
  useEffect(() => {
    if (still) {
      videoRef.current?.pause();
      setPaused(true);
    }
  }, [still]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setPaused(false);
    } else {
      video.pause();
      setPaused(true);
    }
  };

  /** Fade and rise into place once the scroll passes `at`. With reduced motion everything shows at once. */
  const reveal = (at: number): React.CSSProperties => {
    const t = still ? 1 : clamp((p - at) / FADE);
    return { opacity: t, transform: `translate3d(0, ${(1 - t) * 24}px, 0)` };
  };

  // Parallax: the photo stays pinned at the top and slowly zooms in from its top edge;
  // the text rises faster and settles exactly centred by the end.
  const bg = still ? {} : { transform: `scale(${1 + p * 0.08})`, transformOrigin: '50% 0%' };
  const text = still ? {} : { transform: `translate3d(0, ${(1 - p) * 36}px, 0)` };

  return (
    // Pulled up under the see-through header so the photo fills the whole screen of the device.
    <section className="relative -mt-16">
      <div ref={trackRef} data-header-overlay className={still ? '' : 'h-[260vh]'}>
        <div className="sticky top-0 h-screen h-[100dvh] overflow-hidden gradient-hero">
          <div aria-hidden className="absolute inset-0 pointer-events-none will-change-transform" style={bg}>
            <img
              src={`${PHOTO}&w=1920`}
              srcSet={photoSrcSet}
              sizes="100vw"
              alt=""
              className="hero-pan absolute inset-0 h-full w-full object-cover object-[center_70%]"
            />

            <video
              ref={videoRef}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${hasVideo ? 'opacity-100' : 'opacity-0'}`}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster={hasVideo ? VIDEO.poster : undefined}
              onLoadedData={() => setHasVideo(true)}
            >
              <source src={VIDEO.webm} type="video/webm" />
              <source src={VIDEO.mp4} type="video/mp4" onError={() => setHasVideo(false)} />
            </video>
          </div>

          {/* Deep terracotta brown (brand #C1694F, darkened) at 80% so the text stays readable over the photo or video. */}
          <div aria-hidden className="absolute inset-0 bg-[hsl(14_38%_13%/0.8)]" />

          {/* Equal space above and below the text block, measured from under the 64px header;
              gaps scale with screen height so short phones still fit. */}
          <div className="relative h-full container px-5 md:px-6 pt-[calc(4rem+clamp(1.5rem,6vh,4rem))] pb-[clamp(1.5rem,6vh,4rem)] flex items-center justify-center">
            <div className="max-w-4xl mx-auto text-center [text-wrap:balance] will-change-transform" style={text}>
              <h1 className="text-[clamp(2.5rem,8vw,4.5rem)] font-light tracking-[0.015em] leading-[1.1] text-hero-foreground">
                <span className="block">Your first familiar faces</span>
                <span className="block text-hero-accent font-normal mt-[clamp(0.25rem,1.2vh,0.75rem)]" style={reveal(REVEAL.accent)}>
                  in 90 days.
                </span>
              </h1>

              <p className="mt-[clamp(1.75rem,6vh,3.5rem)] space-y-[clamp(0.5rem,1.8vh,1.1rem)] text-[clamp(1.125rem,2.4vw,1.5rem)] leading-snug font-light text-hero-muted">
                {LINES.map((line, i) => (
                  <span key={line} className="block" style={reveal(REVEAL.lines[i])}>
                    {line}
                  </span>
                ))}
              </p>

              <div className="mt-[clamp(2.25rem,8vh,5rem)] flex justify-center" style={reveal(REVEAL.cta)}>
                <Link to="/onboarding" tabIndex={p < REVEAL.cta && !still ? -1 : undefined}>
                  <Button variant="hero" size="xl">
                    Find your first event
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* A quiet cue to keep scrolling, gone once the story starts */}
          {!still && (
            <ChevronDown
              aria-hidden
              className="absolute bottom-6 left-1/2 -translate-x-1/2 h-6 w-6 text-hero-muted animate-bounce"
              style={{ opacity: clamp(1 - p / 0.08) * 0.7 }}
            />
          )}

          {hasVideo && (
            <button
              type="button"
              onClick={togglePlayback}
              aria-label={paused ? 'Play background video' : 'Pause background video'}
              className="absolute bottom-4 right-4 flex h-11 w-11 items-center justify-center text-hero-muted opacity-70 hover:opacity-100 focus-visible:opacity-100"
            >
              {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

export default Hero;
