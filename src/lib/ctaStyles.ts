// One primary call-to-action style (body-size, regular weight) for log in, sign up and onboarding, so every
// screen's main button has the same colour, type and width. Full width up to the
// log-in column (max-w-md), centred, so it lines up with the forms above it.
export const primaryCta =
  'mx-auto flex h-12 w-full max-w-md px-6 text-base font-normal bg-[#C1694F] text-[#1F110C] shadow-none hover:bg-primary-hover disabled:opacity-40';

// Form fields in the same shape as the primary button: 48px tall, fully rounded, roomy padding.
export const pillField = 'mt-1.5 h-12 rounded-full px-5';

// The one secondary action on a screen: a text link centred under the primary button. Medium weight in SYNC's
// darker terracotta (#974B35: 6:1 on cream; the brand #C1694F is too light for text this size), no underline.
export const secondaryLink =
  'mx-auto mt-3 flex min-h-11 items-center rounded px-3 text-base font-medium text-[#974B35] hover:text-[#7A3C2A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
