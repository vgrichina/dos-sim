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
  const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
  
  try {
    console.log("Initializing js-dos...");
    // Fetch the required files
    console.log("Fetching required files...");
    
    // Define all files by type for consistent handling
    const allFiles = [
      { name: "GWBASIC.EXE", type: "binary" },
      { name: "QB.EXE", type: "binary" },
      { name: "UHEX.COM", type: "binary" },
      { name: "CMD.BAS", type: "text" },
      { name: "TEST.BAS", type: "text" },
      { name: "README.TXT", type: "text" }
    ];
    
    // Fetch all files from disk
    const fetchPromises = allFiles.map(file => 
      fetch(`disk/${file.name}`).catch(err => {
        console.warn(`Could not load ${file.name}:`, err);
        return null; // Return null for failed requests
      })
    );
    
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
      console.log("Skipping poll cycle - already processing");
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
      
      // Get file tree and search for our file first
      console.log("Checking file system for CMD_OUT.TXT...");
      try {
        const fileTree = await commandInterface.fsTree();
        
        // Search for our file using the global findFile function
        const actualFilename = findFile(fileTree, "CMD_OUT.TXT");
        
        if (!actualFilename) {
          console.log("CMD_OUT.TXT not found in file system");
          return;
        }
        
        console.log("Found file in filesystem:", actualFilename);
        
        // Now read the file using the correct filename
        const outputBuffer = await commandInterface.fsReadFile(actualFilename);
        console.log("Successfully read file contents!");
        
        // Process the file contents with DOS line ending normalization
        const output = decodeDOSText(outputBuffer);
        console.log("Received command output:", output);
        
        // Skip empty files
        if (output.trim() === "") {
          console.log("Skipping empty file content");
          return;
        }
        
        // "Delete" the file by writing empty content to avoid processing it again
        try {
          console.log("Attempting to clear file:", actualFilename);
          await commandInterface.fsWriteFile(actualFilename, new Uint8Array(0));
          console.log("Successfully cleared file");
        } catch (writeError) {
          console.warn("Could not clear file:", writeError);
        }
        
        // Handle the command
        await handleCmdOutput(output);
        
        return; // Exit the function after processing
      } catch (err) {
        console.log("Error processing files:", err);
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
        console.log("Successfully read existing CMD_IN.TXT");
      } catch (readErr) {
        console.warn("Error reading CMD_IN.TXT:", readErr);
      }
    } else {
      console.log("CMD_IN.TXT does not exist yet, will create it");
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
    console.log("Successfully appended to CMD_IN.TXT");
  } catch (error) {
    console.error("Error appending to CMD_IN.TXT:", error);
  }
}

// Handle generate command
async function handleGenerateRequest(prompt) {
  try {
    // Get the AI client using the factory
    const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
    
    // Prompt should already be cleaned, just trim
    const cleanPrompt = prompt.trim();
    console.log("Generating code for prompt:", cleanPrompt);
    
    // Extract the filename from the prompt (first word)
    const filename = cleanPrompt.split(/\s+/)[0];
    
    // Generate code via streaming API
    const stream = await aiClient.generateStream(cleanPrompt);
    let currentContent = "";
    
    // Process the stream chunks
    for await (const chunk of stream) {
      currentContent = chunk;
      // Send chunk to CMD_IN.TXT with CHUNK: prefix for streaming display
      try {
        await appendToCmdIn("CHUNK: " + currentContent);
      } catch (writeError) {
        console.warn("Error writing to CMD_IN.TXT:", writeError.message);
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

