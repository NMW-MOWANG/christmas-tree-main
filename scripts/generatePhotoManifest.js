import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

async function generatePhotoManifest() {
  try {
    console.log('Scanning default photos directory...');
    
    // 扫描public/default-photos目录下的图片文件
    const photosDir = path.join(process.cwd(), 'public', 'default-photos');
    const files = await glob('**/*.{jpg,jpeg,png,webp}', { 
      cwd: photosDir,
      nodir: true 
    });
    
    // 生成照片URL列表
    const photos = files.map(file => `/default-photos/${file}`);
    
    console.log(`Found ${photos.length} photos:`, photos);
    
    // 写入manifest文件
    const manifestPath = path.join(photosDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify({ photos }, null, 2));
    
    console.log('Photo manifest generated successfully:', manifestPath);
  } catch (error) {
    console.error('Error generating photo manifest:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  generatePhotoManifest();
}

export default generatePhotoManifest;