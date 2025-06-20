// ===== App State =====
const researchState = {
  currentStep: null,
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
  const userMessage = userInput.value.trim();
  if (!userMessage) return;

  appendMessage("user", userMessage);
  userInput.value = "";

  const reply = await chatWithGPT(researchState.currentStep, userMessage);
  appendMessage("gpt", reply);
  storeResult(researchState.currentStep, reply);
  updateSummary();
});

// ===== GPT API Call =====
async function chatWithGPT(step, userMessage) {
  const messages = [
    { role: "system", content: getStepPrompt(step) },
    { role: "user", content: userMessage }
  ];

  const response = await fetch("/api/openai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages })
  });

  const data = await response.json();
  return data.reply;
}

// ===== Chat & Display Functions =====
function appendMessage(sender, message) {
  const div = document.createElement("div");
  div.className = sender === "user" ? "user-msg" : "gpt-msg";
  div.textContent = message;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function showSystemMessage(msg) {
  appendMessage("gpt", msg);
}

function resetChat() {
  chatLog.innerHTML = "";
  outputContent.textContent = "Your result will appear here.";
  userInput.value = "";
}

// ===== Step Prompts =====
function getStepPrompt(step) {
  switch (step) {
    case "1": return `
You are helping a Japanese university student with limited English make a simple research project in English class.

First, ask what topic they are interested in (e.g., family, friends, phone, future, stress).

If the topic is too general, give 5–7 simple, easy-to-understand ideas related to it that can be studied in a short survey.

✅ Use short and easy English
✅ Be kind and guide them patiently
✅ At the end, ask: “Do you have your own idea?”
📦 When they choose, say: “Great! Let’s move on to the next step: making your research question.”`;

    case "2": return `
Now the student has picked a topic. Help them explore it more deeply.

🎯 Ask these questions in easy English:
- What do you want to know about this topic?
- What do you want to ask your classmates?
- What do you think others will say?

Let them explain their thoughts. Then suggest 2–3 good research questions in simple English.
✅ Confirm it's suitable for a short questionnaire.
📦 When one is chosen, say:
“Nice! That will be your research question. Now let’s build your questionnaire.”`;

    case "3": return `
Time to write the questionnaire.

✅ First, suggest 3–4 easy profile questions (e.g., age, gender, club, part-time job).
✅ Then, suggest 7–10 Likert scale questions (1 = strongly disagree to 5 = strongly agree) related to their research question.

Ask the student:
- Which questions do you want to keep?
- Do you want to add or change anything?

📦 After they decide, say:
“Great — I will now make a Google Form code for you.”`;

    case "4": return `
Let’s help the student make a guess (hypothesis) about what their classmates will say.

Ask them:
- What do you think most students will answer?
- Do you think there will be a pattern?

Then help them write one sentence like:
“Students who use their phones late at night will sleep less.”
📦 When done, say:
“OK! Now let’s plan your slides for the presentation.”`;

    default: return "Let’s get started!";
  }
}

// ===== Step Instructions for Student UI =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "1":
      return "What topic are you interested in? (e.g., family, future, phones)\n\nLet’s choose something you want to know more about!";
    case "2":
      return "Now let’s think more about your topic.\n\nWhat do you want to ask classmates? What are you curious about?\n\nLet’s make a simple research question together!";
    case "3":
      return "Let’s make your questionnaire.\n\nFirst: 3–4 profile questions (e.g., gender, club, part-time job).\nThen: 7–10 survey questions with 1–5 scale (strongly disagree → strongly agree).";
    case "4":
      return "What do you think students will say in your survey?\nLet’s write your prediction — this is your hypothesis!";
    case "5":
      return "Let’s make your slide plan.\nMake 4–5 slides to explain your research idea.";
    case "6":
      return "This is the last step!\nCheck your full plan and download it if ready.";
    default:
      return "Let’s get started!";
  }
}

// ===== Store Step Output =====
function storeResult(step, content) {
  switch (step) {
    case "1":
      researchState.step1.theme = content;
      break;
    case "2":
      researchState.step2.question = content;
      break;
    case "3":
      const [profilePart, likertPart] = content.split("Likert:");
      researchState.step3.profileQuestions = profilePart.trim().split("\n").filter(q => q);
      researchState.step3.likertQuestions = likertPart?.trim().split("\n").filter(q => q) || [];
      break;
    case "4":
      researchState.step4.hypothesis = content;
      break;
    case "5":
      researchState.step5.slidePlan = content.split("\n");
      break;
    case "6":
      researchState.step6.exportSummary = content;
      break;
  }

  outputContent.textContent = content;
}

// ===== Update Summary View =====
function updateSummary() {
  summaryText.textContent = `
📌 Topic: ${researchState.step1.theme}
❓ Research Question: ${researchState.step2.question}

👤 Profile Questions: ${researchState.step3.profileQuestions.join(", ")}
📊 Likert Questions:
${researchState.step3.likertQuestions.join("\n")}

💡 Hypothesis: ${researchState.step4.hypothesis}

🎞 Slide Plan:
${researchState.step5.slidePlan.join("\n")}
  `;
}

// ===== Glossary Popup Logic =====
const popup = document.getElementById("dictionary-popup");
const dictionaryResult = document.getElementById("dictionary-result");
const closePopup = document.getElementById("close-popup");
const btnMeaning = document.getElementById("btn-meaning");
const btnSay = document.getElementById("btn-say");

btnMeaning.addEventListener("click", () => {
  const text = userInput.value.trim() || "No input";
  dictionaryResult.innerHTML = `
    <strong>📘 Plain English:</strong> Explanation of "<em>${text}</em>" in easy words.<br><br>
    <strong>🗣 Context Explanation:</strong> How this term is used in surveys or research.<br><br>
    <strong>🇯🇵 Japanese:</strong> ${text} の意味
  `;
  popup.classList.remove("hidden");
});

btnSay?.addEventListener("click", () => {
  const text = userInput.value.trim() || "No input";
  dictionaryResult.innerHTML = `
    <strong>💬 Natural English:</strong> A native-like way to say "${text}".<br><br>
    <strong>✍️ Suggested Rephrase:</strong> Try using: “In my experience, ...” or “It's important that...”<br><br>
    <strong>🇯🇵 Japanese:</strong> ${text} を英語でどう言うか
  `;
  popup.classList.remove("hidden");
});

closePopup.addEventListener("click", () => {
  popup.classList.add("hidden");
});

const exportBtn = document.getElementById("export-btn");

exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});

// ===== Make Glossary Popup Draggable =====
const dragTarget = document.getElementById("dictionary-popup");
const dragHandle = dragTarget.querySelector(".popup-header");

let offsetX = 0;
let offsetY = 0;
let isDragging = false;

dragHandle.style.cursor = "move";

dragHandle.addEventListener("mousedown", (e) => {
  isDragging = true;
  offsetX = e.clientX - dragTarget.offsetLeft;
  offsetY = e.clientY - dragTarget.offsetTop;
});

document.addEventListener("mouseup", () => {
  isDragging = false;
});

document.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  dragTarget.style.left = `${e.clientX - offsetX}px`;
  dragTarget.style.top = `${e.clientY - offsetY}px`;
});
