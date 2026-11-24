import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, MessageCircle, CalendarDays, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationsPopover from './NotificationsPopover';
import HeaderSearch from './HeaderSearch';
import { getUserProfile } from '@/lib/userProfile';
import { useAttending } from '@/context/AttendingContext';
import syncWordmark from '@/assets/sync-wordmark-v2.png';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  onOpenMessages?: () => void;
}

export const HEADER_HEIGHT = 64;

/**
 * Where the header sits relative to the page:
 * - `overHero`: on top of a dark full-screen hero (marked with [data-header-overlay]), so logo and icons go light;
 * - `scrolled`: content is sliding under the header (past the top of the page, or the hero is scrolling away),
 *   so a soft frosted backing keeps it readable; it stays fully see-through while the hero is pinned.
 */
const useHeaderPosition = () => {
  const [state, setState] = useState({ overHero: false, scrolled: false });

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const hero = document.querySelector<HTMLElement>('[data-header-overlay]');
      const heroBottom = hero ? hero.getBoundingClientRect().bottom : 0;
      const overHero = !!hero && heroBottom > HEADER_HEIGHT;
      const scrolled = hero ? heroBottom < window.innerHeight - 1 : window.scrollY > 8;
      setState(s => (s.overHero === overHero && s.scrolled === scrolled ? s : { overHero, scrolled }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    // The hero mounts after the header, so check again once the page has rendered.
    const settle = window.setTimeout(update, 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(settle);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return state;
};

const Header = ({ onOpenMessages }: HeaderProps) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(() => !getUserProfile());
  const { attending } = useAttending();
  const { isAdmin } = useAdmin();
  const [pendingCount, setPendingCount] = useState(0);
  const { overHero, scrolled } = useHeaderPosition();

  useEffect(() => {
    const sync = () => setIsGuest(!getUserProfile());
    sync();
    window.addEventListener('sync:profile-changed', sync);
    return () => window.removeEventListener('sync:profile-changed', sync);
  }, []);

  // Curators see how many collected events are still waiting for review.
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    supabase
      .from('events')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', 'pending')
      .then(({ count }) => {
        if (!cancelled) setPendingCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  // Notifications only start once a registered user has signed up for their first event
  const showNotifications = !isGuest && attending.size > 0;
  const iconTone = overHero
    ? 'text-hero-foreground hover:bg-[hsl(0_0%_100%/0.12)] hover:text-hero-foreground'
    : 'text-foreground';

  return (
    <header
      className={`sticky top-0 z-50 w-full transition-[background-color,backdrop-filter] duration-300 ${
        !scrolled ? 'bg-transparent' : overHero ? 'bg-[hsl(14_38%_13%/0.55)] backdrop-blur-lg' : 'bg-background/70 backdrop-blur-lg'
      }`}
    >
      <div className="container grid h-16 grid-cols-[1fr_auto_1fr] items-center px-4 md:px-6">
        {/* Left: curators get their queue link; everyone else gets balanced empty space */}
        <div className="flex items-center">
          {isAdmin && (
            <Link
              to="/curate"
              className={`hidden md:flex items-center gap-2 text-sm font-medium transition-colors ${
                overHero ? 'text-hero-muted hover:text-hero-foreground' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Curate events
              {pendingCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                  {pendingCount}
                </span>
              )}
            </Link>
          )}
        </div>

        {/* Centre: the wordmark, light over the hero photo */}
        <Link to="/" className="flex items-center justify-center" aria-label="SYNC home">
          <img
            src={syncWordmark}
            alt="SYNC"
            className={`h-7 w-auto transition-[filter] duration-300 ${overHero ? 'brightness-0 invert' : ''}`}
          />
        </Link>

        <div className="flex items-center justify-end gap-1">
          {isGuest ? (
            // Logged out: one menu with the two ways in.
            <DropdownMenu modal={false}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className={iconTone} aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" sideOffset={8} className="min-w-[10rem]">
                <DropdownMenuItem asChild className="py-2.5 text-[15px] cursor-pointer">
                  <Link to="/login">Log in</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="py-2.5 text-[15px] cursor-pointer">
                  <Link to="/onboarding">Register</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <HeaderSearch />
              <Button variant="ghost" size="icon" className={iconTone} onClick={onOpenMessages} title="Messages">
                <MessageCircle className="h-5 w-5" />
              </Button>
              {showNotifications && (
                <NotificationsPopover open={notifOpen} onOpenChange={setNotifOpen} />
              )}
              <Button variant="ghost" size="icon" className={iconTone} asChild title="Calendar">
                <Link to="/calendar" aria-label="Calendar">
                  <CalendarDays className="h-5 w-5" />
                </Link>
              </Button>
              <Button variant="ghost" size="icon" className={iconTone} asChild title="Profile">
                <Link to="/profile" aria-label="Profile">
                  <User className="h-5 w-5" />
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
