import "dotenv/config";

export const PORT = process.env.PORT || 3001;
export const CORS_ORIGIN = process.env.CORS_ORIGIN || "*";
export const REDIRECT_URL = process.env.REDIRECT_URL || "http://localhost:5173";
export const STRIPE_SECRET = process.env.STRIPE_SECRET || "";
export const STRIPE_ENDPOINT_SECRET = process.env.STRIPE_ENDPOINT_SECRET || "";
