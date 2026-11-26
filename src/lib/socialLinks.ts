/**
 * Who can see a member's social links (Instagram, LinkedIn, WhatsApp): their connections only.
 * A connection = two people who were at the same event and tagged each other. Nobody else sees the
 * links or any hint that they exist. Private by default, as the GDPR's data protection by default
 * (Article 25) expects.
 */

export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  whatsapp?: string;
}

/** The links a viewer may see: all of them for the member themself and their connections, none for anyone else. */
export const visibleSocialLinks = (
  links: SocialLinks | undefined,
  { isSelf, isConnection }: { isSelf: boolean; isConnection: boolean },
): { shown: SocialLinks } => ({ shown: links && (isSelf || isConnection) ? { ...links } : {} });

// People paste handles, @handles or whole profile links; keep just the handle or number.
export const cleanInstagram = (value: string) =>
  value.trim().replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/^@/, '').replace(/[/?#].*$/, '').slice(0, 30);

export const cleanLinkedIn = (value: string) =>
  value.trim().replace(/^https?:\/\/([a-z]{2,3}\.)?linkedin\.com\/in\//i, '').replace(/[/?#].*$/, '').slice(0, 100);

export const cleanWhatsApp = (value: string) => {
  const digits = value.replace(/[^\d+]/g, '');
  return digits.startsWith('+') ? `+${digits.slice(1).replace(/\+/g, '')}`.slice(0, 16) : digits.replace(/\+/g, '').slice(0, 15);
};
