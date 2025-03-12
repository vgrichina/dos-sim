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
    
    // Process options - convert both "/option" and "option" formats to lowercase
    const options = parts.slice(1).map(opt => {
      // Strip the leading slash if it exists
      const cleanOpt = opt.startsWith("/") ? opt.substring(1) : opt;
      // Convert to lowercase for case-insensitive option handling
      return cleanOpt.toLowerCase();
    });
    
    console.log(`Parsed prompt: filename=${filename}, options=${options.join(', ')}`);
    return { filename, options };
  }
}

/**
 * OpenRouter AI Client for production use
 * Connects to OpenRouter API for code generation
 */
class OpenRouterClient extends BaseAIClient {
  constructor(apiKey, model = "anthropic/claude-3.5-sonnet") {
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
    
    // Load example QBasic files if requested
    const loadExampleFile = async (filename) => {
      try {
        const response = await fetch(`qbasic-examples/${filename}`);
        if (!response.ok) {
          console.error(`Failed to load example file ${filename}: ${response.status}`);
          return null;
        }
        return await response.text();
      } catch (error) {
        console.error(`Error loading example file ${filename}:`, error);
        return null;
      }
    };

    // Build the system prompt with optional example files
    let systemPromptText = `You are an expert QBasic 4.5 programmer in an MS-DOS environment from the mid-1990s. 
Your task is to generate QBasic code that runs on MS-DOS machines with QB.EXE.

When writing QBasic programs:
1. Focus on creating functional, well-structured code
2. Use modern QBasic syntax without requiring line numbers
3. Use SUB and FUNCTION procedures for modular design
4. Include comments for key sections
5. Use proper QBasic syntax and commands
6. Make the program user-friendly with clear UI
7. Use QBasic 4.5 features like better graphics, mouse support where appropriate
8. Never use reserved words as variable names or identifiers

The following is a complete list of Microsoft QBasic reserved words to avoid using as variable names:
ABS, ACCESS, ALIAS, AND, ANY, APPEND, AS, ASC, ATN, BASE, BEEP, BINARY, BLOAD, BSAVE, BYVAL, CALL, CALLS, CASE, CDBL, CDECL, 
CHAIN, CHDIR, CHR$, CINT, CIRCLE, CLEAR, CLNG, CLOSE, CLS, COLOR, COM, COMMAND$, COMMON, CONST, COS, CSNG, CSRLIN, CVD, CVDMBF, CVI, 
CVL, CVS, CVSMBF, DATA, DATE$, DECLARE, DEF, DEFDBL, DEFINT, DEFLNG, DEFSNG, DEFSTR, DIM, DO, DOUBLE, DRAW, ELSE, ELSEIF, END, ENDIF, 
ENVIRON, ENVIRON$, EOF, EQV, ERASE, ERDEV, ERDEV$, ERL, ERR, ERROR, EXIT, EXP, FIELD, FILEATTR, FILES, FIX, FOR, FRE, FREEFILE, 
FUNCTION, GET, GOSUB, GOTO, HEX$, IF, IMP, INKEY$, INP, INPUT, INPUT$, INSTR, INT, INTEGER, IOCTL, IOCTL$, IS, KEY, KILL, LBOUND, 
LCASE$, LEFT$, LEN, LET, LINE, LIST, LOC, LOCAL, LOCATE, LOCK, LOF, LOG, LONG, LOOP, LPOS, LPRINT, LSET, LTRIM$, MID$, MKD$, MKDIR, 
MKDMBF$, MKI$, MKL$, MKS$, MKSMBF$, MOD, NAME, NEXT, NOT, OCT$, OFF, ON, OPEN, OPTION, OR, OUT, OUTPUT, PAINT, PALETTE, PCOPY, PEEK, 
PEN, PLAY, PMAP, POINT, POKE, POS, PRESET, PRINT, PSET, PUT, RANDOM, RANDOMIZE, READ, REDIM, REM, RESET, RESTORE, RESUME, RETURN, 
RIGHT$, RMDIR, RND, RSET, RTRIM$, RUN, SADD, SCREEN, SEEK, SEG, SELECT, SETMEM, SGN, SHARED, SHELL, SIGNAL, SIN, SINGLE, SLEEP, 
SOUND, SPACE$, SPC, SQR, STATIC, STEP, STICK, STOP, STR$, STRIG, STRING, STRING$, SUB, SWAP, SYSTEM, TAB, TAN, THEN, TIME$, TIMER, 
TO, TROFF, TRON, TYPE, UBOUND, UCASE$, UEVENT, UNLOCK, UNTIL, USING, VAL, VARPTR, VARPTR$, VARSEG, VIEW, WAIT, WEND, WHILE, WIDTH, 
WINDOW, WRITE, XOR`;

    // Always load example files
    console.log("Loading QBasic example files...");
    const exampleFiles = ["NIBBLES.BAS", "MONEY.BAS"];
    const exampleContents = await Promise.all(exampleFiles.map(file => loadExampleFile(file)));
    
    // Filter out any files that failed to load
    const loadedExamples = exampleFiles.filter((_, index) => exampleContents[index] !== null);
    const loadedContents = exampleContents.filter(content => content !== null);
    
    if (loadedExamples.length > 0) {
      systemPromptText += `\n\nHere are some examples of well-structured QBasic programs to learn from:\n`;
      
      for (let i = 0; i < loadedExamples.length; i++) {
        const description = loadedExamples[i] === "NIBBLES.BAS" ? 
          "A snake game implemented in QBasic" : 
          "A personal finance manager in QBasic";
          
        systemPromptText += `\nExample ${i+1}: ${loadedExamples[i]} - ${description}
\`\`\`qbasic
${loadedContents[i]}
\`\`\`\n`;
      }
      
      systemPromptText += `\nUse these as references for QBasic coding style, structure and techniques. Your task is to create a new, original program based on the user's request, not to modify these examples.`;
    }

    // Add the final instruction
    systemPromptText += `\n\nThe code should be output with NO markdown formatting or explanation - ONLY output the raw QBasic code.
Do not use any special instructions or notes, just the QBasic code itself.`;

    const systemPrompt = systemPromptText;

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
              content: `Create a QBasic 4.5 program named ${filename} with the following options: ${options.join(", ")}`
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
    
    // Generate QBasic 4.5 code based on the app name and options
    chunks.push("' " + appName + " - QBasic 4.5 Generated App\n");
    chunks.push("' Options: " + options.join(", ") + "\n\n");
    chunks.push("SCREEN 12  ' High resolution graphics mode\n");
    chunks.push("CLS\n\n");
    
    if (appName.includes("MARIO")) {
      chunks.push("' Main program\n");
      chunks.push("COLOR 14\n");
      chunks.push("PRINT \"It's-a me, Mario!\"\n");
      
      if (options.includes("no-koopas")) {
        chunks.push("COLOR 10\n");
        chunks.push("PRINT \"No Koopas mode activated!\"\n");
      }
      
      if (options.includes("play-as-princess")) {
        chunks.push("COLOR 13\n");
        chunks.push("PRINT \"Playing as Princess Peach!\"\n");
      }
      
      chunks.push("\nCOLOR 7\n");
      chunks.push("PRINT \"Press any key to continue...\"\n");
      chunks.push("SLEEP\n");
      chunks.push("CLS\n");
      chunks.push("PRINT \"Game would start here...\"\n");
      chunks.push("PRINT \"Press any key to exit\"\n");
      chunks.push("SLEEP\n");
      chunks.push("SYSTEM\n");
    } else if (appName.includes("SNAKE")) {
      chunks.push("' Snake game variables\n");
      chunks.push("DIM snakeX(100), snakeY(100) AS INTEGER\n");
      chunks.push("length = 5  ' Initial snake length\n\n");
      chunks.push("' Display instructions\n");
      chunks.push("COLOR 10\n");
      chunks.push("PRINT \"SNAKE GAME\"\n");
      chunks.push("COLOR 7\n");
      chunks.push("PRINT \"Use WASD to move\"\n");
      chunks.push("PRINT \"Collect food (*) to grow\"\n");
      chunks.push("PRINT\n");
      chunks.push("PRINT \"Press any key to play...\"\n");
      chunks.push("SLEEP\n"); 
      chunks.push("CLS\n");
      chunks.push("PRINT \"Game is simulated. Thanks for playing!\"\n");
      chunks.push("PRINT \"Press any key to exit\"\n");
      chunks.push("SLEEP\n");
      chunks.push("SYSTEM\n");
    } else if (appName.includes("CALC")) {
      chunks.push("' Calculator functions\n");
      chunks.push("FUNCTION Add(a, b)\n");
      chunks.push("  Add = a + b\n");
      chunks.push("END FUNCTION\n\n");
      chunks.push("FUNCTION Subtract(a, b)\n");
      chunks.push("  Subtract = a - b\n");
      chunks.push("END FUNCTION\n\n");
      chunks.push("' Main program\n");
      chunks.push("COLOR 11\n");
      chunks.push("PRINT \"QBasic Calculator\"\n");
      chunks.push("PRINT \"---------------\"\n");
      chunks.push("COLOR 7\n");
      chunks.push("INPUT \"Enter first number: \", a\n");
      chunks.push("INPUT \"Enter second number: \", b\n");
      chunks.push("PRINT\n");
      chunks.push("PRINT \"Results:\"\n");
      chunks.push("PRINT a; \" + \"; b; \" = \"; Add(a, b)\n");
      chunks.push("PRINT a; \" - \"; b; \" = \"; Subtract(a, b)\n");
      chunks.push("PRINT a; \" * \"; b; \" = \"; a * b\n");
      chunks.push("IF b <> 0 THEN\n");
      chunks.push("  PRINT a; \" / \"; b; \" = \"; a / b\n");
      chunks.push("ELSE\n");
      chunks.push("  PRINT \"Division by zero!\"\n");
      chunks.push("END IF\n");
      chunks.push("PRINT\n");
      chunks.push("PRINT \"Press any key to exit\"\n");
      chunks.push("SLEEP\n");
      chunks.push("SYSTEM\n");
    } else {
      chunks.push("' Main program\n");
      chunks.push("COLOR 14\n");
      chunks.push("PRINT \"This is a simple " + appName + " app\"\n");
      chunks.push("COLOR 7\n");
      chunks.push("PRINT\n");
      chunks.push("PRINT \"Press any key to exit...\"\n");
      chunks.push("SLEEP\n");
      chunks.push("SYSTEM\n");
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
        config.model || "anthropic/claude-3.5-sonnet"
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