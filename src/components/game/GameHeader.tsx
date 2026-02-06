import { formatINR } from "@/data/items";
import { Player } from "@/hooks/useGameState";

interface GameHeaderProps {
  round: number;
  totalRounds: number;
  player: Player | undefined;
}

export function GameHeader({ round, totalRounds, player }: GameHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 pb-4 mb-6">
      <div className="flex items-center gap-4">
        <h2 className="font-heading text-lg text-neon-cyan tracking-wider">BIDCRAFT</h2>
        <span className="text-muted-foreground font-mono text-sm">
          ROUND {round}/{totalRounds}
        </span>
      </div>
      {player && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{player.name}</span>
          <span className="font-mono text-neon-gold font-semibold">
            {formatINR(player.capital)}
          </span>
        </div>
      )}
    </div>
  );
}
