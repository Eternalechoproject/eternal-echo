export default async function handler(req, res) {
  const { prompt } = req.body;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are Scarlett, a calm and warm companion." },
        { role: "user", content: prompt }
      ]
    })
  });
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content?.trim() || "I'm here.";
  res.status(200).json({ text });
}
