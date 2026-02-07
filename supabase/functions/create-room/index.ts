import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAYER_NAME_REGEX = /^[a-zA-Z0-9_ -]{1,20}$/;

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeErrorResponse(err: unknown, status = 500): Response {
  console.error("create-room error:", err);
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
    const { playerName } = await req.json();

    // Validate player name
    if (!playerName || typeof playerName !== "string" || !PLAYER_NAME_REGEX.test(playerName.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid player name. Use 1-20 alphanumeric characters, underscores, spaces, or hyphens." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedName = playerName.trim();

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

    if (roomError) return safeErrorResponse(roomError);

    // Create host player
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({ room_id: room.id, player_name: sanitizedName, capital: 1000 })
      .select("id")
      .single();

    if (playerError) return safeErrorResponse(playerError);

    // Update room with host
    await supabase
      .from("rooms")
      .update({ host_player_id: player.id })
      .eq("id", room.id);

    // Generate session token
    const sessionToken = generateSessionToken();
    const { error: sessionError } = await supabase
      .from("player_sessions")
      .insert({
        session_token: sessionToken,
        player_id: player.id,
        room_id: room.id,
      });

    if (sessionError) return safeErrorResponse(sessionError);

    return new Response(
      JSON.stringify({ roomId: room.id, roomCode, playerId: player.id, sessionToken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err);
  }
});
