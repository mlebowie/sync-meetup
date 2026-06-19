import { Button } from '@/components/ui/button';
import { Bell, User, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface HeaderProps {
  onOpenMessages?: () => void;
}

const Header = ({ onOpenMessages }: HeaderProps) => {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">S</span>
            </div>
            <span className="text-xl font-bold text-foreground">Sync</span>
          </div>
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
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-accent-foreground">
              3
            </span>
          </Button>
          <Button variant="ghost" size="icon">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
