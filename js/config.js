/**
 * DOSSim Configuration
 * 
 * This file contains configuration settings for DOSSim.
 * Modify these settings to customize the behavior of the application.
 */

const DOSSimConfig = {
  // js-dos configuration
  jsDos: {
    wasm: true,
    cycles: "max",
    // Local path to GWBASIC.EXE
    gwBasicPath: "disk/GWBASIC.EXE"
  },
  
  // Initial virtual filesystem
  virtualFs: {
    initialFiles: ["README.TXT"],
    readmeContent: "Welcome to DOSSim!\r\nType HELP for available commands.\r\n"
  },
  
  // AI configuration
  ai: {
    // Set to true to use a real AI service instead of mock
    useRealAi: false,
    
    // API endpoint (only used if useRealAi is true)
    apiEndpoint: "https://api.example.com/generate",
    
    // API key (only used if useRealAi is true)
    apiKey: "",
    
    // Streaming parameters
    streamingDelay: 300 // ms between chunks in mock mode
  },
  
  // User interface settings
  ui: {
    promptText: "C:\\>",
    terminalWidth: 640,
    terminalHeight: 400
  },
  
  // System settings
  system: {
    pollingInterval: 500, // ms (increased from 100ms to 500ms)
    rateLimitInterval: 1000 // ms between commands
  }
};