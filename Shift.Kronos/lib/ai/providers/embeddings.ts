import { getServerEnv } from "@/lib/env";

const DEFAULT_EMBEDDING_MODEL = "text-embedding-004";

export type EmbeddingResult = {
  model: string;
  dimensions: number;
  values: number[];
};

function assertEmbeddingVector(values: unknown): number[] {
  if (!Array.isArray(values) || values.length === 0 || values.some((value) => typeof value !== "number")) {
    throw new Error("Embedding provider returned an invalid vector payload.");
  }

  return values;
}

function buildDeterministicTestVector(input: string, dimensions: number) {
  const values = new Array<number>(dimensions).fill(0);

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    const bucket = index % dimensions;
    values[bucket] = values[bucket] + code / 255;
  }

  return values;
}

export async function generateEmbedding(input: string): Promise<EmbeddingResult> {
  const env = getServerEnv();
  const trimmed = input.trim();

  if (!trimmed) {
    throw new Error("Embedding input must not be empty.");
  }

  if (env.PHASE5_FAKE_EMBEDDINGS === "1") {
    const values = buildDeterministicTestVector(trimmed, Number(env.PHASE5_EMBEDDING_DIMENSIONS));

    return {
      model: env.PHASE5_EMBEDDING_MODEL,
      dimensions: values.length,
      values,
    };
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${DEFAULT_EMBEDDING_MODEL}:embedContent?key=${env.GEMINI_API_KEY}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: `models/${DEFAULT_EMBEDDING_MODEL}`,
      content: {
        parts: [
          {
            text: trimmed,
          },
        ],
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Embedding provider request failed with status ${response.status}.`);
  }

  const payload = (await response.json()) as {
    embedding?: {
      values?: unknown;
    };
  };
  const values = assertEmbeddingVector(payload.embedding?.values);

  return {
    model: DEFAULT_EMBEDDING_MODEL,
    dimensions: values.length,
    values,
  };
}
