import { motion } from "framer-motion";
import { Player } from "@/hooks/useGameState";
import { formatINR } from "@/data/items";

interface PlayerListProps {
  players: Player[];
  currentPlayerId?: string;
  showBids?: boolean;
  winnerId?: string;
}

export function PlayerList({ players, currentPlayerId, showBids, winnerId }: PlayerListProps) {
  const sorted = [...players].sort((a, b) => b.capital - a.capital);

  return (
    <div className="border border-border/60 rounded-lg p-4 bg-card/80 backdrop-blur-sm">
      <h4 className="font-heading text-sm tracking-wider text-muted-foreground mb-3">PLAYERS</h4>
      <div className="space-y-2">
        {sorted.map((player, index) => (
          <motion.div
            key={player.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
              player.isEliminated
                ? "opacity-40 line-through"
                : player.id === currentPlayerId
                ? "border border-primary/40 bg-primary/5"
                : "bg-muted/30"
            } ${player.id === winnerId ? "border-glow-cyan" : ""}`}
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground font-mono">
                {player.isEliminated ? "💀" : `#${index + 1}`}
              </span>
              <span className={`font-body font-semibold ${
                player.isAI ? "text-muted-foreground" : "text-neon-cyan"
              }`}>
                {player.name}
                {!player.isAI && " (You)"}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {showBids && player.bid !== undefined && (
                <span className="text-xs font-mono text-neon-pink">
                  Bid: {formatINR(player.bid)}
                </span>
              )}
              <span className={`font-mono font-semibold ${
                player.capital <= 200 ? "text-neon-red" : "text-neon-gold"
              }`}>
                {formatINR(player.capital)}
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
