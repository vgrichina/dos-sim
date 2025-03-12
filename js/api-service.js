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
 * OpenRouter AI Client for production use
 * Connects to OpenRouter API for code generation
 */
class OpenRouterClient extends BaseAIClient {
  constructor(apiKey, model = "anthropic/claude-3-haiku") {
    super();
    this.apiKey = apiKey;
    this.model = model;
    this.apiEndpoint = "https://openrouter.ai/api/v1/chat/completions";
    // Enable debug mode by default to false
    this.debugEnabled = false;
  }
  
  setDebugEnabled(enabled) {
    this.debugEnabled = enabled;
    console.log(`Debug mode ${enabled ? 'enabled' : 'disabled'} for OpenRouter client`);
  }
  
  async generateStream(prompt) {
    if (this.debugEnabled) {
      console.log("Debug mode enabled - using mock implementation");
      // Use mock implementation for debugging
      const mockClient = new MockAIClient(300);
      return mockClient.generateStream(prompt);
    }
    
    console.log(`Using OpenRouter API (${this.model}) for generation`);
    
    const { filename, options } = this.parsePrompt(prompt);
    
    const systemPrompt = `You are an expert GW-BASIC programmer in an MS-DOS environment from the early 1990s. 
Your task is to generate GW-BASIC code that runs on MS-DOS machines with GWBASIC.EXE or QB.EXE.

When writing GW-BASIC programs:
1. Focus on creating functional, well-structured code
2. Use line numbers in increments of 10
3. Include comments for key sections
4. Use proper BASIC syntax and commands
5. Make the program user-friendly

The code should be output with NO markdown formatting or explanation - ONLY output the raw BASIC code.
Do not use any special instructions or notes, just the BASIC code itself.`;

    try {
      const response = await fetch(this.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          'HTTP-Referer': 'https://dossim.app',
          'X-Title': 'DOSSim BASIC Generator'
        },
        body: JSON.stringify({
          model: this.model,
          stream: true,
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: `Create a GW-BASIC program named ${filename} with the following options: ${options.join(", ")}`
            }
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed: ${response.status} - ${errorText}`);
      }
      
      // Parse the streaming response from OpenRouter
      const reader = response.body.getReader();
      
      return (async function* () {
        let accumulatedCode = "";
        const decoder = new TextDecoder();
        
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          // Convert the chunk to text and parse as JSON
          const chunk = decoder.decode(value);
          
          // Process each line separately (OpenRouter sends multiple JSON objects)
          const lines = chunk.split('\n').filter(line => line.trim() !== '');
          
          for (const line of lines) {
            try {
              // Skip "data: [DONE]" message
              if (line === 'data: [DONE]') continue;
              
              // Remove "data: " prefix if present
              const jsonStr = line.startsWith('data: ') ? line.substring(6) : line;
              const data = JSON.parse(jsonStr);
              
              // Extract content from the delta or choices
              let content = '';
              if (data.choices && data.choices.length > 0) {
                if (data.choices[0].delta && data.choices[0].delta.content) {
                  content = data.choices[0].delta.content;
                } else if (data.choices[0].message && data.choices[0].message.content) {
                  content = data.choices[0].message.content;
                }
              }
              
              if (content) {
                accumulatedCode += content;
                yield accumulatedCode;
              }
            } catch (error) {
              console.warn("Error parsing JSON from stream:", error, "Line:", line);
              // Continue with the next line
            }
          }
        }
      })();
    } catch (error) {
      console.error("Error generating with OpenRouter:", error);
      throw error;
    }
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
      // Create OpenRouter client
      const client = new OpenRouterClient(
        config.apiKey, 
        config.model || "anthropic/claude-3-haiku"
      );
      return client;
    } else {
      return new MockAIClient(config.streamingDelay);
    }
  }
}

// Global function to toggle debug mode
window.setAIDebugEnabled = function(enabled = true) {
  const config = DOSSimConfig.ai;
  const client = AIClientFactory.createClient(config);
  
  if (client instanceof OpenRouterClient) {
    client.setDebugEnabled(enabled);
    console.log(`AI debug mode ${enabled ? 'enabled' : 'disabled'}`);
    return true;
  } else {
    console.log("Debug mode can only be set when using the OpenRouter client");
    return false;
  }
};