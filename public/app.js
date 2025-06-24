// ===== App State =====
const researchState = {
  currentStep: null,
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: { profileQuestions: [], surveyQuestions: [], chat: [] },
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

// ===== Step Button Switching =====
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    resetChat();
    const intro = getStepPrompt(step);
    appendMessage("gpt", intro);
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
  storeResult(researchState.currentStep, userMessage, reply);
  updateSummary();
});

// ===== ChatGPT API Integration =====
async function chatWithGPT(step, userMessage) {
  const systemPrompt = getSystemPrompt(step);
  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userMessage }
  ];

  try {
    const res = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });

    const data = await res.json();
    return data.reply || "(No reply)";
  } catch (e) {
    return "(Error calling GPT)";
  }
}

// ===== Message Display =====
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

// ===== Step Instructions for GPT Role =====
function getSystemPrompt(step) {
  switch (step) {
    case "1":
      return "You are helping a student choose a research topic. Accept any topic that sounds measurable (e.g., job, money, family) and respond positively. Do not over-analyze.";

    case "2":
      return `
You are helping a student write a clear and simple research question based on their topic.

🎯 Your job is to guide — not redirect or over-analyze.

🧠 Accept ideas that are specific enough to build a survey from.  
Examples of good-enough topics:
- “Ideal family” (✅ okay)  
- “Family” alone (❌ too vague — ask what part of family they are interested in)

✅ If their answer is at the right level (like “ideal family,” “family spending,” “phone use at night”), accept it.  
❌ If the answer is too vague (like “money,” “jobs,” or “family”), ask **one friendly follow-up** to guide them to a focus.

🚫 Do NOT bring up academic topics like demography, policy, or sociology unless the student says so first.

📘 Examples of good research questions:
- “What kind of family do people want to have in the future?”
- “What do students think is most important when choosing a job?”
- “How much time do students spend on their phones after midnight?”

✅ Once a good research question is formed:
1. Confirm it positively  
2. Say clearly:  
   **“Let’s move on to your questionnaire →”**

💬 Keep your tone warm, simple, and encouraging — like a supportive teacher guiding a student in class.
`;

    case "3":
      return "Help the student think about what to ask in their survey. First ask what personal info might matter (e.g., gender, age). Then offer 5–6 main survey questions based on their ideas. Present questions in Google Form style.";

    case "4":
      return "Ask what kind of result the student expects. Keep it simple and light. Help them express a clear, informal guess as a hypothesis.";

    case "5":
      return "Create a 4–5 slide plan for a Felo presentation. Each slide should include a title, keywords, and a short narration explaining the research.";

    default:
      return "Guide the student with friendly and helpful tone.";
  }
}

// ===== Instruction for Student UI (top message) =====
function getStepPrompt(step) {
  switch (step) {
    case "1":
      return "What topic are you interested in? (e.g., money, job, family, happiness, traveling, hobbies)";
    case "2":
      return "Let’s make your research question. What do you want to know about your topic?";
    case "3":
      return "Let’s think about your survey. What background info and questions will help you learn something useful?";
    case "4":
      return "What do you think your classmates will say? Let’s write your hypothesis.";
    case "5":
      return "Let’s plan your presentation slides. We’ll write titles, keywords, and narrations.";
    default:
      return "Let’s get started!";
  }
}

// ===== Save Results Per Step =====
function storeResult(step, userInput, reply) {
  switch (step) {
    case "1":
      researchState.step1.theme = userInput;
      break;
    case "2":
      researchState.step2.question = reply;
      break;
    case "3":
      if (reply.includes("Q1") || reply.includes("1.")) {
        const lines = reply.split("\n").filter(l => l.trim().startsWith("Q"));
        researchState.step3.surveyQuestions = lines;
      } else {
        researchState.step3.profileQuestions.push(userInput);
      }
      break;
    case "4":
      researchState.step4.hypothesis = reply;
      break;
    case "5":
      const slides = reply.split("\n\n").filter(s => s.includes("Slide"));
      researchState.step5.slidePlan = slides;
      break;
  }
  outputContent.textContent = reply;
}

// ===== Summary Display =====
function updateSummary() {
  summaryText.textContent = `
📌 Topic: ${researchState.step1.theme}
❓ Research Question: ${researchState.step2.question}

👤 Profile Ideas: ${researchState.step3.profileQuestions.join(", ")}
📋 Survey Questions:
${researchState.step3.surveyQuestions.join("\n")}

💡 Hypothesis:
${researchState.step4.hypothesis}

🎞 Slide Plan:
${researchState.step5.slidePlan.join("\n")}
  `;
}

// ===== Export Summary Text =====
exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});
