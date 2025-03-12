10 ' Configuration variables - easy to adjust
11 POLLDELAY = 150000 * 10 ' Polling delay (10x for QBasic)
12 ERRDELAY = 300000 * 10 ' Error delay (10x for QBasic)
13 ' Global variables
14 CURFILE$ = "" ' Current file being generated
15 FILEOPEN = 0 ' Flag to track if output file is open
16 CLS
20 PRINT "DOSSim v1.0 - DOS Experience in the Browser"
30 PRINT "Type DOS commands or generate BASIC apps using [NAME].BAS parameters"
40 PRINT "Example: MARIO.BAS /no-koopas /play-as-princess"
50 PRINT
60 PRINT "C:\>";
65 PRINT "CMD-READ: Waiting for command input..."
70 LINE INPUT CMD$
71 PRINT "CMD-READ: Raw command received: ["; CMD$; "]"
72 PRINT "CMD-READ: Command length: "; LEN(CMD$)
73 PRINT "CMD-READ: ASCII codes: ";
74 FOR I = 1 TO LEN(CMD$)
75   PRINT ASC(MID$(CMD$, I, 1)); " ";
76 NEXT I
77 PRINT
78 PRINT "CMD-READ: About to convert to uppercase"
79 ' Convert to uppercase manually
80 ON ERROR GOTO 2500
81 PRINT "CMD-READ: About to convert to uppercase"
82 GOSUB 3000
83 PRINT "CMD-READ: Uppercase conversion complete - returned from subroutine!"
84 PRINT "DEBUG: Command after uppercase is '"; CMD$; "', LEN="; LEN(CMD$)
85 IF CMD$ = "" THEN PRINT "CMD-READ: Empty command detected": GOTO 60
90 IF CMD$ = "EXIT" THEN PRINT "Exiting DOSSim..." : SYSTEM
95 ' Check if it's a generative prompt
100 IF INSTR(CMD$, ".BAS") > 0 THEN GOTO 300
105 ' Is it a TEST command?
106 IF CMD$ = "TEST" THEN PRINT "CMD-READ: Test command detected": GOTO 60
110 ' Otherwise, it's a standard DOS command
115 PRINT "DOS-EXEC: Attempting to execute '"; CMD$; "'"
116 ON ERROR GOTO 2000
117 PRINT "DOS-EXEC: Using SHELL command now..."
120 SHELL CMD$
125 ON ERROR GOTO 0
126 PRINT "DOS-EXEC: Command executed successfully"
130 GOTO 60

1999 PRINT "ERROR: Accidental entry to SHELL error handler!": END
2000 ' Error handler for SHELL command
2005 A = ERR : B = ERL
2010 PRINT "DOS-ERROR: Error"; A; "at line"; B; "while executing '"; CMD$; "'"
2020 ' Display specific error messages based on error code
2030 IF A = 53 THEN PRINT "DOS-ERROR: File not found"
2040 IF A = 52 THEN PRINT "DOS-ERROR: Bad filename or number"
2050 IF A = 71 THEN PRINT "DOS-ERROR: Disk not ready"
2060 IF A = 76 THEN PRINT "DOS-ERROR: Path not found"
2070 IF A = 5 THEN PRINT "DOS-ERROR: Illegal function call"
2080 IF A = 2 THEN PRINT "DOS-ERROR: Syntax error"
2090 PRINT "DOS-ERROR: Returning to command prompt"
2095 RESUME 130

2499 PRINT "ERROR: Accidental entry to uppercase error handler!": END
2500 ' Error handler for uppercase conversion
2505 E = ERR : L = ERL
2510 PRINT "UPPERCASE-ERROR: Error"; E; "at line"; L
2520 PRINT "UPPERCASE-ERROR: Continuing without uppercase conversion"
2525 ON ERROR GOTO 0
2530 RESUME 85

300 ' Handle BASIC file generation
301 ' First, extract filename from command (first word)
302 CMDLEN = LEN(CMD$)
303 CMDPOS = 1
304 CURFILE$ = ""
305 ' Skip leading spaces
306 WHILE CMDPOS <= CMDLEN AND MID$(CMD$, CMDPOS, 1) = " "
307   CMDPOS = CMDPOS + 1
308 WEND
309 ' Extract filename (up to first space)
310 WHILE CMDPOS <= CMDLEN AND MID$(CMD$, CMDPOS, 1) <> " "
311   CURFILE$ = CURFILE$ + MID$(CMD$, CMDPOS, 1)
312   CMDPOS = CMDPOS + 1
313 WEND
314 PRINT "GEN-CMD: Extracted filename: "; CURFILE$
315 ' Reset file open flag
316 FILEOPEN = 0
317 ' Just set the filename, we'll open the file when we get the first chunk
318 PRINT "GEN-CMD: File will be created when first chunk arrives..."
320 ' Send generation command
322 PRINT "GEN-CMD: Sending generation command"
323 OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1
324 PRINT #1, "GENERATE:" + CMD$
325 CLOSE #1
330 PRINT "GEN-CMD: Generation command sent, going to polling loop"
340 GOTO 400 ' Go to polling loop after sending the command

400 ' Polling loop for cmd_in.txt
405 PRINT "POLLING: Starting loop"
406 ' Keep track of file position to avoid reading the same content twice
407 FILEPOS = 1 ' Start at position 1 (beginning of file)
408 MAXBUF = 200 ' Maximum buffer size to avoid string overflow errors
420 FOR I = 1 TO POLLDELAY : NEXT I ' Using configurable polling delay
425 PRINT "POLLING: Attempting to open CMD_IN.TXT"
430 ' Try to open file with proper error handling
435 ON ERROR GOTO 1000
440 OPEN "CMD_IN.TXT" FOR INPUT AS #2
445 PRINT "POLLING: Successfully opened CMD_IN.TXT"
455 LNCNT = 0
456 HVCNT = 0
465 PRINT "READING: Starting to read file content"
467 FOR I = 1 TO FILEPOS - 1
468   IF EOF(2) THEN EXIT FOR
469   LINE INPUT #2, SKIP$
470 NEXT I
471 ' Now process any new lines in the file
472 ON ERROR GOTO 2700 ' Handle string overflow errors (Error 15)
473 WHILE NOT EOF(2)
475   PRINT "READING: Reading a line from file"
476   LINE INPUT #2, INDAT$
480   PRINT "READING: Got line: "; INDAT$
481   LNCNT = LNCNT + 1
482   FILEPOS = FILEPOS + 1 ' Track position in file
483   
484   ' Process this line immediately instead of buffering
485   GOSUB 700
486   
487   HVCNT = 1 ' Flag that we found content
488 WEND
505 PRINT "READING: Finished reading file"
510 CLOSE #2
515 ' Don't empty the file - JS keeps appending to it
520 ' Only need to reset file position if file was manually edited or deleted
525 IF LNCNT = 0 AND HVCNT = 0 THEN FILEPOS = 1
530 GOTO 420

599 PRINT "ERROR: Accidental entry to old content processing routine!": END
600 ' Old process routine (keeping for reference)
605 PRINT "PROCESS-FLOW: [OLD] Processing new content"
610 PRINT "WARNING: Using old processing routine!"
615 RETURN

699 PRINT "ERROR: Accidental entry to line processing routine!": END
700 ' Process single line of content
705 PRINT "PROCESS-FLOW: Processing line: "; INDAT$
710 IF LEFT$(INDAT$, 5) = "RUN: " THEN
715   PRINT "PROCESS-FLOW: RUN command detected"
720   PRINT
725   RUNF$ = MID$(INDAT$, 5)
730   PRINT "PROCESS-FLOW: Extracted filename: "; RUNF$
735   ' Clean filename - remove non-printable characters
740   CLNF$ = ""
745   FOR I = 1 TO LEN(RUNF$)
750     C$ = MID$(RUNF$, I, 1)
755     IF ASC(C$) >= 32 AND ASC(C$) < 127 THEN CLNF$ = CLNF$ + C$
760   NEXT I
765   PRINT "PROCESS-FLOW: Clean filename: "; CLNF$
766   ' Close the file if it's open
767   IF FILEOPEN = 1 THEN
768     PRINT "PROCESS-FLOW: Closing open file..."
769     CLOSE #3
770     FILEOPEN = 0
771   END IF
772   PRINT "Running " + CLNF$
775   PRINT "PROCESS-FLOW: File created, exiting to check file"
780   PRINT "*** Exiting to check if file was created ***"
785   SYSTEM
786 ELSEIF LEFT$(INDAT$, 7) = "CHUNK: " THEN
787   PRINT "PROCESS-FLOW: Code chunk detected"
788   CHUNK$ = MID$(INDAT$, 7) ' Get content after "CHUNK: "
789   
790   ' Display the chunk for user feedback
791   PRINT CHUNK$;
792   
793   ' Also write to the file if we have an active filename
794   IF CURFILE$ <> "" THEN
795     ON ERROR GOTO 2900
796     
797     ' If file isn't open yet, open it
798     IF FILEOPEN = 0 THEN
799       PRINT "PROCESS-FLOW: Creating file: "; CURFILE$
800       OPEN CURFILE$ FOR OUTPUT AS #3
801       FILEOPEN = 1
802     END IF
803     
804     ' Write chunk to the open file
805     PRINT #3, CHUNK$
806     
807     ON ERROR GOTO 2700 ' Restore original error handler
808   END IF
809 ELSEIF LEFT$(INDAT$, 7) = "ERROR: " THEN
810   PRINT "PROCESS-FLOW: Error message detected"
811   PRINT: PRINT "ERROR: "; MID$(INDAT$, 7): PRINT
812 ELSE
813   PRINT "PROCESS-FLOW: Unformatted content, printing as-is"
814   PRINT INDAT$; ' Stream without newline
815 END IF
816 RETURN

999 PRINT "ERROR: Accidental entry to file error handler!": END
1000 ' Error handler for file not found
1001 A = ERR : B = ERL
1005 PRINT "ERROR HANDLER: Error"; A; "at line"; B
1010 CLOSE ' Close any open files 
1015 PRINT "ERROR HANDLER: Waiting longer before retry"
1020 ' Add extra delay to avoid rapid cycling when file not found
1025 FOR I = 1 TO ERRDELAY : NEXT I ' Using configurable error delay
1030 PRINT "ERROR HANDLER: Returning to polling"
1035 RESUME 420 ' Go back to polling loop

2699 PRINT "ERROR: Accidental entry to string overflow handler!": END
2700 ' Error handler for string overflow (Error 15)
2705 E = ERR : L = ERL
2710 PRINT "ERROR HANDLER: Error"; E; "at line"; L
2715 IF E = 15 THEN
2720   PRINT "ERROR HANDLER: String overflow detected"
2725   CLOSE ' Close any open files
2730   PRINT "ERROR HANDLER: Continuing with processing"
2735   RESUME 510 ' Skip to the end of file reading
2740 ELSE
2745   ' For any other error, close files and continue polling
2750   PRINT "ERROR HANDLER: Unexpected error"
2755   CLOSE
2760   RESUME 525 ' Continue polling
2765 END IF

2899 PRINT "ERROR: Accidental entry to file operation handler!": END
2900 ' Error handler for file operations
2905 E = ERR : L = ERL
2910 PRINT "FILE ERROR: Error"; E; "at line"; L
2915 PRINT "FILE ERROR: Problem with file"; CURFILE$
2920 CLOSE ' Close any open files
2930 GOTO 60 ' Return to main prompt

2999 PRINT "ERROR: Accidental entry to uppercase routine!": END
3000 ' Uppercase conversion subroutine
3005 PRINT "UPPER-SUB: Starting uppercase conversion"
3010 TEMP$ = ""
3020 FOR I = 1 TO LEN(CMD$)
3025   PRINT "UPPER-SUB: Processing char"; I;
3030   C$ = MID$(CMD$, I, 1)
3035   PRINT "UPPER-SUB: Char is '"; C$; "' ASCII="; ASC(C$)
3040   IF C$ >= "a" AND C$ <= "z" THEN GOTO 3045
3042   PRINT "UPPER-SUB: No conversion needed"
3043   GOTO 3050
3045   PRINT "UPPER-SUB: Converting to uppercase"
3046   C$ = CHR$(ASC(C$) - 32)
3050   TEMP$ = TEMP$ + C$
3055   PRINT "UPPER-SUB: Added to temp string, length now"; LEN(TEMP$)
3060 NEXT I
3065 PRINT "UPPER-SUB: Conversion complete, setting CMD$"
3070 CMD$ = TEMP$
3075 PRINT "UPPER-SUB: CMD$ set to ["; CMD$; "]"
3076 PRINT "UPPER-SUB: About to RETURN from subroutine"
3080 RETURN
3081 PRINT "UPPER-SUB: This line should never execute!"
