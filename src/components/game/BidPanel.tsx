import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/data/items";

interface BidPanelProps {
  maxBid: number;
  onBid: (amount: number) => void;
  disabled?: boolean;
}

export function BidPanel({ maxBid, onBid, disabled }: BidPanelProps) {
  const [bidAmount, setBidAmount] = useState(Math.min(100, maxBid));

  const presets = [
    { label: "10%", value: Math.floor(maxBid * 0.1) },
    { label: "25%", value: Math.floor(maxBid * 0.25) },
    { label: "50%", value: Math.floor(maxBid * 0.5) },
    { label: "ALL IN", value: maxBid },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="border border-border/60 rounded-lg p-6 bg-card/80 backdrop-blur-sm"
    >
      <h4 className="font-heading text-sm tracking-wider text-muted-foreground mb-4">PLACE YOUR BID</h4>

      <div className="mb-4">
        <div className="flex items-center gap-2 bg-input rounded-md border border-border/60 px-4 py-3">
          <span className="text-neon-gold font-heading text-lg">₹</span>
          <input
            type="number"
            value={bidAmount}
            onChange={(e) => {
              const val = Math.max(0, Math.min(maxBid, Number(e.target.value)));
              setBidAmount(val);
            }}
            min={0}
            max={maxBid}
            className="bg-transparent text-foreground font-mono text-xl w-full outline-none"
            disabled={disabled}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2 font-mono">
          Available: {formatINR(maxBid)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-4">
        {presets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => setBidAmount(preset.value)}
            disabled={disabled}
            className="py-2 px-2 text-xs font-mono rounded border border-border/60 bg-muted/50 text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="mb-4">
        <input
          type="range"
          min={0}
          max={maxBid}
          value={bidAmount}
          onChange={(e) => setBidAmount(Number(e.target.value))}
          className="w-full accent-[hsl(var(--neon-cyan))] h-1"
          disabled={disabled}
        />
      </div>

      <Button
        onClick={() => onBid(bidAmount)}
        disabled={disabled || bidAmount <= 0}
        variant="neon"
        size="lg"
        className="w-full font-heading tracking-wider"
      >
        🎯 SUBMIT BID — {formatINR(bidAmount)}
      </Button>
    </motion.div>
  );
}
