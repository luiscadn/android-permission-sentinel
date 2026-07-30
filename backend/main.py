from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from typing import List
import os

app = FastAPI(title="Android Security Inspector API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "malware_model.joblib")
FEATURES_PATH = os.path.join(BASE_DIR, "model_features.joblib")

model = None
feature_columns = None

@app.on_event("startup")
def load_model():
    global model, feature_columns
    try:
        model = joblib.load(MODEL_PATH)
        feature_columns = joblib.load(FEATURES_PATH)
    except Exception as e:
        print(f"Error loading model: {e}")

class PredictRequest(BaseModel):
    permissions: List[str]

@app.get("/")
def read_root():
    return {"status": "ok"}

@app.get("/features")
def get_features():
    if feature_columns:
        return {"features": feature_columns}
    return {"features": []}

@app.post("/predict")
def predict(request: PredictRequest):
    if not model or not feature_columns:
        return {"error": "Model offline"}
        
    input_data = {col: [0] for col in feature_columns}
    for perm in request.permissions:
        if perm in input_data:
            input_data[perm] = [1]
            
    df = pd.DataFrame(input_data)
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    
    return {
        "prediction": int(prediction),
        "benign_probability": round(float(probabilities[0]), 4),
        "malware_probability": round(float(probabilities[1]), 4),
        "verdict": "Malware" if prediction == 1 else "Benign"
    }
