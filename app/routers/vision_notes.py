from fastapi import APIRouter, File, UploadFile, HTTPException, status
from app.schemas import VisionNotesResponse
import json
from app.ollama_client import generate_vision_response

router = APIRouter()


@router.post("/vision-notes", response_model=VisionNotesResponse)
async def vision_notes(file: UploadFile = File(...)):
    image_bytes = await file.read()

    if not image_bytes:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type or empty file")

    
    try:
        prompt = """
            Analyze the uploaded study notes image.

            Return only valid JSON using exactly this structure:

            {
                "extracted_text": [
                    "First line",
                    "Second line",
                    "Third line"
                ],
                "summary": "...",
                "explanation": "..."
            }

            Requirements:
            - Transcribe all readable printed and handwritten text.
            - Return extracted_text as a JSON array where each element represents one line from the original notes.
            - Preserve the original line order.
            - Do not merge multiple lines into a single string.
            - Preserve important formulas, symbols, and technical terms.
            - Summarize the notes clearly.
            - Explain the main ideas in simple language.
            - Do not use Markdown code fences.
            - Do not include any text before or after the JSON.
            """
        
        response = generate_vision_response(image_bytes=image_bytes, prompt=prompt)
        
        cleaned_response = response.strip()

        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]

        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]

        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()
        parsed_response = json.loads(cleaned_response)

        if "extracted_text" not in parsed_response or "summary" not in parsed_response or "explanation" not in parsed_response:
            raise ValueError("Invalid JSON format")

        return VisionNotesResponse(**parsed_response)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Failed to parse response")
    except RuntimeError as e:
        print(f"Actual error: {e}")
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(e))