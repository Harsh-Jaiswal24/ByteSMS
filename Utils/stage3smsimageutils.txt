// // utils/smsImageUtils.js
// import ImageResizer from '@bam.tech/react-native-image-resizer';
// import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';

// /**
//  * Maximum allowed image dimensions for SMS compression
//  */
// const MAX_IMAGE_WIDTH = 4000;
// const MAX_IMAGE_HEIGHT = 4000;
// const IMAGE_QUALITY = 100; // 0-100 (lower = smaller but worse quality)
// const IMAGE_PREFIX = 'IMG:'; // To identify image messages

// /**
//  * Compresses an image to an SMS-friendly string
//  * @param {string} imageUri - Local image URI or base64
//  * @returns {Promise<string>} Compressed string (with IMG: prefix)
//  */

// export const compressImageForSMS = async (imageUri) => {
//   try {
//     // 1. Resize and compress the image
//     const resized = await ImageResizer.createResizedImage(
//       imageUri,                // imageUri
//       MAX_IMAGE_WIDTH,         // width
//       MAX_IMAGE_HEIGHT,        // height
//       'JPEG',                  // format
//       IMAGE_QUALITY,           // quality
//       0,                       // rotation
//       undefined,               // outputPath (null/undefined returns base64)
//       false                    // keepMeta
//     );

//     // Rest of your code remains the same...
//     let base64 = resized.uri;
//     if (base64.startsWith('data:')) {
//       base64 = base64.split(',')[1];
//     }

//     if (!base64) {
//       throw new Error('Failed to get image data');
//     }

//     const compressed = compressToEncodedURIComponent(base64);
//     return `${IMAGE_PREFIX}${compressed}`;
//   } catch (error) {
//     console.error('Image compression failed:', error);
//     throw new Error(`Failed to compress image: ${error.message}`);
//   }
// };

// /**
//  * Checks if a message is a compressed image
//  * @param {string} message 
//  * @returns {boolean}
//  */
// export const isCompressedImage = (message) => {
//   return message?.startsWith(IMAGE_PREFIX);
// };

// /**
//  * Decompresses an image string back to a displayable URI
//  * @param {string} compressedStr 
//  * @returns {string | null} - Base64 image URI or null if invalid
//  */


// export const decompressImageForDisplay = (compressedStr) => {
//   if (!isCompressedImage(compressedStr)) return null;

//   try {
//     // 1. Remove prefix
//     const compressedData = compressedStr.replace(IMAGE_PREFIX, '');

//     // 2. Decompress LZ-String
//     const base64 = decompressFromEncodedURIComponent(compressedData);

//     if (!base64) {
//       console.warn('Failed to decompress image data');
//       return null;
//     }

//     // 3. Convert to data URI for <Image> component
//     return `${base64}`;
//   } catch (error) {
//     console.error('Image decompression failed:', error);
//     return null;
//   }
// };


// /////////shsdfshdf

// ////////////finla wokring done all wokring 


// ////dondoneondoneondoenodno





// utils/smsImageUtils.js
import ImageResizer from '@bam.tech/react-native-image-resizer';
import RNFS from 'react-native-fs';

const MAX_COMPRESSED_CHARS = 3000;
const IMAGE_PREFIX = 'IMG:';

export const compressImageForSMS = async (imageUri) => {
  try {
    let maxSize = 400;
    let quality = 85;
    let base64Data = null;
    let found = false;
    
    // First pass: Reduce quality
    while (quality >= 40 && !found) {
      const { base64 } = await resizeImage(imageUri, maxSize, quality);
      
      if (base64.length <= MAX_COMPRESSED_CHARS) {
        base64Data = base64;
        found = true;
      } else {
        quality -= 10;
      }
    }
    
    // Second pass: Reduce size
    if (!found) {
      maxSize = 300;
      quality = 85;
      
      while (maxSize >= 100 && !found) {
        const { base64 } = await resizeImage(imageUri, maxSize, quality);
        
        if (base64.length <= MAX_COMPRESSED_CHARS) {
          base64Data = base64;
          found = true;
        } else {
          maxSize -= 50;
        }
      }
    }
    
    // Final fallback
    if (!found) {
      const { base64 } = await resizeImage(imageUri, 100, 40);
      base64Data = base64;
    }
    
    return `${IMAGE_PREFIX}${base64Data}`;
  } catch (error) {
    console.error('Image compression failed:', error);
    throw new Error(`Failed to compress image: ${error.message}`);
  }
};

export const isCompressedImage = (message) => {
  return message?.startsWith(IMAGE_PREFIX);
};

export const decompressImageForDisplay = (compressedStr) => {
  if (!isCompressedImage(compressedStr)) return null;
  return compressedStr.replace(IMAGE_PREFIX, '');
};

// Helper function to resize and convert to base64
const resizeImage = async (uri, maxSize, quality) => {
  try {
    const resized = await ImageResizer.createResizedImage(
      uri,
      maxSize,
      maxSize,
      'JPEG',
      quality,
      0,
      null,
      false
    );
    
    // Handle both file paths and base64 URIs
    let base64;
    if (resized.uri.startsWith('data:')) {
      base64 = resized.uri.split(',')[1];
    } else {
      base64 = await RNFS.readFile(resized.uri, 'base64');
    }
    
    return { base64 };
  } catch (error) {
    console.error('Resize error:', error);
    throw new Error('Failed to process image');
  }
};


///stage 3.00 finalllll
//only play with while(quality> )and with maxcharacters