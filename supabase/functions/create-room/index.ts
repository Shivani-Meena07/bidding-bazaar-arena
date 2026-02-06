import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { playerName } = await req.json();
    if (!playerName || typeof playerName !== "string") {
      return new Response(
        JSON.stringify({ error: "playerName is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Generate unique room code
    let roomCode = generateRoomCode();
    let attempts = 0;
    while (attempts < 10) {
      const { data: existing } = await supabase
        .from("rooms")
        .select("id")
        .eq("room_code", roomCode)
        .maybeSingle();
      if (!existing) break;
      roomCode = generateRoomCode();
      attempts++;
    }

    // Create room
    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({ room_code: roomCode, status: "waiting" })
      .select("id")
      .single();

    if (roomError) throw roomError;

    // Create host player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({ room_id: room.id, player_name: playerName, capital: 1000 })
      .select("id")
      .single();

    if (playerError) throw playerError;

    // Update room with host
    await supabase
      .from("rooms")
      .update({ host_player_id: player.id })
      .eq("id", room.id);

    return new Response(
      JSON.stringify({ roomId: room.id, roomCode, playerId: player.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
