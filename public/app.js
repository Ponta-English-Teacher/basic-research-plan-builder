// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [] },
  step4: { hypothesis: "" },
  step5: { slidePlan: [] },
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

// ===== Event Listeners =====
stepButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = "step" + step;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction("step" + step));
  });
});

sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;
  appendMessage("user", input);
  userInput.value = "";

  const messages = buildMessageHistory();
  try {
    const result = await callChatGPT(messages);
    const reply = result.content;
    appendMessage("gpt", reply);
    storeDataByStep(reply);
    updateSummary();
  } catch (error) {
    appendMessage("gpt", "❌ Error: Unable to fetch response.");
  }
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "research_plan_summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// ===== Chat Functions =====
function appendMessage(sender, message) {
  const msg = document.createElement("div");
  msg.className = sender;
  msg.innerHTML = `<strong>${sender.toUpperCase()}:</strong> ${message}`;
  chatLog.appendChild(msg);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function resetChat() {
  chatLog.innerHTML = "";
}

function buildMessageHistory() {
  const step = researchState.currentStep;
  const chatHistory = researchState[step].chat || [];
  return [
    { role: "system", content: getSystemPrompt(step) },
    ...chatHistory,
    { role: "user", content: userInput.value.trim() }
  ];
}

function storeDataByStep(reply) {
  const step = researchState.currentStep;
  researchState[step].chat.push({ role: "user", content: userInput.value });
  researchState[step].chat.push({ role: "assistant", content: reply });

  if (step === "step1") {
    const match = userInput.value.trim();
    researchState.step1.theme = match;
  } else if (step === "step2") {
    researchState.step2.question = userInput.value;
  } else if (step === "step3") {
    if (!researchState.step3.profileQuestions.length) {
      researchState.step3.profileQuestions.push("Selected"); // placeholder
    }
    if (!researchState.step3.likertQuestions.length) {
      researchState.step3.likertQuestions.push("Generated"); // placeholder
    }
  } else if (step === "step4") {
    researchState.step4.hypothesis = userInput.value;
  } else if (step === "step5") {
    researchState.step5.slidePlan.push(reply);
  } else if (step === "step6") {
    researchState.step6.exportSummary = generateFullSummary();
  }
}

function updateSummary() {
  summaryText.textContent = generateFullSummary();
}

function generateFullSummary() {
  return `Theme: ${researchState.step1.theme}
Research Question: ${researchState.step2.question}
Profile Questions: ${researchState.step3.profileQuestions.join(", ")}
Likert Questions: ${researchState.step3.likertQuestions.join(", ")}
Hypothesis: ${researchState.step4.hypothesis}
Slide Plan: ${researchState.step5.slidePlan.join("\n")}`;
}

// ===== Prompts =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "What topic are you interested in? (e.g., money, time, jobs, phones, stress, family, future)";
    case "step2":
      return `You chose "${researchState.step1.theme}". What do you want to know about it?`;
    case "step3":
      return `Thanks for your question: ${researchState.step2.question}. Now, let’s choose some profile questions (age, gender…) and Likert questions (e.g., How often do you spend money on entertainment?) based on that.`;
    case "step4":
      return `Based on your Likert questions, what trends do you expect to find? Let's write a few hypotheses.`;
    case "step5":
      return `Let's create a 5–7 slide plan for your presentation. I’ll help with both slide ideas and narration.`;
    case "step6":
      return `Here is your final research plan summary. You can review or download it.`;
    default:
      return "Start by choosing a step.";
  }
}

function getSystemPrompt(step) {
  switch (step) {
    case "step1":
      return "You are a kind research teacher helping a student pick one broad topic. Do not repeat questions. After they answer, say clearly: Now press 'Research Question' to continue. Do not continue yourself.";
    case "step2":
      return `Guide the student to make one clear, researchable question about: ${researchState.step1.theme}. Ask follow-up questions if it's vague, then confirm and say: Great — we can use that as your research question! Let’s move on to building your questionnaire.`;
    case "step3":
      return `Generate a list of 20 simple profile questions (gender, club activity, time, etc.) and let the student choose 5. Then suggest Likert scale questions based on their research question: ${researchState.step2.question}.`;
    case "step4":
      return `Based on their questionnaire about: ${researchState.step2.question}, help them reflect and write 1–3 hypotheses (e.g., Students who X tend to Y).`;
    case "step5":
      return `Using everything above, generate 5–7 slide titles and narration for a research presentation.`;
    case "step6":
      return `Combine all previous answers into a printable summary. Make it student-friendly.`;
    default:
      return "You are a helpful assistant.";
  }
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
