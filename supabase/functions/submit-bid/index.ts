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
    const { roomId, playerId, amount, roundNumber } = await req.json();
    if (!roomId || !playerId || amount === undefined || !roundNumber) {
      return new Response(
        JSON.stringify({ error: "roomId, playerId, amount, and roundNumber are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify room is in bidding phase
    const { data: room } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    if (!room || room.status !== "bidding") {
      return new Response(
        JSON.stringify({ error: "Room is not accepting bids" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify player exists and is not eliminated
    const { data: player } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .eq("room_id", roomId)
      .single();

    if (!player || player.is_eliminated) {
      return new Response(
        JSON.stringify({ error: "Player not found or eliminated" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clamp bid amount
    const bidAmount = Math.max(0, Math.min(amount, player.capital));

    // Insert bid
    const { error: bidError } = await supabase
      .from("bids")
      .insert({
        room_id: roomId,
        player_id: playerId,
        round_number: roundNumber,
        amount: bidAmount,
      });

    if (bidError) {
      if (bidError.code === "23505") {
        return new Response(
          JSON.stringify({ error: "Already bid this round" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw bidError;
    }

    // Check if all active players have bid
    const { count: activePlayers } = await supabase
      .from("players")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("is_eliminated", false);

    const { count: roundBids } = await supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("round_number", roundNumber);

    const allBidsIn = (roundBids || 0) >= (activePlayers || 0);

    if (allBidsIn) {
      // Auto-resolve the round
      await resolveRound(supabase, roomId, room);
    }

    return new Response(
      JSON.stringify({ success: true, allBidsIn }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function resolveRound(supabase: any, roomId: string, room: any) {
  const currentRound = room.current_round;
  const currentItem = room.current_item;

  // Get all bids for this round
  const { data: bids } = await supabase
    .from("bids")
    .select("*, players!inner(player_name)")
    .eq("room_id", roomId)
    .eq("round_number", currentRound)
    .order("amount", { ascending: false });

  if (!bids || bids.length === 0) return;

  // Winner = highest bidder
  const winner = bids[0];
  const winnerGain = currentItem.price - winner.amount;

  // Update all players
  const eliminatedNames: string[] = [];
  for (const bid of bids) {
    let newCapital: number;
    if (bid.player_id === winner.player_id) {
      newCapital = (await getPlayerCapital(supabase, bid.player_id)) + winnerGain;
    } else {
      newCapital = (await getPlayerCapital(supabase, bid.player_id)) - bid.amount;
    }

    const isEliminated = newCapital <= 0;
    if (isEliminated) {
      eliminatedNames.push(bid.players.player_name);
    }

    await supabase
      .from("players")
      .update({ capital: newCapital, is_eliminated: isEliminated })
      .eq("id", bid.player_id);
  }

  // Build result data
  const resultData = {
    winnerId: winner.player_id,
    winnerName: winner.players.player_name,
    winnerBid: winner.amount,
    winnerGain,
    allBids: bids.map((b: any) => ({
      playerId: b.player_id,
      playerName: b.players.player_name,
      amount: b.amount,
    })),
    eliminated: eliminatedNames,
  };

  // Broadcast result via realtime channel
  const channel = supabase.channel(`game-${roomId}`);
  await channel.send({
    type: "broadcast",
    event: "round_result",
    payload: resultData,
  });

  // Check if game should end
  const { count: remainingPlayers } = await supabase
    .from("players")
    .select("*", { count: "exact", head: true })
    .eq("room_id", roomId)
    .eq("is_eliminated", false);

  const isGameOver = (remainingPlayers || 0) <= 1 || currentRound >= (room.max_rounds || 10);

  // Update room status
  await supabase
    .from("rooms")
    .update({ status: isGameOver ? "game_over" : "results" })
    .eq("id", roomId);
}

async function getPlayerCapital(supabase: any, playerId: string): Promise<number> {
  const { data } = await supabase
    .from("players")
    .select("capital")
    .eq("id", playerId)
    .single();
  return data?.capital || 0;
}
