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

function resetChat() {
  chatLog.innerHTML = "";
  outputContent.textContent = "Your result will appear here.";
  userInput.value = "";
}

// ===== Step Prompts =====
function getStepPrompt(step) {
  switch (step) {
    case "1": return `
You are helping a first-year Japanese university student (lower-intermediate English learner) build a simple research project using a class survey.

First, ask what topic they are interested in (e.g., money, family, phones, stress, future, jobs, dating).

Then, if they give a general topic (like \"money\"), suggest 6–7 specific, surveyable ideas using plain and short English.

✅ If the student says \"all of them are interesting\", do NOT ask them to choose just one.
✅ Instead, say: “It sounds like you want to include many of these ideas in your survey. Let me help you turn them into survey questions!”

📦 When a good list of survey ideas is agreed on, say:
“Great — now let’s turn these into a good research question!”
`;

    case "2": return `
The student has chosen a focused topic. Now help them explore it further.

Ask:
- What do you want to know about this topic?
- What do you want to ask your classmates?
- What kind of answers do you think they will give?

Then suggest 2–3 good research questions they might use.
✅ When they choose one, say:
“Great — we can use that as your research question! Let’s move on to building your questionnaire.”
`;

    case "3": return `
Help the student create a survey.

Start with 3–4 profile questions (e.g., gender, age, club, part-time job).
Then make 7–10 Likert scale questions based on their topic.

✅ Use simple and clear language.
✅ After generating all questions, ask:
- What else do you want to ask?
- Are there any questions you want to remove?
📦 When finished, say:
“Nice job! Now let’s write your hypothesis.”
`;

    case "4": return `
Help the student write a hypothesis — a guess based on their topic.

Ask:
- What do you think your classmates will say?
- Do you think there is a connection or pattern?

Help them write a clear sentence like:
“Students who work more hours sleep less.”
📦 When done, say:
“Great — let’s make your slide plan.”
`;

    case "5": return `
Help the student make a presentation plan.
Give ideas for 4–5 slides:
1. Title & Introduction
2. Research Question
3. Questionnaire (profile + Likert)
4. Hypothesis
5. What you expect to find
📦 When finished, say:
“All done! Let’s check your full summary.”
`;

    case "6": return `
Final step! Show the full plan:
- Topic
- Research Question
- Survey Questions
- Hypothesis
- Slide Plan

Ask if they want to revise anything.
📦 When ready, say:
“If you're ready, you can download your plan!”
`;

    default: return "Let’s get started!";
  }
}

// ===== Student UI Instructions =====
function getUserFacingInstruction(step) {
  switch (step) {
    case "1":
      return "What topic are you interested in? (e.g., money, time, family, stress, phones, future)\nLet’s choose something you want to learn more about!";
    case "2":
      return "Now let’s think more about your topic.\nWhat do you want to know about it?\nWhat kind of question do you want to ask your classmates?";
    case "3":
      return "Let’s make your questionnaire!\nStart with 3–4 profile questions (e.g., gender, part-time job)\nThen write 7–10 survey questions with a 1–5 scale.";
    case "4":
      return "Let’s write your hypothesis!\nWhat do you think your classmates will say?\nTry writing one sentence as your guess.";
    case "5":
      return "Let’s plan your presentation!\nWe’ll make 4–5 simple slides to explain your research.";
    case "6":
      return "Let’s review your full research plan and download it if you’re ready!";
    default:
      return "Let’s get started!";
  }
}

// ===== Store Step Output =====
function storeResult(step, content) {
  switch (step) {
    case "1": researchState.step1.theme = content; break;
    case "2": researchState.step2.question = content; break;
    case "3": researchState.step3.likertQuestions = content.split("\n"); break;
    case "4": researchState.step4.hypothesis = content; break;
    case "5": researchState.step5.slidePlan = content.split("\n"); break;
    case "6": researchState.step6.exportSummary = content; break;
  }
  outputContent.textContent = content;
}

// ===== Update Summary View =====
function updateSummary() {
  summaryText.textContent = `
📌 Topic: ${researchState.step1.theme}
❓ Research Question: ${researchState.step2.question}

👤 Profile Questions: ${researchState.step3.profileQuestions.join(", ")}
📊 Likert Questions:\n${researchState.step3.likertQuestions.join("\n")}

💡 Hypothesis: ${researchState.step4.hypothesis}

🎞 Slide Plan:\n${researchState.step5.slidePlan.join("\n")}
  `;
}

// ===== Glossary Popup =====
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

// ===== Export Summary =====
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

// ===== Make Popup Draggable =====
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
