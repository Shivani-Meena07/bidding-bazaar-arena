import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

export default function Index() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background bg-grid-pattern scanline flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-secondary/5 rounded-full blur-[80px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-center max-w-lg mx-auto relative z-10"
      >
        {/* Title */}
        <motion.h1
          className="font-heading text-5xl md:text-7xl text-neon-cyan tracking-widest animate-flicker"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
        >
          BIDCRAFT
        </motion.h1>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-3"
        >
          <span className="text-4xl">🎯</span>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="font-heading text-xs md:text-sm tracking-[0.3em] text-muted-foreground mt-4"
        >
          PREDICT &nbsp;•&nbsp; BID &nbsp;•&nbsp; SURVIVE
        </motion.p>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-muted-foreground mt-6 font-body text-base md:text-lg leading-relaxed max-w-md mx-auto"
        >
          Compete against AI opponents or friends. Predict market prices,
          place strategic bids, and be the last one standing with capital.
        </motion.p>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8 space-y-3"
        >
          <Button
            onClick={() => navigate("/solo")}
            variant="neon"
            size="xl"
            className="w-full font-heading tracking-widest"
          >
            🤖 Solo Mode
          </Button>
          <Button
            onClick={() => navigate("/multiplayer")}
            variant="neonOutline"
            size="xl"
            className="w-full font-heading tracking-widest"
          >
            🌐 Multiplayer
          </Button>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-10 grid grid-cols-3 gap-4"
        >
          <div className="text-center">
            <span className="text-2xl">💰</span>
            <p className="font-heading text-sm text-neon-gold mt-1">₹1,000</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Starting Capital</p>
          </div>
          <div className="text-center">
            <span className="text-2xl">🎲</span>
            <p className="font-heading text-sm text-neon-cyan mt-1">10</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Rounds</p>
          </div>
          <div className="text-center">
            <span className="text-2xl">⚔️</span>
            <p className="font-heading text-sm text-neon-pink mt-1">3</p>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">AI Opponents</p>
          </div>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-10 text-xs text-muted-foreground/50 uppercase tracking-[0.2em] font-heading"
        >
          Built for the streets of Night City
        </motion.p>
      </motion.div>
    </div>
  );
}
