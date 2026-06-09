#!/usr/bin/env node
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, '../public');
const svgPath = path.join(publicDir, 'iams-logo.svg');

// Sizes needed for iOS and PWA
const sizes = [
  { size: 192, name: 'logo-192.png', purpose: 'PWA icon (medium)' },
  { size: 192, name: 'logo-192-maskable.png', purpose: 'PWA maskable icon (medium)' },
  { size: 512, name: 'logo-512.png', purpose: 'PWA icon (large)' },
  { size: 512, name: 'logo-512-maskable.png', purpose: 'PWA maskable icon (large)' },
  { size: 180, name: 'apple-touch-icon.png', purpose: 'iOS home screen icon' },
  { size: 167, name: 'apple-touch-icon-ipad.png', purpose: 'iOS iPad icon' },
  { size: 152, name: 'apple-touch-icon-152.png', purpose: 'iOS old iPad icon' },
];

async function generateLogos() {
  console.log('🎨 Generating logo PNG files from SVG...\n');

  if (!fs.existsSync(svgPath)) {
    console.error(`❌ SVG file not found at ${svgPath}`);
    process.exit(1);
  }

  for (const { size, name, purpose } of sizes) {
    try {
      const outputPath = path.join(publicDir, name);

      await sharp(svgPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        })
        .png({ quality: 90 })
        .toFile(outputPath);

      console.log(`✅ Generated ${name} (${size}x${size}) - ${purpose}`);
    } catch (error) {
      console.error(`❌ Failed to generate ${name}:`, error.message);
      process.exit(1);
    }
  }

  console.log('\n✨ All logos generated successfully!');
  console.log('\nGenerated files:');
  console.log('  • logo-192.png - PWA icon (medium)');
  console.log('  • logo-192-maskable.png - PWA maskable icon');
  console.log('  • logo-512.png - PWA icon (large)');
  console.log('  • logo-512-maskable.png - PWA maskable icon');
  console.log('  • apple-touch-icon.png - iOS home screen (180x180)');
  console.log('  • apple-touch-icon-ipad.png - iOS iPad (167x167)');
  console.log('  • apple-touch-icon-152.png - iOS older devices (152x152)');
}

generateLogos().catch((error) => {
  console.error('❌ Error:', error);
  process.exit(1);
});
