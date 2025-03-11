/**
 * DOSSim - DOS Simulation Environment
 * 
 * This file implements the core functionality for DOSSim, a browser-based platform
 * where users can run standard DOS commands and generate simple DOS apps/games
 * from natural language prompts using js-dos and an external AI API.
 */

// Custom CMD.BAS for the DOS environment - simplified to focus on generative aspects
const CMD_BAS = `10 CLS
20 PRINT "DOSSim v1.0 - DOS Experience in the Browser"
30 PRINT "Type DOS commands or generate BASIC apps using [NAME].BAS parameters"
40 PRINT "Example: MARIO.BAS /no-koopas /play-as-princess"
50 PRINT
60 PRINT "C:\\>";
70 LINE INPUT CMD$
80 IF CMD$ = "EXIT" THEN PRINT "Exiting DOSSim..." : END
90 ' Check if it's a generative prompt
100 IF INSTR(CMD$, ".BAS") > 0 THEN GOSUB 2000 : GOTO 300
110 ' Otherwise, it's a standard DOS command
120 SHELL CMD$
130 GOTO 60

300 ' Handle BASIC file generation
310 OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1
320 PRINT #1, "GENERATE:" + CMD$
330 CLOSE #1

400 ' Polling loop for cmd_in.txt
410 LASTPOS = 0 : BUFFER$ = ""
420 FOR I = 1 TO 1000 : NEXT I ' ~100ms delay
430 IF NOT EXIST("CMD_IN.TXT") THEN GOTO 420
440 OPEN "CMD_IN.TXT" FOR INPUT AS #2
450 BUFFER$ = ""
460 WHILE NOT EOF(2)
470   LINE INPUT #2, LINE$
480   BUFFER$ = BUFFER$ + LINE$ + CHR$(13) + CHR$(10)
490 WEND
500 CLOSE #2
510 IF LEN(BUFFER$) > LASTPOS THEN GOSUB 600 : LASTPOS = LEN(BUFFER$)
520 GOTO 420

600 ' Process new content
610 NEWCONTENT$ = MID$(BUFFER$, LASTPOS + 1)
620 IF LEFT$(NEWCONTENT$, 4) = "RUN:" THEN PRINT : PRINT "Running " + MID$(NEWCONTENT$, 5) : RUN MID$(NEWCONTENT$, 5)
630 PRINT NEWCONTENT$; ' Stream without newline
640 RETURN

2000 ' Check if file exists
2010 FUNCTION EXIST(FILENAME$)
2020   ON ERROR GOTO 2050
2030   OPEN FILENAME$ FOR INPUT AS #3
2040   EXIST = 1
2050   IF EXIST = 1 THEN CLOSE #3
2060   ON ERROR GOTO 0
2070 END FUNCTION
2080 RETURN
`;

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
      { path: "README.TXT", contents: new TextEncoder().encode(DOSSimConfig.virtualFs.readmeContent) }
    ];
    
    // Initialize following the example's approach
    commandInterface = await Dos(document.querySelector(".jsdos-rso"), {
      wdosboxUrl: "https://v8.js-dos.com/latest/wdosbox.js",
      dosboxConf: `
        [autoexec]
        mount c .
        c:
        GWBASIC.EXE CMD.BAS
        
        [cpu]
        cputype pentium_mmx
        cycles=auto 150000 50% limit 250000
      `,
      initFs: files,
      backend: 'dosboxX',
      autoStart: true,
      noCloud: true
    });
    
    // Set up polling for CMD output once DOSBox is ready
    console.log("DOSSim environment ready!");
    pollCmdOutput();
    
    console.log("DOSSim initialization in progress...");
  } catch (error) {
    console.error("Error initializing DOSSim:", error);
  }
});

// Poll for CMD output at specified interval
async function pollCmdOutput() {
  const pollInterval = setInterval(async () => {
    try {
      // Check if commandInterface is still available
      if (!commandInterface) {
        console.log("DOSBox interface not available, stopping polling");
        clearInterval(pollInterval);
        return;
      }
      
      // Directly read the file using fsReadFile
      let outputBuffer;
      try {
        outputBuffer = await commandInterface.fsReadFile("cmd_out.txt");
      } catch (readError) {
        // File probably doesn't exist yet, which is normal
        return;
      }
      
      const output = new TextDecoder().decode(outputBuffer);
      console.log("Received command output:", output);
      
      // Remove the file to avoid processing it again
      try {
        await commandInterface.fsDeleteFile("cmd_out.txt");
      } catch (deleteError) {
        console.warn("Could not delete cmd_out.txt:", deleteError.message);
      }
      
      // Handle the command
      await handleCmdOutput(output);
    } catch (error) {
      // General error in polling function
      console.error("Error in polling CMD output:", error);
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
    if (output.startsWith("GENERATE:")) {
      console.log("Processing GENERATE command");
      await handleGenerateRequest(output.slice(9));
    } else {
      console.warn("Unknown command received:", output);
    }
  } catch (error) {
    console.error("Error handling CMD output:", error);
    // Write error to cmd_in.txt
    try {
      const errorMsg = "Error: " + error.message;
      await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(errorMsg));
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
      // Write current content to cmd_in.txt for streaming display
      try {
        await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(currentContent));
      } catch (writeError) {
        console.warn("Error writing to cmd_in.txt:", writeError.message);
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
      await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode("RUN:" + filename));
    } catch (fileError) {
      console.error(`Error writing ${filename}:`, fileError);
      await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(`Error creating ${filename}: ${fileError.message}`));
    }
  } catch (error) {
    console.error("Error generating code:", error);
    const errorMsg = "Error generating code: " + error.message;
    try {
      await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(errorMsg));
    } catch (e) {
      console.error("Failed to write error message:", e);
    }
  }
}

