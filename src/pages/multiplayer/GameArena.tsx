import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GameItem, formatINR } from "@/data/items";
import { ItemCard } from "@/components/game/ItemCard";
import { BidPanel } from "@/components/game/BidPanel";
import { PlayerList } from "@/components/game/PlayerList";
import { Player } from "@/hooks/useGameState";
import { getGameSession, getSessionHeaders } from "@/lib/gameSession";

interface RoomData {
  id: string;
  room_code: string;
  status: string;
  current_round: number;
  max_rounds: number;
  host_player_id: string;
  current_item: any;
}

interface DBPlayer {
  id: string;
  player_name: string;
  capital: number;
  is_eliminated: boolean;
}

interface RoundResultData {
  winnerId: string;
  winnerName: string;
  winnerBid: number;
  winnerGain: number;
  allBids: { playerId: string; playerName: string; amount: number }[];
  eliminated: string[];
}

export default function GameArena() {
  const { roomId } = useParams<{ roomId: string }>();
  const navigate = useNavigate();

  const session = roomId ? getGameSession(roomId) : null;
  const playerName = session?.playerName || "Player";
  const myPlayerId = session?.playerId || "";

  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<DBPlayer[]>([]);
  const [hasBid, setHasBid] = useState(false);
  const [roundResult, setRoundResult] = useState<RoundResultData | null>(null);
  const [bidsCount, setBidsCount] = useState(0);

  // Redirect if no session
  useEffect(() => {
    if (!session) {
      toast.error("Session expired. Please rejoin.");
      navigate("/multiplayer");
    }
  }, [session, navigate]);

  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
    if (data) setRoom(data as RoomData);
  }, [roomId]);

  const fetchPlayers = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("capital", { ascending: false });
    if (data) setPlayers(data as DBPlayer[]);
  }, [roomId]);

  const fetchBidsCount = useCallback(async () => {
    if (!roomId || !room) return;
    const { count } = await supabase
      .from("bids")
      .select("*", { count: "exact", head: true })
      .eq("room_id", roomId)
      .eq("round_number", room.current_round);
    setBidsCount(count || 0);
  }, [roomId, room]);

  // Check if I already bid this round
  const checkMyBid = useCallback(async () => {
    if (!roomId || !room || !myPlayerId) return;
    const { data } = await supabase
      .from("bids")
      .select("id")
      .eq("room_id", roomId)
      .eq("player_id", myPlayerId)
      .eq("round_number", room.current_round)
      .maybeSingle();
    setHasBid(!!data);
  }, [roomId, room, myPlayerId]);

  useEffect(() => {
    fetchRoom();
    fetchPlayers();
  }, [fetchRoom, fetchPlayers]);

  useEffect(() => {
    if (room) {
      checkMyBid();
      fetchBidsCount();
    }
  }, [room, checkMyBid, fetchBidsCount]);

  // Realtime subscriptions
  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as RoomData;
        setRoom(updated);

        if (updated.status === "results") {
          fetchPlayers();
          setRoundResult(null);
        }
        if (updated.status === "bidding") {
          setHasBid(false);
          setRoundResult(null);
          fetchPlayers();
        }
        if (updated.status === "game_over") {
          fetchPlayers();
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, () => {
        fetchPlayers();
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bids", filter: `room_id=eq.${roomId}` }, () => {
        fetchBidsCount();
      })
      .on("broadcast", { event: "round_result" }, (payload) => {
        setRoundResult(payload.payload as RoundResultData);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchPlayers, fetchBidsCount]);

  const handleBid = async (amount: number) => {
    if (!roomId || !room || hasBid) return;
    try {
      const { data, error } = await supabase.functions.invoke("submit-bid", {
        body: { roomId, playerId: myPlayerId, amount, roundNumber: room.current_round },
        headers: getSessionHeaders(roomId),
      });
      if (error) throw error;
      setHasBid(true);
      toast.success("Bid submitted!");
    } catch (err: any) {
      toast.error(err.message || "Failed to submit bid");
    }
  };

  const handleNextRound = async () => {
    if (!roomId) return;
    try {
      const { error } = await supabase.functions.invoke("next-round", {
        body: { roomId },
        headers: getSessionHeaders(roomId),
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to advance round");
    }
  };

  const me = players.find((p) => p.id === myPlayerId);
  const isHost = room?.host_player_id === myPlayerId;
  const currentItem = room?.current_item as GameItem | null;
  const activePlayers = players.filter((p) => !p.is_eliminated);
  const isEliminated = me?.is_eliminated ?? false;

  // Convert DB players to game Player format for PlayerList
  const gamePlayers: Player[] = players.map((p) => ({
    id: p.id,
    name: p.player_name,
    capital: p.capital,
    isAI: false,
    isEliminated: p.is_eliminated,
  }));

  // Game Over
  if (room?.status === "game_over") {
    const sorted = [...players].sort((a, b) => b.capital - a.capital);
    const winner = sorted[0];
    const myRank = sorted.findIndex((p) => p.id === myPlayerId) + 1;

    return (
      <div className="min-h-screen bg-background bg-grid-pattern scanline flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="max-w-lg mx-auto text-center space-y-8"
        >
          <div>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-6xl mb-4"
            >
              {winner?.id === myPlayerId ? "🏆" : "💀"}
            </motion.div>
            <h2 className="font-heading text-3xl text-neon-cyan tracking-wider">
              {winner?.id === myPlayerId ? "VICTORY" : "GAME OVER"}
            </h2>
            <p className="text-muted-foreground mt-2 font-body text-lg">
              {winner?.id === myPlayerId
                ? "You dominated the auction floor!"
                : `You finished #${myRank}. ${winner?.player_name} claimed victory.`}
            </p>
          </div>

          <div className="border border-border/60 rounded-lg p-4 bg-card/80">
            <h4 className="font-heading text-sm tracking-wider text-muted-foreground mb-3">
              FINAL LEADERBOARD
            </h4>
            <div className="space-y-2">
              {sorted.map((player, i) => (
                <motion.div
                  key={player.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className={`flex items-center justify-between px-4 py-3 rounded ${
                    i === 0 ? "border border-primary/40 bg-primary/10 glow-cyan"
                    : player.is_eliminated ? "opacity-40 bg-muted/20"
                    : "bg-muted/30"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg">
                      {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀"}
                    </span>
                    <span className={`font-body font-semibold ${
                      player.id === myPlayerId ? "text-neon-cyan" : "text-foreground"
                    }`}>
                      {player.player_name}
                      {player.id === myPlayerId && " (You)"}
                    </span>
                  </div>
                  <span className={`font-mono font-bold ${
                    player.capital <= 0 ? "text-neon-red" : "text-neon-gold"
                  }`}>
                    {formatINR(player.capital)}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={() => navigate("/multiplayer")}
              variant="neon"
              size="lg"
              className="flex-1 font-heading tracking-wider"
            >
              🏠 BACK TO LOBBY
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Results phase
  if (room?.status === "results") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern scanline">
        <div className="max-w-5xl mx-auto p-4 md:p-6">
          <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-6">
            <div className="flex items-center gap-4">
              <h2 className="font-heading text-lg text-neon-cyan tracking-wider">BIDCRAFT</h2>
              <span className="text-muted-foreground font-mono text-sm">
                ROUND {room.current_round}/{room.max_rounds} — RESULTS
              </span>
            </div>
            {me && (
              <span className="font-mono text-neon-gold font-semibold">{formatINR(me.capital)}</span>
            )}
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {roundResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="border border-border/60 rounded-lg p-6 bg-card/80 space-y-4"
                >
                  <h3 className="font-heading text-lg text-neon-cyan text-center tracking-wider">
                    ROUND RESULTS
                  </h3>
                  <div className="text-center p-4 rounded-lg border border-primary/30 bg-primary/5">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">🏆 Highest Bidder</p>
                    <p className="font-heading text-lg text-neon-cyan mt-1">{roundResult.winnerName}</p>
                    <p className="font-mono text-sm text-muted-foreground">Bid: {formatINR(roundResult.winnerBid)}</p>
                    <p className={`font-mono text-sm ${roundResult.winnerGain >= 0 ? "text-neon-green" : "text-neon-red"}`}>
                      {roundResult.winnerGain >= 0 ? "+" : ""}{formatINR(roundResult.winnerGain)} profit
                    </p>
                  </div>

                  <div className="space-y-1">
                    {roundResult.allBids.map((bid, i) => (
                      <div key={bid.playerId} className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                        bid.playerId === roundResult.winnerId ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
                      }`}>
                        <span className="font-body">{i === 0 ? "🏆" : `#${i + 1}`} {bid.playerName}</span>
                        <span className="font-mono text-neon-gold">{formatINR(bid.amount)}</span>
                      </div>
                    ))}
                  </div>

                  {roundResult.eliminated.length > 0 && (
                    <p className="text-xs text-neon-red uppercase tracking-wider font-heading text-center">
                      💀 Eliminated: {roundResult.eliminated.join(", ")}
                    </p>
                  )}
                </motion.div>
              )}

              {!roundResult && (
                <div className="border border-border/60 rounded-lg p-6 bg-card/80 text-center">
                  <p className="text-muted-foreground font-mono animate-pulse-neon">
                    Loading results...
                  </p>
                </div>
              )}

              {isHost && (
                <Button
                  onClick={handleNextRound}
                  variant="neon"
                  size="lg"
                  className="w-full font-heading tracking-wider"
                >
                  NEXT ROUND →
                </Button>
              )}
            </div>

            <div>
              <PlayerList players={gamePlayers} currentPlayerId={myPlayerId} showBids winnerId={roundResult?.winnerId} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bidding phase
  return (
    <div className="min-h-screen bg-background bg-grid-pattern scanline">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-6">
          <div className="flex items-center gap-4">
            <h2 className="font-heading text-lg text-neon-cyan tracking-wider">BIDCRAFT</h2>
            <span className="text-muted-foreground font-mono text-sm">
              ROUND {room?.current_round || 1}/{room?.max_rounds || 10}
            </span>
            <span className="text-xs text-muted-foreground font-mono">
              {bidsCount}/{activePlayers.length} bids in
            </span>
          </div>
          {me && (
            <span className="font-mono text-neon-gold font-semibold">{formatINR(me.capital)}</span>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`bidding-${room?.current_round}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid md:grid-cols-3 gap-6"
          >
            <div className="md:col-span-2 space-y-6">
              {currentItem && <ItemCard item={currentItem} />}

              {!hasBid && !isEliminated && me && (
                <BidPanel maxBid={me.capital} onBid={handleBid} />
              )}

              {hasBid && (
                <div className="border border-primary/30 rounded-lg p-6 bg-primary/5 text-center">
                  <p className="text-neon-cyan font-heading tracking-wider">BID SUBMITTED ✓</p>
                  <p className="text-muted-foreground font-mono text-sm mt-2">
                    Waiting for other players... ({bidsCount}/{activePlayers.length})
                  </p>
                </div>
              )}

              {isEliminated && (
                <div className="text-center p-4 border border-destructive/40 rounded-lg bg-destructive/10">
                  <p className="text-neon-red font-heading">YOU'VE BEEN ELIMINATED</p>
                  <p className="text-sm text-muted-foreground mt-1">Spectating...</p>
                </div>
              )}
            </div>

            <div>
              <PlayerList players={gamePlayers} currentPlayerId={myPlayerId} />
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
