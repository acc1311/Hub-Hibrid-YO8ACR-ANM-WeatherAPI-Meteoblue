# YO8ACR Weather Hub v2.4 — Upgrade Audit

## Implemented in this release

- Robust MAD-based outlier detection in the fusion engine.
- Hard rejection of extreme scalar outliers for safety-sensitive continuous fields.
- Robust weighted temperature fusion (Huber-like reweighting) instead of ordinary mean.
- Explicit provenance fields for fusion method and robust outlier method.
- Persistent browser Model Skill database with metric-based skill scoring.
- Verification store persistence using localStorage, with MAE/RMSE/Bias/Correlation/Brier support.
- Dynamic weighting now consumes model skill and provider health when supplied.
- Weather Decision Engine can consume the persistent skill database.
- Official ANM nowcasting bridge via the public ANM nowcasting page, clearly marked `official-nowcasting`.
- ANM provider exposes `getNowcasting()` / `fetchNowcastingNormalized()`.
- Developer globals expose fusion, model-skill and verification diagnostics.
- Node smoke test added for core weather-engine logic.

## Important operational note

The ANM website currently lists separate public products for Starea Vremii API, Avertizări NowCasting API, Avertizări Generale API and Prognoza Orașe API. This repository does **not** invent an undocumented API path. The `/api/anm/nowcasting` Worker route therefore mirrors the current public ANM nowcasting page and labels the result as official ANM nowcasting. If ANM provides a documented machine-readable endpoint for this product, replace the bridge with the documented endpoint while keeping the normalized schema unchanged.

## Remaining recommended work

1. Connect the modular fusion output into every legacy weather rendering path, rather than exposing it only as a compatibility/diagnostics layer.
2. Add persistent forecast archives outside browser localStorage for multi-user/regional model-skill learning.
3. Add integration tests against recorded provider fixtures.
4. Add real ANM city-forecast adapter when the permitted machine-readable product is confirmed.
5. Replace the coarse Romania bounding box with a maintained country polygon for exact `ANM_FIRST` region detection.
