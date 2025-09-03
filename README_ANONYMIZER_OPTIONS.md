# Anonymizer Options

## Default: Python batch cropper
- Script: `src/batch-crop-usdt-pairs-v2.py`
- Input: Directory containing 1920x1080 TradingView PNGs
- Output: Writes `*_cropped.png` alongside originals (1440x850)

Run:
```bash
python3 src/batch-crop-usdt-pairs-v2.py /path/to/originals
```

The orchestrator `src/workflow/run-workflow.ts` calls this script in Step 3.

## Optional: Node (sharp) single-coin flow
- Script: `src/workflow/live-final-one.ts`
- What it does: Captures 1920x1080, crops to 1440x850 with `sharp`, creates a pseudonym copy, and runs AI analysis

Run:
```bash
ts-node src/workflow/live-final-one.ts
```

Notes:
- Both Python and Node produce the same 1440x850 anonymized dimensions (left 40, right 440, top 130, bottom 100).
- Keep Python as the default for batch anonymization; use the Node route for single-coin experiments.
