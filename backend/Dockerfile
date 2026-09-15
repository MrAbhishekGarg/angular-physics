FROM node:24-bookworm-slim

# ImageMagick (WMF conversion via libwmf) — used to convert legacy MathType
# equation previews and embedded pictures extracted from bulk-uploaded
# question Word docs. See src/utils/docxEmbeddedImageExtractor.js.
#
# libmagickcore-6.q16-6-extra is required too, even though it looks
# redundant with `imagemagick` itself — Debian splits delegate-based coders
# (WMF among them) out of the base package specifically so installing
# `imagemagick` alone does NOT register WMF. Confirmed by hand: without this
# package `convert -list format` has no WMF entry at all, regardless of
# libwmf being present.
RUN apt-get update && apt-get install -y --no-install-recommends \
      imagemagick \
      libmagickcore-6.q16-6-extra \
      libwmf-bin \
      libwmf0.2-7 \
    && rm -rf /var/lib/apt/lists/*

# Debian's default policy.xml disables several coders by default (security
# hardening) — loosen every "rights=none" coder policy rather than guessing
# which pattern covers WMF specifically.
RUN if [ -f /etc/ImageMagick-6/policy.xml ]; then \
      sed -i 's/rights="none"/rights="read|write"/g' /etc/ImageMagick-6/policy.xml; \
    fi

# Fail the build loudly if the WMF coder isn't actually registered, instead
# of discovering it's missing at a mentor's first real upload in production.
RUN convert -list format | grep -qi '^ *WMF' || (echo "ImageMagick WMF coder not available" && exit 1)

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY . .

ENV NODE_ENV=production
EXPOSE 5000
CMD ["node", "src/server.js"]
