' DOSSim v1.0 - QBasic Version
' Modern structured version of CMD.BAS

' Configuration variables - easy to adjust
POLLDELAY = 1500000  ' Polling delay 
ERRDELAY = 3000000   ' Error delay

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
  CALL CommandPrompt
LOOP UNTIL QUIT

END ' End of main program

' *** MAIN SUBROUTINES ***

SUB CommandPrompt
  SHARED QUIT
  ' Display command prompt and get user input
  PRINT "C:\>";
  LINE INPUT CMD$
  
  ' Convert to uppercase
  ON ERROR GOTO UppercaseError
  CALL ConvertUppercase(CMD$)
  ON ERROR GOTO 0
  
  ' Process command
  IF CMD$ = "" THEN 
    EXIT SUB
  END IF
  
  IF CMD$ = "EXIT" THEN 
    PRINT "Exiting DOSSim..."
    QUIT = 1
    EXIT SUB
  END IF
  
  ' Check command type and process accordingly
  IF INSTR(CMD$, ".BAS") > 0 THEN
    CALL HandleBasicFile(CMD$)
  ELSEIF CMD$ = "TEST" THEN
    PRINT "Running test command..."
  ELSE
    CALL ExecuteDosCommand(CMD$)
  END IF
END SUB

SUB ConvertUppercase(cmd$)
  ' Convert command to uppercase
  TEMP$ = ""
  FOR I = 1 TO LEN(cmd$)
    C$ = MID$(cmd$, I, 1)
    
    IF C$ >= "a" AND C$ <= "z" THEN
      C$ = CHR$(ASC(C$) - 32)
    END IF
    
    TEMP$ = TEMP$ + C$
  NEXT I
  
  cmd$ = TEMP$
END SUB

SUB ExecuteDosCommand(cmd$)
  ' Execute standard DOS command
  ON ERROR GOTO ShellError
  SHELL cmd$
  ON ERROR GOTO 0
END SUB

SUB HandleBasicFile(cmd$)
  SHARED CURFILE$, FILEOPEN
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
  
  ' Reset file open flag
  FILEOPEN = 0
  
  ' Send generation command
  PRINT "Generating "; CURFILE$ ; "..."
  
  ON ERROR GOTO GenCommandError
  OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1
  PRINT #1, "GENERATE:" + cmd$
  CLOSE #1
  ON ERROR GOTO 0
  
  ' Start polling loop
  CALL PollInputFile
END SUB

SUB PollInputFile
  SHARED POLLDELAY, ERRDELAY
  ' Polling loop for cmd_in.txt
  
  ' Keep track of file position to avoid reading the same content twice
  FILEPOS = 1 ' Start at position 1 (beginning of file)
  MAXBUF = 200 ' Maximum buffer size to avoid string overflow errors
  EXITPOLLING = 0
  
  DO
    ' Use configurable polling delay
    FOR I = 1 TO POLLDELAY : NEXT I
    
    ' Try to open file with proper error handling
    ON ERROR GOTO FileNotFound
    OPEN "CMD_IN.TXT" FOR INPUT AS #2
    
    LNCNT = 0
    HVCNT = 0
    
    ' Skip already processed lines
    FOR I = 1 TO FILEPOS - 1
      IF EOF(2) THEN EXIT FOR
      LINE INPUT #2, SKIP$
    NEXT I
    
    ' Process any new lines in the file
    ON ERROR GOTO ReadingError
    
    WHILE NOT EOF(2)
      LINE INPUT #2, INDAT$
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
    
    CLOSE #2
    
    ' Don't empty the file - JS keeps appending to it
    ' Only need to reset file position if file was manually edited or deleted
    IF LNCNT = 0 AND HVCNT = 0 THEN FILEPOS = 1
    
    ON ERROR GOTO 0
  LOOP
END SUB

SUB ProcessLine(lineData$, exitFlag)
  ' Process single line of content
  
  IF LEFT$(lineData$, 5) = "RUN: " THEN
    CALL HandleRunCommand(lineData$, exitFlag)
  ELSEIF LEFT$(lineData$, 7) = "CHUNK: " THEN
    CALL HandleChunkData(lineData$)
  ELSEIF LEFT$(lineData$, 7) = "ERROR: " THEN
    PRINT: PRINT "ERROR: "; MID$(lineData$, 7): PRINT
  ELSE
    PRINT lineData$; ' Stream without newline
  END IF
END SUB

SUB HandleRunCommand(lineData$, exitFlag)
  SHARED FILEOPEN
  ' Handle RUN command from input file
  PRINT
  
  RUNF$ = MID$(lineData$, 5)
  
  ' Clean filename - remove non-printable characters
  CLNF$ = ""
  FOR I = 1 TO LEN(RUNF$)
    C$ = MID$(RUNF$, I, 1)
    IF ASC(C$) >= 32 AND ASC(C$) < 127 THEN CLNF$ = CLNF$ + C$
  NEXT I
  
  ' Close the file if it's open
  IF FILEOPEN = 1 THEN
    CLOSE #3
    FILEOPEN = 0
  END IF
  
  PRINT "Running " + CLNF$
  PRINT "*** Running " + CLNF$ + " with QBasic ***"
  
  ' Run the file with QB using SHELL command
  RUNQB$ = "QB /run " + CLNF$
  
  ON ERROR GOTO RunError
  SHELL RUNQB$
  ON ERROR GOTO 0
  
  ' Clear input file contents since we've processed everything
  CLOSE ' Make sure all files are closed
  OPEN "CMD_IN.TXT" FOR OUTPUT AS #2
  CLOSE #2
  
  ' Set flag to exit polling loop
  exitFlag = 1
END SUB

SUB HandleChunkData(lineData$)
  SHARED CURFILE$, FILEOPEN
  ' Handle CHUNK data from input file
  
  CHUNK$ = MID$(lineData$, 7) ' Get content after "CHUNK: "
  
  ' Display the chunk for user feedback
  PRINT CHUNK$;
  
  ' Also write to the file if we have an active filename
  IF CURFILE$ <> "" THEN
    ON ERROR GOTO FileWriteError
    
    ' If file isn't open yet, open it
    IF FILEOPEN = 0 THEN
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
  PRINT "CRITICAL ERROR: Failed to convert to uppercase (Error"; E; "at line"; L; ")"
  END

ShellError:
  ' Error handler for SHELL command
  A = ERR : B = ERL
  
  ' Display specific error messages based on error code
  IF A = 53 THEN PRINT "ERROR: File not found"
  IF A = 52 THEN PRINT "ERROR: Bad filename or number"
  IF A = 71 THEN PRINT "ERROR: Disk not ready"
  IF A = 76 THEN PRINT "ERROR: Path not found"
  IF A = 5 THEN PRINT "ERROR: Illegal function call"
  IF A = 2 THEN PRINT "ERROR: Syntax error"
  IF A = 0 THEN PRINT "ERROR: Unknown error while executing command"
  
  RESUME NEXT

GenCommandError:
  ' Error handler for generation command
  PRINT "ERROR: Unable to send generation command"
  CLOSE
  RESUME NEXT

FileNotFound:
  ' Error handler for file not found
  CLOSE ' Close any open files 
  
  ' Add extra delay to avoid rapid cycling when file not found
  FOR I = 1 TO ERRDELAY : NEXT I ' Using configurable error delay
  
  RESUME

ReadingError:
  ' Error handler for reading errors
  E = ERR
  
  IF E = 15 THEN ' String overflow error
    CLOSE ' Close any open files
    RESUME NEXT
  ELSE
    ' For any other error, close files and continue polling
    PRINT "ERROR: Problem reading file content"
    CLOSE
    RESUME NEXT
  END IF

RunError:
  ' Error handler for QB run command
  PRINT "ERROR: Problem running "; CLNF$
  CLOSE
  exitFlag = 1 ' Still return to command prompt
  RESUME NEXT

FileWriteError:
  ' Error handler for file write operations
  PRINT "ERROR: Problem writing to file "; CURFILE$
  CLOSE #3
  FILEOPEN = 0
  RESUME NEXT
