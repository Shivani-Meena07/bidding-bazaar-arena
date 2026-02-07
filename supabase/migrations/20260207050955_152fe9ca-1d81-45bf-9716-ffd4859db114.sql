
-- 1. Create player_sessions table for session-based authentication
CREATE TABLE public.player_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_token TEXT NOT NULL UNIQUE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sessions table
ALTER TABLE public.player_sessions ENABLE ROW LEVEL SECURITY;

-- Deny all client access to sessions table (only accessible via service_role in edge functions)
CREATE POLICY "No client access to sessions" ON public.player_sessions FOR SELECT USING (false);
CREATE POLICY "No client insert to sessions" ON public.player_sessions FOR INSERT WITH CHECK (false);
CREATE POLICY "No client update to sessions" ON public.player_sessions FOR UPDATE USING (false);
CREATE POLICY "No client delete to sessions" ON public.player_sessions FOR DELETE USING (false);

-- 2. Add last_resolved_round to rooms for race condition prevention
ALTER TABLE public.rooms ADD COLUMN last_resolved_round INTEGER NOT NULL DEFAULT 0;

-- 3. Drop overly permissive INSERT policies and replace with deny policies
-- All writes must go through edge functions (which use service_role and bypass RLS)
DROP POLICY IF EXISTS "Anyone can insert rooms" ON public.rooms;
DROP POLICY IF EXISTS "Anyone can insert players" ON public.players;
DROP POLICY IF EXISTS "Anyone can insert bids" ON public.bids;

CREATE POLICY "No direct inserts to rooms" ON public.rooms FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct inserts to players" ON public.players FOR INSERT WITH CHECK (false);
CREATE POLICY "No direct inserts to bids" ON public.bids FOR INSERT WITH CHECK (false);

-- 4. Add UPDATE deny policies on all game tables
CREATE POLICY "No direct updates to rooms" ON public.rooms FOR UPDATE USING (false);
CREATE POLICY "No direct updates to players" ON public.players FOR UPDATE USING (false);
CREATE POLICY "No direct updates to bids" ON public.bids FOR UPDATE USING (false);

-- 5. Add DELETE deny policies on all game tables
CREATE POLICY "No direct deletes from rooms" ON public.rooms FOR DELETE USING (false);
CREATE POLICY "No direct deletes from players" ON public.players FOR DELETE USING (false);
CREATE POLICY "No direct deletes from bids" ON public.bids FOR DELETE USING (false);
