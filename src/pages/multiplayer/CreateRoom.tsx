import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { saveGameSession } from "@/lib/gameSession";

export default function CreateRoom() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    const trimmed = playerName.trim();
    if (!trimmed) {
      toast.error("Enter your callsign first!");
      return;
    }
    // Client-side validation matching server regex
    if (!/^[a-zA-Z0-9_ -]{1,20}$/.test(trimmed)) {
      toast.error("Use 1-20 alphanumeric characters, underscores, spaces, or hyphens.");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-room", {
        body: { playerName: trimmed },
      });
      if (error) throw error;
      if (!data?.roomId) throw new Error("No room created");

      // Store session securely in localStorage
      saveGameSession(data.roomId, {
        sessionToken: data.sessionToken,
        playerId: data.playerId,
        roomId: data.roomId,
        playerName: trimmed,
        isHost: true,
      });

      navigate(`/multiplayer/lobby/${data.roomId}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to create room");
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
          <h1 className="font-heading text-2xl text-neon-cyan tracking-wider">CREATE ROOM</h1>
          <p className="text-muted-foreground mt-2 font-body">
            Set up a new battle arena and invite friends
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

          <Button
            onClick={handleCreate}
            variant="neon"
            size="lg"
            className="w-full font-heading tracking-wider"
            disabled={loading}
          >
            {loading ? "CREATING..." : "🏗️ CREATE ROOM"}
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
