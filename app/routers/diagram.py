import json
from fastapi import APIRouter, HTTPException, status
from app.schemas import DiagramRequest, DiagramResponse
from app.ollama_client import generate_response

router = APIRouter()


@router.post("/diagram", response_model=DiagramResponse)
def diagram(request: DiagramRequest) -> DiagramResponse:
    prompt = f"""
        Create a study flowchart from the following text:

        {request.text}

        Identify the most important concepts and organize them logically.

        Return only valid JSON using exactly this structure:

        {{
            "title": "...",
            "diagram_code": "...",
            "explanation": "..."
        }}

        Requirements:
        - diagram_code must contain valid Mermaid flowchart syntax.
        - Return the Mermaid diagram as a normal multi-line string.
        - Use actual line breaks between Mermaid statements.
        - Do not output the characters "\n".
        - Start the Mermaid diagram with flowchart TD or flowchart LR.
        - Keep the diagram clear and reasonably simple.
        - Use short labels inside the diagram nodes.
        - Explain the diagram clearly.
        - Do not use Markdown code fences.
        - Do not include any text before or after the JSON.
        """
    
   
    try:
        response = generate_response(prompt=prompt)

        cleaned_response = response.strip()

        if cleaned_response.startswith("```json"):
            cleaned_response = cleaned_response[7:]

        if cleaned_response.startswith("```"):
            cleaned_response = cleaned_response[3:]

        if cleaned_response.endswith("```"):
            cleaned_response = cleaned_response[:-3]

        cleaned_response = cleaned_response.strip()

        parsed_response = json.loads(cleaned_response)
        
        if "title" not in parsed_response or "diagram_code" not in parsed_response or "explanation" not in parsed_response:
            raise ValueError("Invalid JSON format")
        
       
        return DiagramResponse(**parsed_response)
    except (json.JSONDecodeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Failed to parse response",
        )

    except RuntimeError as error:
        print(f"Actual error: {error}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(error),
        )