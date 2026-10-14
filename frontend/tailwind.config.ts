import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-jetbrains)", "ui-monospace", "SFMono-Regular", "monospace"],
      },
      colors: {
        vx: {
          bg: "#0a0e14",
          surface: "#10151f",
          surface2: "#161c2a",
          border: "#232b3d",
          muted: "#6b7794",
          text: "#e7ecf5",
          accent: "#3d7fff",
          accent2: "#7c5cff",
          buy: "#17c787",
          sell: "#ff4d6a",
          warn: "#ffb020",
        },
      },
      boxShadow: {
        glass: "0 1px 0 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)",
      },
      backgroundImage: {
        "vx-radial":
          "radial-gradient(60% 50% at 50% 0%, rgba(61,127,255,0.14) 0%, rgba(10,14,20,0) 60%)",
      },
    },
  },
  plugins: [],
};

export default config;
