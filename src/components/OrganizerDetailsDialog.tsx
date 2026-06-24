import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Organizer } from '@/types/event';
import { Star, MapPin, Calendar, Instagram, Linkedin, Mail, Quote } from 'lucide-react';
import { format } from 'date-fns';

interface Props {
  organizer: Organizer;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const fallbackPhotos = [
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1496843916299-590492c751f4?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&h=500&fit=crop',
  'https://images.unsplash.com/photo-1505236858219-8359eb29e329?w=800&h=500&fit=crop',
];

const fallbackTestimonials = [
  { author: 'Sofia M.', rating: 5, text: 'Consistently well-run events. The host actually remembers your name by week two.', date: new Date() },
  { author: 'Diego R.', rating: 5, text: 'Showed up solo, left with three people I still meet up with.', date: new Date() },
  { author: 'Marta L.', rating: 4, text: 'Always on time, well-organized, and the group is friendly to newcomers.', date: new Date() },
];

const OrganizerDetailsDialog = ({ organizer, open, onOpenChange }: Props) => {
  const photos = organizer.photos?.length ? organizer.photos : [
    ...(organizer.avatar ? [organizer.avatar.replace(/w=\d+&h=\d+/, 'w=800&h=500')] : []),
    ...fallbackPhotos,
  ].slice(0, 8);
  const testimonials = organizer.testimonials?.length ? organizer.testimonials :
    (organizer.recentReview ? [organizer.recentReview, ...fallbackTestimonials] : fallbackTestimonials);
  const bio = organizer.bio ?? `${organizer.name} has been bringing people together in ${organizer.location} for years, hosting consistent, welcoming events designed for regulars and first-timers alike. Expect a friendly crowd, a clear structure, and the kind of small touches that turn a one-off meetup into a weekly habit.`;
  const eventTypes = organizer.eventTypes?.length ? organizer.eventTypes : ['Weekly meetups', 'Beginner-friendly sessions', 'Social mixers', 'Seasonal special events'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="overflow-y-auto">
          {/* Carousel */}
          <Carousel className="w-full">
            <CarouselContent>
              {photos.map((src, i) => (
                <CarouselItem key={i}>
                  <div className="h-56 sm:h-64 w-full overflow-hidden">
                    <img src={src} alt={`${organizer.name} photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious className="left-2" />
            <CarouselNext className="right-2" />
          </Carousel>

          <div className="px-6 py-5 space-y-5">
            {/* Header */}
            <div className="flex items-start gap-3">
              {organizer.avatar && (
                <img src={organizer.avatar} alt={organizer.name} className="w-16 h-16 rounded-full object-cover -mt-12 ring-4 ring-background" />
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-foreground">{organizer.name}</h2>
                <p className="text-xs text-muted-foreground capitalize">
                  {organizer.type === 'company' ? 'Organization' : 'Host'} · {organizer.location}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                    <span className="font-semibold text-foreground">{organizer.rating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({organizer.reviewCount} reviews)</span>
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    {organizer.eventsHosted} events hosted
                  </span>
                </div>
              </div>
            </div>

            {/* Bio */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-1">About</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{bio}</p>
            </section>

            {/* Event types */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Types of events</h3>
              <div className="flex flex-wrap gap-1.5">
                {eventTypes.map((t) => (
                  <span key={t} className="px-2 py-1 rounded-full bg-secondary text-xs text-secondary-foreground">{t}</span>
                ))}
              </div>
            </section>

            {/* Testimonials */}
            <section>
              <h3 className="text-sm font-semibold text-foreground mb-2">Testimonials</h3>
              <div className="space-y-2">
                {testimonials.slice(0, 5).map((t, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-foreground">{t.author}</span>
                      <span className="flex items-center gap-0.5">
                        {Array.from({ length: t.rating }).map((_, j) => (
                          <Star key={j} className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        ))}
                      </span>
                    </div>
                    <Quote className="h-3.5 w-3.5 text-muted-foreground mb-1" />
                    <p className="text-sm text-foreground">"{t.text}"</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Social */}
            {organizer.social && (
              <section>
                <h3 className="text-sm font-semibold text-foreground mb-2">Connect</h3>
                <div className="flex items-center gap-2">
                  {organizer.social.instagram && (
                    <a href={`https://instagram.com/${organizer.social.instagram}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-secondary hover:bg-secondary/70" aria-label="Instagram">
                      <Instagram className="h-4 w-4" />
                    </a>
                  )}
                  {organizer.social.linkedin && (
                    <a href={`https://linkedin.com/in/${organizer.social.linkedin}`} target="_blank" rel="noreferrer" className="p-2 rounded-full bg-secondary hover:bg-secondary/70" aria-label="LinkedIn">
                      <Linkedin className="h-4 w-4" />
                    </a>
                  )}
                  {organizer.social.email && (
                    <a href={`mailto:${organizer.social.email}`} className="p-2 rounded-full bg-secondary hover:bg-secondary/70" aria-label="Email">
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </section>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OrganizerDetailsDialog;
