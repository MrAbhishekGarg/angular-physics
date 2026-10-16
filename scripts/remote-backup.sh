#!/bin/bash
# Runs ON THE VPS. Dumps MongoDB (via the official mongo image, hitting
# Atlas over the network — no local DB to touch) and archives the uploaded
# files, staged under /home/deploy/backups/<date>/ for the local machine to
# pull down over rsync. Keeps only the latest 3 staged dumps on the VPS
# itself so this never silently eats server disk.
set -e

STAMP=$(date +%F_%H%M%S)
STAGE_ROOT=/home/deploy/backups
STAGE_DIR="$STAGE_ROOT/$STAMP"
APP_DIR=/home/deploy/angular-physics/backend

mkdir -p "$STAGE_DIR"

MONGO_URI=$(grep -m1 '^MONGODB_URI=' "$APP_DIR/.env" | cut -d= -f2-)
if [ -z "$MONGO_URI" ]; then
  echo "MONGODB_URI not found in $APP_DIR/.env" >&2
  exit 1
fi

# Scoped to the app's real databases — an unscoped dump also pulls in
# Atlas's bundled sample_mflix demo dataset (~25k irrelevant documents).
# "test" is the live app data (Mongoose's default db name when none is
# given in the URI); "angular-physics" is a small early/leftover db kept
# here just in case it still matters.
for DB in test angular-physics; do
  docker run --rm --user "$(id -u):$(id -g)" --entrypoint mongodump \
    -v "$STAGE_DIR":/backup \
    mongo:7 \
    --uri="$MONGO_URI" --db="$DB" --out=/backup/mongodump
done

tar -czf "$STAGE_DIR/uploads.tar.gz" -C "$APP_DIR" uploads secure-uploads

cp "$APP_DIR/.env" "$STAGE_DIR/backend.env"

echo "$STAGE_DIR"

# Prune staged backups on the VPS itself, keep the 3 most recent.
cd "$STAGE_ROOT"
ls -1dt */ 2>/dev/null | tail -n +4 | xargs -r rm -rf
