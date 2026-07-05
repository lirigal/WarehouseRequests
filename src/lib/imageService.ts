import { ItemPictureUrl } from "../types";

/**
 * Centered placeholder generator to satisfy:
 * "If no image exists: Display a default image. Hebrew: אין תמונה זמינה, English: No image available"
 */
export const getPlaceholderImage = (isRtl: boolean): string => {
  const text = isRtl ? "אין תמונה זמינה" : "No image available";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="200" height="200">
    <rect width="200" height="200" fill="#f8fafc" rx="8"/>
    <rect x="2" y="2" width="196" height="196" fill="none" stroke="#cbd5e1" stroke-width="2" stroke-dasharray="4 4" rx="8"/>
    <path d="M70 95 C 70 85, 130 85, 130 95" fill="none" stroke="#94a3b8" stroke-width="4" stroke-linecap="round"/>
    <circle cx="85" cy="110" r="4" fill="#94a3b8"/>
    <circle cx="115" cy="110" r="4" fill="#94a3b8"/>
    <path d="M100 65 L100 80 M100 80 Q100 83 97 83 L90 83 M100 80 Q100 83 103 83 L110 83" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round"/>
    <text x="100" y="145" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-size="12" font-weight="600" fill="#64748b">${text}</text>
  </svg>`;
  return "data:image/svg+xml;utf8," + encodeURIComponent(svg);
};

// Simple memoization cache to optimize performance and prevent duplicate/redundant searches
const imageCache: Record<string, string> = {};

/**
 * Single, centralized source of truth method requested:
 * "GetItemPrimaryImageBySku(string sku)"
 * All screens must use this method to request product images.
 */
export function GetItemPrimaryImageBySku(
  sku: string, 
  itemPictureUrls: ItemPictureUrl[], 
  isRtl: boolean = true
): string {
  if (!sku) return getPlaceholderImage(isRtl);
  
  const normalizedSku = sku.trim();
  
  // Fast Lookup cache key matching both language preference and SKU
  const cacheKey = `${normalizedSku}_${isRtl ? "HE" : "EN"}`;
  
  // Check memory cache first to satisfy performance requirements ("Cache image URLs, avoid redundant queries")
  if (imageCache[cacheKey]) {
    return imageCache[cacheKey];
  }

  // Find all active records for this specific SKU (preserving leading zeros, exact match)
  const skuPics = itemPictureUrls.filter(
    (pic) => pic.sku.trim() === normalizedSku && pic.isActive
  );

  if (skuPics.length === 0) {
    const placeholder = getPlaceholderImage(isRtl);
    imageCache[cacheKey] = placeholder;
    return placeholder;
  }

  // Look for the designated primary image
  const primaryPic = skuPics.find((pic) => pic.isPrimary);
  const resolvedUrl = primaryPic ? primaryPic.imageUrl : skuPics[0].imageUrl;

  // Save in runtime cache
  imageCache[cacheKey] = resolvedUrl;
  return resolvedUrl;
}

/**
 * Resets the lookup performance cache (called when state changes occur)
 */
export function ClearImageCache() {
  for (const key in imageCache) {
    delete imageCache[key];
  }
}
