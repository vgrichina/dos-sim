10 CLS
20 PRINT "TEST PROGRAM"
30 PRINT "If you see this message, the BASIC program is running"
40 PRINT "Type a test number (1-7):"
50 LINE INPUT NUM$
60 N = VAL(NUM$)
70 PRINT "Running test "; N
80 ON N GOTO 100, 200, 300, 400, 500, 600, 700
90 PRINT "Invalid test number": GOTO 40

100 ' Test 1: Simple DIR command
110 PRINT "TEST 1: Simple DIR command"
120 PRINT "About to execute SHELL 'DIR'"
130 ON ERROR GOTO 190
140 SHELL "DIR"
150 PRINT "DIR command executed successfully"
160 ON ERROR GOTO 0
170 GOTO 700
190 PRINT "Error"; ERR; "occurred while executing DIR": GOTO 700

200 ' Test 2: Using COMMAND.COM
210 PRINT "TEST 2: Using COMMAND.COM"
220 PRINT "About to execute SHELL 'COMMAND.COM /C DIR'"
230 ON ERROR GOTO 290
240 SHELL "COMMAND.COM /C DIR"
250 PRINT "COMMAND.COM executed successfully"
260 ON ERROR GOTO 0
270 GOTO 700
290 PRINT "Error"; ERR; "occurred while using COMMAND.COM": GOTO 700

300 ' Test 3: Checking SHELL output redirection
310 PRINT "TEST 3: Output redirection"
320 PRINT "About to execute 'DIR > TEST.TXT'"
330 ON ERROR GOTO 390
340 SHELL "DIR > TEST.TXT"
350 PRINT "Command executed, checking TEST.TXT..."
360 OPEN "TEST.TXT" FOR INPUT AS #1: CLOSE #1
370 PRINT "TEST.TXT was created"
380 GOTO 700
390 PRINT "Error"; ERR; "occurred with redirection": GOTO 700

400 ' Test 4: CMD$ variable
410 PRINT "TEST 4: Using CMD$ variable"
420 PRINT "Type a command to run:"
430 LINE INPUT CMD$
440 PRINT "About to execute '"; CMD$; "'"
450 ON ERROR GOTO 490
460 SHELL CMD$
470 PRINT "Command executed successfully"
480 GOTO 700
490 PRINT "Error"; ERR; "occurred running '"; CMD$; "'": GOTO 700

500 ' Test 5: Alternative command approach
510 PRINT "TEST 5: Alternative 'dir' approach"
520 PRINT "About to try an alternative approach"
530 ON ERROR GOTO 590
540 SHELL "cd ."
550 SHELL "dir"
560 PRINT "Alternative approach completed"
570 GOTO 700
590 PRINT "Error"; ERR; "occurred with alternative": GOTO 700

600 ' Test 6: Environment check
610 PRINT "TEST 6: Environment check"
620 PRINT "Checking environment variables..."
630 OPEN "ENV.TXT" FOR OUTPUT AS #1
640 PRINT #1, "Running environment check"
650 CLOSE #1
660 SHELL "SET > ENV.TXT"
670 PRINT "Environment saved to ENV.TXT"
680 GOTO 700

700 ' Test 7: LINE INPUT demo and troubleshooting
710 PRINT "TEST 7: LINE INPUT demonstration"
720 PRINT "This test will show various LINE INPUT behaviors"
730 PRINT 
740 PRINT "Test 7.1: Basic LINE INPUT"
750 PRINT "Type something and press Enter:"
760 ON ERROR GOTO 790
765 LINE INPUT TEST$
770 PRINT "You typed: ["; TEST$; "]"
780 GOTO 800
790 PRINT "Error"; ERR; "occurred during basic LINE INPUT"

800 PRINT
810 PRINT "Test 7.2: LINE INPUT with file"
820 PRINT "Creating test file..."
830 ON ERROR GOTO 890
840 PRINT "Attempting to open INPUT.TXT for output..."
841 OPEN "INPUT.TXT" FOR OUTPUT AS #1
845 PRINT "File opened successfully"
850 PRINT #1, "This is a test line"
860 PRINT #1, "This is another line"
870 CLOSE #1
875 PRINT "File written and closed"
880 GOTO 900
890 PRINT "Error"; ERR; "at line"; ERL; "creating test file"
895 GOTO 990

900 PRINT "Reading from test file..."
910 ON ERROR GOTO 970
920 PRINT "Attempting to open INPUT.TXT for input..."
925 OPEN "INPUT.TXT" FOR INPUT AS #2
930 PRINT "File opened successfully"
940 PRINT "Reading first line with LINE INPUT:"
945 LINE INPUT #2, FLINE$
950 PRINT "First line: ["; FLINE$; "]"
960 GOTO 980
970 PRINT "Error"; ERR; "at line"; ERL; "reading from file"
980 CLOSE #2

990 ' Test complete
1000 PRINT
1010 PRINT "Test complete. Press any key to return to menu"
1020 A$ = INKEY$: IF A$ = "" THEN 1020
1030 GOTO 10