import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, MessageCircle, CalendarDays } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationsPopover from './NotificationsPopover';
import { getUserProfile } from '@/lib/userProfile';
import { useAttending } from '@/context/AttendingContext';
import syncWordmark from '@/assets/sync-wordmark.png.asset.json';


interface HeaderProps {
  onOpenMessages?: () => void;
}

const Header = ({ onOpenMessages }: HeaderProps) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(() => !getUserProfile());
  const { attending } = useAttending();
  useEffect(() => {
    setIsGuest(!getUserProfile());
  }, []);
  // Notifications only start once a registered user has signed up for their first event
  const showNotifications = !isGuest && attending.size > 0;
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center">
            <img src={syncWordmark.url} alt="SYNC" className="h-7 w-auto" />
          </Link>

        </div>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#events" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Events
          </a>
          <a href="#interests" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Interests
          </a>
          <a href="#community" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Community
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onOpenMessages} title="Messages">
            <MessageCircle className="h-5 w-5" />
          </Button>
          {showNotifications && (
            <NotificationsPopover open={notifOpen} onOpenChange={setNotifOpen} />
          )}
          <Button variant="ghost" size="icon" asChild title="Calendar">
            <Link to="/calendar" aria-label="Calendar">
              <CalendarDays className="h-5 w-5" />
            </Link>
          </Button>

          <Button variant="ghost" size="icon" asChild title="Profile">
            <Link to="/profile">
              <User className="h-5 w-5" />
            </Link>
          </Button>
          {isGuest && (
            <>
              <Button variant="outline" size="sm" asChild>
                <Link to="/login">Log in</Link>
              </Button>
              <Button variant="hero" size="sm" asChild>
                <Link to="/onboarding">Register</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
