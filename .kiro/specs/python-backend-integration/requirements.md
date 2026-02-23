# Requirements Document

## Introduction

This document specifies the requirements for integrating the Python Flask AI backend with the Node.js Express server in the CyberShakti project. The goal is to enable unified backend startup with a single command (`pnpm dev`), eliminating the need to manually start the Python Flask server separately. The integration will use a process management approach where the Express server spawns and manages the Flask server as a child process.

## Glossary

- **Express_Server**: The Node.js Express application that handles phishing scanner and general API routes (port 8080)
- **Flask_Server**: The Python Flask application that handles deepfake detection AI endpoints (port 5001)
- **Python_Bridge**: The Node.js module responsible for spawning, managing, and communicating with the Flask server process
- **Child_Process**: The Flask server running as a subprocess managed by the Express server
- **Health_Check**: A mechanism to verify that the Flask server is running and responsive
- **Graceful_Shutdown**: The process of cleanly terminating both servers when the application stops
- **Development_Mode**: Running the application with hot-reload and debugging enabled
- **Production_Mode**: Running the application in an optimized, stable configuration

## Requirements

### Requirement 1: Unified Startup

**User Story:** As a developer, I want to start both backend servers with a single command, so that I can quickly begin development without managing multiple terminal sessions.

#### Acceptance Criteria

1. WHEN a developer runs `pnpm dev`, THE Express_Server SHALL start on port 8080
2. WHEN the Express_Server starts, THE Python_Bridge SHALL spawn the Flask_Server as a Child_Process on port 5001
3. WHEN the Flask_Server starts successfully, THE Express_Server SHALL log a confirmation message
4. WHEN the Flask_Server fails to start, THE Express_Server SHALL log an error message with diagnostic information
5. THE Express_Server SHALL wait for the Flask_Server to be ready before accepting API requests to deepfake endpoints

### Requirement 2: Process Management

**User Story:** As a developer, I want the Flask server to be automatically managed by the Express server, so that I don't need to manually start or stop it.

#### Acceptance Criteria

1. WHEN the Express_Server spawns the Flask_Server, THE Python_Bridge SHALL capture stdout and stderr from the Child_Process
2. WHEN the Flask_Server outputs logs, THE Python_Bridge SHALL forward them to the Express_Server console with a distinguishing prefix
3. WHEN the Flask_Server process exits unexpectedly, THE Python_Bridge SHALL log the exit code and reason
4. WHEN the Flask_Server crashes, THE Express_Server SHALL continue running and return appropriate error responses for deepfake endpoints
5. THE Python_Bridge SHALL store the Child_Process reference for lifecycle management

### Requirement 3: Health Monitoring

**User Story:** As a developer, I want to know if the Flask server is running correctly, so that I can diagnose issues quickly.

#### Acceptance Criteria

1. WHEN the Flask_Server is spawned, THE Python_Bridge SHALL perform a Health_Check by polling the `/api/deepfake/stats` endpoint
2. WHEN the Health_Check succeeds, THE Python_Bridge SHALL mark the Flask_Server as ready
3. WHEN the Health_Check fails after maximum retry attempts, THE Python_Bridge SHALL log a warning and mark the Flask_Server as unavailable
4. THE Python_Bridge SHALL retry the Health_Check up to 10 times with 500ms intervals
5. WHEN a request is made to a deepfake endpoint and the Flask_Server is unavailable, THE Express_Server SHALL return a 503 Service Unavailable response

### Requirement 4: Graceful Shutdown

**User Story:** As a developer, I want both servers to shut down cleanly when I stop the application, so that no orphaned processes remain running.

#### Acceptance Criteria

1. WHEN the Express_Server receives a SIGINT signal, THE Python_Bridge SHALL send a termination signal to the Flask_Server Child_Process
2. WHEN the Express_Server receives a SIGTERM signal, THE Python_Bridge SHALL send a termination signal to the Flask_Server Child_Process
3. WHEN the Flask_Server is terminated, THE Python_Bridge SHALL wait up to 5 seconds for the process to exit
4. IF the Flask_Server does not exit within 5 seconds, THEN THE Python_Bridge SHALL forcefully kill the process
5. WHEN both servers have stopped, THE Express_Server SHALL exit with code 0

### Requirement 5: Environment Detection

**User Story:** As a developer, I want the system to detect if Python is properly configured, so that I receive clear error messages if dependencies are missing.

#### Acceptance Criteria

1. WHEN the Python_Bridge attempts to spawn the Flask_Server, THE Python_Bridge SHALL verify that Python is available in the system PATH
2. IF Python is not found, THEN THE Python_Bridge SHALL log an error message with instructions to install Python
3. WHEN the Flask_Server fails to start due to missing dependencies, THE Python_Bridge SHALL detect the error from stderr and log a helpful message
4. THE Python_Bridge SHALL check for the existence of `python/api_server.py` before attempting to spawn the process
5. IF the Flask server file is missing, THEN THE Python_Bridge SHALL log an error and continue running the Express_Server without Flask integration

### Requirement 6: Cross-Platform Support

**User Story:** As a developer, I want the integration to work on Windows, Linux, and macOS, so that all team members can use the same development workflow.

#### Acceptance Criteria

1. WHEN spawning the Flask_Server on Windows, THE Python_Bridge SHALL use the `python` command
2. WHEN spawning the Flask_Server on Linux or macOS, THE Python_Bridge SHALL use the `python3` command if `python` is not available
3. WHEN determining the Python command, THE Python_Bridge SHALL check which command is available in the system PATH
4. THE Python_Bridge SHALL use platform-independent path resolution for locating `python/api_server.py`
5. WHEN sending termination signals, THE Python_Bridge SHALL use appropriate signals for the current platform (SIGTERM on Unix, taskkill on Windows)

### Requirement 7: Development and Production Modes

**User Story:** As a developer, I want different behavior in development versus production, so that I have debugging tools during development and optimized performance in production.

#### Acceptance Criteria

1. WHEN running in Development_Mode, THE Flask_Server SHALL start with debug mode enabled
2. WHEN running in Production_Mode, THE Flask_Server SHALL start with debug mode disabled
3. WHEN running in Development_Mode, THE Python_Bridge SHALL provide verbose logging of Flask_Server output
4. WHEN running in Production_Mode, THE Python_Bridge SHALL only log Flask_Server errors and warnings
5. THE Python_Bridge SHALL determine the mode based on the NODE_ENV environment variable

### Requirement 8: Error Handling and Logging

**User Story:** As a developer, I want clear, actionable error messages when something goes wrong, so that I can quickly identify and fix issues.

#### Acceptance Criteria

1. WHEN the Flask_Server fails to start, THE Python_Bridge SHALL log the full error output from stderr
2. WHEN the Flask_Server is not ready after Health_Check retries, THE Python_Bridge SHALL log a warning with troubleshooting steps
3. WHEN a deepfake API request fails because the Flask_Server is unavailable, THE Express_Server SHALL return a JSON error response with status 503
4. THE Python_Bridge SHALL prefix all Flask_Server logs with `[Python]` for easy identification
5. WHEN the Flask_Server exits unexpectedly, THE Python_Bridge SHALL log the exit code and signal information

### Requirement 9: API Request Proxying

**User Story:** As a frontend developer, I want deepfake API requests to be automatically routed to the Flask server, so that I can use a consistent API base URL.

#### Acceptance Criteria

1. WHEN a request is made to `/api/deepfake/*`, THE Express_Server SHALL forward the request to the Flask_Server at `http://localhost:5001`
2. WHEN the Flask_Server returns a response, THE Express_Server SHALL forward the response to the client with the original status code and headers
3. WHEN the Flask_Server is unavailable, THE Express_Server SHALL return a 503 error without attempting to proxy the request
4. THE Express_Server SHALL preserve request headers, body, and query parameters when proxying
5. THE Express_Server SHALL handle multipart/form-data requests for file uploads to deepfake endpoints

### Requirement 10: Configuration Management

**User Story:** As a developer, I want to configure Flask server settings through environment variables, so that I can customize the integration without modifying code.

#### Acceptance Criteria

1. THE Python_Bridge SHALL read the Flask server port from the `FLASK_PORT` environment variable with a default of 5001
2. THE Python_Bridge SHALL read the Flask server host from the `FLASK_HOST` environment variable with a default of `0.0.0.0`
3. THE Python_Bridge SHALL read the Health_Check timeout from the `FLASK_HEALTH_TIMEOUT` environment variable with a default of 10 seconds
4. THE Python_Bridge SHALL read the Health_Check retry interval from the `FLASK_HEALTH_INTERVAL` environment variable with a default of 500ms
5. WHEN environment variables are invalid, THE Python_Bridge SHALL use default values and log a warning
