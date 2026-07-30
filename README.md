# Android Sentinel - Permission Risk Analyzer

## Description
This project is an end-to-end Machine Learning cybersecurity application designed to evaluate Android APK manifest permissions and classify applications as either **Benign** or **Malware**.

It was built as part of my initial cybersecurity and applied machine learning research at Universidad ICESI.

## Architecture
- **Machine Learning Engine**: Random Forest Classifier trained on Android manifest permission vectors, achieving an accuracy of **91.25%**.
- **Backend API**: Asynchronous RESTful service built with FastAPI (`Python`).
- **Frontend Interface**: Modern, responsive web application built with React and Vite.

## Project Structure
```text
.
├── backend/            # FastAPI REST API & Saved ML Model
│   ├── main.py
│   ├── malware_model.joblib
│   └── model_features.joblib
├── frontend/           # React + Vite Web Application
│   ├── src/
│   ├── package.json
│   └── vite.config.js
├── train.csv           # Android Permission Dataset
├── train_model.py      # ML Model Training Script
└── README.md
```

## Getting Started

### 1. Requirements
- Python 3.9+
- Node.js 18+

### 2. Backend Setup
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python3 train_model.py
cd backend
uvicorn main:app --reload
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.
