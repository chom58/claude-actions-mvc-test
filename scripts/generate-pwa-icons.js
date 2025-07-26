const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');

/**
 * PWA用のアイコンを生成
 * ネオンピンクの背景に白い「HCC」テキストのシンプルなアイコン
 */
async function generatePWAIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const iconDir = path.join(__dirname, '../public/icons');
  
  // ディレクトリを作成
  await fs.mkdir(iconDir, { recursive: true });
  
  for (const size of sizes) {
    console.log(`Generating ${size}x${size} icon...`);
    
    // SVGテンプレート
    const svg = `
      <svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
        <rect width="${size}" height="${size}" fill="#FF1493"/>
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.3}px" 
              font-weight="bold" fill="white" text-anchor="middle" 
              dominant-baseline="middle">HCC</text>
      </svg>
    `;
    
    // SVGからPNGに変換
    await sharp(Buffer.from(svg))
      .png()
      .toFile(path.join(iconDir, `icon-${size}x${size}.png`));
  }
  
  // 特別なアイコンも生成
  // バッジアイコン
  const badgeSvg = `
    <svg width="72" height="72" xmlns="http://www.w3.org/2000/svg">
      <rect width="72" height="72" fill="#FF1493" rx="16"/>
      <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="24px" 
            font-weight="bold" fill="white" text-anchor="middle" 
            dominant-baseline="middle">H</text>
    </svg>
  `;
  
  await sharp(Buffer.from(badgeSvg))
    .png()
    .toFile(path.join(iconDir, 'badge-72x72.png'));
  
  // ショートカット用アイコン（求人）
  const jobSvg = `
    <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" fill="#00FFFF" rx="16"/>
      <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="40px" 
            fill="#0a0a0a" text-anchor="middle" dominant-baseline="middle">💼</text>
      <text x="50%" y="70%" font-family="Arial, sans-serif" font-size="16px" 
            fill="#0a0a0a" text-anchor="middle" dominant-baseline="middle">求人</text>
    </svg>
  `;
  
  await sharp(Buffer.from(jobSvg))
    .png()
    .toFile(path.join(iconDir, 'job-96x96.png'));
  
  // ショートカット用アイコン（イベント）
  const eventSvg = `
    <svg width="96" height="96" xmlns="http://www.w3.org/2000/svg">
      <rect width="96" height="96" fill="#00FF00" rx="16"/>
      <text x="50%" y="40%" font-family="Arial, sans-serif" font-size="40px" 
            fill="#0a0a0a" text-anchor="middle" dominant-baseline="middle">📅</text>
      <text x="50%" y="70%" font-family="Arial, sans-serif" font-size="16px" 
            fill="#0a0a0a" text-anchor="middle" dominant-baseline="middle">イベント</text>
    </svg>
  `;
  
  await sharp(Buffer.from(eventSvg))
    .png()
    .toFile(path.join(iconDir, 'event-96x96.png'));
  
  console.log('All PWA icons generated successfully!');
}

// 実行
generatePWAIcons().catch(console.error);