
-- Remove overly permissive policies (service role bypasses RLS anyway)
DROP POLICY IF EXISTS "Service role can manage rooms" ON public.rooms;
DROP POLICY IF EXISTS "Service role can manage players" ON public.players;
DROP POLICY IF EXISTS "Service role can manage bids" ON public.bids;

-- Add specific anon INSERT policies for edge function fallback
-- (Edge functions use service role which bypasses RLS, so these are just safety nets)
CREATE POLICY "Anyone can insert rooms" ON public.rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert players" ON public.players FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can insert bids" ON public.bids FOR INSERT WITH CHECK (true);
