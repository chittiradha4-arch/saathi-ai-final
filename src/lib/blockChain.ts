/**
 * Aitihya Chain (The Chain of Witness)
 * 
 * Implements a conceptual "Block-Chain" for chat history to ensure 
 * unwavering context and continuity (Sankalpa).
 */

export interface MessageBlock {
  id: string;
  index: number;
  timestamp: string;
  previousHash: string | null;
  hash: string;
  role: 'user' | 'ai';
  text: string;
  isError?: boolean;
  model?: string;
}

/**
 * Simple hash function for blocks to maintain conceptual integrity.
 */
function generateHash(data: string, previousHash: string | null): string {
  const str = `${data}-${previousHash}-${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16);
}

/**
 * Creates a new block in the chain.
 */
export function createBlock(
  text: string, 
  role: 'user' | 'ai', 
  lastBlock: MessageBlock | null
): MessageBlock {
  const index = lastBlock ? lastBlock.index + 1 : 0;
  const previousHash = lastBlock ? lastBlock.hash : null;
  const hash = generateHash(text, previousHash);
  
  return {
    id: `block-${index}-${hash.slice(0, 4)}`,
    index,
    timestamp: new Date().toISOString(),
    previousHash,
    hash,
    role,
    text
  };
}

/**
 * Formats the chain for AI consumption, emphasizing the "Pipes" of continuity.
 */
export function formatBlockChain(blocks: MessageBlock[]): string {
  return blocks.map(block => {
    return `[BLOCK ${block.index} | TIMESTAMP: ${block.timestamp} | LINK: ${block.previousHash || 'ROOT'}]
${block.role.toUpperCase()}: ${block.text}
---`;
  }).join('\n\n');
}
