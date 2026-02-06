import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useGameState } from "@/hooks/useGameState";
import { GameHeader } from "@/components/game/GameHeader";
import { ItemCard } from "@/components/game/ItemCard";
import { BidPanel } from "@/components/game/BidPanel";
import { PlayerList } from "@/components/game/PlayerList";
import { RoundResults } from "@/components/game/RoundResults";
import { GameOver } from "@/components/game/GameOver";
import { Button } from "@/components/ui/button";

export default function SoloGame() {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const game = useGameState();

  if (!game.isStarted) {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern scanline flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full text-center space-y-6"
        >
          <div>
            <h1 className="font-heading text-3xl text-neon-cyan tracking-wider">SOLO MODE</h1>
            <p className="text-muted-foreground mt-2 font-body">
              Enter the auction arena against 3 AI opponents
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

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-muted/30 rounded p-3">
                <p className="text-neon-gold font-heading text-lg">₹1,000</p>
                <p className="text-xs text-muted-foreground">Starting Capital</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <p className="text-neon-cyan font-heading text-lg">10</p>
                <p className="text-xs text-muted-foreground">Rounds</p>
              </div>
              <div className="bg-muted/30 rounded p-3">
                <p className="text-neon-pink font-heading text-lg">3</p>
                <p className="text-xs text-muted-foreground">AI Foes</p>
              </div>
            </div>

            <Button
              onClick={() => game.startGame(playerName || "Player")}
              variant="neon"
              size="lg"
              className="w-full font-heading tracking-wider"
            >
              ⚔️ ENTER THE ARENA
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

  if (game.phase === "game_over") {
    return (
      <div className="min-h-screen bg-background bg-grid-pattern scanline flex items-center justify-center p-4">
        <GameOver
          players={game.players}
          humanPlayerId="human"
          onPlayAgain={() => game.startGame(playerName || "Player")}
          onMainMenu={() => navigate("/")}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-grid-pattern scanline">
      <div className="max-w-5xl mx-auto p-4 md:p-6">
        <GameHeader round={game.round} totalRounds={game.totalRounds} player={game.humanPlayer} />

        <AnimatePresence mode="wait">
          {game.phase === "bidding" && game.currentItem && (
            <motion.div
              key={`bidding-${game.round}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-3 gap-6"
            >
              <div className="md:col-span-2 space-y-6">
                <ItemCard item={game.currentItem} />
                <BidPanel
                  maxBid={game.humanPlayer?.capital ?? 0}
                  onBid={game.placeBid}
                  disabled={game.isHumanEliminated}
                />
                {game.isHumanEliminated && (
                  <div className="text-center p-4 border border-destructive/40 rounded-lg bg-destructive/10">
                    <p className="text-neon-red font-heading">YOU'VE BEEN ELIMINATED</p>
                    <p className="text-sm text-muted-foreground mt-1">Watching remaining rounds...</p>
                    <Button
                      onClick={game.nextRound}
                      variant="outline"
                      className="mt-3 font-heading text-sm border-primary/40 text-primary hover:bg-primary/10"
                    >
                      SKIP TO END →
                    </Button>
                  </div>
                )}
              </div>
              <div>
                <PlayerList
                  players={game.players}
                  currentPlayerId="human"
                />
              </div>
            </motion.div>
          )}

          {game.phase === "results" && game.roundResult && (
            <motion.div
              key={`results-${game.round}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid md:grid-cols-3 gap-6"
            >
              <div className="md:col-span-2">
                <RoundResults
                  result={game.roundResult}
                  players={game.players}
                  onNext={game.nextRound}
                  isLastRound={game.round >= game.totalRounds}
                  isHumanEliminated={game.isHumanEliminated}
                />
              </div>
              <div>
                <PlayerList
                  players={game.players}
                  currentPlayerId="human"
                  showBids
                  winnerId={game.roundResult.winnerId}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
