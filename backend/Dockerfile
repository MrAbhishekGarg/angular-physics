FROM node:24-bookworm-slim

# ImageMagick (WMF conversion via libwmf) — used to convert legacy MathType
# equation previews and embedded pictures extracted from bulk-uploaded
# question Word docs. See src/utils/docxEmbeddedImageExtractor.js.
RUN apt-get update && apt-get install -y --no-install-recommends \
      imagemagick \
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
