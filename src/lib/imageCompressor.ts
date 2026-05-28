/**
 * Clean & highly efficient client-side image compression tool.
 * Reduces dimension limits and adjusts quality to enforce highly optimized base64 limits.
 */

// Safe helper to convert any selected File directly to standard compressed Base64
export function compressImageFile(file: File, maxWidth = 1000, maxHeight = 1000, quality = 0.75): Promise<string> {
  return new Promise((resolve, reject) => {
    // If it's not actually an image, read as normal file base64 dataURL
    if (!file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = () => resolve(r.result as string);
      r.onerror = (e) => reject(e);
      r.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const rawBase64 = e.target?.result as string;
        const compressed = await compressImageBase64(rawBase64, maxWidth, maxHeight, quality);
        resolve(compressed);
      } catch (err) {
        // Fallback to raw base64 if canvas compression fails
        resolve(e.target?.result as string);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

// Low level core: loads original base64 to canvas to resize and compress quality
export function compressImageBase64(base64Str: string, maxWidth = 1000, maxHeight = 1000, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    if (!base64Str || !base64Str.startsWith('data:image/')) {
      resolve(base64Str);
      return;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = base64Str;
    img.onload = () => {
      let width = img.width;
      let height = img.height;

      // Adjust to constraint bound
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64Str);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      
      // Output as compressed JPEG format (standard highly portable Base64 string wrapper)
      const compressed = canvas.toDataURL('image/jpeg', quality);
      resolve(compressed);
    };
    img.onerror = () => {
      // Safe fallback: can't load image, return original
      resolve(base64Str);
    };
  });
}

// Convert any generic uploaded document/binary non-image file block to Base64 safely
export function documentFileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as string);
    };
    reader.onerror = (err) => {
      reject(err);
    };
    reader.readAsDataURL(file);
  });
}
