from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers.explain import router as explain_router
from app.routers.flashcards import router as flashcards_router
from app.routers.quiz import router as quiz_router
from app.routers.code import router as code_router
from app.routers.vision_notes import router as vision_router
from app.routers.diagram import router as diagram_router


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def read_root():
    return {"message": "AI Study Assistant API is running"}


app.include_router(explain_router)
app.include_router(flashcards_router)
app.include_router(quiz_router)
app.include_router(code_router)
app.include_router(vision_router)
app.include_router(diagram_router)
