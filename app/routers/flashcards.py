from fastapi import APIRouter, HTTPException
from app.schemas import FlashcardsRequest, FlashcardsResponse
from app.ollama_client import generate_response
import json

router = APIRouter()

@router.post("/flashcards", response_model=FlashcardsResponse)
def create_flashcards(request: FlashcardsRequest) -> FlashcardsResponse:
    prompt = f"""
Generate {request.number_of_cards} high-quality educational flashcards for the following study material:

{request.text}

Each flashcard should contain a question and an answer.

Return ONLY valid JSON.

Use exactly this structure:

{{
  "flashcards": [
    {{
      "question": "Question 1",
      "answer": "Answer 1"
    }}
  ]
}}
"""
 
    try:
        response = generate_response(prompt=prompt)
        print("RAW MODEL RESPONSE:", repr(response))
        cleaned_response = response.strip()

        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]

        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()

        json_response = json.loads(cleaned_response)
        # convert the string into json -> python dict

        if "flashcards" in json_response:
            # check the key of the dict
            return FlashcardsResponse(**json_response)
            # unpack the dict into keyword arguments
            # FlashcardsResponse(flashcards=json_response["flashcards"])

        else:
            raise HTTPException(status_code=400, detail="Invalid JSON response")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))