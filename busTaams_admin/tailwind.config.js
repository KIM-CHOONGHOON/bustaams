/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── 홈페이지 브랜드 토큰 (HTML 템플릿 기준) ──────────────────────
        "primary":                    "#002045",
        "on-primary":                 "#ffffff",
        "primary-container":          "#1a365d",
        "on-primary-container":       "#86a0cd",
        "primary-fixed":              "#d6e3ff",
        "primary-fixed-dim":          "#adc7f7",
        "on-primary-fixed":           "#001b3c",
        "on-primary-fixed-variant":   "#2d476f",
        "inverse-primary":            "#adc7f7",
        "surface-tint":               "#455f88",

        "secondary":                  "#126c40",
        "on-secondary":               "#ffffff",
        "secondary-container":        "#a1f5bc",
        "on-secondary-container":     "#1c7245",
        "secondary-fixed":            "#a1f5bc",
        "secondary-fixed-dim":        "#85d8a2",
        "on-secondary-fixed":         "#00210f",
        "on-secondary-fixed-variant": "#00522d",

        "tertiary":                   "#002627",
        "on-tertiary":                "#ffffff",
        "tertiary-container":         "#003d3f",
        "on-tertiary-container":      "#45aeb2",
        "tertiary-fixed":             "#8ff3f6",
        "tertiary-fixed-dim":         "#72d6da",
        "on-tertiary-fixed":          "#002021",
        "on-tertiary-fixed-variant":  "#004f52",

        "error":                      "#ba1a1a",
        "on-error":                   "#ffffff",
        "error-container":            "#ffdad6",
        "on-error-container":         "#93000a",

        "background":                 "#e8eaed",
        "on-background":              "#191c1e",
        "surface":                    "#e8eaed",
        "on-surface":                 "#191c1e",
        "surface-variant":            "#e0e3e5",
        "on-surface-variant":         "#43474e",
        "surface-dim":                "#d8dadc",
        "surface-bright":             "#e8eaed",
        "surface-container-lowest":   "#ffffff",
        "surface-container-low":      "#f2f4f6",
        "surface-container":          "#eceef0",
        "surface-container-high":     "#e6e8ea",
        "surface-container-highest":  "#e0e3e5",
        "inverse-surface":            "#2d3133",
        "inverse-on-surface":         "#eff1f3",

        "outline":                    "#74777f",
        "outline-variant":            "#c4c6cf",
      },

      fontFamily: {
        sans:              ['Inter', 'Pretendard', 'sans-serif'],
        "headline-lg":     ['"Hanken Grotesk"', 'sans-serif'],
        "headline-md":     ['"Hanken Grotesk"', 'sans-serif'],
        "body-lg":         ['"Hanken Grotesk"', 'sans-serif'],
        "body-md":         ['"Hanken Grotesk"', 'sans-serif'],
        "button-text":     ['"Hanken Grotesk"', 'sans-serif'],
        "label-technical": ['"JetBrains Mono"', 'monospace'],
      },

      fontSize: {
        "headline-lg":        ["40px", { lineHeight: "48px", letterSpacing: "-0.02em", fontWeight: "700" }],
        "headline-lg-mobile": ["30px", { lineHeight: "36px", letterSpacing: "-0.01em", fontWeight: "700" }],
        "headline-md":        ["24px", { lineHeight: "32px", fontWeight: "600" }],
        "body-lg":            ["18px", { lineHeight: "28px", fontWeight: "400" }],
        "body-md":            ["16px", { lineHeight: "24px", fontWeight: "400" }],
        "button-text":        ["15px", { lineHeight: "20px", fontWeight: "600" }],
        "label-technical":    ["13px", { lineHeight: "16px", letterSpacing: "0.05em", fontWeight: "500" }],
      },

      spacing: {
        unit:             "4px",
        gutter:           "24px",
        "margin-desktop": "64px",
        "margin-mobile":  "16px",
      },

      maxWidth: {
        "container-max": "1280px",
      },
    },
  },
  plugins: [],
}
