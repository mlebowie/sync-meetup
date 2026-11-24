import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, MessageCircle, User } from 'lucide-react';
import HeaderSearch from './HeaderSearch';

interface Props {
  /** Opens the messages panel when the current page has one (the homepage); otherwise we go home and open it there. */
  onOpenMessages?: () => void;
}

const item =
  'flex h-12 w-12 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground';
const active = 'text-primary hover:text-primary';

/**
 * Members' bottom bar: home on the left, messages in the middle,
 * then search and profile on the right. Tablets and phones only (under 1024px); desktop keeps the header icons.
 * Sits above the phone's home indicator.
 */
const BottomNav = ({ onOpenMessages }: Props) => {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  // Leave room at the bottom of every page so the bar never covers the last items.
  useEffect(() => {
    document.body.classList.add('has-bottom-nav');
    return () => document.body.classList.remove('has-bottom-nav');
  }, []);

  const openMessages = () => {
    if (onOpenMessages) onOpenMessages();
    else navigate('/?messages=1');
  };

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-50 lg:hidden border-t border-border/50 bg-background/85 backdrop-blur-lg pb-[env(safe-area-inset-bottom)]"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-center justify-items-center px-4">
        <Link to="/" aria-label="Home" className={`${item} ${pathname === '/' ? active : ''}`}>
          <Home className="h-6 w-6" />
        </Link>

        <span aria-hidden />

        {/* Same size and baseline as the other icons; the bubble is mirrored so its tail points right. */}
        <button type="button" onClick={openMessages} aria-label="Messages" className={item}>
          <MessageCircle className="h-6 w-6 -scale-x-100" />
        </button>

        <HeaderSearch side="top" triggerClassName={`${item} [&_svg]:h-6 [&_svg]:w-6`} />

        <Link to="/profile" aria-label="Profile" className={`${item} ${pathname.startsWith('/profile') ? active : ''}`}>
          <User className="h-6 w-6" />
        </Link>
      </div>
    </nav>
  );
};

export default BottomNav;
