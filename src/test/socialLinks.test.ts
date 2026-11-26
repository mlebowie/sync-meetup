import { describe, expect, it } from 'vitest';
import { cleanInstagram, cleanLinkedIn, cleanWhatsApp, visibleSocialLinks } from '@/lib/socialLinks';

const links = { instagram: 'tom.bruns', linkedin: 'tom-bruns', whatsapp: '+4915123456789' };

describe('visibleSocialLinks', () => {
  it('shows someone who is not a connection nothing', () => {
    expect(visibleSocialLinks(links, { isSelf: false, isConnection: false })).toEqual({ shown: {} });
  });

  it('shows a connection everything, WhatsApp included', () => {
    expect(visibleSocialLinks(links, { isSelf: false, isConnection: true })).toEqual({ shown: links });
  });

  it('shows members all of their own links', () => {
    expect(visibleSocialLinks(links, { isSelf: true, isConnection: false }).shown).toEqual(links);
  });

  it('handles members with no links', () => {
    expect(visibleSocialLinks(undefined, { isSelf: false, isConnection: true })).toEqual({ shown: {} });
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
