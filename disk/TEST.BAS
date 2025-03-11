10 CLS
20 PRINT "TEST PROGRAM"
30 PRINT "If you see this message, the BASIC program is running"
40 PRINT "Type a command:"
50 LINE INPUT CMD$
60 PRINT "You typed: "; CMD$
70 PRINT "Testing SHELL command..."
80 ON ERROR GOTO 100
90 SHELL CMD$
95 GOTO 110
100 PRINT "SHELL command failed with error: "; ERR
110 PRINT "Test complete"
120 END