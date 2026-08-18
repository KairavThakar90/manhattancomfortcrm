import imageCompression from 'browser-image-compression';

export const compressImageIfNeeded = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file; // Can't format non-images easily, return as is
  }

  // Next/Django limits are often 1-2mb by default.
  // We'll aggressively compress images so they fit in limits.
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    // Convert Blob to File to keep API compatible
    return new File([compressedBlob], file.name, {
      type: compressedBlob.type,
      lastModified: Date.now(),
    });
  } catch (error) {
    console.error('Image compression failed:', error);
    return file; // Fallback to original
  }
};
