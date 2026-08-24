from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.schemas import ExplainRequest, ExplainResponse
from app.ollama_client import generate_response

router = APIRouter()

@router.post("/explain", response_model=ExplainResponse)
def explain(request: ExplainRequest):
    try:
        explanation = generate_response(request.text)
        return {"explanation": explanation}
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))