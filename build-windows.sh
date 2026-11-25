#!/usr/bin/env bash
# Build dist/Sundrift.exe (Windows 11 x64) from Linux with Node's single-executable feature.
# Needs: node (same major as the target), curl, python3, npx. Output: dist/Sundrift.exe (~80 MB).
set -euo pipefail
cd "$(dirname "$0")"
NODE_VER="v$(node -p 'process.versions.node')"   # the blob must come from the same Node version as the .exe
WIN_NODE="build/node-$NODE_VER-win-x64.exe"
mkdir -p build dist

if [ ! -f "$WIN_NODE" ]; then
  echo "Downloading Windows node.exe $NODE_VER ..."
  curl -fsSL -o "$WIN_NODE" "https://nodejs.org/dist/$NODE_VER/win-x64/node.exe"
fi
echo "Verifying checksum ..."
want=$(curl -fsSL "https://nodejs.org/dist/$NODE_VER/SHASUMS256.txt" | awk '$2=="win-x64/node.exe"{print $1}')
echo "$want  $WIN_NODE" | sha256sum -c -

echo "Building app blob ..."
node --experimental-sea-config sea-config.json

cp "$WIN_NODE" dist/Sundrift.exe
python3 -I tools/strip-signature.py dist/Sundrift.exe
npx --yes postject@1.0.0-alpha.6 dist/Sundrift.exe NODE_SEA_BLOB build/sea-prep.blob \
  --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
( cd dist && sha256sum Sundrift.exe > Sundrift.exe.sha256 )
ls -la dist/
