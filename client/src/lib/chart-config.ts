
import { type ChartConfig } from "@/components/ui/chart";

const THEMES = { light: "", dark: ".dark" } as const;

export const CHART_COLORS = {
  light: {
    chart1: "#FB7185", // red
    chart2: "#4ADE80", // green
    chart3: "#FDE047", // yellow
    chart4: "#38BDF8", // blue
    chart5: "#A78BFA", // purple
  },
  dark: {
    chart1: "#E14D62", // dark red
    chart2: "#22C55E", // dark green
    chart3: "#FFD700", // dark yellow
    chart4: "#2196F3", // dark blue
    chart5: "#7C3AED", // dark purple
  },
};

export const generateChartConfig = (): ChartConfig => ({
  chart1: {
    theme: {
      light: CHART_COLORS.light.chart1,
      dark: CHART_COLORS.dark.chart1,
    },
  },
  chart2: {
    theme: {
      light: CHART_COLORS.light.chart2,
      dark: CHART_COLORS.dark.chart2,
    },
  },
  chart3: {
    theme: {
      light: CHART_COLORS.light.chart3,
      dark: CHART_COLORS.dark.chart3,
    },
  },
  chart4: {
    theme: {
      light: CHART_COLORS.light.chart4,
      dark: CHART_COLORS.dark.chart4,
    },
  },
  chart5: {
    theme: {
      light: CHART_COLORS.light.chart5,
      dark: CHART_COLORS.dark.chart5,
    },
  },
});
