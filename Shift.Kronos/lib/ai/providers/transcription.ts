export type TranscriptionResult = {
  transcript: string;
};

export async function transcribeTextLikeAudio(input: string): Promise<TranscriptionResult> {
  return {
    transcript: input.trim(),
  };
}
