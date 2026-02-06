import { Routes, Route, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import CreateRoom from "@/pages/multiplayer/CreateRoom";
import JoinRoom from "@/pages/multiplayer/JoinRoom";
import Lobby from "@/pages/multiplayer/Lobby";
import GameArena from "@/pages/multiplayer/GameArena";

function MultiplayerMenu() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-grid-pattern scanline flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full text-center space-y-6"
      >
        <div>
          <h1 className="font-heading text-3xl text-neon-cyan tracking-wider">MULTIPLAYER</h1>
          <p className="text-muted-foreground mt-2 font-body">
            Challenge real players in live auction battles
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => navigate("/multiplayer/create")}
            variant="neon"
            size="xl"
            className="w-full font-heading tracking-widest"
          >
            🏗️ Create Room
          </Button>
          <Button
            onClick={() => navigate("/multiplayer/join")}
            variant="neonOutline"
            size="xl"
            className="w-full font-heading tracking-widest"
          >
            🔗 Join Room
          </Button>
        </div>

        <Button
          onClick={() => navigate("/")}
          variant="ghost"
          className="text-muted-foreground hover:text-primary font-mono text-sm"
        >
          ← Back to Menu
        </Button>
      </motion.div>
    </div>
  );
}

export default function Multiplayer() {
  return (
    <Routes>
      <Route index element={<MultiplayerMenu />} />
      <Route path="create" element={<CreateRoom />} />
      <Route path="join" element={<JoinRoom />} />
      <Route path="lobby/:roomId" element={<Lobby />} />
      <Route path="game/:roomId" element={<GameArena />} />
    </Routes>
  );
}
