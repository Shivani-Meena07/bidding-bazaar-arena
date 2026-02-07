import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Game items catalog
const GAME_ITEMS = [
  { id: "1", name: "Vintage Mechanical Watch", description: "A rare 1960s Swiss automatic timepiece with sapphire crystal", price: 45000, category: "Luxury", emoji: "⌚" },
  { id: "2", name: "Gaming Laptop", description: "RTX 4060, 16GB RAM, 144Hz display, RGB keyboard", price: 85000, category: "Electronics", emoji: "💻" },
  { id: "3", name: "Royal Enfield Classic 350", description: "Chrome black finish, single-cylinder, retro design", price: 195000, category: "Vehicles", emoji: "🏍️" },
  { id: "4", name: "Gold Necklace Set", description: "22K gold temple design necklace, 25 grams", price: 150000, category: "Jewelry", emoji: "📿" },
  { id: "5", name: "iPhone 16 Pro", description: "256GB, Titanium finish, A18 Pro chip", price: 134900, category: "Electronics", emoji: "📱" },
  { id: "6", name: "Handmade Persian Rug", description: "6x9 ft, silk blend, intricate floral pattern", price: 75000, category: "Home", emoji: "🪴" },
  { id: "7", name: "Drone Camera Kit", description: "4K stabilized camera, 30min flight, GPS return", price: 62000, category: "Electronics", emoji: "🛸" },
  { id: "8", name: "Antique Brass Telescope", description: "19th century naval telescope, fully functional", price: 28000, category: "Collectibles", emoji: "🔭" },
  { id: "9", name: "Designer Leather Jacket", description: "Italian lambskin, custom-stitched, limited edition", price: 35000, category: "Fashion", emoji: "🧥" },
  { id: "10", name: "Electric Guitar Bundle", description: "Fender Stratocaster with amp, pedals, and case", price: 48000, category: "Music", emoji: "🎸" },
  { id: "11", name: "Smart Home Kit", description: "Hub, 10 sensors, smart locks, cameras, voice control", price: 42000, category: "Electronics", emoji: "🏠" },
  { id: "12", name: "Vintage Wine Collection", description: "6 bottles of aged Bordeaux, 2005-2015 vintages", price: 55000, category: "Luxury", emoji: "🍷" },
  { id: "13", name: "Professional DSLR Camera", description: "Full-frame sensor, 45MP, weather-sealed body", price: 120000, category: "Electronics", emoji: "📷" },
  { id: "14", name: "Teak Wood Dining Set", description: "8-seater carved dining table with chairs", price: 88000, category: "Furniture", emoji: "🪑" },
  { id: "15", name: "Mountain Bike", description: "Carbon frame, 27-speed, hydraulic disc brakes", price: 65000, category: "Sports", emoji: "🚲" },
  { id: "16", name: "Espresso Machine", description: "Commercial-grade, dual boiler, PID temperature control", price: 38000, category: "Kitchen", emoji: "☕" },
  { id: "17", name: "Crystal Chandelier", description: "Swarovski crystal, 12-arm, gold-plated frame", price: 95000, category: "Home", emoji: "✨" },
  { id: "18", name: "Signed Cricket Bat", description: "Autographed by Virat Kohli, with COA", price: 72000, category: "Collectibles", emoji: "🏏" },
  { id: "19", name: "4K Projector", description: "Laser, 3000 lumens, 150-inch throw, HDR10+", price: 155000, category: "Electronics", emoji: "🎬" },
  { id: "20", name: "Kashmiri Pashmina Shawl", description: "Hand-embroidered, pure pashmina, heirloom quality", price: 32000, category: "Fashion", emoji: "🧣" },
];

function getRandomItems(count: number) {
  const shuffled = [...GAME_ITEMS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

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
  console.error("start-game error:", err);
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

    // Check room
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room || room.status !== "waiting") {
      return new Response(
        JSON.stringify({ error: "Room not found or already started" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is host
    if (room.host_player_id !== session.playerId) {
      return new Response(
        JSON.stringify({ error: "Only the host can start the game" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check player count
    const { count } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId);

    if ((count || 0) < 2) {
      return new Response(
        JSON.stringify({ error: "Need at least 2 players to start" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate items for the game
    const items = getRandomItems(room.max_rounds || 10);

    // Update room to bidding
    const { error } = await supabase
      .from("rooms")
      .update({
        status: "bidding",
        current_round: 1,
        items: items,
        current_item: items[0],
      })
      .eq("id", roomId);

    if (error) return safeErrorResponse(error);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return safeErrorResponse(err);
  }
});
