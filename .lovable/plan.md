# Two-step cancel for the Attending button

Today, clicking the green "Attending" button instantly removes the registration — one accidental tap and the user is out of the event. This adds a deliberate two-step cancel.

## Behaviour

1. Event is joined → button shows "Attending" with a check (unchanged).
2. First click on "Attending" → the same button switches in place to a warning-styled "Cancel registration?" state.
3. Second click on that state → a confirmation dialog opens: "Leave this event?" with the event title, a note that the event group chat access will be lost, and two actions — "Keep my spot" and "Yes, cancel registration".
4. Confirming removes the registration and shows the existing "Event removed" toast. Cancelling or clicking elsewhere reverts the button to "Attending".
5. The armed "Cancel registration?" state auto-reverts after about 4 seconds of no action, and when the card/modal loses focus, so it never sticks.

Joining an event is unaffected — "Attend" still registers in one click.

## Where it applies

- Event cards across the homefeed, carousels, Popular & Trending, personalized feed.
- The event preview modal's sticky "Attending" button (the currently selected element).

Both surfaces share the same logic so the behaviour is identical.

## Technical notes

- `src/components/EventCard.tsx` holds the attend logic (`handleAttend`, `useAttending().toggle`). Split it: attending + not armed → arm (local `cancelArmed` state + timeout); attending + armed → open a new confirm dialog; not attending → current join path unchanged.
- New `src/components/CancelRegistrationDialog.tsx` built on the existing AlertDialog primitive, receiving the event and an `onConfirm` callback.
- `src/components/EventDetailsModal.tsx` receives the armed state and handler from `EventCard` via new props (`cancelArmed`, plus the existing `onAttend`) so the modal button mirrors the card button rather than duplicating state.
- Button styling for the armed state uses the existing destructive token; no new colors.
