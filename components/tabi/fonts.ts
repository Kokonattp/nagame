import { Prompt } from "next/font/google";

// Heading font for Tabi (self-hosted by Next, exposed as --font-prompt for tabi.css).
export const prompt = Prompt({ subsets: ["thai", "latin"], weight: ["500", "600", "700"], variable: "--font-prompt", display: "swap" });
