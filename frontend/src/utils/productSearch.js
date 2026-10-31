import { resolvePricing } from "./pricing";

// Strip the things people type around a price: "tk", "৳", "taka", commas and spaces
const stripCurrency = (text) =>
  text
    .replace(/৳|tk\.?|taka|bdt/g, " ")
    .replace(/,/g, "")
    .replace(/\s+/g, " ")
    .trim();

// Read a price condition out of the search text.
// "120" -> exact, "under 200" / "<200" -> max, "above 500" / ">500" -> min, "100-200" -> range.
// Returns null when the text is not a price search.
export const parsePriceQuery = (rawQuery) => {
  const text = stripCurrency((rawQuery || "").toLowerCase());
  if (!text) return null;

  // "100-200", "100 to 200"
  const range = text.match(/^(\d+(?:\.\d+)?)\s*(?:-|to)\s*(\d+(?:\.\d+)?)$/);
  if (range) {
    const low = Number(range[1]);
    const high = Number(range[2]);
    return { min: Math.min(low, high), max: Math.max(low, high) };
  }

  // "under 200", "below 200", "less than 200", "<200", "<=200"
  const below = text.match(/^(?:under|below|less than|upto|up to|max|<=?)\s*(\d+(?:\.\d+)?)$/);
  if (below) return { max: Number(below[1]) };

  // "above 500", "over 500", "more than 500", ">500", ">=500"
  const above = text.match(/^(?:above|over|more than|min|>=?)\s*(\d+(?:\.\d+)?)$/);
  if (above) return { min: Number(above[1]) };

  // A bare number means "around this price", so similar priced products show up too
  const single = text.match(/^(\d+(?:\.\d+)?)$/);
  if (single) return { near: Number(single[1]) };

  return null;
};

// How far from the typed price still counts as a similar product: 20%, but never a window under 10
const NEAR_RATIO = 0.2;
const NEAR_MINIMUM = 10;

// The price window around a single typed number
const nearWindow = (target) => {
  const spread = Math.max(target * NEAR_RATIO, NEAR_MINIMUM);
  return { min: target - spread, max: target + spread };
};

// True when the product's selling price satisfies the parsed condition
const priceMatches = (product, condition) => {
  // Flash sale aware: compares what the customer actually pays
  const { price } = resolvePricing(product);

  // A single number matches anything priced close to it
  if (condition.near != null) {
    const { min, max } = nearWindow(condition.near);
    return price >= min && price <= max;
  }

  if (condition.min != null && price < condition.min) return false;
  if (condition.max != null && price > condition.max) return false;
  return true;
};

// Does this product match what was typed: name, category, description or price
export const matchesSearch = (product, rawQuery) => {
  const query = (rawQuery || "").toLowerCase().trim();
  // An empty search matches everything, same as before
  if (!query) return true;

  // Text match on name, category and description
  if (
    product?.name?.toLowerCase().includes(query) ||
    product?.category?.toLowerCase().includes(query) ||
    product?.description?.toLowerCase().includes(query)
  ) {
    return true;
  }

  // Price match, only when the text reads like a price
  const condition = parsePriceQuery(query);
  return condition ? priceMatches(product, condition) : false;
};

export default matchesSearch;
