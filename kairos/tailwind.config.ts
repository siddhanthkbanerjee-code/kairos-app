import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        kairos: {
          base: "#0a0a12",
          elevated: "#14141f",
        },
        accent: {
          purple: "#a855f7",
          rose: "#f472b6",
          indigo: "#6366f1",
        },
      },
      fontFamily: {
        editorial: ["var(--font-editorial)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        sm: "8px",
        md: "12px",
        lg: "16px",
        xl: "20px",
      },
    },
  },
};

export default config;
