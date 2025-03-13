' DOSSim v1.0 - QBasic Version
' Modern structured version of CMD.BAS

' Configuration variables - easy to adjust
POLLDELAY = 150000 * 10 ' Polling delay (10x for QBasic)
ERRDELAY = 300000 * 10 ' Error delay for QBasic

' Global variables
CURFILE$ = ""        ' Current file being generated
FILEOPEN = 0         ' Flag to track if output file is open
QUIT = 0             ' Flag to exit program
SKIPPOLLING = 0      ' Flag to skip polling and return to prompt
RUNNINGFLAG = 0      ' Flag to indicate if we're running a file

' Main program
CLS
PRINT "DOSSim v1.0 - DOS Experience in the Browser"
PRINT "Type DOS commands or generate BASIC apps using [NAME].BAS parameters"
PRINT "Example: MARIO.BAS /no-koopas /play-as-princess"
PRINT

' Main command loop
DO
  PRINT "DEBUG: Before CommandPrompt, QUIT ="; QUIT
  CALL CommandPrompt
  PRINT "DEBUG: After CommandPrompt, QUIT ="; QUIT
LOOP UNTIL QUIT

END ' End of main program

' *** MAIN SUBROUTINES ***

SUB CommandPrompt
  SHARED QUIT
  ' Display command prompt and get user input
  PRINT "C:\>";
  PRINT "CMD-READ: Waiting for command input..."
  LINE INPUT CMD$
  PRINT "CMD-READ: Raw command received: ["; CMD$; "]"
  PRINT "CMD-READ: Command length: "; LEN(CMD$)
  
  ' Display ASCII codes for debugging
  PRINT "CMD-READ: ASCII codes: ";
  FOR I = 1 TO LEN(CMD$)
    PRINT ASC(MID$(CMD$, I, 1)); " ";
  NEXT I
  PRINT
  
  ' Convert to uppercase
  PRINT "CMD-READ: About to convert to uppercase"
  ON ERROR GOTO UppercaseError
  CALL ConvertUppercase(CMD$)
  ON ERROR GOTO 0
  PRINT "CMD-READ: Uppercase conversion complete!"
  PRINT "DEBUG: Command after uppercase is '"; CMD$; "', LEN="; LEN(CMD$)
  
  ' Process command
  IF CMD$ = "" THEN 
    PRINT "CMD-READ: Empty command detected"
    EXIT SUB
  END IF
  
  IF CMD$ = "EXIT" THEN 
    PRINT "Exiting DOSSim..."
    PRINT "DEBUG: Setting QUIT flag to 1"
    QUIT = 1
    PRINT "DEBUG: After setting, QUIT ="; QUIT
    EXIT SUB
  END IF
  
  ' Check command type and process accordingly
  IF INSTR(CMD$, ".BAS") > 0 THEN
    CALL HandleBasicFile(CMD$)
  ELSEIF CMD$ = "TEST" THEN
    PRINT "CMD-READ: Test command detected"
  ELSE
    CALL ExecuteDosCommand(CMD$)
  END IF
END SUB

SUB ConvertUppercase(cmd$)
  ' Convert command to uppercase
  PRINT "UPPER-SUB: Starting uppercase conversion"
  TEMP$ = ""
  FOR I = 1 TO LEN(cmd$)
    PRINT "UPPER-SUB: Processing char"; I;
    C$ = MID$(cmd$, I, 1)
    PRINT "UPPER-SUB: Char is '"; C$; "' ASCII="; ASC(C$)
    
    IF C$ >= "a" AND C$ <= "z" THEN
      PRINT "UPPER-SUB: Converting to uppercase"
      C$ = CHR$(ASC(C$) - 32)
    ELSE
      PRINT "UPPER-SUB: No conversion needed"
    END IF
    
    TEMP$ = TEMP$ + C$
    PRINT "UPPER-SUB: Added to temp string, length now"; LEN(TEMP$)
  NEXT I
  
  PRINT "UPPER-SUB: Conversion complete, setting cmd$"
  cmd$ = TEMP$
  PRINT "UPPER-SUB: cmd$ set to ["; cmd$; "]"
END SUB

SUB ExecuteDosCommand(cmd$)
  ' Execute standard DOS command
  PRINT "DOS-EXEC: Attempting to execute '"; cmd$; "'"
  ON ERROR GOTO ShellError
  PRINT "DOS-EXEC: Using SHELL command now..."
  SHELL cmd$
  ON ERROR GOTO 0
  PRINT "DOS-EXEC: Command executed successfully"
END SUB

SUB HandleBasicFile(cmd$)
  ' Handle BASIC file generation
  ' First, extract filename from command (first word)
  CMDLEN = LEN(cmd$)
  CMDPOS = 1
  CURFILE$ = ""
  
  ' Skip leading spaces
  WHILE CMDPOS <= CMDLEN AND MID$(cmd$, CMDPOS, 1) = " "
    CMDPOS = CMDPOS + 1
  WEND
  
  ' Extract filename (up to first space)
  WHILE CMDPOS <= CMDLEN AND MID$(cmd$, CMDPOS, 1) <> " "
    CURFILE$ = CURFILE$ + MID$(cmd$, CMDPOS, 1)
    CMDPOS = CMDPOS + 1
  WEND
  
  PRINT "GEN-CMD: Extracted filename: "; CURFILE$
  
  ' Reset file open flag
  FILEOPEN = 0
  
  ' Send generation command
  PRINT "GEN-CMD: File will be created when first chunk arrives..."
  PRINT "GEN-CMD: Sending generation command"
  
  ON ERROR GOTO GenCommandError
  OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1
  PRINT #1, "GENERATE:" + cmd$
  CLOSE #1
  ON ERROR GOTO 0
  
  PRINT "GEN-CMD: Generation command sent, going to polling loop"
  
  ' Start polling loop
  CALL PollInputFile
END SUB

SUB PollInputFile
  ' Polling loop for cmd_in.txt
  PRINT "POLLING: Starting loop"
  
  ' Keep track of file position to avoid reading the same content twice
  FILEPOS = 1 ' Start at position 1 (beginning of file)
  MAXBUF = 200 ' Maximum buffer size to avoid string overflow errors
  EXITPOLLING = 0
  
  DO
    ' Use configurable polling delay
    FOR I = 1 TO POLLDELAY : NEXT I
    
    PRINT "POLLING: Attempting to open CMD_IN.TXT"
    
    ' Try to open file with proper error handling
    ON ERROR GOTO FileNotFound
    OPEN "CMD_IN.TXT" FOR INPUT AS #2
    
    PRINT "POLLING: Successfully opened CMD_IN.TXT"
    LNCNT = 0
    HVCNT = 0
    
    PRINT "READING: Starting to read file content"
    
    ' Skip already processed lines
    FOR I = 1 TO FILEPOS - 1
      IF EOF(2) THEN EXIT FOR
      LINE INPUT #2, SKIP$
    NEXT I
    
    ' Process any new lines in the file
    ON ERROR GOTO ReadingError
    
    WHILE NOT EOF(2)
      PRINT "READING: Reading a line from file"
      LINE INPUT #2, INDAT$
      PRINT "READING: Got line: "; INDAT$
      LNCNT = LNCNT + 1
      FILEPOS = FILEPOS + 1 ' Track position in file
      
      ' Process this line immediately
      CALL ProcessLine(INDAT$, EXITPOLLING)
      IF EXITPOLLING THEN
        ' Close the file before exiting
        CLOSE #2
        EXIT SUB
      END IF
      
      HVCNT = 1 ' Flag that we found content
    WEND
    
    PRINT "READING: Finished reading file"
    CLOSE #2
    
    ' Don't empty the file - JS keeps appending to it
    ' Only need to reset file position if file was manually edited or deleted
    IF LNCNT = 0 AND HVCNT = 0 THEN FILEPOS = 1
    
    ON ERROR GOTO 0
  LOOP
END SUB

SUB ProcessLine(lineData$, exitFlag)
  ' Process single line of content
  PRINT "PROCESS-FLOW: Processing line: "; lineData$
  
  IF LEFT$(lineData$, 5) = "RUN: " THEN
    CALL HandleRunCommand(lineData$, exitFlag)
  ELSEIF LEFT$(lineData$, 7) = "CHUNK: " THEN
    CALL HandleChunkData(lineData$)
  ELSEIF LEFT$(lineData$, 7) = "ERROR: " THEN
    PRINT "PROCESS-FLOW: Error message detected"
    PRINT: PRINT "ERROR: "; MID$(lineData$, 7): PRINT
  ELSE
    PRINT "PROCESS-FLOW: Unformatted content, printing as-is"
    PRINT lineData$; ' Stream without newline
  END IF
END SUB

SUB HandleRunCommand(lineData$, exitFlag)
  ' Handle RUN command from input file
  PRINT "PROCESS-FLOW: RUN command detected"
  PRINT
  
  RUNF$ = MID$(lineData$, 5)
  PRINT "PROCESS-FLOW: Extracted filename: "; RUNF$
  
  ' Clean filename - remove non-printable characters
  CLNF$ = ""
  FOR I = 1 TO LEN(RUNF$)
    C$ = MID$(RUNF$, I, 1)
    IF ASC(C$) >= 32 AND ASC(C$) < 127 THEN CLNF$ = CLNF$ + C$
  NEXT I
  
  PRINT "PROCESS-FLOW: Clean filename: "; CLNF$
  
  ' Close the file if it's open
  IF FILEOPEN = 1 THEN
    PRINT "PROCESS-FLOW: Closing open file..."
    CLOSE #3
    FILEOPEN = 0
  END IF
  
  PRINT "Running " + CLNF$
  PRINT "PROCESS-FLOW: File created, running with QB..."
  PRINT "*** Running " + CLNF$ + " with QBasic ***"
  
  ' Run the file with QB using SHELL command
  RUNQB$ = "QB /run " + CLNF$
  PRINT "SHELL command: "; RUNQB$
  
  ON ERROR GOTO RunError
  SHELL RUNQB$
  ON ERROR GOTO 0
  
  PRINT "PROCESS-FLOW: Returned from running file successfully"
  PRINT "PROCESS-FLOW: Generation complete, returning to command prompt"
  
  ' Clear input file contents since we've processed everything
  CLOSE ' Make sure all files are closed
  OPEN "CMD_IN.TXT" FOR OUTPUT AS #2
  CLOSE #2
  
  ' Set flag to exit polling loop
  exitFlag = 1
END SUB

SUB HandleChunkData(lineData$)
  ' Handle CHUNK data from input file
  PRINT "PROCESS-FLOW: Code chunk detected"
  
  CHUNK$ = MID$(lineData$, 7) ' Get content after "CHUNK: "
  
  ' Display the chunk for user feedback
  PRINT CHUNK$;
  
  ' Also write to the file if we have an active filename
  IF CURFILE$ <> "" THEN
    ON ERROR GOTO FileWriteError
    
    ' If file isn't open yet, open it
    IF FILEOPEN = 0 THEN
      PRINT "PROCESS-FLOW: Creating file: "; CURFILE$
      OPEN CURFILE$ FOR OUTPUT AS #3
      FILEOPEN = 1
    END IF
    
    ' Write chunk to the open file
    PRINT #3, CHUNK$
    ON ERROR GOTO 0
  END IF
END SUB

' *** ERROR HANDLERS - DO NOT CALL DIRECTLY ***
' These are only reachable through ON ERROR GOTO statements

UppercaseError:
  ' Error handler for uppercase conversion
  E = ERR : L = ERL
  PRINT "UPPERCASE-ERROR: Error"; E; "at line"; L
  PRINT "UPPERCASE-ERROR: Continuing without uppercase conversion"
  RESUME NEXT

ShellError:
  ' Error handler for SHELL command
  A = ERR : B = ERL
  PRINT "DOS-ERROR: Error"; A; "at line"; B; "while executing '"; cmd$; "'"
  
  ' Display specific error messages based on error code
  IF A = 53 THEN PRINT "DOS-ERROR: File not found"
  IF A = 52 THEN PRINT "DOS-ERROR: Bad filename or number"
  IF A = 71 THEN PRINT "DOS-ERROR: Disk not ready"
  IF A = 76 THEN PRINT "DOS-ERROR: Path not found"
  IF A = 5 THEN PRINT "DOS-ERROR: Illegal function call"
  IF A = 2 THEN PRINT "DOS-ERROR: Syntax error"
  
  PRINT "DOS-ERROR: Returning to command prompt"
  RESUME NEXT

GenCommandError:
  ' Error handler for generation command
  E = ERR : L = ERL
  PRINT "GEN-CMD-ERROR: Error"; E; "at line"; L
  PRINT "GEN-CMD-ERROR: Unable to send generation command"
  CLOSE
  RESUME NEXT

FileNotFound:
  ' Error handler for file not found
  A = ERR : B = ERL
  PRINT "ERROR HANDLER: Error"; A; "at line"; B
  CLOSE ' Close any open files 
  PRINT "ERROR HANDLER: Waiting longer before retry"
  
  ' Add extra delay to avoid rapid cycling when file not found
  FOR I = 1 TO ERRDELAY : NEXT I ' Using configurable error delay
  
  PRINT "ERROR HANDLER: Returning to polling"
  RESUME NEXT

ReadingError:
  ' Error handler for reading errors
  E = ERR : L = ERL
  PRINT "ERROR HANDLER: Error"; E; "at line"; L
  
  IF E = 15 THEN ' String overflow error
    PRINT "ERROR HANDLER: String overflow detected"
    CLOSE ' Close any open files
    PRINT "ERROR HANDLER: Continuing with processing"
    RESUME NEXT
  ELSE
    ' For any other error, close files and continue polling
    PRINT "ERROR HANDLER: Unexpected error"
    CLOSE
    RESUME NEXT
  END IF

RunError:
  ' Error handler for QB run command
  E = ERR : L = ERL
  PRINT "SHELL ERROR: Error"; E; "at line"; L
  PRINT "SHELL ERROR: Problem running QB with file"; CLNF$
  PRINT "SHELL ERROR: Command was:"; RUNQB$
  CLOSE
  exitFlag = 1 ' Still return to command prompt
  RESUME NEXT

FileWriteError:
  ' Error handler for file write operations
  E = ERR : L = ERL
  PRINT "FILE ERROR: Error"; E; "at line"; L
  PRINT "FILE ERROR: Problem with file"; CURFILE$
  CLOSE #3
  FILEOPEN = 0
  RESUME NEXT