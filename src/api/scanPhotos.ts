import fs from 'fs';
import path from 'path';

export async function scanPhotos() {
  try {
    const photosDir = path.join(process.cwd(), 'public', 'default-photos');
    const files = fs.readdirSync(photosDir);
    
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const imageFiles = files.filter(file => 
      imageExtensions.some(ext => file.toLowerCase().endsWith(ext))
    );
    
    return imageFiles.map(file => `/default-photos/${file}`);
  } catch (error) {
    console.error('Error scanning photos directory:', error);
    return [];
  }
}