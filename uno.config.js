// uno.config.ts
import {
  defineConfig,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from "unocss";
import presetRemToPx from "@unocss/preset-rem-to-px";

export default defineConfig({
  shortcuts: {
    "flex-center": "flex justify-center items-center",
    "flex-x-center": "flex justify-center",
    "flex-y-center": "flex items-center",
    "wh-full": "w-full h-full",
    "flex-x-between": "flex items-center justify-between",
    "flex-x-end": "flex items-center justify-end",
    "absolute-lt": "absolute left-0 top-0",
    "absolute-rt": "absolute right-0 top-0 ",
    "fixed-lt": "fixed left-0 top-0",
  },
  rules: [
    ["h-full-2d", { height: "calc(100% - var(--el-menu-horizontal-height))" }],
    [
      "backdrop-filter-mask",
      {
        "backdrop-filter": "blur(2px)",
      },
    ],
  ],
  theme: {
    fontSize: {
      xs: "12px",
    },
    colors: {
      primary: "var(--el-bg-color)",
      primary_dark: "var(--el-bg-color)",
      primary_text: "var(--el-text-color-primary)",
    },
  },
  presets: [
    presetUno(),
    presetRemToPx({
      baseFontSize: 4,
    }),
  ],
  transformers: [transformerDirectives(), transformerVariantGroup()],
});
