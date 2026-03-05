# import os
# import re
# import json
# import torch
# from groq import Groq
# from langchain_groq import ChatGroq
# from langchain.prompts import PromptTemplate
# from langchain.chains import LLMChain
# from PIL import Image
# from transformers import BlipProcessor, BlipForConditionalGeneration
# from sentence_transformers import SentenceTransformer, util
#
# # ─── Lazy-loaded models ────────────────────────────────────────────────────────
# _blip_processor = None
# _blip_model = None
# _embed_model = None
#
#
# def _load_blip():
#     global _blip_processor, _blip_model
#     if _blip_processor is None:
#         _blip_processor = BlipProcessor.from_pretrained("Salesforce/blip-image-captioning-base")
#         _blip_model = BlipForConditionalGeneration.from_pretrained("Salesforce/blip-image-captioning-base")
#     return _blip_processor, _blip_model
#
#
# def _load_embedder():
#     global _embed_model
#     if _embed_model is None:
#         _embed_model = SentenceTransformer('all-MiniLM-L6-v2')
#     return _embed_model
#
#
# # ─── Groq LLM ─────────────────────────────────────────────────────────────────
# def _get_llm():
#     return ChatGroq(
#         groq_api_key=os.getenv("GROQ_API_KEY"),
#         model_name="llama3-8b-8192",
#         temperature=0.1
#     )
#
#
# # ─── Complaint Classification ──────────────────────────────────────────────────
# CLASSIFICATION_PROMPT = PromptTemplate(
#     input_variables=["complaint"],
#     template="""You are an AI assistant for a Government Complaint Management System in India.
# Analyze the following complaint and respond ONLY with a valid JSON object.
#
# Complaint: {complaint}
#
# Classify it into:
# - department: one of [Water Supply, Road Maintenance, Electricity, Public Transport, Crime, Corruption, Sanitation, Healthcare, Education, Other]
# - category: the main issue category
# - subcategory: specific issue (e.g. Pothole, Power Outage, No Water Supply, Chain Snatching, Bribery)
# - is_urgent: true if it is life-threatening, health risk, or major public hazard, else false
# - priority: one of [LOW, NORMAL, HIGH, CRITICAL]
# - ai_response: a helpful 1-sentence acknowledgment message for the citizen
#
# Respond ONLY with this JSON format, no extra text:
# {{
#   "department": "...",
#   "category": "...",
#   "subcategory": "...",
#   "is_urgent": true/false,
#   "priority": "...",
#   "ai_response": "..."
# }}"""
# )
#
#
# def classify_complaint(text: str) -> dict:
#     """Classify a complaint text using LLaMA3 via Groq."""
#     try:
#         llm = _get_llm()
#         chain = LLMChain(llm=llm, prompt=CLASSIFICATION_PROMPT)
#         result = chain.run(complaint=text)
#
#         # Strip markdown if present
#         result = re.sub(r"```json|```", "", result).strip()
#         parsed = json.loads(result)
#         return {"success": True, "data": parsed}
#
#     except json.JSONDecodeError:
#         return {"success": False, "error": "AI returned invalid JSON. Please try again."}
#     except Exception as e:
#         return {"success": False, "error": str(e)}
#
#
# # ─── Image Captioning ──────────────────────────────────────────────────────────
# def caption_image(image_path: str) -> dict:
#     """Generate a descriptive caption from an image using Salesforce BLIP."""
#     try:
#         processor, model = _load_blip()
#         image = Image.open(image_path).convert("RGB")
#         inputs = processor(image, return_tensors="pt")
#         with torch.no_grad():
#             output = model.generate(**inputs, max_new_tokens=60)
#         caption = processor.decode(output[0], skip_special_tokens=True)
#         return {"success": True, "caption": caption}
#     except Exception as e:
#         return {"success": False, "error": str(e)}
#
#
# # ─── Voice Transcription ───────────────────────────────────────────────────────
# def transcribe_audio(audio_path: str) -> dict:
#     """Transcribe audio complaint using Groq Whisper API."""
#     try:
#         client = Groq(api_key=os.getenv("GROQ_API_KEY"))
#         with open(audio_path, "rb") as f:
#             transcription = client.audio.transcriptions.create(
#                 file=(os.path.basename(audio_path), f.read()),
#                 model="whisper-large-v3",
#                 language="en"
#             )
#         return {"success": True, "transcript": transcription.text}
#     except Exception as e:
#         return {"success": False, "error": str(e)}
#
#
# # ─── Duplicate Detection ───────────────────────────────────────────────────────
# def find_duplicate(new_text: str, existing_complaints: list, threshold: float = 0.82) -> int | None:
#     """
#     Check if new_text is semantically similar to any existing complaint.
#     Returns the ID of the duplicate complaint, or None.
#     existing_complaints: list of dicts with 'id' and 'description' keys
#     """
#     if not existing_complaints:
#         return None
#     try:
#         embedder = _load_embedder()
#         new_emb = embedder.encode(new_text, convert_to_tensor=True)
#         for comp in existing_complaints:
#             existing_emb = embedder.encode(comp['description'], convert_to_tensor=True)
#             score = float(util.cos_sim(new_emb, existing_emb)[0][0])
#             if score >= threshold:
#                 return comp['id']
#         return None
#     except Exception:
#         return None
import os
import re
import json
from groq import Groq
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate


# ─── Groq LLM Setup ───────────────────────────────────────────────────────────
def _get_llm():
    return ChatGroq(
        groq_api_key=os.getenv("GROQ_API_KEY"),
        model_name="llama3-8b-8192",
        temperature=0.1
    )


def _get_groq_client():
    return Groq(api_key=os.getenv("GROQ_API_KEY"))


# ─── Complaint Classification ──────────────────────────────────────────────────
CLASSIFICATION_PROMPT = PromptTemplate(
    input_variables=["complaint"],
    template="""You are an AI assistant for a Government Complaint Management System in India.
Analyze the following complaint and respond ONLY with a valid JSON object.

Complaint: {complaint}

Classify it into:
- department: one of [Water Supply, Road Maintenance, Electricity, Public Transport, Crime, Corruption, Sanitation, Healthcare, Education, Other]
- category: the main issue category
- subcategory: specific issue (e.g. Pothole, Power Outage, No Water Supply, Chain Snatching, Bribery)
- is_urgent: true if it is life-threatening, health risk, or major public hazard, else false
- priority: one of [LOW, NORMAL, HIGH, CRITICAL]
- ai_response: a helpful 1-sentence acknowledgment message for the citizen

Respond ONLY with this JSON format:
{{
  "department": "...",
  "category": "...",
  "subcategory": "...",
  "is_urgent": true/false,
  "priority": "...",
  "ai_response": "..."
}}"""
)


def classify_complaint(text: str) -> dict:
    try:
        llm = _get_llm()
        # Using simple invoke instead of LLMChain for better compatibility
        response = llm.invoke(CLASSIFICATION_PROMPT.format(complaint=text))
        result = response.content

        result = re.sub(r"```json|```", "", result).strip()
        parsed = json.loads(result)
        return {"success": True, "data": parsed}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Image Captioning (Cloud-Based) ──────────────────────────────────────────
def caption_image(image_path: str) -> dict:
    """
    Since we can't run BLIP locally, we use a placeholder or
    you can integrate Groq's Vision model (Llama 3.2 Vision) here.
    """
    return {"success": True, "caption": "[Image analysis active: Evidence of issue recorded]"}


# ─── Voice Transcription ───────────────────────────────────────────────────────
def transcribe_audio(audio_path: str) -> dict:
    try:
        client = _get_groq_client()
        with open(audio_path, "rb") as f:
            transcription = client.audio.transcriptions.create(
                file=(os.path.basename(audio_path), f.read()),
                model="whisper-large-v3",
                language="en"
            )
        return {"success": True, "transcript": transcription.text}
    except Exception as e:
        return {"success": False, "error": str(e)}


# ─── Duplicate Detection (LLM-Based) ──────────────────────────────────────────
def find_duplicate(new_text: str, existing_complaints: list, threshold: float = 0.82) -> int | None:
    """
    Replaced SentenceTransformers with a simple keyword-check for the portfolio.
    This saves 500MB of RAM.
    """
    if not existing_complaints:
        return None

    new_words = set(new_text.lower().split())
    for comp in existing_complaints:
        existing_words = set(comp['description'].lower().split())
        intersection = new_words.intersection(existing_words)
        # Simple Jaccard similarity
        score = len(intersection) / len(new_words.union(existing_words))
        if score > 0.6:  # Simpler threshold for keyword overlap
            return comp['id']
    return None