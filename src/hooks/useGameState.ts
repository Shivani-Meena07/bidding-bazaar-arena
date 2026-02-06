import { useState, useCallback, useRef } from "react";
import { GameItem, getRandomItems, formatINR } from "@/data/items";
import { getRandomAINames } from "@/data/aiNames";

export interface Player {
  id: string;
  name: string;
  capital: number;
  isAI: boolean;
  isEliminated: boolean;
  bid?: number;
}

export interface RoundResult {
  item: GameItem;
  bids: { player: Player; amount: number }[];
  winnerId: string;
  winnerGain: number;
}

export type GamePhase = "bidding" | "results" | "game_over";

const STARTING_CAPITAL = 1000;
const TOTAL_ROUNDS = 10;
const AI_COUNT = 3;

function generateAIBid(capital: number, itemPrice: number, round: number): number {
  const aggression = 0.3 + Math.random() * 0.5;
  const priceEstimate = itemPrice * (0.6 + Math.random() * 0.8);
  const maxBid = Math.min(capital, Math.floor(priceEstimate * aggression));
  const minBid = Math.max(10, Math.floor(capital * 0.05));
  
  if (round > 7) {
    // Late game: more aggressive
    return Math.min(capital, Math.floor(minBid + (maxBid - minBid) * (0.5 + Math.random() * 0.5)));
  }
  
  return Math.max(minBid, Math.floor(minBid + (maxBid - minBid) * Math.random()));
}

export function useGameState() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [items, setItems] = useState<GameItem[]>([]);
  const [round, setRound] = useState(1);
  const [phase, setPhase] = useState<GamePhase>("bidding");
  const [roundResult, setRoundResult] = useState<RoundResult | null>(null);
  const [roundHistory, setRoundHistory] = useState<RoundResult[]>([]);
  const [isStarted, setIsStarted] = useState(false);
  const playerNameRef = useRef("Player");

  const startGame = useCallback((playerName: string) => {
    playerNameRef.current = playerName;
    const aiNames = getRandomAINames(AI_COUNT);
    const newPlayers: Player[] = [
      { id: "human", name: playerName || "Player", capital: STARTING_CAPITAL, isAI: false, isEliminated: false },
      ...aiNames.map((name, i) => ({
        id: `ai-${i}`,
        name,
        capital: STARTING_CAPITAL,
        isAI: true,
        isEliminated: false,
      })),
    ];
    setPlayers(newPlayers);
    setItems(getRandomItems(TOTAL_ROUNDS));
    setRound(1);
    setPhase("bidding");
    setRoundResult(null);
    setRoundHistory([]);
    setIsStarted(true);
  }, []);

  const currentItem = items[round - 1] || null;

  const placeBid = useCallback(
    (amount: number) => {
      if (!currentItem || phase !== "bidding") return;

      const activePlayers = players.filter((p) => !p.isEliminated);
      const bids: { player: Player; amount: number }[] = [];

      for (const player of activePlayers) {
        if (player.isAI) {
          const aiBid = generateAIBid(player.capital, currentItem.price, round);
          bids.push({ player, amount: aiBid });
        } else {
          bids.push({ player, amount: Math.min(amount, player.capital) });
        }
      }

      bids.sort((a, b) => b.amount - a.amount);
      const winner = bids[0];
      const winnerGain = currentItem.price - winner.amount;

      const updatedPlayers = players.map((p) => {
        const bid = bids.find((b) => b.player.id === p.id);
        if (!bid) return p;

        let newCapital = p.capital;
        if (p.id === winner.player.id) {
          newCapital = p.capital + winnerGain;
        } else {
          newCapital = p.capital - bid.amount;
        }

        return {
          ...p,
          capital: newCapital,
          isEliminated: p.isEliminated || newCapital <= 0,
          bid: bid.amount,
        };
      });

      const result: RoundResult = {
        item: currentItem,
        bids,
        winnerId: winner.player.id,
        winnerGain,
      };

      setPlayers(updatedPlayers);
      setRoundResult(result);
      setRoundHistory((prev) => [...prev, result]);
      setPhase("results");
    },
    [players, currentItem, phase, round]
  );

  const nextRound = useCallback(() => {
    const activePlayers = players.filter((p) => !p.isEliminated);
    
    if (round >= TOTAL_ROUNDS || activePlayers.length <= 1) {
      setPhase("game_over");
      return;
    }

    setRound((r) => r + 1);
    setPhase("bidding");
    setRoundResult(null);
  }, [players, round]);

  const resetGame = useCallback(() => {
    setIsStarted(false);
    setPlayers([]);
    setItems([]);
    setRound(1);
    setPhase("bidding");
    setRoundResult(null);
    setRoundHistory([]);
  }, []);

  const humanPlayer = players.find((p) => !p.isAI);
  const isHumanEliminated = humanPlayer?.isEliminated ?? false;

  return {
    players,
    round,
    totalRounds: TOTAL_ROUNDS,
    phase,
    currentItem,
    roundResult,
    roundHistory,
    isStarted,
    isHumanEliminated,
    humanPlayer,
    startGame,
    placeBid,
    nextRound,
    resetGame,
  };
}
