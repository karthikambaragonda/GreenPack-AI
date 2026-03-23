import pandas as pd

# Load your FINAL dataset
df = pd.read_csv("data/material_final.csv")

# Handle missing values
numeric_cols = df.select_dtypes(include=['float64', 'int64']).columns
df[numeric_cols] = df[numeric_cols].fillna(df[numeric_cols].mean())

categorical_cols = df.select_dtypes(include=['object']).columns
for col in categorical_cols:
    df[col].fillna(df[col].mode()[0], inplace=True)

# Save cleaned data
df.to_csv("data/cleaned_data.csv", index=False)

print("✅ Data cleaned successfully")