#!/usr/bin/env bash
# Regenerate the Word (.docx) version of the combined Packfora SOP.
#
# Usage:
#   ./scripts/build_sop_docs.sh
#
# Output: /mnt/documents/Packfora_SOP.docx
# Requires: pandoc

set -euo pipefail

OUT=/mnt/documents
mkdir -p "$OUT"

SRC="docs/PACKFORA_SOP.md"
DEST="$OUT/Packfora_SOP.docx"

echo "▶ $SRC → $DEST"
pandoc "$SRC" \
  --from=gfm \
  --to=docx \
  --toc \
  --toc-depth=3 \
  -o "$DEST"

echo "✓ Built $DEST"
