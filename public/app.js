// ===== App State =====
const researchState = {
  currentStep: null,
  step3SubStep: null,
  step1: { theme: "", chat: [] },
  step2: { question: "", chat: [] },
  step3: {
    profileQuestions: [],
    multipleChoiceQuestions: [],
    likertQuestions: [],
    chat: []
  },
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
stepButtons.forEach(btn => {
  btn.addEventListener("click", () => {
    const step = btn.dataset.step;
    researchState.currentStep = step;
    researchState.step3SubStep = step === "3" ? null : null;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction(step));
    if (researchState[step]) {
      researchState[step].chat = [];
    } else {
      researchState[step] = { chat: [] };
    }
    console.log(`Switched to Step ${step}. Chat history cleared.`);
  });
});

// ===== Send Button Behavior =====
sendBtn.addEventListener("click", async () => {
  const userMessage = userInput.value.trim();
  if (!userMessage) return;
  appendMessage("user", userMessage);
  userInput.value = "";

  if (!Array.isArray(researchState[researchState.currentStep].chat)) {
    researchState[researchState.currentStep].chat = [];
  }
  researchState[researchState.currentStep].chat.push({ role: "user", content: userMessage });

  const reply = await chatWithGPT(researchState.currentStep, userMessage);
  appendMessage("gpt", reply);
  researchState[researchState.currentStep].chat.push({ role: "gpt", content: reply });

  if (researchState.currentStep === "1" && reply.toLowerCase().includes("let’s move on to making your research question")) {
    const extractedTheme = extractFromReply(reply, "1");
    storeResult("1", extractedTheme);
    researchState.currentStep = "2";
    resetChat();
    appendMessage("gpt", getUserFacingInstruction("2"));
    researchState.step1.chat = [];
    updateSummary();
    return;
  }

  if (researchState.currentStep === "2" && reply.toLowerCase().includes("let’s move on to building your questionnaire")) {
    const extractedQuestion = extractFromReply(reply, "2");
    storeResult("2", extractedQuestion);
    researchState.currentStep = "3";
    researchState.step3SubStep = null;
    resetChat();
    appendMessage("gpt", getUserFacingInstruction("3"));
    researchState.step2.chat = [];
    updateSummary();
    return;
  }

  const extractedContent = extractFromReply(reply, researchState.currentStep, researchState.step3SubStep);
  storeResult(researchState.currentStep, extractedContent);

  if (researchState.currentStep === "3") {
    if (researchState.step3SubStep === null) {
      researchState.step3SubStep = 'profile';
    }
    if (researchState.step3SubStep === 'profile' && reply.toLowerCase().includes("multiple-choice questions")) {
      researchState.step3SubStep = 'multipleChoice';
      appendMessage("gpt", getUserFacingInstruction("3"));
    } else if (researchState.step3SubStep === 'multipleChoice' && reply.toLowerCase().includes("likert scale questions")) {
      researchState.step3SubStep = 'likert';
      appendMessage("gpt", getUserFacingInstruction("3"));
    } else if (researchState.step3SubStep === 'likert' && reply.toLowerCase().includes("let’s move on to writing your hypothesis")) {
      researchState.currentStep = "4";
      researchState.step3SubStep = null;
      resetChat();
      appendMessage("gpt", getUserFacingInstruction("4"));
      researchState.step3.chat = [];
    }
  }

  updateSummary();
});

// ===== Chat With GPT =====
async function chatWithGPT(step, currentUserMessage) {
  const topic = researchState.step1.theme?.trim() || "[unspecified topic]";
  const researchQuestion = researchState.step2.question?.trim() || "[unspecified question]";

  let messages = [{ role: "system", content: getStepPrompt(step, topic, researchQuestion) }];

  let history = Array.isArray(researchState[step]?.chat) ? researchState[step].chat : [];
  history = history.filter(msg => msg && msg.role && msg.content && typeof msg.content === 'string');

  const MAX_HISTORY = 7;
  if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);

  messages.push(...history);

  console.log("🔍 Sending GPT Messages:", messages);

  try {
    const response = await fetch("/api/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages })
    });
    const data = await response.json();
    if (!data || typeof data.reply === 'undefined') throw new Error("Invalid API response");
    return data.reply;
  } catch (error) {
    console.error("API Error:", error);
    return "⚠️ There was a problem contacting the assistant. Please check your input or try again shortly.";
  }
}

// ===== Utility Functions =====
function extractFromReply(reply, step) {
  if (step === "1") {
    const userMessage = researchState.step1.chat?.findLast(msg => msg.role === 'user')?.content;
    return userMessage?.trim() || "";
  } else if (step === "2") {
    const match = reply.match(/\d+\. ([^\n]+)/);
    if (match && match[1]) return match[1].trim();
    const userMessage = researchState.step2.chat?.findLast(msg => msg.role === 'user')?.content;
    return userMessage?.trim() || "";
  }
  return reply;
}

function storeResult(step, content) {
  if (!content || content === "N/A" || content.includes("[unspecified")) return;
  outputContent.textContent = content;
  switch (step) {
    case "1": researchState.step1.theme = content; break;
    case "2": researchState.step2.question = content; break;
    case "3":
      if (researchState.step3SubStep === 'profile') {
        const lines = content.split("\n").filter(line => line.startsWith('- '));
        researchState.step3.profileQuestions = lines.map(line => line.substring(2).trim());
      } else if (researchState.step3SubStep === 'multipleChoice') {
        const matches = content.match(/\d+\. [^\n]+(?:\n\t\d+\. [^\n]+)*/g);
        if (matches) researchState.step3.multipleChoiceQuestions = matches.map(m => m.trim());
      } else if (researchState.step3SubStep === 'likert') {
        const lines = content.split("\n").filter(line => line.startsWith('- '));
        researchState.step3.likertQuestions = lines.map(line => line.substring(2).trim());
      }
      break;
    case "4": researchState.step4.hypothesis = content; break;
    case "5": researchState.step5.slidePlan = content.split("\n").filter(line => line.trim() !== ""); break;
    case "6": researchState.step6.exportSummary = content; break;
  }
}

function resetChat() {
  chatLog.innerHTML = "";
  outputContent.textContent = "Your result will appear here.";
  userInput.value = "";
}

function appendMessage(sender, message) {
  const div = document.createElement("div");
  div.className = sender === "user" ? "user-msg" : "gpt-msg";
  div.textContent = message;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function updateSummary() {
  summaryText.textContent = `
📌 Topic: ${researchState.step1.theme || "Not yet defined"}
❓ Research Question: ${researchState.step2.question || "Not yet defined"}

👤 Profile Questions:
${researchState.step3.profileQuestions.join("\n") || "Not yet defined"}

🔢 Multiple Choice Questions:
${researchState.step3.multipleChoiceQuestions.join("\n") || "Not yet defined"}

📊 Likert Questions:
${researchState.step3.likertQuestions.join("\n") || "Not yet defined"}

💡 Hypothesis: ${researchState.step4.hypothesis || "Not yet defined"}

🎞 Slide Plan:
${researchState.step5.slidePlan.join("\n") || "Not yet defined"}
  `;
}

function getUserFacingInstruction(step) {
  switch (step) {
    case "1":
      return "What topic are you interested in? (e.g., money, time, jobs)\nYou can also choose topics like: family, friends, phone use, study, sleep, part-time jobs, dating, future, stress.\nLet’s choose something you want to learn more about!";
    case "2":
      return "Now let’s think more about your topic.\nWhat do you want to know about it?\nWhat kind of question do you want to ask your classmates?";
    case "3":
      if (researchState.step3SubStep === 'profile') {
        return "We're setting up your Profile Questions. Tell me, what kind of background information about your respondents do you think is important for your survey?";
      } else if (researchState.step3SubStep === 'multipleChoice') {
        return "Great! Now let's work on your Multiple Choice Questions. What specific aspects related to your topic would you like to give options for?";
      } else if (researchState.step3SubStep === 'likert') {
        return "Excellent! Let's now create your Likert Scale Questions. Think about statements related to your topic that people can strongly agree or disagree with.";
      }
      return "Let's build your questionnaire in three parts: Profile Questions, Multiple Choice Questions, and Likert Scale Questions. We'll start with Profile Questions.";
    case "4":
      return "What do you think your classmates will say?\nLet’s make your guess — your hypothesis!";
    case "5":
      return "Let’s make your slide plan.\nWe will outline 4–5 slides to show your research.";
    case "6":
      return "This is the final step.\nLet’s check your whole plan and download it if you're ready!";
    default:
      return "Let’s get started!";
  }
}

function getStepPrompt(step, topic, researchQuestion) {
  switch (step) {
    case "1":
      return `
You are helping a university student conduct a small survey in English class.
This is not academic research — it is a class exercise to practice making a simple questionnaire, analyzing results, and presenting findings.

First, ask what topic they are interested in (e.g., money, time, family, phones, relationships).

If their answer is vague, give 5–7 simple and measurable examples related to that topic.
✅ Do NOT say "we must narrow it down more."
✅ Accept broad interest as long as it can be asked in survey form.
✅ Confirm their interest and say:
"Great — let’s move on to making your research question."
`;

    case "2":
      return `
Now help the student create a simple research question based on their topic.
Ask: "What do you want to know about that topic?"

Give 2–3 example questions based on their topic that are short, clear, and suitable for a basic survey.
✅ Accept if the student wants to explore more than one aspect.
✅ Once the question is set, say:
"Great — we can use that as your research question! Let’s move on to building your questionnaire."
`;

    case "3":
      switch (researchState.step3SubStep) {
        case "profile":
          return `
You are helping a university student create a survey. Their **established topic is "${topic}"** and their **specific research question is "${researchQuestion}"**.

Your current task is to help them define "Profile Questions." These questions help understand the background of the survey taker.

First, ask: "Considering your research topic (${topic}) and question, what background factors do you think might affect how people answer your survey?"
Then, suggest 3–4 examples of profile questions (e.g., age, gender, part-time job status, number of family members).
End with: "Great! Once you're happy with these, we can move to multiple-choice questions."
`;

        case "multipleChoice":
          return `
Now help the student create 3–4 Multiple Choice Questions related to their research question: "${researchQuestion}" under topic: "${topic}".

Each question should include 4–5 options.
End with: "Once you're ready, we’ll move on to Likert scale questions."
`;

        case "likert":
          return `
Now suggest 3–5 Likert scale statements related to their topic (${topic}) and research question (${researchQuestion}).

The student will ask respondents to rate how much they agree with each statement from 1 (Strongly Disagree) to 5 (Strongly Agree).

End with: "Great — we can use these for your questionnaire! Let’s move on to writing your hypothesis."
`;

        default:
          return `
Let's start building your questionnaire. We'll create:
1. Profile Questions
2. Multiple Choice Questions
3. Likert Scale Questions

Start by asking what kind of background information might be useful to collect.
`;
      }

    case "4":
      return `
Ask the student:
- What do you expect most people will answer?
- Do you think there will be any pattern?

Help them write 1 short and simple hypothesis.
✅ Then say:
"Great — let’s make your presentation slide plan."
`;

    case "5":
      return `
Help the student outline 4–5 slides for a presentation:
1. Topic & Reason
2. Research Question
3. Survey Questions
4. Hypothesis
5. What they expect to find

✅ Then say:
"All done! Let’s review your full plan."
`;

    case "6":
      return `
Summarize everything the student has created:
- Topic
- Research Question
- Survey (profile + multiple-choice + Likert)
- Hypothesis
- Slide Plan

✅ End with:
"If you're ready, you can download your plan!"
`;

    default:
      return "Let’s begin.";
  }
}

exportBtn.addEventListener("click", () => {
  const blob = new Blob([summaryText.textContent], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "Research_Plan_Summary.txt";
  a.click();
  URL.revokeObjectURL(url);
});
