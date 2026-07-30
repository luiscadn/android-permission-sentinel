import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report
import joblib
import os

def main():
    df = pd.read_csv('train.csv', sep=';')
    X = df.drop(columns=['type'])
    y = df['type']
    
    feature_columns = list(X.columns)
    os.makedirs('backend', exist_ok=True)
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    clf = RandomForestClassifier(n_estimators=100, random_state=42)
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    print("Accuracy:", accuracy_score(y_test, y_pred))
    print(classification_report(y_test, y_pred))
    
    joblib.dump(clf, 'backend/malware_model.joblib')
    joblib.dump(feature_columns, 'backend/model_features.joblib')

if __name__ == "__main__":
    main()
