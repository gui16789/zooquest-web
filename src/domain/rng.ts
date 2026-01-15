export type Rng = {
  nextUint32(): number;
  nextInt(maxExclusive: number): number;
  shuffle<T>(items: T[]): T[];
};

// Deterministic RNG for reproducible quiz runs.
// xorshift32: small and sufficient for non-crypto randomness.
export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  if (state === 0) state = 0x6d2b79f5;

  const nextUint32 = () => {
    // xorshift32
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state >>>= 0;
    state ^= state << 5;
    state >>>= 0;
    return state;
  };

  const nextInt = (maxExclusive: number) => {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) {
      throw new Error(`maxExclusive must be positive int, got ${maxExclusive}`);
    }
    return nextUint32() % maxExclusive;
  };

  const shuffle = <T,>(items: T[]) => {
    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i -= 1) {
      const j = nextInt(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  };

  return { nextUint32, nextInt, shuffle };
}

export function seedFromString(input: string): number {
  // FNV-1a 32-bit
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
