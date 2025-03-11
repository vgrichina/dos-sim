10 CLS
20 PRINT "DOSSim v1.0 - DOS Experience in the Browser"
30 PRINT "Type DOS commands or generate BASIC apps using [NAME].BAS parameters"
40 PRINT "Example: MARIO.BAS /no-koopas /play-as-princess"
50 PRINT
60 PRINT "C:\>";
70 LINE INPUT CMD$
71 ' Convert to uppercase manually
72 GOSUB 3000 ' Go to uppercase conversion subroutine
75 PRINT "DEBUG: Command is '"; CMD$; "', LEN="; LEN(CMD$)
80 IF CMD$ = "EXIT" THEN PRINT "Exiting DOSSim..." : SYSTEM
90 ' Check if it's a generative prompt
100 IF INSTR(CMD$, ".BAS") > 0 THEN GOTO 300
110 ' Otherwise, it's a standard DOS command
115 PRINT "DOS-EXEC: Attempting to execute '"; CMD$; "'"
116 ON ERROR GOTO 2000
120 SHELL CMD$
125 ON ERROR GOTO 0
126 PRINT "DOS-EXEC: Command executed"
130 GOTO 60

2000 ' Error handler for SHELL command
2005 A = ERR : B = ERL
2010 PRINT "DOS-ERROR: Error"; A; "at line"; B; "while executing '"; CMD$; "'"
2015 RESUME 130

300 ' Handle BASIC file generation
305 PRINT "GEN-CMD: Sending generation command"
310 OPEN "CMD_OUT.TXT" FOR OUTPUT AS #1
320 PRINT #1, "GENERATE:" + CMD$
330 CLOSE #1
335 PRINT "GEN-CMD: Generation command sent, going to polling loop"
340 GOTO 400 ' Go to polling loop after sending the command

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