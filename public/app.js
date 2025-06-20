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
You are helping a Japanese university student with limited English ability create a simple in-class research project.
The student will collect answers from classmates using a short questionnaire.

Start by asking what topic they are interested in. Examples:
money, time, family, relationships, phones, stress, future

If the student gives a vague topic, show 5–7 specific, surveyable ideas.
If they already give a specific idea (e.g., how students spend money), accept it and move on.

✅ Keep your English simple.
✅ Help the student choose one specific idea they want to study.
✅ Avoid repeating topic selection once it’s clear.
📦 When ready, say:
“Great — let’s move on to the next step: making your research question.”`;

    case "2": return `
The student has chosen a topic. Now help them focus their curiosity into a research question.

🎯 Ask:
- What do you want to know about this topic?
- What kind of differences or patterns do you expect to find?
- What do you want to compare or discover?

Then suggest 2–3 possible simple research questions.
📦 When the student agrees on one, say:
“Great — we can use that as your research question! Let’s move on to building your questionnaire.”`;

    case "3": return `
Now it’s time to write survey questions.

Start with 3–4 profile questions (e.g., gender, part-time job, club activity).
Then help create 7–10 topic-related questions using a 1–5 Likert scale.

✅ Provide examples.
✅ Ask what else they want to ask.
✅ Say: “Which questions are most important? Are any not necessary?”
📦 When ready, say:
“Nice job! Now let’s write your hypothesis.”`;

    case "4": return `
Let’s think about what the student expects to find.

Ask:
- What do you think your classmates will say?
- What kind of pattern do you expect?

Then help write one clear hypothesis, such as:
“Students who work more hours will save less money.”
📦 When ready, say:
“Great — let’s make a slide plan for your presentation.”`;

    case "5": return `
Help the student create 4–5 simple slide ideas:
1. Title & Topic
2. Research Question
3. Questionnaire (profile + topic questions)
4. Hypothesis
5. What they hope to find out

✅ Make it easy to understand.
✅ Give bullet point examples.
📦 Say:
“All done! Let’s look at your full summary.”`;

    case "6": return `
Review the student’s full research plan:
- Topic
- Research Question
- Survey Questions
- Hypothesis
- Slide Plan

📦 Then say:
“If you're ready, you can download your plan!”`;

    default: return "Let’s get started!";
  }
}

// ===== Step Instructions for Student UI =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "1":
      return `What topic are you interested in?\n\nYou can choose from: money, time, family, relationships, phones, stress, future.\n\nLet’s pick something you want to know more about!`;

    case "2":
      return `Now let’s think more about your topic.\n\nWhat do you want to know about it?\nWhat kind of question do you want to ask your classmates?`;

    case "3":
      return `Let’s write your questionnaire.\n\nStart with 3–4 profile questions (e.g., gender, club, part-time job).\nThen write 7–10 topic questions using a 1–5 scale.`;

    case "4":
      return `Now let’s guess the result.\n\nWhat do you think your classmates will say?\nLet’s write your prediction — this is your hypothesis!`;

    case "5":
      return `Let’s make slide ideas for your presentation.\nWe will use your research question, questionnaire, and hypothesis.`;

    case "6":
      return `Final check!\nLet’s look at your whole research plan.\nYou can download or revise it.`;

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
      const parts = content.split("Profile Questions:");
      researchState.step3.profileQuestions = (parts[1]?.split("Likert Questions:")[0] || "").trim().split("\n");
      researchState.step3.likertQuestions = (parts[1]?.split("Likert Questions:")[1] || content).trim().split("\n");
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

// ===== Export Button =====
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
