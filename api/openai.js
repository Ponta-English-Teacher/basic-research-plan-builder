async function chatWithGPT(step, userMessage) {
  const messages = [];

  // Add a system prompt for this step
  messages.push({ role: "system", content: getStepPrompt(step) });

  // Add user input
  messages.push({ role: "user", content: userMessage });

  const response = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();
  return data.reply;
}

