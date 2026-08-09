Angular Physics — Logo Assets
==============================

WHAT'S HERE
-----------
logo-wordmark-black.svg / .pdf   Full "ANGULAR PHYSIX" lockup, black — for light backgrounds
logo-wordmark-white.svg / .pdf   Same lockup, white — for dark backgrounds
logo-icon-black.svg / .pdf       Circle+X mark only, black circle — for square/favicon use
logo-icon-white.svg / .pdf       Circle+X mark only, white circle — for dark backgrounds
logo-full-tagline-black.png      Full lockup + "UNLOCKING THE INNER POTENTIAL" tagline, black
logo-full-tagline-white.png      Same, white

The SVG and PDF files are TRUE VECTOR ART — traced from your original PNG
logo (color-separated: black layer, magenta layer, white accent layer),
not just an embedded raster image. They scale to any size with zero loss
of quality, and are fully editable (paths, not pixels).

The two tagline PNGs are NOT vectorized — the watercolor swirl behind the
tagline has soft, painterly color blending that doesn't reduce cleanly to
flat vector shapes the way the bold wordmark and icon do. If you need
those vectorized too, share the original design file (the one used to
create the PNG) and I can trace it, though a swirl like that is usually
better kept as a raster/photo effect even in a vector artwork.

GETTING A .CDR FILE
--------------------
I can't generate a genuine CorelDRAW (.cdr) file directly — that's a
proprietary format with no available library or tool to write it, and I
don't have CorelDRAW installed. To get a .cdr:

  1. Open CorelDRAW.
  2. File > Import, and pick either the .svg or .pdf version here
     (both bring in real editable vector paths, not a flattened image).
  3. File > Save As > CorelDRAW (.cdr).

That's the standard workflow for bringing outside vector art into
CorelDRAW regardless of the original source — there's no format that
skips this step.

WHERE THESE ARE USED ON THE SITE
---------------------------------
frontend/src/assets/logo-wordmark-black.svg   -> header logo (light background)
frontend/src/assets/logo-wordmark-white.svg   -> footer logo (dark background)
frontend/src/assets/logo-icon-black.svg       -> source for favicon.ico / favicon.svg / apple-touch-icon
frontend/public/favicon.svg                   -> browser tab icon
frontend/public/favicon.ico                   -> browser tab icon (legacy browser fallback)
frontend/public/apple-touch-icon.png          -> iOS "Add to Home Screen" icon
frontend/public/og-image.png                  -> social share preview card (Facebook/Twitter/WhatsApp link previews)
frontend/public/logo-social.png               -> Google structured-data organization logo
