import { motion } from "framer-motion";
import { RoundResult } from "@/hooks/useGameState";
import { formatINR } from "@/data/items";
import { Button } from "@/components/ui/button";

interface RoundResultsProps {
  result: RoundResult;
  players: { id: string; name: string; capital: number; isEliminated: boolean; isAI: boolean }[];
  onNext: () => void;
  isLastRound: boolean;
  isHumanEliminated: boolean;
}

export function RoundResults({ result, players, onNext, isLastRound, isHumanEliminated }: RoundResultsProps) {
  const winner = result.bids.find((b) => b.player.id === result.winnerId);
  const eliminated = players.filter((p) => p.isEliminated);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="border border-border/60 rounded-lg p-6 bg-card/80 backdrop-blur-sm space-y-6"
    >
      <div className="text-center">
        <h3 className="font-heading text-lg text-neon-cyan tracking-wider">ROUND RESULTS</h3>
        <p className="text-sm text-muted-foreground mt-1 font-mono">
          {result.item.emoji} {result.item.name}
        </p>
      </div>

      {/* Winner */}
      {winner && (
        <div className="text-center p-4 rounded-lg border border-primary/30 bg-primary/5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">🏆 Highest Bidder</p>
          <p className="font-heading text-lg text-neon-cyan mt-1">{winner.player.name}</p>
          <p className="font-mono text-sm text-muted-foreground mt-1">
            Bid: {formatINR(winner.amount)}
          </p>
          <p className={`font-mono text-sm mt-1 ${result.winnerGain >= 0 ? "text-neon-green" : "text-neon-red"}`}>
            {result.winnerGain >= 0 ? "+" : ""}{formatINR(result.winnerGain)} profit
          </p>
        </div>
      )}

      {/* All bids */}
      <div>
        <h4 className="text-xs font-heading text-muted-foreground tracking-wider mb-2">ALL BIDS</h4>
        <div className="space-y-1">
          {result.bids.map((bid, i) => (
            <div
              key={bid.player.id}
              className={`flex items-center justify-between px-3 py-2 rounded text-sm ${
                bid.player.id === result.winnerId ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
              }`}
            >
              <span className="font-body">
                {i === 0 ? "🏆" : `#${i + 1}`} {bid.player.name}
              </span>
              <span className="font-mono text-neon-gold">{formatINR(bid.amount)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Eliminations */}
      {eliminated.length > 0 && (
        <div className="text-center">
          <p className="text-xs text-neon-red uppercase tracking-wider font-heading">
            💀 Eliminated: {eliminated.map((p) => p.name).join(", ")}
          </p>
        </div>
      )}

      <Button
        onClick={onNext}
        variant="neon"
        size="lg"
        className="w-full font-heading tracking-wider"
      >
        {isHumanEliminated
          ? "VIEW FINAL STANDINGS"
          : isLastRound
          ? "VIEW FINAL RESULTS"
          : "NEXT ROUND →"}
      </Button>
    </motion.div>
  );
}
