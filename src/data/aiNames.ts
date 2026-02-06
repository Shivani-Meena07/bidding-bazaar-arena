export const AI_NAMES = [
  "NetRunner_X",
  "CyberVoid",
  "Glitch.exe",
  "NeonWraith",
  "DataPhantom",
  "PixelReaper",
  "CircuitBreaker",
  "ShadowByte",
  "ChromeJack",
  "BinaryGhost",
];

export function getRandomAINames(count: number): string[] {
  const shuffled = [...AI_NAMES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
