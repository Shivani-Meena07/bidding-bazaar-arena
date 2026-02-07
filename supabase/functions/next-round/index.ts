import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function validateSession(supabase: any, req: Request): Promise<{ playerId: string; roomId: string } | null> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase
    .from("player_sessions")
    .select("player_id, room_id")
    .eq("session_token", token)
    .maybeSingle();

  return data || null;
}

function safeErrorResponse(err: unknown, status = 500): Response {
  console.error("next-round error:", err);
  return new Response(
    JSON.stringify({ error: "An unexpected error occurred" }),
    { status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { roomId } = await req.json();
    if (!roomId) {
      return new Response(
        JSON.stringify({ error: "roomId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate session
    const session = await validateSession(supabase, req);
    if (!session || session.roomId !== roomId) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get room
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room) {
      return new Response(
        JSON.stringify({ error: "Room not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is host
    if (room.host_player_id !== session.playerId) {
      return new Response(
        JSON.stringify({ error: "Only the host can advance rounds" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check remaining players
    const { count: remainingPlayers } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("is_eliminated", false);

    const nextRound = room.current_round + 1;
    const isGameOver = (remainingPlayers || 0) <= 1 || nextRound > (room.max_rounds || 10);

    if (isGameOver) {
      await supabase
        .from("rooms")
        .update({ status: "game_over" })
        .eq("id", roomId);

      return new Response(
        JSON.stringify({ success: true, gameOver: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get next item
    const items = room.items as any[];
    const nextItem = items && items[nextRound - 1] ? items[nextRound - 1] : null;

    // Update room to next round
    await supabase
      .from("rooms")
      .update({
        status: "bidding",
        current_round: nextRound,
        current_item: nextItem,
      })
      .eq("id", roomId);

    return new Response(
      JSON.stringify({ success: true, round: nextRound }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err);
  }
});
