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
    const [gwbasicResponse, cmdBasResponse] = await Promise.all([
      fetch("disk/GWBASIC.EXE"),
      fetch("disk/CMD.BAS")
    ]);
    
    const gwbasicBinary = await gwbasicResponse.arrayBuffer();
    const cmdBasText = await cmdBasResponse.text();
    
    // Convert to DOS line endings (CRLF)
    const cmdBasWithCRLF = cmdBasText.replace(/\n/g, "\r\n");
    
    // Initialize emulator using js-dos v8 API with enhanced configuration
    console.log("Creating js-dos emulator with files...");
    // First clear the container and add a dedicated element for js-dos
    const container = document.getElementById("dos-container");
    container.innerHTML = '<div class="jsdos-rso"></div>';
    
    // Create file list for initialization
    const files = [
      { path: "GWBASIC.EXE", contents: new Uint8Array(gwbasicBinary) },
      { path: "CMD.BAS", contents: new TextEncoder().encode(cmdBasWithCRLF) },
      { path: "README.TXT", contents: new TextEncoder().encode(DOSSimConfig.virtualFs.readmeContent.replace(/\n/g, "\r\n")) }
    ];
    
    // Initialize with auto-launching CMD.BAS
    const options = {
      dosboxConf: `
        [autoexec]
        mount c .
        c:
        GWBASIC.EXE CMD.BAS
        
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
        
        // Helper function to search the file tree
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
        
        // Search for our file
        const actualFilename = findFile(fileTree, "CMD_OUT.TXT");
        
        if (!actualFilename) {
          console.log("CMD_OUT.TXT not found in file system");
          return;
        }
        
        console.log("Found file in filesystem:", actualFilename);
        
        // Now read the file using the correct filename
        const outputBuffer = await commandInterface.fsReadFile(actualFilename);
        console.log("Successfully read file contents!");
        
        // Process the file contents
        const output = new TextDecoder().decode(outputBuffer);
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
    console.log("Processing command output:", output);
    if (output.startsWith("GENERATE:")) {
      console.log("Processing GENERATE command:", output.slice(9));
      await handleGenerateRequest(output.slice(9));
    } else {
      console.warn("Unknown command received:", output);
    }
  } catch (error) {
    console.error("Error handling CMD output:", error);
    // Write error to cmd_in.txt
    try {
      const errorMsg = "Error: " + error.message;
      await commandInterface.fsWriteFile("CMD_IN.TXT", new TextEncoder().encode(errorMsg));
    } catch (writeError) {
      console.error("Failed to write error message:", writeError);
    }
  }
}

// Handle generate command
async function handleGenerateRequest(prompt) {
  try {
    // Get the AI client using the factory
    const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
    console.log("Generating code for prompt:", prompt);
    
    // Extract the filename from the prompt
    const filename = prompt.split(" ")[0];
    
    // Generate code via streaming API
    const stream = await aiClient.generateStream(prompt);
    let currentContent = "";
    
    // Process the stream chunks
    for await (const chunk of stream) {
      currentContent = chunk;
      // Write current content to CMD_IN.TXT for streaming display
      try {
        await commandInterface.fsWriteFile("CMD_IN.TXT", new TextEncoder().encode(currentContent));
      } catch (writeError) {
        console.warn("Error writing to CMD_IN.TXT:", writeError.message);
      }
    }
    
    // Add the file to our virtual FS tracking
    if (!virtualFiles.includes(filename)) {
      virtualFiles.push(filename);
    }
    
    // Write the complete file
    try {
      await commandInterface.fsWriteFile(filename, new TextEncoder().encode(currentContent));
      console.log(`File ${filename} created successfully`);
      
      // Send command to run the file
      const runCommand = "RUN:" + filename.trim();
      console.log("Sending RUN command to BASIC:", runCommand);
      // Add a newline to ensure proper parsing in BASIC
      await commandInterface.fsWriteFile("CMD_IN.TXT", new TextEncoder().encode(runCommand + "\r\n"));
    } catch (fileError) {
      console.error(`Error writing ${filename}:`, fileError);
      await commandInterface.fsWriteFile("CMD_IN.TXT", new TextEncoder().encode(`Error creating ${filename}: ${fileError.message}`));
    }
  } catch (error) {
    console.error("Error generating code:", error);
    const errorMsg = "Error generating code: " + error.message;
    try {
      await commandInterface.fsWriteFile("CMD_IN.TXT", new TextEncoder().encode(errorMsg));
    } catch (e) {
      console.error("Failed to write error message:", e);
    }
  }
}

