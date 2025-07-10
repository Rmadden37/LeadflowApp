// Feature flags for form improvements
export const FEATURE_FLAGS = {
  USE_HTML_FORM: true, // Set to true to use pure HTML/CSS form instead of React Hook Form
  ENHANCED_ANTI_JUMP: true, // Enhanced anti-jump measures
  DEBUG_MODE: false, // Show debug information
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;
