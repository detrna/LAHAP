# Liquid Stock Level Estimation: Multi-Bottle Test Set

Test images for a kitchen feature that looks at a photo of bottles (cooking oil, drinking water) and reports how many bottles of stock are left, rounded up to a whole bottle.

## How the count works

1. Estimate how full each visible bottle is.
2. Add the fill levels together, so one full bottle = 1.0 and a half-full bottle = 0.5.
3. Round the total **up** to a whole number. That becomes `quantity`.

Example from the kitchen workflow:

| Time | Bottles in photo | Exact stock | Reported `quantity` |
|---|---|---|---|
| Start of day | 5 full | 5.0 | 5 |
| End of day | 3 full + 1 half | 3.5 | **4** |

`scenes/oil_scene_01_5bottles.png` (start of day) and `scenes/oil_scene_3full_1half.png` (end of day) reproduce this example.

## Expected output format

```ts
interface StockLevelEstimateOutput {
  item: { name: string; quantity: number; unit: string };
}

// e.g. end-of-day oil photo
const expected: StockLevelEstimateOutput = {
  item: { name: "Cooking Oil", quantity: 4, unit: "bottle" },
};
```

`labels.json` contains one entry per scene. Its `expected_output` field follows the interface above. The other fields are for debugging and are not part of the interface.

| Field | Meaning |
|---|---|
| `file` | Image path inside this folder |
| `liquid` | `oil` or `water` |
| `bottles_visible` | Number of bottles in the frame, including empty ones |
| `fill_levels_percent` | Fill of each bottle: 0, 25, 50, 75 or 100 |
| `exact_total_bottles` | Sum of the fill levels, before rounding |
| `source` | `original` (real crop from your sheet) or `composited` (see below) |
| `expected_output` | Ground-truth `StockLevelEstimateOutput` |

For the rounding step, work in integer percentages (`Math.ceil(sumPercent / 100)`) rather than summing decimals like 0.1 + 0.2, which avoids floating-point surprises right at a boundary such as exactly 4.0.

## Folder contents

- `scenes/`: 22 multi-bottle test images (11 oil, 11 water), the main test set.
- `reference_singles/`: the 10 single-bottle images at 0, 25, 50, 75 and 100% for oil and water. Use them to calibrate or sanity-check single-bottle fill estimates.
- `labels.json`: ground truth for every scene.

## What the scenes cover

| Case | Why it matters | Example |
|---|---|---|
| All full | Baseline, no rounding | `oil_scene_01_5bottles` (5.0 → 5) |
| Fractional total rounds up | The core rule | `oil_scene_3full_1half` (3.5 → 4) |
| Tiny remainder rounds up | 2.25 should become 3 | `water_scene_2full_1quarter` (2.25 → 3) |
| Exact whole total from partial bottles | Must not round up | `oil_scene_06_4bottles` (3.0 → 3) |
| Total under one bottle | 0.5 or 0.75 becomes 1 | `water_scene_07_2bottles` (0.5 → 1) |
| Empty bottles still in frame | Empty bottles must count as 0, not 1 | `oil_scene_08_3bottles` (1.0 → 1) |
| Everything empty | Edge case, result is 0 | `oil_scene_09_3bottles` (0.0 → 0) |
| Mixed brands and fill levels | Model can't rely on one label | `oil_scene_10_5bottles` (3.5 → 4) |

## Limitations (please read)

- **20 of the 22 scenes are composites.** They were built by stitching bottles cut from the single-bottle photos onto one row, with soft blending at the seams. Only the two `*_3full_1half` and `*_2full_1quarter` scenes are untouched crops. Composites are fine for checking counting and rounding logic, but they are not a substitute for real photos.
- **Repeated bottles are near-identical.** Because there are only five source photos per liquid, scenes with several bottles at the same fill level reuse the same bottle (with slight brightness and position jitter). A model could learn this artifact.
- **Brand variety is limited.** Full oil bottles are always Bimoli, and full water bottles are always Aqua.
- **Resolution is low** (about 250 px per source image) because everything was cut from a screenshot of a contact sheet.
- **One item type per image.** Each scene contains only oil or only water. A photo with both would need an array of items rather than a single `item`.
- **Fill levels are rough.** Labels use 25% steps, so a real bottle at, say, 60% would be ambiguous. Decide in advance how the feature should treat in-between levels.

For production validation, take real photos of the actual kitchen shelf at several stock levels and label them the same way.
