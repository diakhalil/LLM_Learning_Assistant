const API_URL = "http://127.0.0.1:8000";

async function post(endpoint, data) {
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    throw new Error("Could not connect to the local API. Make sure FastAPI and Ollama are running.");
  }

  let result;
  try { result = await response.json(); }
  catch { throw new Error(`The API returned an unreadable response (${response.status}).`); }

  if (!response.ok) {
    const detail = result?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).filter(Boolean).join(" · ")
      : typeof detail === "string" ? detail : "The request could not be completed.";
    throw new Error(message);
  }
  return result;
}

async function postFormData(endpoint, data) {
  let response;
  try {
    response = await fetch(`${API_URL}${endpoint}`, { method: "POST", body: data });
  } catch {
    throw new Error("Could not connect to the local API. Make sure FastAPI and Ollama are running.");
  }

  let result;
  try { result = await response.json(); }
  catch { throw new Error(`The API returned an unreadable response (${response.status}).`); }

  if (!response.ok) {
    const detail = result?.detail;
    const message = Array.isArray(detail)
      ? detail.map((item) => item.msg).filter(Boolean).join(" · ")
      : typeof detail === "string" ? detail : "The request could not be completed.";
    throw new Error(message);
  }
  return result;
}

export const explainText = (text) => post("/explain", { text });
export const generateFlashcards = (text, numberOfCards) => post("/flashcards", { text, number_of_cards: numberOfCards });
export const generateQuiz = (text, numberOfQuestions) => post("/quiz", { text, number_of_questions: numberOfQuestions });
export const generateCode = (input, task, programmingLanguage) => post("/code", {
  input,
  task,
  programming_language: programmingLanguage === "Other" ? null : programmingLanguage,
});
export const analyzeVisionNotes = (image) => {
  const formData = new FormData();
  formData.append("file", image);
  return postFormData("/vision-notes", formData);
};
export const generateDiagram = (text) => post("/diagram", { text });
