from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import joblib
import pandas as pd
from typing import List
import os
import tempfile
import pyaxmlparser

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

def init_model():
    global model, feature_columns
    try:
        if os.path.exists(MODEL_PATH) and os.path.exists(FEATURES_PATH):
            model = joblib.load(MODEL_PATH)
            feature_columns = joblib.load(FEATURES_PATH)
            print("Model and features successfully loaded.")
        else:
            print(f"Model files not found in {BASE_DIR}")
    except Exception as e:
        print(f"Error loading model: {e}")

# Load immediately on import
init_model()

@app.on_event("startup")
def startup_event():
    if model is None or feature_columns is None:
        init_model()

class PredictRequest(BaseModel):
    permissions: List[str]

@app.get("/")
def read_root():
    return {
        "status": "ok",
        "model_loaded": model is not None,
        "features_loaded": feature_columns is not None
    }

@app.get("/features")
def get_features():
    if feature_columns:
        return {"features": feature_columns}
    return {"features": []}

def run_prediction(permissions_list):
    if not model or not feature_columns:
        return {"error": "Model offline"}
        
    input_data = {col: [0] for col in feature_columns}
    for perm in permissions_list:
        if perm in input_data:
            input_data[perm] = [1]
            
    df = pd.DataFrame(input_data)
    prediction = model.predict(df)[0]
    probabilities = model.predict_proba(df)[0]
    
    return {
        "prediction": int(prediction),
        "benign_probability": round(float(probabilities[0]), 4),
        "malware_probability": round(float(probabilities[1]), 4),
        "verdict": "Malware" if prediction == 1 else "Benign",
        "extracted_permissions": permissions_list
    }

@app.post("/predict")
def predict(request: PredictRequest):
    return run_prediction(request.permissions)

@app.post("/upload-apk")
async def upload_apk(file: UploadFile = File(...)):
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".apk") as temp_apk:
            temp_apk.write(await file.read())
            temp_apk_path = temp_apk.name
            
        apk = pyaxmlparser.APK(temp_apk_path)
        
        extracted = []
        try:
            extracted = apk.get_permissions()
        except Exception:
            try:
                extracted = apk.get_declared_permissions()
            except Exception:
                extracted = []
                
        if not isinstance(extracted, list):
            extracted = list(extracted)
            
        extracted = list(set(extracted))
            
        os.unlink(temp_apk_path)
        
        return run_prediction(extracted)
    except Exception as e:
        return {"error": str(e)}
