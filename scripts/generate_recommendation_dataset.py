import pandas as pd
from sklearn.preprocessing import MinMaxScaler

df = pd.read_csv("data/feature_engineered.csv")

# Sustainability score
df['sustainability_score'] = (
    0.2 * df['strength_final'] +
    0.15 * df['weight_capacity_final'] +
    0.2 * df['recyclability_final'] +
    0.2 * df['biodegradability_score'] -
    0.15 * df['co2_emission_final'] -
    0.1 * df['cost_per_kg_final']
)

# Normalize score
scaler = MinMaxScaler()
df['sustainability_score'] = scaler.fit_transform(df[['sustainability_score']])

df.to_csv("data/ml_ready.csv", index=False)

print("✅ ML dataset ready")