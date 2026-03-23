import pandas as pd
from sklearn.preprocessing import MinMaxScaler
import joblib

# Load your dataset
df = pd.read_csv("data/balanced_dataset.csv")

# Select SAME features used in training
features = df[['strength_final', 'weight_capacity_final',
               'recyclability_final', 'biodegradability_score']]

# Create scaler
scaler = MinMaxScaler()

# Fit scaler
scaler.fit(features)

# Save scaler
joblib.dump(scaler, "models/scaler.pkl")

print("Scaler saved successfully ✅")