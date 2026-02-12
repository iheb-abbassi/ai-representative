@echo off
set MAVEN_PROJECT_DIR=%~dp0
if "%MAVEN_PROJECT_DIR%"=="" set MAVEN_PROJECT_DIR=%%~dp0

set MAVEN_HOME=C:\Program Files\apache-maven-3.9.9

set CLASSPATH=%MAVEN_PROJECT_DIR%\target\classes;%MAVEN_PROJECT_DIR%\target\test-classes;%MAVEN_PROJECT_DIR%\target\classes

REM Use production profile configuration
set MAVEN_OPTS=-Dspring.profiles.active=prod -Dspring.config.location=file:./application-prod.yml

REM Provide a "standardized" maven.cmd file.
@setlocal

set MAVEN_CMD_LINE_ARGS=%*

@rem Execute the project using Maven CLI with "mvn" command
"%MAVEN_HOME%\bin\mvn.cmd" %MAVEN_CMD_LINE_ARGS%

if %ERRORLEVEL% NEQ 0 goto error
goto end

:error
set ERROR_CODE=1
echo Maven build failed!
exit /B %ERROR_CODE%

:end
set ERROR_CODE=0
exit /B 0

echo Maven build successful!
