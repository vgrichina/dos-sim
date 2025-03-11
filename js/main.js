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

// Initialize js-dos when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
  
  try {
    console.log("Initializing js-dos...");
    // Initialize emulator using js-dos v8 API
    const emulatorsElement = document.getElementById("dos-container");
    const dosboxElement = document.createElement("div");
    emulatorsElement.appendChild(dosboxElement);
    
    // Create a new js-dos instance with configuration
    const dosbox = await Dos(dosboxElement, {
      wasm: DOSSimConfig.jsDos.wasm,
      cycles: DOSSimConfig.jsDos.cycles,
      dosboxConf: {
        "cpu": "auto",
        "cycles": "max",
        "sbtype": "none",
        "gus": "false",
        "fullscreen": "false",
        "autolock": "false"
      },
      initFs: {
        "/README.TXT": DOSSimConfig.virtualFs.readmeContent
      }
    });
    
    // Fetch the GWBASIC.EXE file
    console.log("Fetching GWBASIC.EXE...");
    const response = await fetch("disk/GWBASIC.EXE");
    const gwbasicBinary = await response.arrayBuffer();
    
    // Create an empty disk
    console.log("Creating disk image...");
    commandInterface = await dosbox.fs();
    
    // Write GWBASIC.EXE and CMD.BAS to the disk
    await commandInterface.writeFile("GWBASIC.EXE", new Uint8Array(gwbasicBinary));
    await commandInterface.writeFile("CMD.BAS", CMD_BAS);
    await commandInterface.writeFile("README.TXT", DOSSimConfig.virtualFs.readmeContent);
    
    // Execute GWBASIC with CMD.BAS
    console.log("Starting GW-BASIC...");
    await dosbox.shell(["GWBASIC.EXE", "CMD.BAS"]);
    
    // Set up polling for CMD output
    pollCmdOutput();
    
    console.log("DOSSim initialized successfully!");
  } catch (error) {
    console.error("Error initializing DOSSim:", error);
  }
});

// Poll for CMD output at specified interval
async function pollCmdOutput() {
  setInterval(async () => {
    try {
      // Directly try to read the file and handle errors
      const outputBuffer = await commandInterface.fsReadFile("cmd_out.txt");
      const output = new TextDecoder().decode(outputBuffer);
      console.log("Received command output:", output);
      
      // Remove the file to avoid processing it again
      await commandInterface.fsDeleteFile("cmd_out.txt");
      
      // Handle the command
      await handleCmdOutput(output);
    } catch (error) {
      // File probably doesn't exist yet, which is normal
      // Only log unexpected errors
      if (error.message && !error.message.includes("not found") && 
          !error.message.includes("not exist") && !error.message.includes("No such")) {
        console.error("Error in polling CMD output:", error);
      }
    }
  }, DOSSimConfig.system.pollingInterval);
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
    }
  } catch (error) {
    console.error("Error handling CMD output:", error);
    // Write error to cmd_in.txt
    const errorMsg = "Error: " + error.message;
    await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(errorMsg));
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
      await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(currentContent));
    }
    
    // Add the file to our virtual FS tracking
    if (!virtualFiles.includes(filename)) {
      virtualFiles.push(filename);
    }
    
    // Write the complete file
    await commandInterface.fsWriteFile(filename, new TextEncoder().encode(currentContent));
    
    // Send command to run the file
    await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode("RUN:" + filename));
  } catch (error) {
    console.error("Error generating code:", error);
    const errorMsg = "Error generating code: " + error.message;
    await commandInterface.fsWriteFile("cmd_in.txt", new TextEncoder().encode(errorMsg));
  }
}

