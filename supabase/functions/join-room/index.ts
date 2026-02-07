import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PLAYER_NAME_REGEX = /^[a-zA-Z0-9_ -]{1,20}$/;

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function safeErrorResponse(err: unknown, status = 500): Response {
  console.error("join-room error:", err);
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
    const { playerName, roomCode } = await req.json();

    // Validate player name
    if (!playerName || typeof playerName !== "string" || !PLAYER_NAME_REGEX.test(playerName.trim())) {
      return new Response(
        JSON.stringify({ error: "Invalid player name. Use 1-20 alphanumeric characters, underscores, spaces, or hyphens." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!roomCode || typeof roomCode !== "string") {
      return new Response(
        JSON.stringify({ error: "Room code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const sanitizedName = playerName.trim();

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

    if (roomError) return safeErrorResponse(roomError);
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
      .insert({ room_id: room.id, player_name: sanitizedName, capital: 1000 })
      .select("id")
      .single();

    if (playerError) return safeErrorResponse(playerError);

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
      JSON.stringify({ roomId: room.id, playerId: player.id, sessionToken }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err);
  }
});
