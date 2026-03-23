import pandas as pd
from sklearn.preprocessing import MinMaxScaler

df = pd.read_csv("data/cleaned_data.csv")

# Normalize important columns
cols = [
    'strength_final',
    'weight_capacity_final',
    'co2_emission_final',
    'recyclability_final',
    'cost_per_kg_final',
    'biodegradability_score'
]

scaler = MinMaxScaler()
df[cols] = scaler.fit_transform(df[cols])

# Feature Engineering
df['co2_impact_index'] = 1 - df['co2_emission_final']
df['cost_efficiency_index'] = 1 - df['cost_per_kg_final']

df['material_suitability_score'] = (
    0.25 * df['strength_final'] +
    0.20 * df['weight_capacity_final'] +
    0.20 * df['recyclability_final'] +
    0.15 * df['biodegradability_score'] +
    0.10 * df['cost_efficiency_index'] +
    0.10 * df['co2_impact_index']
)

df.to_csv("data/feature_engineered.csv", index=False)

print("✅ Feature engineering done")