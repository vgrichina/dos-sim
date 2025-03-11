/**
 * DOSSim - DOS Simulation Environment
 * 
 * This file implements the core functionality for DOSSim, a browser-based platform
 * where users can run standard DOS commands and generate simple DOS apps/games
 * from natural language prompts using js-dos and an external AI API.
 */

// Full CMD.BAS for the DOS environment
const CMD_BAS_CONTENT = `10 CLS
20 PRINT "DOSSim v1.0 - DOS Experience in the Browser"
30 PRINT "Type DOS commands or generate BASIC apps using [NAME].BAS parameters"
40 PRINT "Example: MARIO.BAS /no-koopas /play-as-princess"
50 PRINT
60 PRINT "C:\\>";
70 LINE INPUT CMD$
71 ' Convert to uppercase manually
72 GOSUB 3000 ' Go to uppercase conversion subroutine
75 PRINT "DEBUG: Command is '"; CMD$; "', LEN="; LEN(CMD$)
80 IF CMD$ = "EXIT" THEN PRINT "Exiting DOSSim..." : SYSTEM
90 ' Check if it's a generative prompt
100 IF INSTR(CMD$, ".BAS") > 0 THEN GOTO 300
110 ' Otherwise, it's a standard DOS command
120 SHELL CMD$
130 GOTO 60

300 ' Handle BASIC file generation
310 OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1
320 PRINT #1, "GENERATE:" + CMD$
330 CLOSE #1

400 ' Polling loop for cmd_in.txt
405 PRINT "POLLING: Starting loop"
410 LASTPOS = 0 : BUFFER$ = ""
420 FOR I = 1 TO 150000 : NEXT I ' Increased delay to reduce CPU usage
425 PRINT "POLLING: Attempting to open CMD_IN.TXT"
430 ' Try to open file with proper error handling
435 ON ERROR GOTO 1000
440 OPEN "CMD_IN.TXT" FOR INPUT AS #2
445 PRINT "POLLING: Successfully opened CMD_IN.TXT"
447 GOTO 450
450 ' We successfully opened the file
460 BUFFER$ = ""
465 PRINT "READING: Starting to read file content"
470 WHILE NOT EOF(2)
475   PRINT "READING: Reading a line from file"
480   LINE INPUT #2, LINE$
485   PRINT "READING: Got line: "; LINE$
490   BUFFER$ = BUFFER$ + LINE$ + CHR$(13) + CHR$(10)
495   PRINT "READING: Added to buffer"
500 WEND
505 PRINT "READING: Finished reading file"
510 CLOSE #2
512 ' Add debug output to see buffer contents
513 PRINT "DEBUG: Buffer length="; LEN(BUFFER$); ", LastPos="; LASTPOS
514 IF LEN(BUFFER$) > 0 THEN PRINT "DEBUG: First few chars: "; LEFT$(BUFFER$, 10)
515 ' Empty the file after reading it
516 OPEN "CMD_IN.TXT" FOR OUTPUT AS #3
517 CLOSE #3
520 IF LEN(BUFFER$) > LASTPOS THEN GOSUB 600 : LASTPOS = LEN(BUFFER$)
530 GOTO 420

600 ' Process new content
605 PRINT "PROCESS-FLOW: Processing new content"
610 NEWCONTENT$ = MID$(BUFFER$, LASTPOS + 1)
615 PRINT "DEBUG: Got content: "; NEWCONTENT$
620 IF LEFT$(NEWCONTENT$, 4) = "RUN:" THEN
622   PRINT "PROCESS-FLOW: RUN command detected"
623   PRINT
624   RUNFILE$ = MID$(NEWCONTENT$, 5)
625   PRINT "PROCESS-FLOW: Extracted filename: "; RUNFILE$
626   ' Clean filename - remove non-printable characters
627   CLEANFILE$ = ""
628   FOR I = 1 TO LEN(RUNFILE$)
629     C$ = MID$(RUNFILE$, I, 1)
630     IF ASC(C$) >= 32 AND ASC(C$) < 127 THEN CLEANFILE$ = CLEANFILE$ + C$
631   NEXT I
632   PRINT "PROCESS-FLOW: Clean filename: "; CLEANFILE$
633   PRINT "Running " + CLEANFILE$
634   PRINT "PROCESS-FLOW: About to run file"
635   RUN CLEANFILE$
636 ELSE
637   PRINT "PROCESS-FLOW: Standard content, printing to screen"
638   PRINT NEWCONTENT$; ' Stream without newline
640 END IF
650 RETURN

1000 ' Error handler for file not found
1001 A = ERR : B = ERL
1005 PRINT "ERROR HANDLER: Error"; A; "at line"; B
1010 CLOSE ' Close any open files 
1015 PRINT "ERROR HANDLER: Waiting longer before retry"
1020 ' Add extra delay to avoid rapid cycling when file not found
1025 FOR I = 1 TO 300000 : NEXT I ' Much longer delay when file not found
1030 PRINT "ERROR HANDLER: Returning to polling"
1035 RESUME 420 ' Go back to polling loop

3000 ' Uppercase conversion subroutine
3010 TEMP$ = ""
3020 FOR I = 1 TO LEN(CMD$)
3030   C$ = MID$(CMD$, I, 1)
3040   IF C$ >= "a" AND C$ <= "z" THEN C$ = CHR$(ASC(C$) - 32)
3050   TEMP$ = TEMP$ + C$
3060 NEXT I
3070 CMD$ = TEMP$
3080 RETURN
`;

// Convert to DOS line endings (CRLF)
const CMD_BAS = CMD_BAS_CONTENT.replace(/\n/g, "\r\n");

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
    // Fetch the GWBASIC.EXE file
    console.log("Fetching GWBASIC.EXE...");
    const response = await fetch("disk/GWBASIC.EXE");
    const gwbasicBinary = await response.arrayBuffer();
    
    // Initialize emulator using js-dos v8 API with enhanced configuration
    console.log("Creating js-dos emulator with files...");
    // First clear the container and add a dedicated element for js-dos
    const container = document.getElementById("dos-container");
    container.innerHTML = '<div class="jsdos-rso"></div>';
    
    // Create file list for initialization
    const files = [
      { path: "GWBASIC.EXE", contents: new Uint8Array(gwbasicBinary) },
      { path: "CMD.BAS", contents: new TextEncoder().encode(CMD_BAS) },
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

