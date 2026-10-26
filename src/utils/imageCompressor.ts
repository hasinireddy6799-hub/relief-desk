/**
 * Compresses an image file in the browser using HTML5 Canvas.
 * Target: Max dimension 1280px, file size ~200 KB.
 */
export async function compressImage(
  file: File,
  maxDimension = 1280,
  maxBytes = 200 * 1024
): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Failed to load image into element'));
      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          reject(new Error('Unable to get canvas 2D context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        let quality = 0.8;
        const attemptCompression = (q: number) => {
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Canvas toBlob failed'));
                return;
              }

              // If file is still too big and quality can be reduced further
              if (blob.size > maxBytes && q > 0.4) {
                attemptCompression(q - 0.15);
              } else {
                const dataUrl = canvas.toDataURL('image/jpeg', q);
                resolve({ blob, dataUrl });
              }
            },
            'image/jpeg',
            q
          );
        };

        attemptCompression(quality);
      };

      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
  });
}
