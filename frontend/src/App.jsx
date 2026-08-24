import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { analyzeVisionNotes, explainText, generateCode, generateDiagram, generateFlashcards, generateQuiz } from "./api";

const FEATURES = {
  explain: { label: "Explain", eyebrow: "Understand the idea", action: "Generate explanation", loading: "Generating explanation…" },
  flashcards: { label: "Flashcards", eyebrow: "Practice active recall", action: "Create flashcards", loading: "Creating flashcards…" },
  quiz: { label: "Quiz", eyebrow: "Test your knowledge", action: "Build a quiz", loading: "Building your quiz…" },
};

const HISTORY_FEATURES = {
  explain: { label: "Explain", icon: "explain" },
  flashcards: { label: "Flashcards", icon: "flashcards" },
  quiz: { label: "Quiz", icon: "quiz" },
  code: { label: "Code Assistant", icon: "code" },
  vision: { label: "Vision Notes", icon: "vision" },
  diagram: { label: "Flowchart", icon: "vision" },
};

function Icon({ name }) {
  const paths = {
    explain: <><path d="M12 3a7 7 0 0 0-4 12.74V18h8v-2.26A7 7 0 0 0 12 3Z"/><path d="M9 21h6M9 14h6"/></>,
    flashcards: <><rect x="5" y="3" width="14" height="16" rx="2"/><path d="M9 7h6M9 11h4M3 7v12a2 2 0 0 0 2 2h10"/></>,
    quiz: <><path d="M9 4h6l1 2h3v15H5V6h3l1-2Z"/><path d="m9 14 2 2 4-5"/></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    trash: <><path d="M3 6h18M8 6V3h8v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/></>,
    arrow: <path d="m9 18 6-6-6-6"/>,
    history: <><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>,
    close: <path d="m6 6 12 12M18 6 6 18"/>,
    code: <><path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/></>,
    model: <><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 9h6v6H9zM9 1v3M15 1v3M9 20v3M15 20v3M1 9h3M20 9h3M1 15h3M20 15h3"/></>,
    vision: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 15-5-5L5 20M12 16l2-2"/></>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 15v5h16v-5"/></>,
  };
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function EmptyState({ feature }) {
  const copy = {
    explain: ["A clear explanation will appear here", "Paste your notes and turn dense material into something easier to understand."],
    flashcards: ["Your study deck will appear here", "Generate a focused set of cards, then reveal answers one at a time."],
    quiz: ["Your practice quiz will appear here", "Build a quiz from your material and get feedback as you work."],
  }[feature];
  return <div className="empty-state"><div className="empty-icon"><Icon name={feature} /></div><h2>{copy[0]}</h2><p>{copy[1]}</p></div>;
}

function ErrorNotice({ message, onRetry }) {
  return <div className="error-notice" role="alert"><div><strong>We couldn’t finish that request.</strong><p>{message}</p></div><button className="text-button" onClick={onRetry}>Try again</button></div>;
}

function InlineMarkdown({ text }) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`")) return <code key={index}>{part.slice(1, -1)}</code>;
    return part;
  });
}

function MarkdownContent({ content }) {
  const blocks = [];
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  let paragraph = [];
  let list = [];
  let listType = null;
  let listStart = 1;

  function flushParagraph() {
    if (paragraph.length) {
      const value = paragraph.join(" ").trim();
      if (value) blocks.push(<p key={`p-${blocks.length}`}><InlineMarkdown text={value} /></p>);
      paragraph = [];
    }
  }

  function flushList() {
    if (!list.length) return;
    const Tag = listType === "ordered" ? "ol" : "ul";
    const listProps = listType === "ordered" ? { start: listStart } : {};
    blocks.push(<Tag {...listProps} key={`list-${blocks.length}`}>{list.map((item, index) => <li key={index}><InlineMarkdown text={item} /></li>)}</Tag>);
    list = [];
    listType = null;
    listStart = 1;
  }

  lines.forEach((rawLine) => {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const unordered = line.match(/^[-*•]\s+(.+)$/);
    const ordered = line.match(/^(\d+)[.)]\s+(.+)$/);

    if (!line) { flushParagraph(); flushList(); return; }
    if (heading) {
      flushParagraph(); flushList();
      const level = Math.min(heading[1].length + 1, 4);
      const Tag = `h${level}`;
      blocks.push(<Tag key={`h-${blocks.length}`}><InlineMarkdown text={heading[2]} /></Tag>);
      return;
    }
    if (unordered || ordered) {
      flushParagraph();
      const nextType = ordered ? "ordered" : "unordered";
      if (list.length && listType !== nextType) flushList();
      listType = nextType;
      if (ordered && list.length === 0) listStart = Number(ordered[1]);
      list.push(ordered ? ordered[2] : unordered[1]);
      return;
    }
    flushList();
    paragraph.push(line);
  });
  flushParagraph(); flushList();
  return blocks;
}

function Explanation({ value }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }
  return <section className="result-panel explanation-panel"><div className="result-heading"><div><span className="section-kicker">Study note</span><h2>Explanation</h2></div><button className="secondary-button" onClick={copy}><Icon name="copy" />{copied ? "Copied" : "Copy"}</button></div>{copied && <span className="copy-status" role="status">Copied to clipboard</span>}<div className="explanation-text"><MarkdownContent content={value} /></div></section>;
}

function Flashcards({ cards }) {
  const [flipped, setFlipped] = useState({});
  const [mobileIndex, setMobileIndex] = useState(0);
  useEffect(() => { setFlipped({}); setMobileIndex(0); }, [cards]);
  function toggle(index) { setFlipped((old) => ({ ...old, [index]: !old[index] })); }
  return <section className="result-panel"><div className="result-heading"><div><span className="section-kicker">Active recall</span><h2>Your flashcards</h2></div><span className="result-count">{cards.length} cards</span></div><div className="flashcard-grid">{cards.map((card, index) => <button type="button" key={`${card.question}-${index}`} className={`flashcard ${flipped[index] ? "is-flipped" : ""} ${index === mobileIndex ? "is-current" : ""}`} onClick={() => toggle(index)} aria-label={`${flipped[index] ? "Answer" : "Question"} ${index + 1}. Press to flip`}><span className="flashcard-inner"><span className="flash-face front"><span className="card-label">Question · {index + 1}</span><strong>{card.question}</strong><span className="reveal-hint">Click to reveal <Icon name="arrow" /></span></span><span className="flash-face back"><span className="card-label">Answer · {index + 1}</span><strong>{card.answer}</strong><span className="reveal-hint">Click for question <Icon name="arrow" /></span></span></span></button>)}</div>{cards.length > 1 && <div className="mobile-pager"><button onClick={() => setMobileIndex((i) => Math.max(0, i - 1))} disabled={mobileIndex === 0}>Previous</button><span>{mobileIndex + 1} / {cards.length}</span><button onClick={() => setMobileIndex((i) => Math.min(cards.length - 1, i + 1))} disabled={mobileIndex === cards.length - 1}>Next</button></div>}</section>;
}

function Quiz({ questions }) {
  const [selected, setSelected] = useState({});
  const [checked, setChecked] = useState({});
  useEffect(() => { setSelected({}); setChecked({}); }, [questions]);
  const answered = Object.keys(checked).length;
  const correct = Object.keys(checked).filter((i) => selected[i] === questions[i]?.correct_answer).length;
  function reset() { setSelected({}); setChecked({}); }
 return <section className="result-panel quiz-panel"><div className="result-heading quiz-heading"><div><span className="section-kicker">Knowledge check</span><h2>Practice quiz</h2></div><button className="secondary-button" onClick={reset}>Reset quiz</button></div><div className="score-strip"><div><strong>{answered}</strong><span>Answered</span></div><div><strong>{correct}</strong><span>Correct</span></div><div><strong>{questions.length}</strong><span>Total</span></div><div className="progress-track"><span style={{ width: `${questions.length ? (answered / questions.length) * 100 : 0}%` }} /></div></div>{questions.map((item, index) => { const isChecked = checked[index]; const isCorrect = selected[index] === item.correct_answer; return <article className="question-card" key={`${item.question}-${index}`}><span className="question-number">Question {index + 1} of {questions.length}</span><h3>{item.question}</h3><div className="choices">{item.choices.map((choice) => { let state = ""; if (isChecked && choice === item.correct_answer) state = "correct"; else if (isChecked && choice === selected[index]) state = "wrong"; return <label className={`choice ${state}`} key={choice}><input type="radio" name={`question-${index}`} value={choice} checked={selected[index] === choice} disabled={isChecked} onChange={() => setSelected((old) => ({ ...old, [index]: choice }))}/><span className="choice-marker">{String.fromCharCode(65 + item.choices.indexOf(choice))}</span><span>{choice}</span></label>; })}</div><button className="check-button" disabled={!selected[index] || isChecked} onClick={() => setChecked((old) => ({ ...old, [index]: true }))}>{isChecked ? "Answer checked" : "Check answer"}</button>{isChecked && <div className={`feedback ${isCorrect ? "correct" : "incorrect"}`} role="status"><strong>{isCorrect ? "Correct" : "Not quite — review the answer below."}</strong><p>{item.explanation}</p></div>}</article>; })}{answered === questions.length && <div className="score-summary"><span>Quiz complete</span><strong>{correct} out of {questions.length} correct</strong><p>{correct === questions.length ? "Excellent work — you’ve mastered this set." : "Review the explanations, then reset when you’re ready for another pass."}</p></div>}</section>;
}

const CODE_TASKS = {
  generate: { label: "Generate Code", field: "Describe what you want to build", placeholder: "Write a Python function that checks whether a number is prime.", loading: "Generating code with qwen2.5-coder:7b…" },
  explain: { label: "Explain Code", field: "Paste the code you want explained", placeholder: "Paste your code here…", loading: "Analyzing the code…" },
  debug: { label: "Debug Code", field: "Paste the code that contains an error", placeholder: "Paste the broken code and optionally include the error message…", loading: "Debugging the code…" },
  improve: { label: "Improve Code", field: "Paste the code you want improved", placeholder: "Paste code that should be made cleaner, safer, or more efficient…", loading: "Improving the code…" },
};

function ModelBadge({ coder = false, vision = false }) {
  const label = vision ? "Vision and multimodal model" : coder ? "Specialized local coding model" : "Main local study model";
  const model = vision ? "qwen2.5vl:7b" : coder ? "qwen2.5-coder:7b" : "qwen2.5:7b";
  return <span className={`model-badge ${coder ? "coder" : ""} ${vision ? "vision" : ""}`}><Icon name={vision ? "vision" : "model"}/><span><small>{label}</small><strong>{model}</strong></span></span>;
}

function ModelOverview({ activeTool, onSelect }) {
  const studyActive = ["explain", "flashcards", "quiz", "diagram"].includes(activeTool);
  const visionActive = activeTool === "vision";
  return <section className="model-overview" aria-labelledby="model-map-title"><div className="model-map-heading"><div><span className="overline">Local model workspace</span><h2 id="model-map-title">Three models, one private workspace</h2></div><span className="ollama-label"><i/>Running locally through Ollama</span></div><div className="model-map"><article className={`model-card study ${studyActive ? "active" : ""}`}><div className="model-card-top"><ModelBadge/><span>Core study tools</span></div><div className="model-tools"><button onClick={() => onSelect("explain")} className={activeTool === "explain" ? "active" : ""}>Explain</button><button onClick={() => onSelect("flashcards")} className={activeTool === "flashcards" ? "active" : ""}>Flashcards</button><button onClick={() => onSelect("quiz")} className={activeTool === "quiz" ? "active" : ""}>Quiz</button><button onClick={() => onSelect("diagram")} className={activeTool === "diagram" ? "active" : ""}>Flowchart</button></div></article><article className={`model-card coder ${activeTool === "code" ? "active" : ""}`}><div className="model-card-top"><ModelBadge coder/><span>Specialized tool</span></div><button className="code-tool-button" onClick={() => onSelect("code")}><Icon name="code"/><span><strong>Code Assistant</strong><small>Generate, explain, debug, and improve</small></span><Icon name="arrow"/></button></article><article className={`model-card vision ${visionActive ? "active" : ""}`}><div className="model-card-top"><ModelBadge vision/><span>Multimodal tool</span></div><div className="vision-tools"><button onClick={() => onSelect("vision")} className={activeTool === "vision" ? "active" : ""}><Icon name="vision"/><span><strong>Study Notes Analyzer</strong><small>Extract and understand image notes</small></span></button></div></article></div></section>;
}

function CodeOutput({ code, explanation, language, task }) {
  const [copied, setCopied] = useState("");
  async function copy(value, type) {
    try { await navigator.clipboard.writeText(value); setCopied(type); setTimeout(() => setCopied(""), 1800); }
    catch { setCopied(""); }
  }
  const explanationOnly = task === "explain";
  return <section className={`code-result result-panel ${explanationOnly ? "explanation-only" : ""}`}><div className="code-output-heading"><div><span className="section-kicker">Coding model output</span><h2>{explanationOnly ? "Code explanation" : "Generated code"}</h2></div><ModelBadge coder/></div>{!explanationOnly && <div className="code-window"><div className="code-toolbar"><span><i/><i/><i/><b>{language}</b></span><button onClick={() => copy(code, "code")}><Icon name="copy"/>{copied === "code" ? "Copied" : "Copy code"}</button></div><pre><code>{code}</code></pre></div>}<div className="code-explanation"><div className="code-explanation-heading"><h3>{explanationOnly ? "How this code works" : "Explanation"}</h3><button onClick={() => copy(explanation, "explanation")}><Icon name="copy"/>{copied === "explanation" ? "Copied" : "Copy"}</button></div><div className="explanation-text"><MarkdownContent content={explanation}/></div></div></section>;
}

function CodeAssistant({ historyEntry, onHistoryAdd }) {
  const [task, setTask] = useState("generate");
  const [language, setLanguage] = useState("Python");
  const [customLanguage, setCustomLanguage] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const selectedLanguage = language === "Other" ? customLanguage.trim() || "Other" : language;

  useEffect(() => {
    if (!historyEntry || historyEntry.feature !== "code") return;
    const saved = historyEntry.result || {};
    const standardLanguages = ["Python", "JavaScript", "Java", "C++", "C#", "TypeScript", "SQL", "HTML/CSS"];
    const savedLanguage = typeof saved.language === "string" ? saved.language : "Python";
    setInput(historyEntry.prompt || "");
    setTask(CODE_TASKS[saved.task] ? saved.task : "generate");
    setLanguage(standardLanguages.includes(savedLanguage) ? savedLanguage : "Other");
    setCustomLanguage(standardLanguages.includes(savedLanguage) ? "" : savedLanguage);
    setCode(typeof saved.code === "string" ? saved.code : "");
    setExplanation(typeof saved.explanation === "string" ? saved.explanation : "");
    setError("");
  }, [historyEntry]);

  async function submit() {
    if (!input.trim()) { setError("Add a request or code before continuing."); return; }
    setLoading(true); setError("");
    try {
      const data = await generateCode(input.trim(), task, selectedLanguage);
      if (!Array.isArray(data.generated_code) && typeof data.generated_code !== "string") throw new Error("The coding model returned an unexpected code format.");
      const generatedCode = Array.isArray(data.generated_code) ? data.generated_code.join("\n") : data.generated_code;
      const generatedExplanation = typeof data.explanation === "string" ? data.explanation : "No explanation was returned.";
      setCode(generatedCode);
      setExplanation(generatedExplanation);
      onHistoryAdd("code", input.trim(), { code: generatedCode, explanation: generatedExplanation, task, language: selectedLanguage });
    } catch (err) { setError(err.message || "The coding model could not complete the request."); }
    finally { setLoading(false); }
  }

  return <div className="code-workspace"><section className="code-intro"><div><span className="overline">Specialized tool</span><h2>Code Assistant</h2><p>Build, understand, and refine code with a model tuned for software tasks.</p></div><ModelBadge coder/></section><section className="code-composer composer"><div className="code-controls"><fieldset><legend>Choose a task</legend><div className="task-selector">{Object.entries(CODE_TASKS).map(([key, item]) => <button type="button" key={key} className={task === key ? "active" : ""} onClick={() => { setTask(key); setError(""); setCode(""); setExplanation(""); }} disabled={loading}>{item.label}</button>)}</div></fieldset><label className="language-control"><span>Programming language</span><select value={language} disabled={loading} onChange={(event) => setLanguage(event.target.value)}>{["Python", "JavaScript", "Java", "C++", "C#", "TypeScript", "SQL", "HTML/CSS", "Other"].map((item) => <option key={item}>{item}</option>)}</select></label>{language === "Other" && <label className="custom-language"><span>Language name</span><input value={customLanguage} disabled={loading} onChange={(event) => setCustomLanguage(event.target.value)} placeholder="e.g. Rust"/></label>}</div><div className="field-heading"><label htmlFor="code-input">{CODE_TASKS[task].field}</label><button className="clear-button" onClick={() => { setInput(""); setError(""); }} disabled={!input || loading}><Icon name="trash"/>Clear</button></div><textarea id="code-input" className="code-input" value={input} disabled={loading} onChange={(event) => { setInput(event.target.value); setError(""); }} placeholder={CODE_TASKS[task].placeholder} spellCheck={task === "generate"}/><div className="composer-footer"><span className="character-count">{input.length.toLocaleString()} characters</span><button className="primary-button code-primary" disabled={loading || !input.trim()} onClick={submit}>{loading ? <><span className="spinner"/>{CODE_TASKS[task].loading}</> : <><Icon name="code"/>{CODE_TASKS[task].label}</>}</button></div></section>{error && <ErrorNotice message={error} onRetry={submit}/>}<div className="output-area" aria-live="polite">{!code && !explanation && !error && !loading && <div className="empty-state code-empty"><div className="empty-icon"><Icon name="code"/></div><h2>Your code output will appear here</h2><p>Select a task, add your input, and the specialized local model will return code with an explanation.</p></div>}{(code || explanation) && <CodeOutput code={code} explanation={explanation} language={selectedLanguage} task={task}/>}</div></div>;
}

async function optimizeStudyImage(file) {
  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1800;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext("2d");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
    if (!blob) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "study-notes";
    return new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: file.lastModified });
  } catch {
    return file;
  }
}

function VisionNotes({ historyEntry, onCreateFlowchart, onHistoryAdd }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!historyEntry || historyEntry.feature !== "vision") return;
    const saved = historyEntry.result;
    if (!saved || typeof saved.extracted_text !== "string" || typeof saved.summary !== "string" || typeof saved.explanation !== "string") return;
    setImage(null);
    setResult(saved);
    setError("");
  }, [historyEntry]);

  async function analyze() {
    if (!image) return;
    setLoading(true); setError("");
    try {
      const optimizedImage = await optimizeStudyImage(image);
      const data = await analyzeVisionNotes(optimizedImage);
      if (!Array.isArray(data.extracted_text) || typeof data.summary !== "string" || typeof data.explanation !== "string") throw new Error("The notes analyzer returned an unexpected response format.");
      const analyzedResult = { ...data, extracted_text: data.extracted_text.join("\n") };
      setResult(analyzedResult);
      onHistoryAdd("vision", image.name, analyzedResult);
    } catch (err) { setError(err.message || "The image could not be analyzed."); }
    finally { setLoading(false); }
  }

  return <div className="vision-workspace"><section className="tool-intro vision-intro"><div><span className="overline">Vision · Multimodal</span><h2>Study Notes Analyzer</h2><p>Upload handwritten or printed study notes and extract the text, summary, and explanation.</p></div><ModelBadge vision/></section><section className="composer vision-composer"><div className="field-heading"><label htmlFor="notes-image">Upload your study notes</label><span className="file-support">PNG, JPG, WEBP</span></div><label className={`upload-zone ${image ? "has-file" : ""}`} htmlFor="notes-image"><Icon name="upload"/><span><strong>{image ? image.name : "Choose an image"}</strong><small>{image ? "Select another file to replace it" : "Handwritten or printed notes"}</small></span><input id="notes-image" type="file" accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={(event) => { setImage(event.target.files?.[0] || null); setError(""); setResult(null); }}/></label><div className="composer-footer"><span className="character-count">{image ? `${(image.size / 1024 / 1024).toFixed(2)} MB selected` : "No image selected"}</span><button className="primary-button vision-primary" disabled={!image || loading} onClick={analyze}>{loading ? <><span className="spinner"/>Analyzing notes with qwen2.5vl:7b…</> : <><Icon name="vision"/>Analyze Study Notes</>}</button></div></section>{error && <ErrorNotice message={error} onRetry={analyze}/>}<div className="output-area" aria-live="polite">{!result && !error && !loading && <div className="empty-state vision-empty"><div className="empty-icon"><Icon name="vision"/></div><h2>Your analyzed notes will appear here</h2><p>Select an image to extract its text and generate a focused summary and explanation.</p></div>}{result && <section className="result-panel vision-result"><div className="result-heading"><div><span className="section-kicker">Vision model output</span><h2>Analyzed study notes</h2></div><button className="secondary-button" onClick={() => onCreateFlowchart(result.extracted_text)}><Icon name="arrow"/>Create flowchart</button></div><article className="vision-section extracted"><h3>Extracted Text</h3><pre>{result.extracted_text}</pre></article><div className="vision-result-grid"><article className="vision-section"><h3>Summary</h3><div className="explanation-text"><MarkdownContent content={result.summary}/></div></article><article className="vision-section"><h3>Explanation</h3><div className="explanation-text"><MarkdownContent content={result.explanation}/></div></article></div></section>}</div></div>;
}

function normalizeMermaidCode(code) {
  let normalized = code
    .replace(/^```(?:mermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  normalized = normalized.split("\n").map((line) =>
    line.replace(/^(\s*[A-Za-z_][\w-]*)@[A-Za-z_][\w-]*(\s*[\[({])/, "$1$2")
  ).join("\n");
  if (!/^(?:flowchart|graph)\s+(?:TD|TB|BT|RL|LR)\b/i.test(normalized)) {
    normalized = `flowchart TD\n${normalized}`;
  }
  return normalized;
}

function MermaidDiagram({ code }) {
  const containerRef = useRef(null);
  const [renderError, setRenderError] = useState("");
  const [showCode, setShowCode] = useState(false);
  const normalizedCode = normalizeMermaidCode(code);

  useEffect(() => {
    let active = true;
    async function renderDiagram() {
      setRenderError(""); setShowCode(false);
      try {
        mermaid.initialize({ startOnLoad: false, securityLevel: "strict", theme: "neutral", fontFamily: "DM Sans, sans-serif" });
        const id = `study-flowchart-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const { svg } = await mermaid.render(id, normalizedCode);
        if (active && containerRef.current) containerRef.current.innerHTML = svg;
      } catch {
        if (active) setRenderError("The flowchart could not be rendered. You can view the Mermaid code to review it.");
      }
    }
    renderDiagram();
    return () => { active = false; };
  }, [normalizedCode]);

  if (renderError) return <div className="diagram-render-error" role="alert"><p>{renderError}</p><button className="secondary-button" onClick={() => setShowCode((old) => !old)}>{showCode ? "Hide Mermaid Code" : "Show Mermaid Code"}</button>{showCode && <pre><code>{normalizedCode}</code></pre>}</div>;
  return <div className="mermaid-canvas" ref={containerRef} aria-label="Generated study flowchart"/>;
}

function FlowchartGenerator({ historyEntry, initialText, onHistoryAdd }) {
  const [text, setText] = useState(initialText || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  useEffect(() => { if (initialText) { setText(initialText); setResult(null); setError(""); } }, [initialText]);
  useEffect(() => {
    if (!historyEntry || historyEntry.feature !== "diagram") return;
    const saved = historyEntry.result;
    if (!saved || typeof saved.title !== "string" || typeof saved.explanation !== "string" || typeof saved.diagram_code !== "string") return;
    setText(historyEntry.prompt || "");
    setResult(saved);
    setError("");
  }, [historyEntry]);

  async function submit() {
    if (!text.trim()) { setError("Enter a topic or paste your notes before generating a flowchart."); return; }
    setLoading(true); setError("");
    try {
      let data;
      try {
        data = await generateDiagram(text.trim());
      } catch (firstError) {
        if (firstError.message !== "Failed to parse response") throw firstError;
        data = await generateDiagram(text.trim());
      }
      if (typeof data.title !== "string" || typeof data.explanation !== "string" || typeof data.diagram_code !== "string") throw new Error("The flowchart generator returned an unexpected response format.");
      setResult(data);
      onHistoryAdd("diagram", text.trim(), data);
    } catch (err) { setError(err.message || "The flowchart could not be generated."); }
    finally { setLoading(false); }
  }

  return <div className="diagram-workspace"><section className="tool-intro diagram-intro"><div><span className="overline">Visual study tool</span><h2>Study Flowchart Generator</h2><p>Turn a topic, pasted notes, or extracted image text into a visual learning path.</p></div><ModelBadge/></section><section className="composer diagram-composer"><div className="field-heading"><label htmlFor="diagram-input">Topic or notes</label><button className="clear-button" onClick={() => { setText(""); setError(""); setResult(null); }} disabled={!text || loading}><Icon name="trash"/>Clear</button></div><textarea id="diagram-input" value={text} disabled={loading} onChange={(event) => { setText(event.target.value); setError(""); }} placeholder="Enter a topic or paste your notes..."/><div className="composer-footer"><span className="character-count">{text.length.toLocaleString()} characters</span><button className="primary-button diagram-primary" disabled={!text.trim() || loading} onClick={submit}>{loading ? <><span className="spinner"/>Building your flowchart…</> : <><Icon name="vision"/>Generate Flowchart</>}</button></div></section>{error && <ErrorNotice message={error} onRetry={submit}/>}<div className="output-area" aria-live="polite">{!result && !error && !loading && <div className="empty-state"><div className="empty-icon"><Icon name="vision"/></div><h2>Your visual flowchart will appear here</h2><p>Enter a topic or use extracted notes to create a structured diagram.</p></div>}{result && <section className="result-panel diagram-result"><div className="result-heading"><div><span className="section-kicker">Generated flowchart</span><h2>{result.title}</h2></div><ModelBadge/></div><MermaidDiagram code={result.diagram_code}/><article className="diagram-explanation"><h3>Explanation</h3><div className="explanation-text"><MarkdownContent content={result.explanation}/></div></article></section>}</div></div>;
}

function HistoryPanel({ entries, onClose, onOpen, onDelete, onClear }) {
  return <div className="history-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><aside className="history-panel" role="dialog" aria-modal="true" aria-labelledby="history-title"><div className="history-header"><div><span className="section-kicker">Saved on this device</span><h2 id="history-title">Study history</h2></div><button className="icon-button" onClick={onClose} aria-label="Close history"><Icon name="close" /></button></div>{entries.length === 0 ? <div className="history-empty"><Icon name="history"/><strong>No study history yet</strong><p>Your successful generations will appear here.</p></div> : <><div className="history-actions"><span>{entries.length} {entries.length === 1 ? "request" : "requests"}</span><button onClick={onClear}>Clear all</button></div><div className="history-list">{entries.map((entry) => { const feature = HISTORY_FEATURES[entry.feature] || { label: "Saved result", icon: "history" }; return <article className="history-item" key={entry.id}><button className="history-open" onClick={() => onOpen(entry)}><span className={`history-type ${entry.feature}`}><Icon name={feature.icon}/>{feature.label}</span><strong>{entry.prompt}</strong><small>{new Date(entry.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</small></button><button className="history-delete" onClick={() => onDelete(entry.id)} aria-label={`Delete ${feature.label} history item`}><Icon name="trash"/></button></article>; })}</div></>}</aside></div>;
}

function loadHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem("study-assistant-history"));
    return Array.isArray(saved) ? saved : [];
  } catch { return []; }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("explain");
  const [text, setText] = useState("");
  const [numberOfCards, setNumberOfCards] = useState(5);
  const [numberOfQuestions, setNumberOfQuestions] = useState(5);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [explanation, setExplanation] = useState("");
  const [flashcards, setFlashcards] = useState([]);
  const [quiz, setQuiz] = useState([]);
  const [history, setHistory] = useState(loadHistory);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState(null);
  const [flowchartSeed, setFlowchartSeed] = useState("");
  const hasResult = activeTab === "explain" ? explanation : activeTab === "flashcards" ? flashcards.length : activeTab === "quiz" ? quiz.length : false;

  useEffect(() => {
    try { localStorage.setItem("study-assistant-history", JSON.stringify(history)); }
    catch { /* History is optional if browser storage is unavailable. */ }
  }, [history]);

  function addHistory(feature, prompt, result) {
    setHistory((old) => [{ id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, feature, prompt, result, createdAt: new Date().toISOString() }, ...old].slice(0, 30));
  }

  function openHistoryEntry(entry) {
    if (!HISTORY_FEATURES[entry.feature]) return;
    setActiveTab(entry.feature); setError(""); setSelectedHistoryEntry(entry);
    if (["explain", "flashcards", "quiz"].includes(entry.feature)) setText(entry.prompt || "");
    if (entry.feature === "explain") setExplanation(entry.result);
    if (entry.feature === "flashcards") setFlashcards(entry.result);
    if (entry.feature === "quiz") setQuiz(entry.result);
    setHistoryOpen(false);
  }

  async function submit(feature = activeTab) {
    if (!text.trim()) { setError("Add some study material before generating a result."); return; }
    setLoading(true); setError("");
    try {
      if (feature === "explain") { const data = await explainText(text.trim()); setExplanation(data.explanation); addHistory(feature, text.trim(), data.explanation); }
      if (feature === "flashcards") { const data = await generateFlashcards(text.trim(), numberOfCards); setFlashcards(data.flashcards); addHistory(feature, text.trim(), data.flashcards); }
      if (feature === "quiz") { const data = await generateQuiz(text.trim(), numberOfQuestions); setQuiz(data.questions); addHistory(feature, text.trim(), data.questions); }
    } catch (err) { setError(err.message || "The local AI service could not be reached."); }
    finally { setLoading(false); }
  }
  function changeTab(tab) { setActiveTab(tab); setError(""); setSelectedHistoryEntry(null); }
  function createFlowchartFromNotes(extractedText) { setFlowchartSeed(extractedText); setSelectedHistoryEntry(null); setActiveTab("diagram"); setError(""); window.scrollTo({ top: 0, behavior: "smooth" }); }
  const count = activeTab === "flashcards" ? numberOfCards : numberOfQuestions;
  const setCount = activeTab === "flashcards" ? setNumberOfCards : setNumberOfQuestions;

  return (
    <div className="app-shell">
      <header className="site-header"><div className="header-inner"><a className="brand" href="#top" aria-label="AI Study Assistant home"><span className="brand-mark">S</span><span><strong>AI Study Assistant</strong><small>Powered by multiple local Ollama models</small></span></a><div className="header-actions"><button className="history-button" onClick={() => setHistoryOpen(true)}><Icon name="history"/><span>History</span>{history.length > 0 && <b>{history.length}</b>}</button><span className="privacy-badge"><i/>Private · Local AI</span></div></div></header>
      <main id="top" className="workspace">
        <section className="intro"><span className="overline">A quieter way to study</span><h1>Turn your notes into <em>understanding.</em></h1><p>Study difficult ideas and solve coding tasks without your material leaving your device.</p></section>
        <ModelOverview activeTool={activeTab} onSelect={changeTab}/>
        {["explain", "flashcards", "quiz"].includes(activeTab) && <>
          <nav className="feature-tabs" aria-label="Study tools">{Object.entries(FEATURES).map(([key, feature]) => <button key={key} className={activeTab === key ? "active" : ""} onClick={() => changeTab(key)} disabled={loading}><Icon name={key}/><span><strong>{feature.label}</strong><small>{feature.eyebrow}</small></span></button>)}</nav>
          <div className="active-model-row"><span>Study workspace</span><ModelBadge/></div>
          <section className="composer"><div className="field-heading"><label htmlFor="material">Your study material</label><button className="clear-button" onClick={() => { setText(""); setError(""); }} disabled={!text || loading}><Icon name="trash"/>Clear</button></div><textarea id="material" value={text} disabled={loading} onChange={(event) => { setText(event.target.value); if (error) setError(""); }} placeholder="Paste a lecture excerpt, textbook passage, class notes, or any topic you want to work through…"/><div className="composer-footer"><span className="character-count">{text.length.toLocaleString()} characters</span><div className="action-group">{activeTab !== "explain" && <label className="count-control"><span>{activeTab === "flashcards" ? "Cards" : "Questions"}</span><input type="number" min="1" max="10" value={count} disabled={loading} onChange={(e) => setCount(Math.min(10, Math.max(1, Number(e.target.value) || 1)))}/></label>}<button className="primary-button" disabled={loading || !text.trim()} onClick={() => submit()}>{loading ? <><span className="spinner"/>{FEATURES[activeTab].loading}</> : <>{FEATURES[activeTab].action}<Icon name="arrow"/></>}</button></div></div></section>
          {error && <ErrorNotice message={error} onRetry={() => submit()}/>}<div className="output-area" aria-live="polite">{!hasResult && !loading && !error && <EmptyState feature={activeTab}/>} {activeTab === "explain" && explanation && <Explanation value={explanation}/>} {activeTab === "flashcards" && flashcards.length > 0 && <Flashcards cards={flashcards}/>} {activeTab === "quiz" && quiz.length > 0 && <Quiz questions={quiz}/>}</div>
        </>}
        {activeTab === "code" && <CodeAssistant historyEntry={selectedHistoryEntry} onHistoryAdd={addHistory}/>}
        {activeTab === "vision" && <VisionNotes historyEntry={selectedHistoryEntry} onCreateFlowchart={createFlowchartFromNotes} onHistoryAdd={addHistory}/>} 
        {activeTab === "diagram" && <FlowchartGenerator historyEntry={selectedHistoryEntry} initialText={flowchartSeed} onHistoryAdd={addHistory}/>} 
      </main>
      <footer><span>Built for focused learning</span><span>Your notes stay on this device</span></footer>
      {historyOpen && <HistoryPanel entries={history} onClose={() => setHistoryOpen(false)} onOpen={openHistoryEntry} onDelete={(id) => setHistory((old) => old.filter((entry) => entry.id !== id))} onClear={() => { if (window.confirm("Clear all saved study history?")) setHistory([]); }}/>} 
    </div>
  );
}
