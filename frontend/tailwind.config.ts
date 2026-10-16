import type { Config } from "tailwindcss";

/** Theme colours are CSS variables (see globals.css) so one class works in light and dark. */
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  darkMode: ["class", '[data-theme="dark"]'],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-plex)", "ui-sans-serif", "system-ui", "sans-serif"],
        condensed: ["var(--font-plex-condensed)", "var(--font-plex)", "ui-sans-serif", "sans-serif"],
        mono: ["var(--font-mono)", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      fontSize: {
        // Scale for a dense, data-heavy interface: 12 / 13 / 14 / 16 / 20 / 28 / 40.
        "2xs": ["0.75rem", { lineHeight: "1rem" }],
        xs: ["0.8125rem", { lineHeight: "1.125rem" }],
        sm: ["0.875rem", { lineHeight: "1.375rem" }],
        base: ["1rem", { lineHeight: "1.5rem" }],
        lg: ["1.25rem", { lineHeight: "1.75rem", letterSpacing: "-0.01em" }],
        xl: ["1.75rem", { lineHeight: "2.125rem", letterSpacing: "-0.02em" }],
        "2xl": ["2.5rem", { lineHeight: "2.75rem", letterSpacing: "-0.025em" }],
      },
      colors: {
        canvas: token("canvas"),
        surface: token("surface"),
        raised: token("raised"),
        line: token("line"),
        ink: token("ink"),
        muted: token("muted"),
        accent: { DEFAULT: token("accent"), soft: token("accent-soft"), ink: token("accent-ink") },
        glow: token("glow"),
        buy: { DEFAULT: token("buy"), soft: token("buy-soft") },
        sell: { DEFAULT: token("sell"), soft: token("sell-soft") },
        warn: { DEFAULT: token("warn"), soft: token("warn-soft") },
        // Legacy names used by pages not yet moved to the tokens above.
        vx: {
          bg: token("canvas"),
          surface: token("surface"),
          surface2: token("raised"),
          border: token("line"),
          muted: token("muted"),
          text: token("ink"),
          accent: token("accent"),
          accent2: token("accent"),
          buy: token("buy"),
          sell: token("sell"),
          warn: token("warn"),
        },
      },
      borderRadius: {
        // Containers are rounder than the controls inside them.
        panel: "14px",
        control: "8px",
      },
      backgroundImage: {
        "vx-radial": "radial-gradient(60% 50% at 50% 0%, rgb(var(--accent) / 0.10) 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
