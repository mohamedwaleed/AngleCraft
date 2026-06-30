// URL content extraction helper.
// Fetches a product URL with a browser User-Agent, parses the HTML with cheerio,
// and returns structured product text + main product image URL.
// Used by the POST /api/extract route handler.

import * as cheerio from "cheerio";

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_BYTES = 6_000_000;
const MAX_FEATURES = 8;
const MIN_FEATURE_LENGTH = 5;
const MAX_FEATURE_LENGTH = 180;

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
    const url = new URL(raw, base);
    // Prefer the base page's protocol to avoid returning insecure http URLs
    // when the page itself is served over https.
    try {
      const baseUrl = new URL(base);
      if (baseUrl.protocol === "https:" && url.protocol === "http:") {
        url.protocol = "https:";
      }
    } catch {
      // ignore
    }
    return url.toString();
  } catch {
    return null;
  }
}

// Shopify CDN serves resized images with suffixes like _480x480 or _medium.
// Removing the suffix gives the original uploaded image.
function upgradeShopifyImageUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    const upgraded = pathname.replace(
      /_(?:\d+x\d+|medium|large|small|grande|compact|icon|original)\.(png|jpg|jpeg|webp|gif)$/i,
      ".$1"
    );
    if (upgraded !== pathname) {
      parsed.pathname = upgraded;
      return parsed.toString();
    }
  } catch {
    // ignore
  }
  return url;
}

interface JsonLdProduct {
  name?: string | null;
  description?: string | null;
  image?: string | string[] | null;
  brand?: { name?: string | null } | null;
  hasVariant?: JsonLdProduct[] | null;
  offers?:
    | { price?: string | number | null; priceCurrency?: string | null }
    | Array<{ price?: string | number | null; priceCurrency?: string | null }>
    | null;
}

function isLdType(parsed: unknown, type: string): boolean {
  if (!parsed || typeof parsed !== "object") return false;
  const value = (parsed as Record<string, unknown>)["@type"];
  if (typeof value === "string") return value === type;
  if (Array.isArray(value)) return value.includes(type);
  return false;
}

function extractJsonLdProduct($: cheerio.CheerioAPI): JsonLdProduct | null {
  let product: JsonLdProduct | null = null;
  $("script[type='application/ld+json']").each((_, el) => {
    if (product) return;
    const text = $(el).text().trim();
    if (!text) return;
    try {
      const parsed = JSON.parse(text);
      if (isLdType(parsed, "Product")) {
        product = parsed as JsonLdProduct;
      } else if (isLdType(parsed, "ProductGroup")) {
        // Convert ProductGroup to a synthetic product so its shared
        // name/description/image and a representative variant price are usable.
        // Skip bundle/selection-box variants when possible; prefer the first
        // actual product variant (e.g. a single flavor on Huel).
        const group = parsed as JsonLdProduct & {
          hasVariant?: Array<JsonLdProduct>;
        };
        const variants = group.hasVariant || [];
        const representativeVariant =
          variants.find(
            (v) => v.name && !/\b(selection box|bundle|variety|pack of|mixed)\b/i.test(v.name)
          ) || variants[0];
        product = {
          name: group.name || representativeVariant?.name,
          description: group.description,
          image: group.image || representativeVariant?.image,
          brand: group.brand,
          hasVariant: group.hasVariant,
          offers: representativeVariant?.offers,
        };
      }
      if (Array.isArray(parsed["@graph"])) {
        for (const node of parsed["@graph"]) {
          if (isLdType(node, "Product")) {
            product = node as JsonLdProduct;
            break;
          }
        }
      }
    } catch {
      // Ignore malformed JSON-LD.
    }
  });
  return product;
}

function cleanName(raw: string | null | undefined, url?: string): string | null {
  if (!raw) return null;
  let name = raw.replace(/\s+/g, " ").trim();

  // Remove common site-name suffixes such as " | Patagonia UK" or " - Shopify Store".
  const suffixPatterns = [
    /\s*[\|\-\—\–]\s*(Official Site|Home|Shop|Store|USA|UK|EU|CA|AU|GB|US)$/i,
    /\s*[\|\-\—\–]\s*[^\|\-\—\–]*(?:UK|US|EU|CA|AU|GB|Official|Store|Shop)$/i,
  ];
  for (const pattern of suffixPatterns) {
    const cleaned = name.replace(pattern, "").trim();
    if (cleaned && cleaned.length > 3) name = cleaned;
  }

  // Try to remove the registered domain name when it appears as a title suffix.
  try {
    if (url) {
      const hostname = new URL(url).hostname.replace(/^www\./, "");
      const parts = hostname.split(".");
      const domain = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      if (domain && domain.length > 2) {
        const hostPattern = new RegExp(`\\s*[\\|\\-\\—\\–]\\s*${domain}\\b`, "i");
        name = name.replace(hostPattern, "").trim();
      }
    }
  } catch {
    // ignore
  }

  return name || null;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  CAD: "CA$",
  AUD: "A$",
  INR: "₹",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  NZD: "NZ$",
  SGD: "S$",
  HKD: "HK$",
  CNY: "¥",
  MXN: "MX$",
  BRL: "R$",
};

function formatPrice(price?: string | number | null, currency?: string | null): string | null {
  if (price === null || price === undefined || price === "") return null;
  const priceStr = typeof price === "number" ? price.toFixed(2).replace(/\.00$/, "") : price;
  if (!priceStr || priceStr === "0") return null;
  const normalized = priceStr.replace(/\s+/g, "").trim();
  if (currency && currency !== "XXX") {
    const symbol = CURRENCY_SYMBOLS[currency.toUpperCase()] || currency;
    return `${symbol} ${normalized}`;
  }
  return normalized;
}

function hasCurrencySymbol(value: string): boolean {
  return /[£$€¥₹]/.test(value) || /(?:USD|EUR|GBP|CAD|AUD|INR|JPY)/i.test(value);
}

function cleanPriceText(value: string): string | null {
  if (!value) return null;
  let cleaned = value.replace(/\s+/g, " ").trim();
  // Remove trailing/leading UI noise such as "Learn more" or "Add to cart".
  cleaned = cleaned.replace(/\bLearn more\b.*$/i, "").trim();
  cleaned = cleaned.replace(/\bAdd to cart\b.*$/i, "").trim();
  cleaned = cleaned.replace(/\bSubscribe & Save\b/i, "").trim();
  cleaned = cleaned.replace(/\bOne-Time\b/i, "").trim();
  if (!cleaned) return null;
  return cleaned;
}

function pickPrice($: cheerio.CheerioAPI, jsonLdPrice?: string | null): string | null {
  if (jsonLdPrice) return jsonLdPrice;

  // Common e-commerce price selectors. Shopify-specific selectors are listed first.
  // Hacked CSS-module selectors (e.g. Huel) are listed before the broad "price" match.
  const selectors = [
    '[data-price-type="finalPrice"] .price',
    ".price__regular .price-item--regular",
    ".price__sale .price-item--sale",
    ".product__price",
    ".product-price__price",
    ".price-item",
    '[itemprop="price"]',
    '[data-price]',
    '[class*="onetime-price" i]',
    '[class*="primary-price" i]',
    '[class*="sale-price" i]',
    '[class*="current-price" i]',
    '[class*="product-price" i]',
    ".price",
    "#price",
    "#priceblock_ourprice",
    "#priceblock_dealprice",
    ".a-price .a-offscreen",
    '[class*="price" i]',
  ];

  const candidates: string[] = [];
  for (const selector of selectors) {
    const el = $(selector).first();
    if (el.length) {
      const rawValue =
        el.attr("content") ||
        el.attr("data-price") ||
        el.attr("aria-label") ||
        el.text().replace(/\s+/g, " ").trim();
      const value = cleanPriceText(rawValue);
      if (value && value.length > 0 && !value.toLowerCase().includes("was")) {
        candidates.push(value);
        if (hasCurrencySymbol(value)) {
          return value;
        }
      }
    }
  }

  return candidates[0] || null;
}

function isBotPage(html: string, title: string | null): boolean {
  const lowerHtml = html.toLowerCase();
  const lowerTitle = (title || "").toLowerCase();
  if (lowerTitle.includes("hang tight") || lowerTitle.includes("routing to checkout")) return true;
  if (lowerTitle.includes("bot") || lowerTitle.includes("robot")) return true;
  if (lowerTitle.includes("access denied") || lowerTitle.includes("blocked")) return true;
  if (lowerHtml.includes("botfailover")) return true;
  if (lowerHtml.includes("sitedownpage") && lowerHtml.includes("patagonia")) return true;
  if (lowerHtml.includes("please enable javascript") && lowerHtml.includes("challenge")) return true;
  return false;
}

function isGoodFeature(text: string): boolean {
  const lower = text.toLowerCase();
  if (lower.length < MIN_FEATURE_LENGTH || lower.length > MAX_FEATURE_LENGTH) return false;
  if (lower.startsWith("show more")) return false;
  if (lower.includes("javascript") || lower.includes("cookie")) return false;
  if (lower.includes("out of stock") || lower.includes("sold out")) return false;
  return true;
}

function splitDescriptionIntoFeatures(description: string): string[] {
  const sentences = description
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= MIN_FEATURE_LENGTH && s.length <= MAX_FEATURE_LENGTH && !s.startsWith("if "));
  return sentences.slice(0, MAX_FEATURES);
}

function pickFeatures($: cheerio.CheerioAPI, fallbackDescription?: string | null): string[] {
  const features: string[] = [];

  // Bullet-point feature lists (Amazon-style).
  $("#feature-bullets li, .a-unordered-list li, .product-detail__list li, .product__features li, .product-features li, .feature-list li")
    .each((_, el) => {
      const text = $(el).text().replace(/\s+/g, " ").trim();
      if (isGoodFeature(text)) features.push(text);
    });

  // Generic list items inside product description containers.
  if (features.length === 0) {
    $('[itemprop="description"] li, .product-description li, .description li, .product__description li, .product-details li')
      .each((_, el) => {
        const text = $(el).text().replace(/\s+/g, " ").trim();
        if (isGoodFeature(text)) features.push(text);
      });
  }

  // Use the product description as a fallback feature source.
  if (features.length === 0 && fallbackDescription) {
    const fromDescription = splitDescriptionIntoFeatures(fallbackDescription);
    features.push(...fromDescription);
  }

  // Deduplicate and cap.
  return Array.from(new Set(features)).slice(0, MAX_FEATURES);
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
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "accept-language": "en-US,en;q=0.9",
        "sec-ch-ua": "\"Not/A)Brand\";v=\"8\", \"Chromium\";v=\"126\", \"Google Chrome\";v=\"126\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "upgrade-insecure-requests": "1",
        "sec-fetch-site": "none",
        "sec-fetch-mode": "navigate",
        "sec-fetch-user": "?1",
        "sec-fetch-dest": "document",
        "cache-control": "max-age=0",
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

  // Extract structured data before removing script tags.
  const jsonLd = extractJsonLdProduct($);

  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim() || null;
  const docTitle = $("title").first().text().trim() || null;

  // Detect bot/interstitial pages before investing in full extraction.
  if (isBotPage(html, docTitle || ogTitle)) {
    throw new ExtractionError(
      "The site blocked automated access. Try uploading a photo instead.",
      403
    );
  }

  // Remove script/style noise before extracting visible text.
  $("script, style, noscript, template").remove();

  const h1 = $("h1").first().text().trim() || null;
  const productTitleEl = $(
    '.product__title h1, .product__title, .product-single__title, [data-testid="product-title"], .product-name h1, .product-name'
  )
    .first()
    .text()
    .trim();
  const rawName = jsonLd?.name || productTitleEl || ogTitle || h1 || docTitle || null;
  const name = cleanName(rawName, url);

  const metaDescription =
    $('meta[name="description"]').attr("content")?.trim() || null;
  const ogDescription =
    $('meta[property="og:description"]').attr("content")?.trim() || null;
  const descriptionSelectors =
    '[itemprop="description"], .product-description, .product__description, .product-details__description, .description, .product-detail__description';
  const descriptionEl = $(descriptionSelectors)
    .first()
    .text()
    .replace(/\s+/g, " ")
    .trim();
  const description =
    jsonLd?.description || ogDescription || metaDescription || descriptionEl || null;

  const jsonLdPrice = formatPrice(
    Array.isArray(jsonLd?.offers) ? jsonLd?.offers[0]?.price : jsonLd?.offers?.price,
    Array.isArray(jsonLd?.offers) ? jsonLd?.offers[0]?.priceCurrency : jsonLd?.offers?.priceCurrency
  );
  const price = pickPrice($, jsonLdPrice);
  const features = pickFeatures($, description || jsonLd?.description);

  // Collect candidate image URLs and filter out tracking pixels, beacons,
  // and non-image assets that sites (especially Amazon) inject.
  const ogImage =
    $('meta[property="og:image"]').attr("content")?.trim() || null;
  const twitterImage =
    $('meta[name="twitter:image"]').attr("content")?.trim() || null;

  const jsonLdImage = Array.isArray(jsonLd?.image)
    ? jsonLd?.image[0]
    : typeof jsonLd?.image === "string"
      ? jsonLd?.image
      : null;

  interface ImageCandidate {
    src: string;
    source: "og" | "twitter" | "jsonld" | "dom";
    alt: string;
    width: string | undefined;
    height: string | undefined;
    domIndex: number;
    parentClasses: string;
  }

  const imageCandidates: ImageCandidate[] = [];
  if (ogImage) {
    imageCandidates.push({ src: ogImage, source: "og", alt: "", width: undefined, height: undefined, domIndex: -3, parentClasses: "" });
  }
  if (twitterImage) {
    imageCandidates.push({ src: twitterImage, source: "twitter", alt: "", width: undefined, height: undefined, domIndex: -2, parentClasses: "" });
  }
  if (jsonLdImage) {
    imageCandidates.push({ src: jsonLdImage, source: "jsonld", alt: "", width: undefined, height: undefined, domIndex: -1, parentClasses: "" });
  }

  // Gather all <img> src values, preferring larger images and data-src.
  $('img').each((index, el) => {
    const src =
      $(el).attr("data-src") ||
      $(el).attr("data-old-hires") ||
      $(el).attr("src") ||
      $(el).attr("data-lazy-src");
    if (src && !src.startsWith("data:")) {
      const parent = $(el).parent();
      imageCandidates.push({
        src,
        source: "dom",
        alt: $(el).attr("alt") || "",
        width: $(el).attr("width"),
        height: $(el).attr("height"),
        domIndex: index,
        parentClasses: `${parent.attr("class") || ""} ${parent.parent().attr("class") || ""}`.trim(),
      });
    }
  });

  const isTrackingPixel = (imageUrl: string): boolean => {
    const lower = imageUrl.toLowerCase();
    if (
      lower.includes("fls-na.amazon") ||
      lower.includes("fls-eu.amazon") ||
      lower.includes("fls-") ||
      lower.includes("aan.amazon") ||
      lower.includes("amazon-adsystem") ||
      lower.includes("doubleclick") ||
      lower.includes("facebook.com/tr") ||
      lower.includes("google-analytics") ||
      lower.includes("googletagmanager") ||
      lower.includes("/uedata") ||
      lower.includes("pixel") ||
      lower.includes("beacon") ||
      lower.includes("1x1")
    ) {
      return true;
    }
    const width = $(`img[src="${imageUrl}"]`).attr("width");
    const height = $(`img[src="${imageUrl}"]`).attr("height");
    if ((width && parseInt(width) <= 1) || (height && parseInt(height) <= 1)) {
      return true;
    }
    return false;
  };

  const isLikelyProductImage = (imageUrl: string): boolean => {
    if (isTrackingPixel(imageUrl)) return false;
    const lower = imageUrl.toLowerCase();
    const path = getUrlPath(imageUrl).toLowerCase();
    return (
      path.endsWith(".jpg") ||
      path.endsWith(".jpeg") ||
      path.endsWith(".png") ||
      path.endsWith(".webp") ||
      path.endsWith(".gif") ||
      lower.includes("/products/") ||
      lower.includes("/images/") ||
      lower.includes("/media/") ||
      lower.includes("product") ||
      lower.includes("cdn") ||
      lower.includes("cdn.shopify") ||
      lower.includes("m.media-amazon") ||
      lower.includes("images-amazon")
    );
  };

  function parseDimension(value: string | undefined | null): number | null {
    if (!value) return null;
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return null;
    return num;
  }

  function parseDimensionsFromUrl(imageUrl: string): { width: number; height: number } | null {
    try {
      const pathname = new URL(imageUrl).pathname;

      // Standard Shopify-style: -1468x1468.jpg
      const standardMatch = pathname.match(/[-_](\d{2,4})x(\d{2,4})\.(?:png|jpg|jpeg|webp|gif)$/i);
      if (standardMatch) {
        const width = parseInt(standardMatch[1], 10);
        const height = parseInt(standardMatch[2], 10);
        if (width > 0 && height > 0) return { width, height };
      }

      // Amazon: _AC_SL1360_.jpg (square, single dimension)
      const amazonSquareMatch = pathname.match(/_SL(\d{3,4})_\.(?:png|jpg|jpeg|webp|gif)$/i);
      if (amazonSquareMatch) {
        const size = parseInt(amazonSquareMatch[1], 10);
        if (size > 0) return { width: size, height: size };
      }

      // Amazon: _SX480_SY480_.jpg or _SY300_SX300_.jpg
      const amazonRectMatch = pathname.match(/_S[X_Y](\d{2,4})_S[XY](\d{2,4})_/i);
      if (amazonRectMatch) {
        const width = parseInt(amazonRectMatch[1], 10);
        const height = parseInt(amazonRectMatch[2], 10);
        if (width > 0 && height > 0) return { width, height };
      }

      // Amazon: _AC_UF480,480_SR480,480_.jpg or _AC_UL165_SR165,165_.jpg
      const amazonResizedMatch = pathname.match(/_SR(\d{2,4}),\d{2,4}_/i);
      if (amazonResizedMatch) {
        const size = parseInt(amazonResizedMatch[1], 10);
        if (size > 0) return { width: size, height: size };
      }
    } catch {
      // ignore
    }
    return null;
  }

  function getImageArea(imageUrl: string, width?: string | null, height?: string | null): number | null {
    const urlDims = parseDimensionsFromUrl(imageUrl);
    // Use URL dimensions first; HTML width/height attributes are often responsive
    // layout values and can be far larger than the actual image (e.g. 1500x3000).
    if (urlDims) return urlDims.width * urlDims.height;
    const attrWidth = parseDimension(width);
    const attrHeight = parseDimension(height);
    if (attrWidth && attrHeight) return attrWidth * attrHeight;
    return null;
  }

  function getUrlPath(imageUrl: string): string {
    try {
      return new URL(imageUrl).pathname;
    } catch {
      return imageUrl;
    }
  }

  function scoreImageCandidate(candidate: ImageCandidate): number {
    const absolute = absoluteUrl(candidate.src, parsedUrl.toString());
    if (!absolute) return -Infinity;
    const imageUrl = upgradeShopifyImageUrl(absolute);
    if (!isLikelyProductImage(imageUrl)) return -Infinity;

    let score = 0;
    const area = getImageArea(imageUrl, candidate.width, candidate.height);
    const urlDims = parseDimensionsFromUrl(imageUrl);
    const width = urlDims?.width ?? parseDimension(candidate.width);
    const height = urlDims?.height ?? parseDimension(candidate.height);

    // Prefer reasonably large product images, but cap the size bonus so a
    // single giant lifestyle photo does not dominate the score.
    if (area) {
      score += Math.min(area / 1000, 2000);
    }

    // Small boost for structured data sources.
    if (candidate.source === "jsonld") score += 10;
    if (candidate.source === "og") score += 5;

    // Strongly prefer images with product-related alt text.
    const alt = candidate.alt.toLowerCase().trim();
    const nameLower = (name || "").toLowerCase();
    const productNameWords = nameLower.split(/\s+/).filter((w) => w.length > 2);
    const hasProductWord = alt.includes("product") || alt.includes("bar") || alt.includes("pack") || alt.includes("box");
    const hasProductName = productNameWords.some((word) => alt.includes(word));
    if (hasProductName || hasProductWord) {
      score += 1000;
    } else if (alt.length === 0 || alt === " " || alt.includes("image of") || alt.includes("photo of")) {
      // Weak/empty alt text is common for decorative lifestyle shots.
      score -= 300;
    }

    // Extra bonus when the alt text closely matches the product title (Amazon
    // main image usually has the exact title as alt).
    const normalizedAlt = alt.replace(/[^a-z0-9]/g, "");
    const normalizedName = nameLower.replace(/[^a-z0-9]/g, "");
    if (normalizedName && normalizedAlt === normalizedName) {
      score += 1500;
    }

    // Prefer the earliest product images in the DOM — the hero/gallery usually
    // appears before footer, testimonials, and upsell modules.
    if (candidate.domIndex >= 0) {
      score += Math.max(0, 100 - candidate.domIndex * 2);
    }

    // Penalty for tiny icons and flag images.
    if ((width && width < 100) || (height && height < 100)) {
      score -= 1000;
    }
    if (imageUrl.toLowerCase().includes("/flags/")) {
      score -= 1000;
    }

    // Penalty for lifestyle/people/testimonial images.
    if (/\b(photo of|image of|holding|wearing|lifestyle)\b/.test(alt)) {
      score -= 400;
    }

    // Penalty for Amazon product-recommendation sections ("Products related to
    // this item", "Frequently bought together", etc.). Only apply on Amazon pages
    // so that other sites' legitimate carousels (e.g. Huel gallery) are not hit.
    if (/\bamazon\./.test(parsedUrl.hostname) || imageUrl.toLowerCase().includes("amazon")) {
      const parentClasses = candidate.parentClasses.toLowerCase();
      if (
        parentClasses.includes("p13n") ||
        parentClasses.includes("sims-fbt") ||
        parentClasses.includes("carousel") ||
        parentClasses.includes("similarities") ||
        parentClasses.includes("s-result-list") ||
        parentClasses.includes("s-search-result")
      ) {
        score -= 1000;
      }
    }

    return score;
  }

  const scoredCandidates = imageCandidates
    .map((candidate) => ({
      candidate,
      score: scoreImageCandidate(candidate),
      url: upgradeShopifyImageUrl(absoluteUrl(candidate.src, parsedUrl.toString()) || ""),
    }))
    .filter((item) => item.score > -Infinity && item.url);

  scoredCandidates.sort((a, b) => b.score - a.score);

  const imageUrl = scoredCandidates[0]?.url ||
    imageCandidates
      .map((candidate) => upgradeShopifyImageUrl(absoluteUrl(candidate.src, parsedUrl.toString()) || ""))
      .filter((imageUrl) => imageUrl && !isTrackingPixel(imageUrl))[0] ||
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
