// Gatehouse Configuration
// Environment-specific settings for the application

export const config = {
  // API Configuration
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || "http://192.168.64.7:8888/api/v1",
  },

  // App metadata
  app: {
    name: "Gatehouse",
    description: "Identity & Access Platform",
  },

  // Feature flags
  features: {
    devTools: import.meta.env.DEV,
  },
} as const;
