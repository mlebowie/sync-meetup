/**
 * Who can see a member's social links.
 *
 * - Photo, first name, neighbourhood and interests: anyone going to the same event (not handled here).
 * - Instagram and LinkedIn: connections only (a mutual tag) by default; the member can open them to
 *   "anyone at my events".
 * - WhatsApp number: connections only, always. A phone number is never shown to strangers.
 *
 * Private by default, as the GDPR's data protection by default (Article 25) expects.
 */

export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  whatsapp?: string;
}

export type SocialVisibility = 'connections' | 'events';

export const DEFAULT_SOCIAL_VISIBILITY: SocialVisibility = 'connections';

export const SOCIAL_VISIBILITY_OPTIONS: { value: SocialVisibility; label: string; detail: string }[] = [
  {
    value: 'connections',
    label: 'Connections only',
    detail: 'People you have both tagged after an event.',
  },
  {
    value: 'events',
    label: 'Anyone at my events',
    detail: 'Members going to the same events as you. Your WhatsApp number stays with connections only.',
  },
];

/** The links a viewer may see, and whether any are being held back until they connect. */
export const visibleSocialLinks = (
  links: SocialLinks | undefined,
  visibility: SocialVisibility | undefined,
  { isSelf, isConnection }: { isSelf: boolean; isConnection: boolean },
): { shown: SocialLinks; hidden: boolean } => {
  if (!links) return { shown: {}, hidden: false };
  if (isSelf || isConnection) return { shown: { ...links }, hidden: false };

  const openToEvents = (visibility ?? DEFAULT_SOCIAL_VISIBILITY) === 'events';
  const shown: SocialLinks = openToEvents ? { instagram: links.instagram, linkedin: links.linkedin } : {};
  const hidden = Boolean(
    links.whatsapp || (!openToEvents && (links.instagram || links.linkedin)),
  );
  return { shown, hidden };
};

// People paste handles, @handles or whole profile links; keep just the handle or number.
export const cleanInstagram = (value: string) =>
  value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '').slice(0, 30);

export const cleanLinkedIn = (value: string) =>
  value.trim().replace(/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i, '').replace(/[/?#].*$/, '').slice(0, 100);

export const cleanWhatsApp = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? `+${digits.slice(1).replace(/\+/g, '')}`.slice(0, 16) : digits.replace(/\+/g, '').slice(0, 15);
};
