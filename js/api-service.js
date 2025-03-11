/**
 * DOSSim - AI API Service
 * 
 * This file contains API service implementations for DOSSim.
 * It provides different API clients for generating BASIC code based on prompts.
 */

/**
 * Base AI Client interface
 */
class BaseAIClient {
  constructor() {
    if (this.constructor === BaseAIClient) {
      throw new Error("Cannot instantiate abstract class BaseAIClient");
    }
  }
  
  async generateStream(prompt) {
    throw new Error("Method 'generateStream' must be implemented");
  }
  
  parsePrompt(prompt) {
    const parts = prompt.split(" ");
    const filename = parts[0];
    const options = parts.slice(1).map(opt => {
      if (opt.startsWith("/")) {
        return opt.substring(1);
      }
      return opt;
    });
    
    return { filename, options };
  }
}

/**
 * Real AI Client for production use
 * Connects to an actual AI API for code generation
 */
class RealAIClient extends BaseAIClient {
  constructor(apiEndpoint, apiKey) {
    super();
    this.apiEndpoint = apiEndpoint;
    this.apiKey = apiKey;
  }
  
  async generateStream(prompt) {
    console.log("Using real AI API for generation");
    
    // This is a placeholder for an actual API implementation
    // You would need to implement this based on your chosen AI API
    const response = await fetch(this.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        prompt: `Generate a GW-BASIC program for: ${prompt}`,
        stream: true,
        max_tokens: 1000,
        temperature: 0.7
      })
    });
    
    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }
    
    // Parse the streaming response
    // This would need to be customized based on the specific API's streaming format
    const reader = response.body.getReader();
    
    return (async function* () {
      let accumulatedCode = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the chunk to text and process it
        const chunk = new TextDecoder().decode(value);
        // This is just a placeholder - you'd need to parse the chunk based on the API format
        const codeChunk = chunk; // In a real implementation, extract the code from the chunk
        
        accumulatedCode += codeChunk;
        yield accumulatedCode;
      }
    })();
  }
}

/**
 * Mock AI Client for development and demo purposes
 * Generates simple BASIC code examples without an external API
 */
class MockAIClient extends BaseAIClient {
  constructor(streamingDelay = 300) {
    super();
    this.streamingDelay = streamingDelay;
  }
  
  async generateStream(prompt) {
    const chunks = [];
    const params = this.parsePrompt(prompt);
    
    // Basic parsing of the prompt
    const appName = params.filename;
    const options = params.options;
    
    // Generate simple BASIC code based on the app name and options
    chunks.push("10 CLS\n");
    chunks.push("20 PRINT \"" + appName + " - Generated App\"\n");
    chunks.push("30 PRINT \"Options: " + options.join(", ") + "\"\n");
    
    if (appName.includes("MARIO")) {
      chunks.push("40 PRINT\n");
      chunks.push("50 PRINT \"It's-a me, Mario!\"\n");
      
      if (options.includes("no-koopas")) {
        chunks.push("60 PRINT \"No Koopas mode activated!\"\n");
      }
      
      if (options.includes("play-as-princess")) {
        chunks.push("70 PRINT \"Playing as Princess Peach!\"\n");
      }
      
      chunks.push("80 PRINT\n");
      chunks.push("90 INPUT \"Press ENTER to continue...\", A$\n");
      chunks.push("100 GOTO 10\n");
    } else if (appName.includes("SNAKE")) {
      chunks.push("40 PRINT\n");
      chunks.push("50 PRINT \"SNAKE GAME\"\n");
      chunks.push("60 PRINT \"Use WASD to move\"\n");
      chunks.push("70 PRINT \"Collect food (*) to grow\"\n");
      chunks.push("80 PRINT\n");
      chunks.push("90 PRINT \"Press ENTER to play...\"\n");
      chunks.push("100 INPUT A$\n"); 
      chunks.push("110 PRINT \"Game is simulated. Thanks for playing!\"\n");
      chunks.push("120 INPUT \"Press ENTER to exit\", A$\n");
      chunks.push("130 SYSTEM\n");
    } else if (appName.includes("CALC")) {
      chunks.push("40 PRINT\n");
      chunks.push("50 PRINT \"BASIC Calculator\"\n");
      chunks.push("60 PRINT \"---------------\"\n");
      chunks.push("70 INPUT \"Enter first number: \", A\n");
      chunks.push("80 INPUT \"Enter second number: \", B\n");
      chunks.push("90 PRINT\n");
      chunks.push("100 PRINT \"Results:\"\n");
      chunks.push("110 PRINT A; \" + \"; B; \" = \"; A+B\n");
      chunks.push("120 PRINT A; \" - \"; B; \" = \"; A-B\n");
      chunks.push("130 PRINT A; \" * \"; B; \" = \"; A*B\n");
      chunks.push("140 IF B <> 0 THEN PRINT A; \" / \"; B; \" = \"; A/B ELSE PRINT \"Division by zero!\"\n");
      chunks.push("150 PRINT\n");
      chunks.push("160 INPUT \"Press ENTER to exit\", X$\n");
      chunks.push("170 SYSTEM\n");
    } else {
      chunks.push("40 PRINT\n");
      chunks.push("50 PRINT \"This is a simple " + appName + " app\"\n");
      chunks.push("60 PRINT\n");
      chunks.push("70 INPUT \"Press ENTER to exit...\", A$\n");
      chunks.push("80 SYSTEM\n");
    }
    
    // Return an async generator to simulate streaming
    return (async function* () {
      let code = "";
      for (const chunk of chunks) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, this.streamingDelay));
        code += chunk;
        yield code;
      }
    }).bind(this)();
  }
}

/**
 * AI Client Factory
 * Creates the appropriate AI client based on configuration
 */
class AIClientFactory {
  static createClient(config) {
    if (config.useRealAi) {
      return new RealAIClient(config.apiEndpoint, config.apiKey);
    } else {
      return new MockAIClient(config.streamingDelay);
    }
  }
}