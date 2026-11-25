import { describe, expect, it } from 'vitest';
import { cleanInstagram, cleanLinkedIn, cleanWhatsApp, visibleSocialLinks } from '@/lib/socialLinks';

const links = { instagram: 'tom.bruns', linkedin: 'tom-bruns', whatsapp: '+4915123456789' };

describe('visibleSocialLinks', () => {
  it('shows a stranger nothing by default and says links are held back', () => {
    expect(visibleSocialLinks(links, undefined, { isSelf: false, isConnection: false })).toEqual({ shown: {}, hidden: true });
  });

  it('shows Instagram and LinkedIn, never WhatsApp, to event attendees when opened to events', () => {
    const { shown, hidden } = visibleSocialLinks(links, 'events', { isSelf: false, isConnection: false });
    expect(shown).toEqual({ instagram: 'tom.bruns', linkedin: 'tom-bruns' });
    expect(hidden).toBe(true);
  });

  it('shows everything, WhatsApp included, to a connection', () => {
    expect(visibleSocialLinks(links, 'connections', { isSelf: false, isConnection: true })).toEqual({ shown: links, hidden: false });
  });

  it('shows members all of their own links', () => {
    expect(visibleSocialLinks(links, 'connections', { isSelf: true, isConnection: false }).shown).toEqual(links);
  });

  it('holds nothing back when there is nothing to hide', () => {
    expect(visibleSocialLinks({ instagram: 'a' }, 'events', { isSelf: false, isConnection: false }).hidden).toBe(false);
    expect(visibleSocialLinks(undefined, 'connections', { isSelf: false, isConnection: false })).toEqual({ shown: {}, hidden: false });
  });
});

describe('cleaning what people paste', () => {
  it('keeps just the handle or number', () => {
    expect(cleanInstagram('https://www.instagram.com/tom.bruns/?hl=en')).toBe('tom.bruns');
    expect(cleanInstagram('@tom.bruns')).toBe('tom.bruns');
    expect(cleanLinkedIn('https://pt.linkedin.com/in/tom-bruns/')).toBe('tom-bruns');
    expect(cleanWhatsApp('+351 912 345 678')).toBe('+351912345678');
  });
});
