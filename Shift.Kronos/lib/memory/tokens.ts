const TOKEN_DIVISOR = 4;

export function estimateTokenCount(input: string) {
  const normalized = input.trim().replace(/\s+/g, " ");

  if (!normalized) {
    return 0;
  }

  return Math.max(1, Math.ceil(normalized.length / TOKEN_DIVISOR));
}

export function estimateTokenCountForMessages(messages: Array<{ content: string }>) {
  return messages.reduce((total, message) => total + estimateTokenCount(message.content), 0);
}
