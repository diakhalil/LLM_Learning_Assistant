import json

from fastapi import APIRouter, HTTPException

from app.ollama_client import generate_code_response
from app.schemas import CodeRequest, CodeResponse


router = APIRouter()


@router.post("/code", response_model=CodeResponse)
def code(request: CodeRequest) -> CodeResponse:
    task = request.task.lower().strip()
    language = request.programming_language or "the appropriate programming language"

    if task == "generate":
        task_instruction = (
            f"Generate clean and readable {language} code for the user's request."
        )
    elif task == "explain":
        task_instruction = (
            f"Explain the following {language} code clearly and step by step."
        )
    elif task == "debug":
        task_instruction = (
            f"Find and fix the errors in the following {language} code."
        )
    elif task == "improve":
        task_instruction = (
            f"Improve the following {language} code while preserving its behavior."
        )
    else:
        raise HTTPException(
            status_code=400,
            detail="Task must be generate, explain, debug, or improve.",
        )

    prompt = f"""
You are an expert software engineer.

Task:
{task_instruction}

User input:
{request.input}

Return only valid JSON using exactly this structure:

{{
  "generated_code": "the generated, corrected, or improved code",
  "explanation": "a clear explanation of the result"
}}

Rules:
- Return valid JSON only.
- Do not use Markdown code fences.
- Do not include text before or after the JSON.
- Escape newline characters correctly inside JSON strings.
"""

    try:
        raw_response = generate_code_response(prompt).strip()

        if raw_response.startswith("```json"):
            raw_response = raw_response[7:]

        if raw_response.startswith("```"):
            raw_response = raw_response[3:]

        if raw_response.endswith("```"):
            raw_response = raw_response[:-3]

        parsed_response = json.loads(raw_response.strip())

        generated_code = parsed_response["generated_code"].splitlines()
        # splits the string at every newline (\n) and returns a list

        return CodeResponse(
            generated_code=generated_code,
            explanation=parsed_response["explanation"],
        )

    except json.JSONDecodeError as error:
        raise HTTPException(
            status_code=500,
            detail="The coding model returned an invalid JSON response.",
        ) from error

    except RuntimeError as error:
        raise HTTPException(
            status_code=503,
            detail=str(error),
        ) from error