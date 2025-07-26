#!/bin/bash

# PWA用のプレースホルダーアイコンを作成
# 実際のプロダクションでは適切なアイコンを用意してください

mkdir -p public/icons

# 各サイズのプレースホルダーファイルを作成
sizes=(72 96 128 144 152 192 384 512)

for size in "${sizes[@]}"
do
  echo "Creating ${size}x${size} placeholder icon..."
  touch "public/icons/icon-${size}x${size}.png"
done

# 特別なアイコンも作成
touch "public/icons/badge-72x72.png"
touch "public/icons/job-96x96.png"
touch "public/icons/event-96x96.png"

echo "Placeholder icons created successfully!"