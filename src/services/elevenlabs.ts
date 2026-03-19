import { getElevenLabsKey } from "../lib/keys";

interface VoiceSettings {
  stability: number;
  similarity_boost: number;
  style?: number;
  use_speaker_boost?: boolean;
}

const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0,
  use_speaker_boost: true,
};

export async function generateAudio(
  text: string,
  voiceId: string,
  settings: VoiceSettings = DEFAULT_VOICE_SETTINGS
): Promise<Buffer> {
  const apiKey = await getElevenLabsKey();

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: "eleven_multilingual_v2",
        voice_settings: settings,
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `ElevenLabs API error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

export async function remixVoice(
  elevenLabsVoiceId: string,
  voiceDescription: string,
  options?: { promptStrength?: number; text?: string }
): Promise<{
  audio_base_64: string;
  generated_voice_id: string;
  duration_secs: number;
}> {
  const apiKey = await getElevenLabsKey();

  const body: Record<string, unknown> = {
    voice_description: voiceDescription,
    prompt_strength: options?.promptStrength ?? 0.7,
  };

  if (options?.text) {
    body.text = options.text;
  } else {
    body.auto_generate_text = true;
  }

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-voice/${elevenLabsVoiceId}/remix`,
    {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `ElevenLabs remix error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as {
    previews: Array<{
      audio_base_64: string;
      generated_voice_id: string;
      duration_secs: number;
    }>;
  };

  if (!data.previews || data.previews.length === 0) {
    throw new Error("ElevenLabs remix returned no previews");
  }

  return data.previews[0];
}

export async function cloneVoice(
  name: string,
  audioFile: Buffer,
  fileName: string
): Promise<string> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append(
    "files",
    new Blob([new Uint8Array(audioFile.buffer)] as any, { type: "audio/mpeg" }),
    fileName
  );
  formData.append("remove_background_noise", "false");

  const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: {
      "xi-api-key": await getElevenLabsKey(),
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      `ElevenLabs clone error: ${response.status} - ${JSON.stringify(errorData)}`
    );
  }

  const data = (await response.json()) as { voice_id: string };
  return data.voice_id;
}
