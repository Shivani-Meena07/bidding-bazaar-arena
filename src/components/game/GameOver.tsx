import { motion } from "framer-motion";
import { Player } from "@/hooks/useGameState";
import { formatINR } from "@/data/items";
import { Button } from "@/components/ui/button";

interface GameOverProps {
  players: Player[];
  humanPlayerId: string;
  onPlayAgain: () => void;
  onMainMenu: () => void;
}

export function GameOver({ players, humanPlayerId, onPlayAgain, onMainMenu }: GameOverProps) {
  const sorted = [...players].sort((a, b) => b.capital - a.capital);
  const winner = sorted[0];
  const humanRank = sorted.findIndex((p) => p.id === humanPlayerId) + 1;
  const isHumanWinner = winner.id === humanPlayerId;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-lg mx-auto text-center space-y-8"
    >
      <div>
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="text-6xl mb-4"
        >
          {isHumanWinner ? "🏆" : "💀"}
        </motion.div>
        <h2 className="font-heading text-3xl text-neon-cyan tracking-wider">
          {isHumanWinner ? "VICTORY" : "GAME OVER"}
        </h2>
        <p className="text-muted-foreground mt-2 font-body text-lg">
          {isHumanWinner
            ? "You dominated the auction floor!"
            : `You finished #${humanRank}. ${winner.name} claimed victory.`}
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
                i === 0
                  ? "border border-primary/40 bg-primary/10 glow-cyan"
                  : player.isEliminated
                  ? "opacity-40 bg-muted/20"
                  : "bg-muted/30"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">
                  {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "💀"}
                </span>
                <span className={`font-body font-semibold ${
                  player.id === humanPlayerId ? "text-neon-cyan" : "text-foreground"
                }`}>
                  {player.name}
                  {player.id === humanPlayerId && " (You)"}
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
        <Button onClick={onPlayAgain} variant="neon" size="lg" className="flex-1 font-heading tracking-wider">
          🔄 PLAY AGAIN
        </Button>
        <Button onClick={onMainMenu} variant="outline" size="lg" className="flex-1 font-heading tracking-wider border-primary/40 text-primary hover:bg-primary/10">
          🏠 MAIN MENU
        </Button>
      </div>
    </motion.div>
  );
}
