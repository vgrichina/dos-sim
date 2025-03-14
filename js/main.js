/**
 * DOSSim - DOS Simulation Environment
 * 
 * This file implements the core functionality for DOSSim, a browser-based platform
 * where users can run standard DOS commands and generate simple DOS apps/games
 * from natural language prompts using js-dos and an external AI API.
 */

// CMD.BAS will be loaded from disk/CMD.BAS file, see initialization code

// Global variables
let commandInterface; // CommandInterface from js-dos
let lastQueryTime = 0; // Prevent spam
let virtualFiles = DOSSimConfig.virtualFs.initialFiles.slice(); // Copy of initial files in our virtual FS

// Helper function to find a file in the js-dos file tree
function findFile(node, filename) {
  if (!node || !node.nodes) return null;
  
  for (const child of node.nodes) {
    if (child.name.toUpperCase() === filename.toUpperCase()) {
      return child.name; // Return actual filename with correct case
    }
    
    // Recursively search subdirectories
    if (child.nodes) {
      const found = findFile(child, filename);
      if (found) return found;
    }
  }
  return null;
}

// Use AI clients from api-service.js

// Clean up DOSBox when we're done
async function cleanupDosBox() {
  if (commandInterface) {
    try {
      console.log("Shutting down DOSBox...");
      await commandInterface.exit();
      commandInterface = null;
      console.log("DOSBox shutdown complete");
    } catch (error) {
      console.error("Error shutting down DOSBox:", error);
    }
  }
}

// Initialize js-dos when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  // Load settings before initializing (settings.js handles this)
  
  // Create AI client with current config
  const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
  
  try {
    console.log("Initializing js-dos with config:", {
      useRealAi: DOSSimConfig.ai.useRealAi,
      model: DOSSimConfig.ai.model
    });
    // Fetch the required files
    console.log("Fetching required files...");
    
    // Define all files by type for consistent handling
    const allFiles = [
      // Core binary files
      { name: "QB.EXE", type: "binary" },
      { name: "UHEX.COM", type: "binary" },
      { name: "LESS.EXE", type: "binary" },
      
      // QBasic support files
      { name: "QB.BI", type: "binary" },
      { name: "QB.LIB", type: "binary" },
      { name: "QB.PIF", type: "binary" },
      { name: "QB.QLB", type: "binary" },
      
      // Core BASIC files
      { name: "CMD.BAS", type: "text" },
      { name: "TEST.BAS", type: "text" },
      { name: "README.TXT", type: "text" },
      
      // All QBasic examples in a flat EXAMPLES directory structure
      // Main examples
      { name: "EXAMPLES/NIBBLES.BAS", type: "text", source: "examples/NIBBLES.BAS" },
      { name: "EXAMPLES/MONEY.BAS", type: "text", source: "examples/MONEY.BAS" },
      { name: "EXAMPLES/GORILLA.BAS", type: "text", source: "examples/GORILLA.BAS" },
      { name: "EXAMPLES/TORUS.BAS", type: "text", source: "examples/TORUS.BAS" },
      { name: "EXAMPLES/QCARDS.BAS", type: "text", source: "examples/QCARDS.BAS" },
      { name: "EXAMPLES/DEMO1.BAS", type: "text", source: "examples/DEMO1.BAS" },
      { name: "EXAMPLES/DEMO2.BAS", type: "text", source: "examples/DEMO2.BAS" },
      { name: "EXAMPLES/DEMO3.BAS", type: "text", source: "examples/DEMO3.BAS" },
      { name: "EXAMPLES/REMLINE.BAS", type: "text", source: "examples/REMLINE.BAS" },
      { name: "EXAMPLES/SORTDEMO.BAS", type: "text", source: "examples/SORTDEMO.BAS" },
      
      // Advanced examples
      { name: "EXAMPLES/CALL_EX.BAS", type: "text", source: "examples/ADVR_EX/CALL_EX.BAS" },
      { name: "EXAMPLES/CHR_EX.BAS", type: "text", source: "examples/ADVR_EX/CHR_EX.BAS" },
      { name: "EXAMPLES/CMD_EX.BAS", type: "text", source: "examples/ADVR_EX/CMD_EX.BAS" },
      { name: "EXAMPLES/COM1_EX.BAS", type: "text", source: "examples/ADVR_EX/COM1_EX.BAS" },
      { name: "EXAMPLES/COM2_EX.BAS", type: "text", source: "examples/ADVR_EX/COM2_EX.BAS" },
      { name: "EXAMPLES/CSR_EX.BAS", type: "text", source: "examples/ADVR_EX/CSR_EX.BAS" },
      { name: "EXAMPLES/DECL_EX.BAS", type: "text", source: "examples/ADVR_EX/DECL_EX.BAS" },
      { name: "EXAMPLES/DEFFN_EX.BAS", type: "text", source: "examples/ADVR_EX/DEFFN_EX.BAS" },
      { name: "EXAMPLES/DEFSG_EX.BAS", type: "text", source: "examples/ADVR_EX/DEFSG_EX.BAS" },
      { name: "EXAMPLES/DRAW_EX.BAS", type: "text", source: "examples/ADVR_EX/DRAW_EX.BAS" },
      { name: "EXAMPLES/FUNC_EX.BAS", type: "text", source: "examples/ADVR_EX/FUNC_EX.BAS" },
      { name: "EXAMPLES/OUT_EX.BAS", type: "text", source: "examples/ADVR_EX/OUT_EX.BAS" },
      { name: "EXAMPLES/SHARE_EX.BAS", type: "text", source: "examples/ADVR_EX/SHARE_EX.BAS" },
      { name: "EXAMPLES/SHELL_EX.BAS", type: "text", source: "examples/ADVR_EX/SHELL_EX.BAS" },
      { name: "EXAMPLES/STAT_EX.BAS", type: "text", source: "examples/ADVR_EX/STAT_EX.BAS" },
      { name: "EXAMPLES/SUB_EX.BAS", type: "text", source: "examples/ADVR_EX/SUB_EX.BAS" },
      { name: "EXAMPLES/TYPE_EX.BAS", type: "text", source: "examples/ADVR_EX/TYPE_EX.BAS" },
      { name: "EXAMPLES/UBO_EX.BAS", type: "text", source: "examples/ADVR_EX/UBO_EX.BAS" },
      { name: "EXAMPLES/UCASE_EX.BAS", type: "text", source: "examples/ADVR_EX/UCASE_EX.BAS" },
      { name: "EXAMPLES/WINDO_EX.BAS", type: "text", source: "examples/ADVR_EX/WINDO_EX.BAS" },
      
      // Standard examples 
      { name: "EXAMPLES/BALLPSET.BAS", type: "text", source: "examples/BALLPSET.BAS" },
      { name: "EXAMPLES/BALLXOR.BAS", type: "text", source: "examples/BALLXOR.BAS" },
      { name: "EXAMPLES/BAR.BAS", type: "text", source: "examples/BAR.BAS" },
      { name: "EXAMPLES/CAL.BAS", type: "text", source: "examples/CAL.BAS" },
      { name: "EXAMPLES/CHECK.BAS", type: "text", source: "examples/CHECK.BAS" },
      { name: "EXAMPLES/COLORS.BAS", type: "text", source: "examples/COLORS.BAS" },
      { name: "EXAMPLES/CRLF.BAS", type: "text", source: "examples/CRLF.BAS" },
      { name: "EXAMPLES/CUBE.BAS", type: "text", source: "examples/CUBE.BAS" },
      { name: "EXAMPLES/EDPAT.BAS", type: "text", source: "examples/EDPAT.BAS" },
      { name: "EXAMPLES/ENTAB.BAS", type: "text", source: "examples/ENTAB.BAS" },
      { name: "EXAMPLES/FILERR.BAS", type: "text", source: "examples/FILERR.BAS" },
      { name: "EXAMPLES/FLPT.BAS", type: "text", source: "examples/FLPT.BAS" },
      { name: "EXAMPLES/INDEX.BAS", type: "text", source: "examples/INDEX.BAS" },
      { name: "EXAMPLES/MANDEL.BAS", type: "text", source: "examples/MANDEL.BAS" },
      { name: "EXAMPLES/PALETTE.BAS", type: "text", source: "examples/PALETTE.BAS" },
      { name: "EXAMPLES/PLOTTER.BAS", type: "text", source: "examples/PLOTTER.BAS" },
      { name: "EXAMPLES/QLBDUMP.BAS", type: "text", source: "examples/QLBDUMP.BAS" },
      { name: "EXAMPLES/SEARCH.BAS", type: "text", source: "examples/SEARCH.BAS" },
      { name: "EXAMPLES/SINEWAVE.BAS", type: "text", source: "examples/SINEWAVE.BAS" },
      { name: "EXAMPLES/STRTONUM.BAS", type: "text", source: "examples/STRTONUM.BAS" },
      { name: "EXAMPLES/TERMINAL.BAS", type: "text", source: "examples/TERMINAL.BAS" },
      { name: "EXAMPLES/TOKEN.BAS", type: "text", source: "examples/TOKEN.BAS" },
      { name: "EXAMPLES/WHEREIS.BAS", type: "text", source: "examples/WHEREIS.BAS" }
    ];
    
    // Fetch all files from disk
    const fetchPromises = allFiles.map(file => {
      const sourceUrl = file.source ? file.source : `disk/${file.name}`;
      return fetch(sourceUrl).catch(err => {
        console.warn(`Could not load ${file.name} from ${sourceUrl}:`, err);
        return null; // Return null for failed requests
      });
    });
    
    // Fetch all files
    const responses = await Promise.all(fetchPromises);
    
    // Process all files based on their type
    const processedFiles = await Promise.all(
      responses.map(async (response, index) => {
        if (!response) return null;
        
        const fileInfo = allFiles[index];
        try {
          if (fileInfo.type === "text") {
            // Process text file
            const text = await response.text();
            const contents = encodeDOSText(text); // Use utility function for DOS text encoding
            
            return {
              path: fileInfo.name,
              contents
            };
          } else {
            // Process binary file
            const binary = await response.arrayBuffer();
            return {
              path: fileInfo.name,
              contents: new Uint8Array(binary)
            };
          }
        } catch (err) {
          console.error(`Error processing ${fileInfo.name}:`, err);
          return null;
        }
      })
    );
    
    // Initialize emulator using js-dos v8 API with enhanced configuration
    console.log("Creating js-dos emulator with files...");
    // First clear the container and add a dedicated element for js-dos
    const container = document.getElementById("dos-container");
    container.innerHTML = '<div class="jsdos-rso"></div>';
    
    // Files are already processed in the correct format
    const files = processedFiles.filter(Boolean);
    
    console.log("Initialized files:", files.map(f => f.path));
    
    // Initialize with auto-launching CMD.BAS
    const options = {
      dosboxConf: `
        [autoexec]
        mount c .
        c:
        qb /run cmd.bas
        
        [cpu]
        cputype pentium_mmx
        cycles=auto 150000 50% limit 250000
        
        [dosbox]
        machine=svga_s3
        captures=capture
        memsize=16
      `,
      initFs: files,
      //backend: 'dosboxX',
      autoStart: true,
      noCloud: true,
      onEvent: (event, ...args) => {
        console.log("js-dos event:", event, args);
        
        // Handle the command interface ready event
        if (event === "ci-ready") {
          commandInterface = args[0];
          console.log("Command interface is ready!");
          
          // List files to verify what's available
          commandInterface.fsTree().then(tree => {
            console.log("Files in DOSBox:", tree);
          }).catch(err => {
            console.error("Error listing files:", err);
          });

          // Set up polling for CMD output once DOSBox is ready
          console.log("DOSSim environment ready!");
          pollCmdOutput();
        }
      }
    };
    
    console.log("Creating js-dos with options:", options);
    await Dos(document.querySelector(".jsdos-rso"), options);
    
    console.log("DOSSim initialization in progress...");
  } catch (error) {
    console.error("Error initializing DOSSim:", error);
  }
});

// Flag to prevent concurrent file operations
let isPolling = false;

// Poll for CMD output at specified interval
async function pollCmdOutput() {
  console.log("Starting to poll for CMD_OUT.TXT file...");
  const pollInterval = setInterval(async () => {
    // Skip this polling cycle if we're already processing a file
    if (isPolling) {
      return;
    }
    
    isPolling = true;
    try {
      // Check if commandInterface is still available
      if (!commandInterface) {
        console.log("DOSBox interface not available, stopping polling");
        clearInterval(pollInterval);
        return;
      }
      
      try {
        const fileTree = await commandInterface.fsTree();
        
        // Search for our file using the global findFile function
        const actualFilename = findFile(fileTree, "CMD_OUT.TXT");
        
        if (!actualFilename) {
          return;
        }
        
        // Read the file using the correct filename
        const outputBuffer = await commandInterface.fsReadFile(actualFilename);
        
        // Process the file contents with DOS line ending normalization
        const output = decodeDOSText(outputBuffer);
        
        // Skip empty files
        if (output.trim() === "") {
          return;
        }
        
        // Only log when we have non-empty content
        console.log("Received command output:", output);
        
        // "Delete" the file by writing empty content to avoid processing it again
        try {
          await commandInterface.fsWriteFile(actualFilename, new Uint8Array(0));
        } catch (writeError) {
          console.warn("Could not clear file:", writeError);
        }
        
        // Handle the command
        await handleCmdOutput(output);
        
        return; // Exit the function after processing
      } catch (err) {
        console.error("Error processing files:", err);
        return;
      }
      
      // We shouldn't reach here because we return in all code paths above
    } catch (error) {
      // General error in polling function
      console.error("Error in polling CMD output:", error);
    } finally {
      // Reset polling flag regardless of success or failure
      isPolling = false;
    }
  }, DOSSimConfig.system.pollingInterval);
  
  return pollInterval;
}

// Handle commands from CMD
async function handleCmdOutput(output) {
  // Prevent spam/rapid execution
  const now = Date.now();
  if (now - lastQueryTime < DOSSimConfig.system.rateLimitInterval) {
    console.log("Rate limiting command execution");
    return;
  }
  lastQueryTime = now;
  
  try {
    // Output should already be cleaned by decodeDOSText, just trim
    const cleanOutput = output.trim();
    console.log("Processing command output:", cleanOutput);
    
    if (cleanOutput.startsWith("GENERATE:")) {
      const prompt = cleanOutput.slice(9);
      console.log("Processing GENERATE command:", prompt);
      await handleGenerateRequest(prompt);
    } else {
      console.warn("Unknown command received:", cleanOutput);
    }
  } catch (error) {
    console.error("Error handling CMD output:", error);
    // Write error to cmd_in.txt
    try {
      const errorMsg = "ERROR: " + error.message;
      await appendToCmdIn(errorMsg);
    } catch (writeError) {
      console.error("Failed to write error message:", writeError);
    }
  }
}

// Function to append to CMD_IN.TXT
async function appendToCmdIn(content) {
  try {
    // First read existing content if any
    let existingContent = new Uint8Array(0);
    
    // Check if file exists first using the file tree
    const fileTree = await commandInterface.fsTree();
    const actualFilename = findFile(fileTree, "CMD_IN.TXT");
    
    // If file exists, read its content
    if (actualFilename) {
      try {
        existingContent = await commandInterface.fsReadFile(actualFilename);
      } catch (readErr) {
        console.warn("Error reading CMD_IN.TXT:", readErr);
      }
    }
    
    // Decode existing content with proper DOS line ending handling
    let existingText = "";
    if (existingContent.length > 0) {
      existingText = decodeDOSText(existingContent);
    }
    
    // Append new content with a newline
    const combinedText = existingText + content + "\n";
    
    // Encode back to DOS format and write to file
    await commandInterface.fsWriteFile("CMD_IN.TXT", encodeDOSText(combinedText));
  } catch (error) {
    console.error("Error appending to CMD_IN.TXT:", error);
  }
}

// Handle generate command
async function handleGenerateRequest(prompt) {
  try {
    // Always get a fresh AI client to ensure we're using the latest config
    const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
    
    // Prompt should already be cleaned, just trim
    const cleanPrompt = prompt.trim();
    console.log("Generating code for prompt:", cleanPrompt, "with config:", {
      useRealAi: DOSSimConfig.ai.useRealAi,
      model: DOSSimConfig.ai.model
    });
    
    // Extract the filename from the prompt (first word)
    const filename = cleanPrompt.split(/\s+/)[0];
    
    // Generate code via streaming API
    const stream = await aiClient.generateStream(cleanPrompt);
    let previousContent = "";
    let partialLine = ""; // Buffer for partial lines
    
    // Process the stream chunks
    for await (const chunk of stream) {
      // Extract only the new content from this chunk
      if (chunk.length > previousContent.length) {
        const newContent = chunk.substring(previousContent.length);
        
        // Add new content to the partial line buffer
        partialLine += newContent;
        
        // Split buffer into lines
        const lines = partialLine.split('\n');
        
        // Process all complete lines (all except the last one)
        const completeLines = lines.slice(0, -1);
        if (completeLines.length > 0) {
          for (const line of completeLines) {
            // Send each complete line with its own CHUNK: prefix
            console.log("Sending complete line:", line);
            try {
              await appendToCmdIn("CHUNK: " + line);
            } catch (writeError) {
              console.warn("Error writing line to CMD_IN.TXT:", writeError.message);
            }
          }
        }
        
        // Keep the last (potentially incomplete) line in the buffer
        partialLine = lines[lines.length - 1];
        
        // Update previous content for next comparison
        previousContent = chunk;
      }
    }
    
    // Send any remaining content in the buffer if it's not empty
    if (partialLine) {
      // Keep log for final line too
      console.log("Sending complete line:", partialLine);
      try {
        await appendToCmdIn("CHUNK: " + partialLine);
      } catch (writeError) {
        console.warn("Error writing final content to CMD_IN.TXT:", writeError.message);
      }
    }
    
    // Add the file to our virtual FS tracking
    if (!virtualFiles.includes(filename)) {
      virtualFiles.push(filename);
    }
    
    // Send command to run the file (BASIC side will handle file operations)
    try {
      const runCommand = "RUN: " + filename.trim(); // Note the space after RUN:
      console.log("Sending RUN command to BASIC:", runCommand);
      
      // Create a log with all the generated content so far
      console.log("Complete generated file contents for", filename, ":\n", previousContent);
      
      await appendToCmdIn(runCommand);
    } catch (error) {
      console.error(`Error sending run command:`, error);
      await appendToCmdIn(`ERROR: Error running ${filename}: ${error.message}`);
    }
  } catch (error) {
    console.error("Error generating code:", error);
    const errorMsg = "ERROR: " + error.message;
    try {
      await appendToCmdIn(errorMsg);
    } catch (e) {
      console.error("Failed to write error message:", e);
    }
  }
}

