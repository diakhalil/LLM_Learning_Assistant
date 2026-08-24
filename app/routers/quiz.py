from fastapi import APIRouter, HTTPException
from app.schemas import QuizRequest, Question, QuizResponse
from app.ollama_client import generate_response
import json

router = APIRouter()

@router.post("/quiz", response_model=QuizResponse)
def create_quiz(request: QuizRequest) -> QuizResponse:
    prompt = f"""
Generate {request.number_of_questions} educational multiple-choice questions based on the study material below.

Requirements:
- Test conceptual understanding whenever possible.
- Avoid duplicate questions.
- Generate exactly 4 answer choices for each question.
- Include only one correct answer.
- Include a short explanation for the correct answer.
- Return ONLY valid JSON.
- Do NOT include Markdown.
- Do NOT wrap the response inside ```json code fences.
- Do NOT add any text before or after the JSON.

The JSON must exactly follow this format:

{{
  "questions": [
    {{
      "question": "What does RAG combine?",
      "choices": [
        "Retrieval and generation",
        "Training and testing",
        "Classification and clustering",
        "Encoding and decoding"
      ],
      "correct_answer": "Retrieval and generation",
      "explanation": "RAG retrieves relevant information and uses it during generation."
    }}
  ]
}}

Study material:

{request.text}
"""
    try:
        response = generate_response(prompt=prompt)
        cleaned_response = response.strip()

        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]

        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()

        json_response = json.loads(cleaned_response)
        
        if "questions" in json_response:
            return QuizResponse(**json_response)
        else:
            raise HTTPException(status_code=400, detail="Invalid JSON response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
