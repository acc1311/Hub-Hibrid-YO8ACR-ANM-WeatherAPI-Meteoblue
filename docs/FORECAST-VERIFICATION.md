# FORECAST-VERIFICATION.md

`src/weather/verification.js` + `src/verification/model-skill.js` + `src/verification/dynamic-weighting.js`.

Compară `forecast vs ANM observed` pe istoric:

- `MAE`, `RMSE`, `bias`, `correlation`, `Brier` (pentru prob), `reliability`.
- `VerificationStore` + `ModelSkillDB` (`localStorage hub_model_skill_v1`) per `model|loc|param|horizon`.
- `skill = max(0, 100 - MAE*8)` → `weightsFor()` normalize.
- `dynamicWeights()` blend `base 60% + skill 40%`, flatten dacă `spread>5`.

Folosit de `WeatherDecisionEngine.rankSources()` pentru `location-aware weighting`.

Ex: `ICON-EU Iași 0-24h temp MAE 0.82°C → skill 93`.
