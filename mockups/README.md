# Square artwork mockups

This workflow creates three photorealistic square room mockups while keeping the
artwork pixels and aspect ratio deterministic. AI is used only for the approved
empty room plates in `mockups/assets/scenes`; Sharp inserts the product, canvas
depth, restrained texture, natural-light falloff, and shadows locally.

Generate the configured pilot product:

```powershell
npm run mockups:generate -- --only life-has-no-rewind
```

Rebuild even when the source and configuration are unchanged:

```powershell
npm run mockups:generate -- --only life-has-no-rewind --force
```

After each product has an approved source/crop entry, generate every configured
canvas in one batch:

```powershell
npm run mockups:generate -- --all
```

Verify dimensions, hashes, color space, output count, and artwork ratio:

```powershell
npm run mockups:verify -- --only life-has-no-rewind
```

Outputs are written to `dist/mockups/<slug>/`, away from `dist/artwork` so the
existing artwork-library sync cannot accidentally choose a generated lifestyle
image as a source master. Each scene produces a 3000x3000 PNG master and a
1200x1200 JPEG, plus a contact sheet and a reproducibility manifest.

Add future products explicitly in `mockups/config/products.json`. Source
filenames in the artwork library are not consistent enough to guess safely.
Declare the clean front-face crop and ratio for each product; the renderer will
contain 3:2, 2:1, portrait, and square canvases without cropping or stretching.

For a vertical CapCut ad, upload one of the PNG masters to **Image to video** and
select 9:16. Ask for a restrained camera move and ambient room motion while
explicitly keeping the canvas, wording, colors, and proportions unchanged. AI
video can redraw lettering, so reject any take where the product text shifts.
