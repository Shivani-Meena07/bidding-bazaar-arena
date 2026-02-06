import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export default function JoinRoom() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!playerName.trim()) {
      toast.error("Enter your callsign first!");
      return;
    }
    if (!roomCode.trim()) {
      toast.error("Enter the room code!");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-room", {
        body: { playerName: playerName.trim(), roomCode: roomCode.trim().toUpperCase() },
      });
      if (error) throw error;
      if (!data?.roomId) throw new Error("Could not join room");
      navigate(`/multiplayer/lobby/${data.roomId}?name=${encodeURIComponent(playerName.trim())}&playerId=${data.playerId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to join room");
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
          <h1 className="font-heading text-2xl text-neon-cyan tracking-wider">JOIN ROOM</h1>
          <p className="text-muted-foreground mt-2 font-body">
            Enter a room code to join the battle
          </p>
        </div>

        <div className="border border-border/60 rounded-lg p-6 bg-card/80 space-y-4">
          <div>
            <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">
              Your Callsign
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={20}
              className="w-full mt-2 bg-input border border-border/60 rounded-md px-4 py-3 text-foreground font-mono outline-none focus:border-primary transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-heading text-muted-foreground uppercase tracking-wider">
              Room Code
            </label>
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ABCD12"
              maxLength={6}
              className="w-full mt-2 bg-input border border-border/60 rounded-md px-4 py-3 text-foreground font-heading text-2xl text-center tracking-[0.3em] outline-none focus:border-primary transition-colors uppercase"
            />
          </div>

          <Button
            onClick={handleJoin}
            variant="neon"
            size="lg"
            className="w-full font-heading tracking-wider"
            disabled={loading}
          >
            {loading ? "JOINING..." : "🔗 JOIN ROOM"}
          </Button>
        </div>

        <Button
          onClick={() => navigate("/multiplayer")}
          variant="ghost"
          className="text-muted-foreground hover:text-primary font-mono text-sm"
        >
          ← Back
        </Button>
      </motion.div>
    </div>
  );
}
