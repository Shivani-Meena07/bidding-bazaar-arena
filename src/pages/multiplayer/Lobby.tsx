import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatINR } from "@/data/items";

interface LobbyPlayer {
  id: string;
  player_name: string;
  capital: number;
  is_eliminated: boolean;
}

interface RoomData {
  id: string;
  room_code: string;
  status: string;
  current_round: number;
  max_rounds: number;
  host_player_id: string;
}

export default function Lobby() {
  const { roomId } = useParams<{ roomId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const playerName = searchParams.get("name") || "Player";
  const isHost = searchParams.get("host") === "true";
  const playerId = searchParams.get("playerId") || "";

  const [room, setRoom] = useState<RoomData | null>(null);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [loading, setLoading] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState(playerId);

  // Fetch room data
  const fetchRoom = useCallback(async () => {
    if (!roomId) return;
    const { data, error } = await supabase
      .from("rooms")
      .select("*")
      .eq("id", roomId)
      .single();
    if (error) {
      toast.error("Room not found");
      return;
    }
    setRoom(data as RoomData);

    // If room transitioned to bidding, go to game
    if (data.status === "bidding") {
      navigate(`/multiplayer/game/${roomId}?name=${encodeURIComponent(playerName)}&playerId=${myPlayerId}`);
    }
  }, [roomId, navigate, playerName, myPlayerId]);

  // Fetch players
  const fetchPlayers = useCallback(async () => {
    if (!roomId) return;
    const { data } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("created_at", { ascending: true });
    if (data) setPlayers(data as LobbyPlayer[]);
  }, [roomId]);

  useEffect(() => {
    fetchRoom();
    fetchPlayers();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`lobby-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_id=eq.${roomId}` }, () => {
        fetchPlayers();
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const updated = payload.new as RoomData;
        setRoom(updated);
        if (updated.status === "bidding") {
          navigate(`/multiplayer/game/${roomId}?name=${encodeURIComponent(playerName)}&playerId=${myPlayerId}`);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, fetchRoom, fetchPlayers, navigate, playerName, myPlayerId]);

  // For host: store playerId from room
  useEffect(() => {
    if (isHost && room && !myPlayerId) {
      setMyPlayerId(room.host_player_id);
    }
  }, [isHost, room, myPlayerId]);

  const handleStartGame = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke("start-game", {
        body: { roomId },
      });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || "Failed to start game");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background bg-grid-pattern scanline flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div>
          <h1 className="font-heading text-2xl text-neon-cyan tracking-wider">BATTLE LOBBY</h1>
          {room && (
            <div className="mt-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Room Code</p>
              <p className="font-heading text-4xl text-neon-gold tracking-[0.4em] mt-1 animate-pulse-neon">
                {room.room_code}
              </p>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                Share this code with friends to join!
              </p>
            </div>
          )}
        </div>

        <div className="border border-border/60 rounded-lg p-4 bg-card/80">
          <h4 className="font-heading text-sm tracking-wider text-muted-foreground mb-3">
            PLAYERS ({players.length})
          </h4>
          <div className="space-y-2">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                  p.id === myPlayerId || p.id === room?.host_player_id
                    ? "border border-primary/40 bg-primary/5"
                    : "bg-muted/30"
                }`}
              >
                <div className="flex items-center gap-2">
                  {p.id === room?.host_player_id && (
                    <span className="text-xs">👑</span>
                  )}
                  <span className="font-body font-semibold text-foreground">
                    {p.player_name}
                    {(p.id === myPlayerId || (isHost && p.id === room?.host_player_id)) && " (You)"}
                  </span>
                </div>
                <span className="font-mono text-neon-gold text-sm">
                  {formatINR(p.capital)}
                </span>
              </motion.div>
            ))}

            {players.length < 2 && (
              <div className="py-4 text-center">
                <div className="inline-block animate-pulse-neon">
                  <span className="text-muted-foreground font-mono text-sm">
                    Waiting for players...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {isHost && (
          <Button
            onClick={handleStartGame}
            variant="neon"
            size="lg"
            className="w-full font-heading tracking-wider"
            disabled={loading || players.length < 2}
          >
            {loading ? "STARTING..." : `⚔️ START GAME (${players.length} players)`}
          </Button>
        )}

        {!isHost && (
          <div className="text-center">
            <p className="text-muted-foreground font-mono text-sm animate-pulse-neon">
              Waiting for host to start the game...
            </p>
          </div>
        )}

        <Button
          onClick={() => navigate("/multiplayer")}
          variant="ghost"
          className="text-muted-foreground hover:text-primary font-mono text-sm"
        >
          ← Leave Room
        </Button>
      </motion.div>
    </div>
  );
}
