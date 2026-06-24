// URL content extraction helper.
// Fetches a product URL with a browser User-Agent, parses the HTML with cheerio,
// and returns structured product text + main product image URL.
// Used by the POST /api/extract route handler.

import * as cheerio from "cheerio";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 10_000;
const MAX_HTML_BYTES = 5_000_000;

export interface ExtractedProduct {
  name: string | null;
  description: string | null;
  price: string | null;
  features: string[];
  imageUrl: string | null;
  /** Concatenated text blob fed to the analyze-product Edge Function. */
  text: string;
}

export class ExtractionError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ExtractionError";
    this.status = status;
  }
}

function absoluteUrl(raw: string | null | undefined, base: string): string | null {
  if (!raw) return null;
  try {
    return new URL(raw, base).toString();
  } catch {
    return null;
  }
}

function pickPrice($: cheerio.CheerioAPI): string | null {
  // Common e-commerce price selectors. Returns the first match found.
  const selectors = [
    '[itemprop="price"]',
    '[data-price]',
    ".price",
    "#price",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-offscreen",
    ".product-price",
    '[class*="price" i]',
  ];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const value =
        el.attr("content") ||
        el.attr("data-price") ||
        el.text().replace(/\s+/g, " ").trim();
      if (value) return value;
    }
  }
  return null;
}

function pickFeatures($: cheerio.CheerioAPI): string[] {
  const features: string[] = [];

  // Bullet-point feature lists (Amazon-style).
  $("#feature-bullets li, .a-unordered-list li")
    .each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (text && text.length > 3 && !text.toLowerCase().startsWith("show more")) {
        features.push(text);
      }
    });

  // Generic list items inside product description containers.
  if (features.length === 0) {
    $('[itemprop="description"] li, .product-description li, .description li')
      .each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (text && text.length > 3) features.push(text);
      });
  }

  // Deduplicate and cap at 8.
  return Array.from(new Set(features)).slice(0, 8);
}

/**
 * Fetch and parse a product page. Throws ExtractionError on fetch/parse failure.
 */
export async function extractProductFromUrl(url: string): Promise<ExtractedProduct> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new ExtractionError("Invalid URL", 400);
  }

  if (!/^https?:$/.test(parsedUrl.protocol)) {
    throw new ExtractionError("URL must use http or https", 400);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(parsedUrl.toString(), {
      headers: {
        "user-agent": BROWSER_USER_AGENT,
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new ExtractionError("Request timed out", 422);
    }
    throw new ExtractionError("Could not reach the URL", 422);
  } finally {
    clearTimeout(timeout);
  }

  if (response.status === 403 || response.status === 401) {
    throw new ExtractionError(
      "The site blocked automated access. Try uploading a photo instead.",
      403
    );
  }
  if (!response.ok) {
    throw new ExtractionError(
      `The URL returned status ${response.status}`,
      422
    );
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
    throw new ExtractionError("The URL did not return a web page", 422);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength > MAX_HTML_BYTES) {
    throw new ExtractionError("The page is too large to parse", 422);
  }
  const html = new TextDecoder("utf-8").decode(buffer);

  const $ = cheerio.load(html);

  // Remove script/style noise before extracting text.
  $("script, style, noscript, template").remove();

  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() || null;
  const docTitle = $("title").first().text().trim() || null;
  const h1 = $("h1").first().text().trim() || null;
  const name = ogTitle || h1 || docTitle || null;

  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() || null;
  const descriptionEl = $('[itemprop="description"], .product-description, .description')
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const description =
    ogDescription || metaDescription || descriptionEl || null;

  const price = pickPrice($);
  const features = pickFeatures($);

  // Collect candidate image URLs and filter out tracking pixels, beacons,
  // and non-image assets that sites (especially Amazon) inject.
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() || null;
  const twitterImage =
    $('meta[name="twitter:image"]').attr("content")?.trim() || null;

  // Gather all <img> src values, preferring larger images and data-src.
  const allImgSrcs: string[] = [];
  $('img').each((_, el) => {
    const src = $(el).attr("src") || $(el).attr("data-src") || $(el).attr("data-old-hires");
    if (src && !src.startsWith("data:")) {
      allImgSrcs.push(src);
    }
  });

  const isTrackingPixel = (url: string): boolean => {
    const lower = url.toLowerCase();
    // Amazon tracking endpoints, common beacon patterns, and 1x1 pixels.
    if (lower.includes("fls-na.amazon") || lower.includes("fls-eu.amazon") ||
        lower.includes("fls-") || lower.includes("aan.amazon") ||
        lower.includes("amazon-adsystem") || lower.includes("doubleclick") ||
        lower.includes("facebook.com/tr") || lower.includes("google-analytics") ||
        lower.includes("googletagmanager") || lower.includes("/uedata") ||
        lower.includes("pixel") || lower.includes("beacon") ||
        lower.includes("1x1")) {
      return true;
    }
    // Check for image dimensions in srcset/attributes (1x1 tracking pixels).
    const width = $(`img[src="${url}"]`).attr("width");
    const height = $(`img[src="${url}"]`).attr("height");
    if ((width && parseInt(width) <= 1) || (height && parseInt(height) <= 1)) {
      return true;
    }
    return false;
  };

  const isLikelyProductImage = (url: string): boolean => {
    if (isTrackingPixel(url)) return false;
    const lower = url.toLowerCase();
    // Must look like an image path or have an image extension.
    return (
      lower.endsWith(".jpg") ||
      lower.endsWith(".jpeg") ||
      lower.endsWith(".png") ||
      lower.endsWith(".webp") ||
      lower.includes("images") ||
      lower.includes("media") ||
      lower.includes("product") ||
      lower.includes("cdn") ||
      lower.includes("m.media-amazon") ||
      lower.includes("images-amazon")
    );
  };

  const candidates = [
    ogImage,
    twitterImage,
    ...allImgSrcs,
  ]
    .map((src) => absoluteUrl(src, parsedUrl.toString()))
    .filter((url): url is string => url !== null);

  const imageUrl =
    candidates.find((url) => isLikelyProductImage(url)) ||
    candidates.find((url) => !isTrackingPixel(url)) ||
    null;

  const text = [
    name ? `Product: ${name}` : null,
    description ? `Description: ${description}` : null,
    price ? `Price: ${price}` : null,
    features.length ? `Features: ${features.join("; ")}` : null,
    imageUrl ? `Image: ${imageUrl}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  if (!name && !description && features.length === 0) {
    throw new ExtractionError(
      "Could not extract product info. Try uploading a photo instead.",
      422
    );
  }

  return {
    name,
    description,
    price,
    features,
    imageUrl,
    text,
  };
}
