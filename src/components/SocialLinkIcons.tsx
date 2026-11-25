import type { SocialLinks } from '@/lib/socialLinks';
import { cn } from '@/lib/utils';

// Inline brand icons for social handles (no extra dependency)
export const InstagramIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5A4.25 4.25 0 0 0 7.75 20.5h8.5A4.25 4.25 0 0 0 20.5 16.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Zm5.25-2.25a.875.875 0 1 1 0 1.75.875.875 0 0 1 0-1.75Z" />
  </svg>
);
export const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14ZM8 18V9H5v9h3Zm-1.5-10.5a1.75 1.75 0 1 1 0-3.5 1.75 1.75 0 0 1 0 3.5ZM19 18v-5.07a2.96 2.96 0 0 0-2.96-2.96 3 3 0 0 0-2.54 1.54V9h-3v9h3v-4.5a1.5 1.5 0 0 1 3 0V18h3Z" />
  </svg>
);
export const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
    <path d="M12.004 2C6.486 2 2 6.486 2 12c0 1.893.528 3.659 1.444 5.17L2 22l4.942-1.413A9.96 9.96 0 0 0 12.004 22c5.518 0 10-4.486 10-10s-4.482-10-10-10Zm4.36 14.28c-.22.622-1.274 1.183-1.78 1.26-.47.07-.913.35-3.068-.65-2.598-1.15-4.25-3.99-4.38-4.18-.125-.187-.997-1.32-.997-2.52 0-1.19.625-1.77.85-2.01.22-.235.48-.293.64-.293.16 0 .32 0 .46.008.15.006.35-.057.55.417.2.474.676 1.646.734 1.766.056.12.093.26.02.42-.075.16-.112.26-.225.398-.112.14-.236.312-.338.42-.112.12-.23.25-.104.49.127.24.566.933.964 1.21.664.471 1.21.513 1.472.57.157.034.318-.032.41-.14.12-.14.338-.38.53-.615.165-.202.28-.272.42-.473.14-.2.07-.38-.03-.53-.098-.15-.41-.52-.57-.707-.167-.19-.33-.16-.45-.18-.135-.025-.27-.065-.39-.11-.2-.08-.34-.117-.39-.217-.05-.1-.02-.36.1-.72.117-.36.35-.79.4-.87.065-.12.13-.24.19-.38.16-.36.08-.66-.04-.76-.12-.1-.32-.12-.64-.12-.29 0-.69.05-1.05.27-.36.22-.9.79-.9 1.8 0 1.02.74 2.02.84 2.16.1.14 1.46 2.23 3.54 3.13.49.21.88.34 1.18.44.49.16.94.14 1.29.09.39-.06 1.274-.52 1.454-1.02.18-.5.18-.93.13-1.02-.05-.09-.2-.14-.42-.24Z" />
  </svg>
);


interface Props {
  links: SocialLinks;
  className?: string;
  iconClassName?: string;
}

/** A member's Instagram, LinkedIn and WhatsApp as icon links. Pass only the links the viewer may see. */
const SocialLinkIcons = ({ links, className, iconClassName = 'h-5 w-5' }: Props) => {
  const items = [
    links.instagram && { href: `https://instagram.com/${links.instagram}`, label: `Instagram @${links.instagram}`, Icon: InstagramIcon },
    links.linkedin && { href: `https://linkedin.com/in/${links.linkedin}`, label: `LinkedIn ${links.linkedin}`, Icon: LinkedInIcon },
    links.whatsapp && { href: `https://wa.me/${links.whatsapp.replace(/[^0-9]/g, '')}`, label: `WhatsApp ${links.whatsapp}`, Icon: WhatsAppIcon },
  ].filter(Boolean) as { href: string; label: string; Icon: typeof InstagramIcon }[];

  if (items.length === 0) return null;
  return (
    <div className={cn('flex items-center', className)}>
      {items.map(({ href, label, Icon }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          title={label}
          className="text-muted-foreground transition-colors hover:text-primary"
        >
          <Icon className={iconClassName} />
        </a>
      ))}
    </div>
  );
};

export default SocialLinkIcons;
