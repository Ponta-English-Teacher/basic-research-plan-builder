// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [], chat: [] },
  step4: { hypothesis: "", chat: [] },
  step5: { slidePlan: [], narration: [], chat: [] },
  step6: { exportSummary: "" }
};

// ===== DOM Elements =====
const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stepButtons = document.querySelectorAll(".step-btn");
const summaryText = document.getElementById("summary-text");
const outputContent = document.getElementById("output-content");
const exportBtn = document.getElementById("export-btn");

// ===== Initial Chat Load =====
document.addEventListener("DOMContentLoaded", () => {
  resetChat();
  appendMessage("gpt", getUserFacingInstruction("step1"));
});

// ===== Step Button Switching =====
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;

  appendMessage("user", input);
  userInput.value = "";

  const messages = buildMessagesForCurrentStep(input);
  const response = await callChatGPT(messages);

  appendMessage("gpt", response.content);
  updateStateFromResponse(input, response.content);
});

// ===== Message Functions =====
function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.className = sender;
  div.innerHTML = `<strong>${sender === "gpt" ? "GPT" : "You"}:</strong> ${text}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1": return "🎯 What general topic are you interested in? (e.g., money, time, jobs, family, phones)";
    case "step2": return `🔍 What do you want to know about "${researchState.step1.theme}"? Let's create your main research question.`;
    case "step3": return `🧾 Let's create profile and Likert questions based on your research question: "${researchState.step2.question}"`;
    case "step4": return `🤔 Based on your questionnaire, what do you expect to find? Let's write 1–2 clear hypotheses.`;
    case "step5": return `📊 Let's plan your 5–7 slide presentation. GPT will suggest slide titles and narration based on your project.`;
    case "step6": return generateFinalSummary();
    default: return "Start by choosing a step.";
  }
}

function buildMessagesForCurrentStep(userInput) {
  const step = researchState.currentStep;
  const messages = [];

  switch (step) {
    case "step1":
      messages.push({ role: "system", content: "You're a helpful assistant helping a student choose a surveyable research theme." });
      messages.push({ role: "user", content: `I am interested in the topic: ${userInput}` });
      break;

    case "step2":
      messages.push({ role: "system", content: `Help the student create a clear, surveyable research question based on this theme: ${researchState.step1.theme}. Don't suggest abstract or vague questions.` });
      messages.push({ role: "user", content: `I want to know: ${userInput}` });
      break;

    case "step3":
      messages.push({ role: "system", content: `Create 3 profile questions (age, gender, etc.) and 3 Likert questions based on: ${researchState.step2.question}. Keep questions simple for beginner students.` });
      messages.push({ role: "user", content: `Here is my main question: ${researchState.step2.question}` });
      break;

    case "step4":
      messages.push({ role: "system", content: `Generate 1–2 hypotheses based on this question: ${researchState.step2.question}. Use student-friendly wording.` });
      messages.push({ role: "user", content: userInput });
      break;

    case "step5":
      messages.push({ role: "system", content: `Make a slide plan and narration (5–7 slides) for this research:
Theme: ${researchState.step1.theme}
Question: ${researchState.step2.question}
Profile Questions: ${researchState.step3.profileQuestions.join(", ")}
Likert Questions: ${researchState.step3.likertQuestions.join(", ")}
Hypothesis: ${researchState.step4.hypothesis}` });
      messages.push({ role: "user", content: "Please give me the slide ideas and narration." });
      break;
  }
  return messages;
}

function updateStateFromResponse(userInput, gptResponse) {
  const step = researchState.currentStep;
  switch (step) {
    case "step1":
      researchState.step1.theme = userInput;
      researchState.step1.chat.push({ user: userInput, gpt: gptResponse });
      break;
    case "step2":
      researchState.step2.question = userInput;
      researchState.step2.chat.push({ user: userInput, gpt: gptResponse });
      break;
    case "step3":
      const profileMatches = gptResponse.match(/Profile Questions:[\s\S]*?Likert/i);
      const likertMatches = gptResponse.match(/Likert Questions:[\s\S]*/i);
      researchState.step3.chat.push({ user: userInput, gpt: gptResponse });
      researchState.step3.profileQuestions = profileMatches ? profileMatches[0].split(/\d+\.\s/).filter(q => q.trim()).slice(1) : [];
      researchState.step3.likertQuestions = likertMatches ? likertMatches[0].split(/\d+\.\s/).filter(q => q.trim()).slice(1) : [];
      break;
    case "step4":
      researchState.step4.hypothesis = gptResponse;
      researchState.step4.chat.push({ user: userInput, gpt: gptResponse });
      break;
    case "step5":
      const [slides, narration] = gptResponse.split(/Narration:/i);
      researchState.step5.slidePlan = slides?.trim().split("\n").filter(line => line.trim());
      researchState.step5.narration = narration?.trim().split("\n").filter(line => line.trim());
      researchState.step5.chat.push({ user: userInput, gpt: gptResponse });
      break;
  }
  updateSummaryText();
}

function updateSummaryText() {
  summaryText.textContent = generateFinalSummary();
}

function generateFinalSummary() {
  return `Theme: ${researchState.step1.theme}
Research Question: ${researchState.step2.question}
Profile Questions: ${researchState.step3.profileQuestions.join(" | ")}
Likert Questions: ${researchState.step3.likertQuestions.join(" | ")}
Hypothesis: ${researchState.step4.hypothesis}
Slide Titles: ${researchState.step5.slidePlan.join(" | ")}`;
}

// ===== OpenAI Proxy Call =====
async function callChatGPT(messages) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();

  if (!data || !data.reply) {
    throw new Error("Invalid response from OpenAI");
  }

  return { content: data.reply };
}

// ===== Export Button =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([generateFinalSummary()], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "research-plan.txt";
  a.click();
  URL.revokeObjectURL(url);
});
