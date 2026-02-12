@echo off
setlocal enabledelayedexpansion

REM Read .env file and set environment variables
for /f "tokens=1,2 delims==" %%a in (.env) do (
    set %%a=%%b
)

REM Run Spring Boot with environment variables
call mvnw.cmd spring-boot:run
