// Centralized index for handling internal static image paths.
// Instead of relative imports throughout the app, you import from this file.

// Example: import logoPlaceholder from './placeholder-logo.png';

export const Images = {
  // LOGO: logoPlaceholder,
  // AVATAR_DEFAULT: '...path',
  // You drop absolute imports / Vite dynamic URLs here
};

export const getImageUrl = (imageName) => {
  return new URL(`./${imageName}`, import.meta.url).href;
};
