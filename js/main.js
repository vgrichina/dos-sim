/**
 * DOSSim - DOS Simulation Environment
 * 
 * This file implements the core functionality for DOSSim, a browser-based platform
 * where users can run standard DOS commands and generate simple DOS apps/games
 * from natural language prompts using js-dos and an external AI API.
 */

// Custom CMD.BAS for the DOS environment
const CMD_BAS = `10 CLS
20 PRINT "DOSSim v1.0 - DOS Experience in the Browser"
30 PRINT "Type commands or app names with parameters"
40 PRINT
50 PRINT "C:\\>";
60 LINE INPUT CMD$
70 IF CMD$ = "CLS" THEN CLS : GOTO 20
80 IF CMD$ = "HELP" THEN GOSUB 1000 : GOTO 50
90 IF LEFT$(CMD$, 3) = "DIR" THEN OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1 : PRINT #1, "DIR_REQUEST" : CLOSE #1 : GOTO 400
100 IF CMD$ = "EXIT" THEN PRINT "Exiting DOSSim..." : END
110 ' Check if it's a generative prompt
120 IF INSTR(CMD$, ".BAS") > 0 THEN OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1 : PRINT #1, "GENERATE:" + CMD$ : CLOSE #1 : GOTO 400
130 PRINT "Bad command or file name"
140 GOTO 50

400 ' Polling loop for cmd_in.txt
410 LASTPOS = 0 : BUFFER$ = ""
420 FOR I = 1 TO 1000 : NEXT I ' ~100ms delay
430 GOSUB 2000 ' Check if cmd_in.txt exists
440 IF EXIST = 0 THEN GOTO 420
450 OPEN "CMD_IN.TXT" FOR INPUT AS #2
460 BUFFER$ = ""
470 WHILE NOT EOF(2)
480   LINE INPUT #2, LINE$
490   BUFFER$ = BUFFER$ + LINE$ + CHR$(13) + CHR$(10)
500 WEND
510 CLOSE #2
520 IF LEN(BUFFER$) > LASTPOS THEN GOSUB 600 : LASTPOS = LEN(BUFFER$)
530 GOTO 420

600 ' Process new content
610 NEWCONTENT$ = MID$(BUFFER$, LASTPOS + 1)
620 IF LEFT$(NEWCONTENT$, 4) = "RUN:" THEN PRINT : PRINT "Running " + MID$(NEWCONTENT$, 5) : RUN MID$(NEWCONTENT$, 5)
630 IF LEFT$(NEWCONTENT$, 9) = "DIR_LIST:" THEN PRINT : GOSUB 1500 : GOTO 50
640 PRINT NEWCONTENT$; ' Stream without newline
650 RETURN

1000 ' Help subroutine
1010 PRINT
1020 PRINT "Available commands:"
1030 PRINT "  CLS        - Clear screen"
1040 PRINT "  DIR        - List files"
1050 PRINT "  HELP       - Show this help"
1060 PRINT "  EXIT       - Exit DOSSim"
1070 PRINT
1080 PRINT "To create an app:"
1090 PRINT "  [NAME].BAS [parameters]"
1100 PRINT "  Example: MARIO.BAS /no-koopas /play-as-princess"
1110 PRINT
1120 RETURN

1500 ' Process DIR_LIST
1510 PRINT "Directory of C:\\"
1520 PRINT
1530 FILESTR$ = MID$(NEWCONTENT$, 10)
1540 IF FILESTR$ = "" THEN PRINT "No files found." : GOTO 1590
1550 FOR I = 1 TO LEN(FILESTR$)
1560   IF MID$(FILESTR$, I, 1) = "," THEN PRINT
1570   PRINT MID$(FILESTR$, I, 1);
1580 NEXT I
1590 PRINT : PRINT
1600 RETURN

2000 ' Check if file exists subroutine
2010 EXIST = 0
2020 ON ERROR GOTO 2050
2030 OPEN "CMD_IN.TXT" FOR INPUT AS #3
2040 EXIST = 1
2050 IF EXIST = 1 THEN CLOSE #3
2060 ON ERROR GOTO 0
2070 RETURN
`;

// Global variables
let ci; // CommandInterface from js-dos
let lastQueryTime = 0; // Prevent spam
let virtualFiles = DOSSimConfig.virtualFs.initialFiles.slice(); // Copy of initial files in our virtual FS

// Use AI clients from api-service.js

// Initialize js-dos when DOM is ready
document.addEventListener("DOMContentLoaded", async () => {
  const aiClient = AIClientFactory.createClient(DOSSimConfig.ai);
  
  try {
    console.log("Initializing js-dos...");
    const dos = await Dos(document.getElementById("dos-container"), {
      wasm: DOSSimConfig.jsDos.wasm,
      cycles: DOSSimConfig.jsDos.cycles
    });
    
    // Load js-dos with GW-BASIC
    console.log("Loading GW-BASIC...");
    ci = await dos.run(DOSSimConfig.jsDos.gwBasicUrl);
    
    // Initialize the custom CMD interpreter
    console.log("Setting up custom CMD interpreter...");
    await ci.fs.writeFile("/cmd.bas", CMD_BAS);
    
    // Create initial README file
    await ci.fs.writeFile("/README.TXT", DOSSimConfig.virtualFs.readmeContent);
    
    // Start the CMD interpreter
    await ci.shell(["gwbasic", "cmd.bas"]);
    
    // Set up polling for CMD output
    pollCmdOutput();
    
    // Set up terminal input
    setupTerminalInput();
    
    console.log("DOSSim initialized successfully!");
  } catch (error) {
    console.error("Error initializing DOSSim:", error);
  }
});

// Poll for CMD output at specified interval
async function pollCmdOutput() {
  setInterval(async () => {
    try {
      if (await ci.fs.exists("/cmd_out.txt")) {
        const output = await ci.fs.readFile("/cmd_out.txt", "utf8");
        console.log("Received command output:", output);
        
        // Remove the file to avoid processing it again
        await ci.fs.unlink("/cmd_out.txt");
        
        // Handle the command
        await handleCmdOutput(output);
      }
    } catch (error) {
      console.error("Error in polling CMD output:", error);
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
    if (output === "DIR_REQUEST") {
      console.log("Processing DIR command");
      await handleDirRequest();
    } else if (output.startsWith("GENERATE:")) {
      console.log("Processing GENERATE command");
      await handleGenerateRequest(output.slice(9));
    }
  } catch (error) {
    console.error("Error handling CMD output:", error);
    // Write error to cmd_in.txt
    await ci.fs.writeFile("/cmd_in.txt", "Error: " + error.message);
  }
}

// Handle DIR command
async function handleDirRequest() {
  try {
    console.log("Listing virtual filesystem:", virtualFiles);
    await ci.fs.writeFile("/cmd_in.txt", "DIR_LIST:" + virtualFiles.join(","));
  } catch (error) {
    console.error("Error handling DIR request:", error);
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
      await ci.fs.writeFile("/cmd_in.txt", currentContent);
    }
    
    // Add the file to our virtual FS tracking
    if (!virtualFiles.includes(filename)) {
      virtualFiles.push(filename);
    }
    
    // Write the complete file
    await ci.fs.writeFile("/" + filename, currentContent);
    
    // Send command to run the file
    await ci.fs.writeFile("/cmd_in.txt", "RUN:" + filename);
  } catch (error) {
    console.error("Error generating code:", error);
    await ci.fs.writeFile("/cmd_in.txt", "Error generating code: " + error.message);
  }
}

// Set up terminal input
function setupTerminalInput() {
  const terminalInput = document.getElementById("terminal-input");
  
  terminalInput.addEventListener("keydown", async (e) => {
    if (e.key === "Enter") {
      const command = terminalInput.value;
      console.log("User input:", command);
      
      // Send the command to js-dos
      await ci.shell([command]);
      
      // Clear the input field
      terminalInput.value = "";
    }
  });
}