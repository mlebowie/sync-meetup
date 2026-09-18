# Behavioral onboarding mockup

## Goal
Turn the selected mockup into a short, mobile-first onboarding flow that learns how someone prefers to attend events before asking what they are interested in.

## Experience
1. Open with **Find your flow** and explain that three quick answers improve event recommendations.
2. Ask one behavior-based question per screen:
   - Planned or spontaneous outings
   - Small or lively group settings
   - Familiar faces or meeting new people
3. Show clear progress, allow Back navigation, and retain previous answers.
4. Use the answers to reveal one of four flexible social styles:
   - The Weekend Explorer
   - The Community Builder
   - The Selective Socialiser
   - The New-in-Town Nomad
5. Explain briefly how that result affects suggested event format, while making clear it is a starting point rather than a permanent label.
6. Continue to **Choose 3–5 interests**, grouped into scannable categories such as Outdoors, Food & Social, Arts & Culture, Wellness, and Professional.
7. Continue into the existing personal-details form, then create the profile and show personalized recommendations as today.

## Visual direction
- Follow the selected **Behavioral onboarding flow** mockup.
- Preserve SYNC’s cream, terracotta, olive, and pale amber palette and existing typography.
- Use focused single-question screens, strong selected states, compact category headings, and subtle crossfade/slide transitions.
- Keep controls accessible and comfortable on small phones; respect reduced-motion preferences.

## Recommendation logic
- Store each answer as a neutral preference signal.
- Map the combined signals deterministically to the closest social style.
- Use the social style for event-format ranking, while interests continue to control subject/category relevance.
- Save the result with the profile so recommendations remain consistent after onboarding.

## Files and validation
- Refactor the current onboarding page into staged questionnaire, interests, and personal-details steps.
- Extend the local profile model with questionnaire answers and social style.
- Reuse the existing interest definitions and profile validation, including required fields and 18+ checks.
- Verify the full flow on mobile and desktop: answer, back, result, 3–5 interest limit, profile submission, and personalized home feed.
