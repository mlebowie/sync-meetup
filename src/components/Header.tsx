import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { User, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import NotificationsPopover from './NotificationsPopover';
import { getUserProfile } from '@/lib/userProfile';

interface HeaderProps {
  onOpenMessages?: () => void;
}

const Header = ({ onOpenMessages }: HeaderProps) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  useEffect(() => {
    setIsGuest(!getUserProfile());
  }, []);
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-1">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">Sync</span>
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
          <NotificationsPopover open={notifOpen} onOpenChange={setNotifOpen} />
          <Button variant="ghost" size="icon" asChild title="Profile">
            <Link to="/profile">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
