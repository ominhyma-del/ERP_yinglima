from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

app = FastAPI(
    title="Enterprise ERP AI Sidecar Service",
    description="FastAPI AI Assistant for ERP Procurement, Consignment Optimization & Analytics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ProcurementAnalysisRequest(BaseModel):
    consignment_code: str
    company_id: str
    items: List[dict]

@app.get("/")
def read_root():
    return {"status": "online", "service": "ERP AI Sidecar Assistant"}

@app.post("/api/v1/ai/analyze-consignment")
def analyze_consignment(request: ProcurementAnalysisRequest):
    total_items = len(request.items)
    return {
        "consignment_code": request.consignment_code,
        "recommendation": "Consignment optimization score: 94%. Packing efficiency is optimal for 40ft High Cube Container.",
        "risk_alerts": [
            "Ensure phytosanitary certificates are attached for citric acid items before shipping."
        ],
        "estimated_lead_time_days": 24,
    }
