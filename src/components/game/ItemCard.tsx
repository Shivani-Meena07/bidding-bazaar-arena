import { motion } from "framer-motion";
import { GameItem, formatINR } from "@/data/items";

interface ItemCardProps {
  item: GameItem;
  showPrice?: boolean;
}

export function ItemCard({ item, showPrice = true }: ItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="border border-border/60 rounded-lg p-6 bg-card/80 backdrop-blur-sm glow-cyan"
    >
      <div className="text-center mb-4">
        <span className="text-5xl">{item.emoji}</span>
      </div>
      <div className="text-center">
        <span className="text-xs font-mono text-neon-pink uppercase tracking-widest">
          {item.category}
        </span>
        <h3 className="font-heading text-xl mt-2 text-foreground">{item.name}</h3>
        <p className="text-sm text-muted-foreground mt-2 font-body">{item.description}</p>
        {showPrice && (
          <div className="mt-4 pt-4 border-t border-border/40">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">Current Market Price</span>
            <p className="font-heading text-2xl text-neon-gold mt-1">{formatINR(item.price)}</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
