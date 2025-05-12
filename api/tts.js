export default async function handler(req, res) {
  const { text, voiceId } = req.body;
  const tts = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
    {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
        Accept: "audio/mpeg"
      },
      body: JSON.stringify({
        text,
        voice_settings: { stability: 0.6, similarity_boost: 0.8 }
      })
    }
  );
  const buffer = await tts.arrayBuffer();
  res.setHeader("Content-Type", "audio/mpeg");
  res.send(Buffer.from(buffer));
}
