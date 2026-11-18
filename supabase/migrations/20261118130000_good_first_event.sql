-- Curator's "Good first event" switch: a low-key event open to everyone that
-- suits someone new. The member home suggests these first.
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS good_first_event boolean NOT NULL DEFAULT false;
