# Local LLM Learning Assistant

## Project Overview

Local LLM Learning Assistant uses [Ollama](https://ollama.com/) to serve Qwen language and vision models locally, FastAPI for the backend API, and React with Vite for the frontend

The backend communicates with Ollama through its OpenAI-compatible chat completions API at `http://127.0.0.1:11434/v1/chat/completions`

## Features

- **explanation:** Generates a explanation from a topic, question, or block of notes
- **flashcards:** Converts study material into flashcards.
- **quiz:** Creates multiple choice questions with answers and explanations
- **code assistant:** Generates, explains, debugs, or improves code using **Qwen2.5-coder:7b** model
- **note analysis:** Accepts an uploaded image of handwritten or printed notes and returns extracted text, a summary, and an explanation using **Qwen2.5-vl:7b** model
- **flowchart:** Converts a topic or notes into a Mermaid flowchart
- **request history:** Stores request results in the browser

## Assignment Context

- The FastAPI backend was built and refined (vibe coded) using **OpenCode** with the local **Qwen 2.5 7B** model
- The **Qwen 2.5 7B** model is used for the main features: **Explain**, **Flashcards**, **Quiz**, and **Study Flowchart**
- **Qwen 2.5 Coder 7B** model was used for the **Code Assistant** feature, which can generate, explain, debug, and improve code
- The analysis of uploaded images of handwritten notes is done by calling **Qwen 2.5 VL 7B** 
- A React frontend was added to better visualize all the features and the outputs
- The required prompting experiments (zero-shot vs. few-shot, parameter tuning, and structured JSON output) are included in `part4/notebook.ipynb`
- The required screenshots are included in the screenshots folder
- The required prompts for opencode (vibe coding) are in `prompts_to_opencode/prompts.md` file


## Project Structure

```text
assignment5_ollama/
├── app/
│   ├── main.py                 # FastAPI application, CORS configuration, and router registration
│   ├── ollama_client.py        # Requests to the local Ollama OpenAI-compatible API
│   ├── schemas.py              # Pydantic request and response models
│   └── routers/
│       ├── explain.py          # Topic explanation endpoint
│       ├── flashcards.py       # Flashcard generation endpoint
│       ├── quiz.py             # Multiple-choice quiz endpoint
│       ├── code.py             # Code assistant endpoint
│       ├── vision_notes.py     # Image-based note analysis endpoint
│       └── diagram.py          # Mermaid flowchart generation endpoint
├── frontend/
│   ├── src/
│   │   ├── App.jsx             # Main interface and feature components
│   │   ├── api.js              # Frontend requests to the FastAPI API
│   │   ├── main.jsx            # React application entry point
│   │   └── index.css           # Application styling and responsive layout
│   ├── index.html               # Frontend HTML entry point
│   ├── package.json            # Frontend dependencies and npm scripts
│   ├── package-lock.json        # Locked frontend dependency versions
│   └── vite.config.js          # Vite configuration
├── part4/
│   └── notebook.ipynb          # Prompting and parameter experiments
├── prompts to opencode/
│   ├── prompts.md              # Selected OpenCode prompts, reviews, and reflection
│   └── image*.png              # Screenshots of OpenCode outputs
├── screenshots/
│   ├── ollama_serving.png      # Ollama running locally
│   ├── opencode_connected_to_localMode1.png
│   ├── opencode_connected_to_localMode2.png
│   └── tool_running/
│       ├── fastapi/             # FastAPI endpoint screenshots
│       └── UI/                  # React application screenshots
├── package-lock.json
└── README.md
```


## Technologies Used

- Python
- FastAPI
- Uvicorn
- Pydantic
- Requests
- Ollama
- Ollama OpenAI-compatible API
- Qwen 2.5 models
  - `qwen2.5:7b`
  - `qwen2.5-coder:7b`
  - `qwen2.5vl:7b`
- React 18
- React DOM
- Vite
- JavaScript and CSS
- Mermaid
- Jupyter Notebook

## Installation

### Prerequisites

Install the following before running the project:

- Python
- Node.js and npm
- Ollama

### 1. Clone and enter the project

```powershell
git clone https://github.com/diakhalil/LLM_Learning_Assistant.git
cd assignment5_ollama
```

### 2. Install the backend dependencies
```
py -m pip install fastapi uvicorn pydantic requests python-multipart

```

`python-multipart` is required for the image upload endpoint


### 3. Start Ollama and download the models

Make sure the Ollama service is running

```powershell
ollama serve
```

download the models used by the application:

```powershell
ollama pull qwen2.5:7b
ollama pull qwen2.5-coder:7b
ollama pull qwen2.5vl:7b
```


### 4. Start the FastAPI backend

From the project root, run:

```powershell
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The API will be available at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 5. Install and start the React frontend

Open another PowerShell window and run:

```powershell
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in a browser



## API Endpoints

- **GET /**  
  returns a simple message confirming that the API is running.

- **POST /explain**  
  explains a topic

- **POST /flashcards**  
  creates flashcards from the provided content

- **POST /quiz**  
  generates mcq with the correct answers and explanations

- **POST /code**  
  generates, explains, debugs, or improves code depending on the selected task

- **POST /vision-notes**  
  accepts an uploaded image of study notes and returns the extracted text, a summary, and an explanation

- **POST /diagram**  
  generates a Mermaid flowchart, a title, and a short explanation from the given text
