export default async function handler(req, res) {
  try {
    const { messages } = req.body;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages,
        temperature: 0.7
      })
    });

    const data = await response.json();

    if (!data || !data.choices || !data.choices[0]) {
      return res.status(500).json({ error: "Invalid response from OpenAI" });
    }

    // ✅ FIXED: return only the reply string
    return res.status(200).json({
      reply: data.choices[0].message.content
    });

  } catch (error) {
    console.error("API error:", error);
    return res.status(500).json({ error: "Server error. Please try again." });
  }
}
