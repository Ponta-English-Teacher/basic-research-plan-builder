// ===== App State =====
const researchState = {
  currentStep: "step1",
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], likertQuestions: [], chat: [] },
  step4: { hypothesis: "", chat: [] },
  step5: { slidePlan: [], chat: [] },
  step6: { exportSummary: "", chat: [] }
};

// ===== DOM Elements =====
const chatLog = document.getElementById("chat-log");
const userInput = document.getElementById("user-input");
const sendBtn = document.getElementById("send-btn");
const stepButtons = document.querySelectorAll(".step-btn");
const summaryText = document.getElementById("summary-text");
const outputContent = document.getElementById("output-content");
const exportBtn = document.getElementById("export-btn");

// ===== Step Button Switching =====
stepButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const stepNumber = btn.dataset.step;
    const stepKey = `step${stepNumber}`;
    researchState.currentStep = stepKey;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(stepKey));
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const input = userInput.value.trim();
  if (!input) return;
  appendMessage("user", input);
  userInput.value = "";

  const step = researchState.currentStep;
  researchState[step].chat.push({ role: "user", content: input });

  const systemPrompt = getSystemPrompt(step);
  const messages = [
    { role: "system", content: systemPrompt },
    ...researchState[step].chat
  ];

  appendMessage("gpt", "Thinking...");
  try {
    const response = await sendToOpenAI(messages);
    const reply = response.content;
    replaceLastGPTMessage(reply);
    researchState[step].chat.push({ role: "assistant", content: reply });

    if (step === "step1") researchState.step1.theme = input;
    if (step === "step2") researchState.step2.question = input;
    if (step === "step4") researchState.step4.hypothesis = input;
    if (step === "step5") researchState.step5.slidePlan = reply;
    if (step === "step6") {
      researchState.step6.exportSummary = reply;
      summaryText.textContent = reply;
    }
  } catch (err) {
    replaceLastGPTMessage("Sorry, something went wrong.");
  }
});

// ===== Helper Functions =====
function appendMessage(sender, text) {
  const div = document.createElement("div");
  div.className = `message ${sender}`;
  div.textContent = text;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function replaceLastGPTMessage(text) {
  const last = chatLog.querySelector(".message.gpt:last-child");
  if (last) last.textContent = text;
}

function resetChat() {
  chatLog.innerHTML = "";
  userInput.value = "";
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "step1":
      return "What topic are you interested in? (e.g., money, time, family, future)";
    case "step2":
      return "Let’s narrow it down. What do you want to know about this topic?";
    case "step3":
  return `Here are 10 profile questions. Please choose 5–7 numbers (e.g., 1, 3, 5, 6, 8):
1. How old are you?
2. What is your gender?
3. What year are you in university?
4. Do you have any part-time jobs?
5. How much free time do you have per week?
6. How often do you use social media?
7. How often do you eat with your family?
8. Do you live with your family or alone?
9. Do you have a regular hobby?
10. How often do you study outside class?

Then type the numbers to select. I’ll also suggest some Likert and Yes/No questions.`;
    case "step4":
      return "What do you expect to find? Let’s write one simple hypothesis based on your question.";
    case "step5":
      return "Let’s create your slide plan. How would you present your research in 5–6 slides?";
    case "step6":
      return "Here is your full summary. You can copy or download it.";
    default:
      return "Let’s get started.";
  }
}

function getSystemPrompt(step) {
  switch (step) {
    case "step1":
      return "You are helping a student choose a broad research theme. Accept vague answers like 'money' or 'family' and do not go deeper. Just respond positively.";
    case "step2":
      return "You are helping the student turn their broad theme into a focused and surveyable question. Do not ask follow-up questions. Accept a simple, student-level research question like 'How do students spend money?' or 'Why do people save money?'. Do not push them to specify demographics or location. After accepting their idea, say: 'Great — we can use that as your research question! Let’s move on to building your questionnaire.' Be warm, kind, and move forward smoothly.";
    case "step3":
      return `You are helping the student build a questionnaire. First, give them this fixed list of 10 profile questions:
1. How old are you?
2. What is your gender?
3. What year are you in university?
4. Do you have any part-time jobs?
5. How much free time do you have per week?
6. How often do you use social media?
7. How often do you eat with your family?
8. Do you live with your family or alone?
9. Do you have a regular hobby?
10. How often do you study outside class?

Then, based on their research question, suggest 3–5 Likert scale questions and 2–3 yes/no questions. Keep them simple and beginner-friendly.`;
    case "step4":
      return "Help the student write one short, clear hypothesis based on their research question. Offer examples if needed.";
    case "step5":
      return "Help the student create a slide plan (5–6 slides) for their presentation. Each slide should have a short title and 2–3 bullet points.";
    case "step6":
      return "Summarize the entire research plan including theme, question, questionnaire highlights, hypothesis, and slide structure.";
    default:
      return "Act as a kind teacher helping a student with a research project.";
  }
}

// ===== Export Summary Button =====
exportBtn.addEventListener("click", () => {
  researchState.currentStep = "step6";
  resetChat();
  appendMessage("gpt", getUserFacingInstruction("step6"));
  const messages = [
    { role: "system", content: getSystemPrompt("step6") },
    { role: "user", content: "Please summarize all my research project so far." },
    { role: "assistant", content: "Generating..." }
  ];
  sendToOpenAI(messages).then((response) => {
    replaceLastGPTMessage(response.content);
    researchState.step6.exportSummary = response.content;
    summaryText.textContent = response.content;
  }).catch(() => {
    replaceLastGPTMessage("Sorry, something went wrong while exporting.");
  });
});

// ===== API Call to OpenAI =====
async function sendToOpenAI(messages) {
  const response = await fetch("/api/openai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI API request failed: ${errorText}`);
  }

  const data = await response.json();
  return { content: data.choices[0].message.content };
}

// ===== Initial GPT Message on Load =====
window.addEventListener("DOMContentLoaded", () => {
  const firstStepKey = "step1";
  researchState.currentStep = firstStepKey;
  appendMessage("gpt", getUserFacingInstruction(firstStepKey));
});
