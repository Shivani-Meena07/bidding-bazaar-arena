import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerName, roomCode } = await req.json();
    if (!playerName || !roomCode) {
      return new Response(
        JSON.stringify({ error: "playerName and roomCode are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .select("id, status")
      .eq("room_code", roomCode.toUpperCase())
      .maybeSingle();

    if (roomError) throw roomError;
    if (!room) {
      return new Response(
        JSON.stringify({ error: "Room not found. Check your code." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (room.status !== "waiting") {
      return new Response(
        JSON.stringify({ error: "Game has already started." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check player count
    const { count } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", room.id);

    if ((count || 0) >= 8) {
      return new Response(
        JSON.stringify({ error: "Room is full (max 8 players)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({ room_id: room.id, player_name: playerName, capital: 1000 })
      .select("id")
      .single();

    if (playerError) throw playerError;

    return new Response(
      JSON.stringify({ roomId: room.id, playerId: player.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
