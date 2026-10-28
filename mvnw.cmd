@echo off
set DIR=%~dp0
if exist "%DIR%..\.tools\maven\apache-maven-3.9.9\bin\mvn.cmd" (
    call "%DIR%..\.tools\maven\apache-maven-3.9.9\bin\mvn.cmd" %*
) else if exist "%DIR%.tools\maven\apache-maven-3.9.9\bin\mvn.cmd" (
    call "%DIR%.tools\maven\apache-maven-3.9.9\bin\mvn.cmd" %*
) else (
    mvn %*
)
