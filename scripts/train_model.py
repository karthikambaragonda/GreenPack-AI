import pandas as pd
import numpy as np
import os
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score, accuracy_score, classification_report
from xgboost import XGBRegressor
import joblib

# ==============================
# 🔹 Load BALANCED dataset
# ==============================
df = pd.read_csv("data/balanced_dataset.csv")
df['cost_proxy'] = (
    0.4 * df['strength_final'] +
    0.3 * df['weight_capacity_final'] -
    0.2 * df['recyclability_final'] -
    0.1 * df['biodegradability_score']
)

# ==============================
# 🔹 Features
# ==============================
features = [
    'strength_final',
    'weight_capacity_final',
    'recyclability_final',
    'biodegradability_score'
]

X = df[features]

# ==============================
# 🎯 Targets
# ==============================
y_cost = df['cost_proxy']              # already created
y_co2 = df['co2_emission_final']
y_class = df['cost_category']

# ==============================
# 🔹 Train-Test Split (Regression)
# ==============================
X_train, X_test, y_cost_train, y_cost_test = train_test_split(
    X, y_cost, test_size=0.2, random_state=42
)

_, _, y_co2_train, y_co2_test = train_test_split(
    X, y_co2, test_size=0.2, random_state=42
)

# ==============================
# 🤖 Regression Models
# ==============================
rf = RandomForestRegressor(n_estimators=200, max_depth=10, random_state=42)
rf.fit(X_train, y_cost_train)

xgb = XGBRegressor()
xgb.fit(X_train, y_co2_train)

# ==============================
# 🔹 Predictions
# ==============================
pred_cost = rf.predict(X_test)
pred_co2 = xgb.predict(X_test)

# ==============================
# 🔹 Evaluation
# ==============================
def evaluate(y_true, y_pred):
    print("MAE:", mean_absolute_error(y_true, y_pred))
    print("RMSE:", np.sqrt(mean_squared_error(y_true, y_pred)))
    print("R2 Score:", r2_score(y_true, y_pred))

print("\n📊 Cost Model (Using Proxy)")
evaluate(y_cost_test, pred_cost)

print("\n📊 CO2 Model")
evaluate(y_co2_test, pred_co2)

# ==============================
# ✅ Classification (Balanced Dataset)
# ==============================
X_train_c, X_test_c, y_train_c, y_test_c = train_test_split(
    X,
    y_class,
    test_size=0.2,
    random_state=42,
    stratify=y_class   # still good practice
)

clf = RandomForestClassifier(n_estimators=100, random_state=42)
clf.fit(X_train_c, y_train_c)

pred_class = clf.predict(X_test_c)

print("\n📊 Cost Classification Model (Balanced Dataset)")
print("Accuracy:", accuracy_score(y_test_c, pred_class))
print("\nClassification Report:\n", classification_report(y_test_c, pred_class))

# ==============================
# 💾 Save Models
# ==============================
print("\nSaving models to:", os.getcwd())

os.makedirs("models", exist_ok=True)

joblib.dump(rf, "models/cost_model.pkl")
joblib.dump(xgb, "models/co2_model.pkl")
joblib.dump(clf, "models/cost_classifier.pkl")

print("\n✅ Models saved successfully")

# ==============================
# 🏆 Recommendation System
# ==============================
df['predicted_cost'] = rf.predict(X)
df['predicted_co2'] = xgb.predict(X)

df['final_score'] = (
    0.4 * (1 - df['predicted_co2']) +
    0.3 * (1 - df['predicted_cost']) +
    0.3 * df['sustainability_score']
)

top5 = df.sort_values(by='final_score', ascending=False)
top5 = top5.drop_duplicates(subset='material_name').head(5)

print("\n🏆 Top 5 Recommended Materials:")
print(top5[['material_name', 'final_score']])