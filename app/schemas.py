from pydantic import BaseModel, Field
from typing import Literal

class ExplainRequest(BaseModel):
    text: str


class ExplainResponse(BaseModel):
    explanation: str


class FlashcardsRequest(BaseModel):
    text: str
    number_of_cards: int


class Flashcard(BaseModel):
    question: str
    answer: str


class FlashcardsResponse(BaseModel):
    flashcards: list[Flashcard]


class QuizRequest(BaseModel):
    text: str
    number_of_questions: int


class Question(BaseModel):
    question: str
    choices: list[str]
    correct_answer: str
    explanation: str


class QuizResponse(BaseModel):
    questions: list[Question]


class CodeRequest(BaseModel):
    input: str
    task: Literal["generate", "explain", "debug", "improve"] = Field(
        description="Available options: generate, explain, debug, improve"
    )
    programming_language: str | None = None

class CodeResponse(BaseModel):
    generated_code: list[str]
    explanation: str

class VisionNotesResponse(BaseModel):
    extracted_text: list[str]
    summary: str
    explanation: str

class DiagramRequest(BaseModel):
    text: str

class DiagramResponse(BaseModel):
    title: str
    diagram_code: str
    explanation: str
