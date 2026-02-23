# Implementation Plan: Python Backend Integration

## Overview

This implementation plan breaks down the Python backend integration into discrete, incremental steps. Each task builds on previous work, starting with core infrastructure (configuration and PythonBridge), then adding proxy middleware, updating the Express server, and finally adding comprehensive testing. The approach ensures that each component can be validated independently before integration.

## Tasks

- [x] 1. Set up project structure and configuration module
  - Create `server/config.ts` for environment variable management
  - Define TypeScript interfaces for Flask configuration
  - Implement configuration loader with default values and validation
  - Add environment variable parsing with error handling
  - Export typed configuration object
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 1.1 Write unit tests for configuration module
  - Test default value application for missing variables
  - Test environment variable parsing for valid values
  - Test invalid value handling and warning logs
  - Test all configuration properties (port, host, timeouts, intervals)
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2. Implement PythonBridge core functionality
  - [x] 2.1 Create `server/python-bridge.ts` with class structure
    - Define `PythonBridgeConfig` interface
    - Define `BridgeState` interface
    - Implement constructor with configuration merging
    - Add state management properties (process, isReady, timestamps)
    - _Requirements: 1.2, 2.5_

  - [x] 2.2 Implement Python command detection
    - Create `detectPythonCommand()` method
    - Check for `python` and `python3` in system PATH
    - Handle platform-specific command selection (Windows vs Unix)
    - Use `which` or `where` commands to verify availability
    - Return appropriate command or throw error
    - _Requirements: 5.1, 6.1, 6.2, 6.3_

  - [ ]* 2.3 Write property test for Python command detection
    - **Property 6: Cross-Platform Command Detection**
    - **Validates: Requirements 6.1, 6.2, 6.3**

  - [x] 2.4 Implement environment validation
    - Create `validateEnvironment()` method
    - Check Python availability using `detectPythonCommand()`
    - Verify `python/api_server.py` file exists
    - Return validation result with error messages
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

  - [ ]* 2.5 Write property test for environment validation
    - **Property 9: Environment Validation and Error Messaging**
    - **Validates: Requirements 5.1, 5.2, 5.4, 5.5**

- [x] 3. Implement Flask process spawning and management
  - [x] 3.1 Implement `spawnFlaskProcess()` method
    - Use `child_process.spawn()` to start Flask server
    - Pass port and host as command-line arguments or environment variables
    - Set appropriate working directory
    - Configure stdio pipes for log capture
    - Store process reference in state
    - _Requirements: 1.2, 2.1, 2.5_

  - [x] 3.2 Implement process output handlers
    - Create `setupProcessHandlers()` method
    - Attach stdout handler to capture Flask logs
    - Attach stderr handler to capture Flask errors
    - Prefix all output with `[Python]` before logging
    - Handle different log levels based on development/production mode
    - _Requirements: 2.1, 2.2, 7.3, 7.4, 8.4_

  - [ ]* 3.3 Write property test for log forwarding
    - **Property 7: Log Forwarding with Prefix**
    - **Validates: Requirements 2.1, 2.2, 8.4**

  - [x] 3.4 Implement process exit handler
    - Create `handleProcessExit()` method
    - Log exit code and signal information
    - Update bridge state (isReady = false, process = null)
    - Provide troubleshooting guidance in logs
    - _Requirements: 2.3, 8.5_

  - [ ]* 3.5 Write property test for comprehensive error logging
    - **Property 10: Comprehensive Error Logging**
    - **Validates: Requirements 1.4, 2.3, 5.3, 8.1, 8.2, 8.5**

- [x] 4. Implement health check mechanism
  - [x] 4.1 Implement `performHealthCheck()` method
    - Make HTTP GET request to `http://localhost:{port}/api/deepfake/stats`
    - Parse JSON response
    - Return boolean indicating success/failure
    - Handle network errors and timeouts
    - _Requirements: 3.1_

  - [x] 4.2 Implement `waitForHealth()` method
    - Retry health check up to configured maximum attempts
    - Wait configured interval between retries
    - Update `isReady` state on success
    - Log warning with troubleshooting steps on failure
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 8.2_

  - [ ]* 4.3 Write property test for health check convergence
    - **Property 2: Health Check Convergence**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4**

- [x] 5. Implement start() method and lifecycle
  - [x] 5.1 Implement `start()` method
    - Validate environment before spawning
    - Handle validation failures gracefully (log error, don't throw)
    - Spawn Flask process if validation passes
    - Set up process handlers
    - Wait for health check
    - Log confirmation message on success
    - Log error with diagnostics on failure
    - _Requirements: 1.2, 1.3, 1.4, 5.5_

  - [ ]* 5.2 Write property test for process lifecycle consistency
    - **Property 1: Process Lifecycle Consistency**
    - **Validates: Requirements 1.2, 1.3, 2.5**

  - [x] 5.3 Implement `isFlaskReady()` method
    - Return current value of `isReady` state
    - _Requirements: 3.5_

  - [x] 5.4 Implement `getFlaskUrl()` method
    - Return Flask server URL based on configuration
    - Format: `http://localhost:{port}`
    - _Requirements: 9.1_

- [x] 6. Checkpoint - Ensure PythonBridge tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Implement graceful shutdown
  - [x] 7.1 Implement `stop()` method
    - Check if process exists
    - Send SIGTERM to Flask process (or taskkill on Windows)
    - Wait up to configured timeout for process exit
    - Forcefully kill process if timeout exceeded
    - Clean up process reference
    - Log shutdown progress
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [ ]* 7.2 Write property test for graceful shutdown
    - **Property 3: Graceful Shutdown Completeness**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

  - [ ]* 7.3 Write property test for platform-specific path resolution
    - **Property 14: Platform-Specific Path Resolution**
    - **Validates: Requirements 6.4, 6.5**

- [x] 8. Implement Flask proxy middleware
  - [x] 8.1 Create `server/routes/deepfake-proxy.ts`
    - Define `ProxyMiddlewareOptions` interface
    - Implement `createDeepfakeProxy()` function
    - Check Flask readiness before proxying
    - Return 503 error if Flask unavailable
    - _Requirements: 3.5, 9.3_

  - [x] 8.2 Implement request proxying logic
    - Use `node-fetch` to forward requests to Flask
    - Preserve request method, headers, body, and query parameters
    - Handle multipart/form-data for file uploads
    - Stream request body to Flask
    - _Requirements: 9.1, 9.4, 9.5_

  - [x] 8.3 Implement response forwarding logic
    - Forward Flask response status code to client
    - Forward Flask response headers to client
    - Stream Flask response body to client
    - Handle Flask errors gracefully
    - _Requirements: 9.2_

  - [ ]* 8.4 Write property test for proxy request preservation
    - **Property 4: Proxy Request Preservation**
    - **Validates: Requirements 9.1, 9.2, 9.4, 9.5**

  - [ ]* 8.5 Write property test for error response consistency
    - **Property 5: Error Response Consistency**
    - **Validates: Requirements 3.5, 9.3, 8.3**

  - [ ]* 8.6 Write property test for request timing and readiness
    - **Property 12: Request Timing and Readiness**
    - **Validates: Requirements 1.5**

- [x] 9. Update Express server integration
  - [x] 9.1 Update `server/index.ts` to use PythonBridge
    - Import PythonBridge and configuration
    - Instantiate PythonBridge in `createServer()` or new initialization function
    - Pass PythonBridge instance to middleware
    - Register deepfake proxy middleware for `/api/deepfake/*` routes
    - _Requirements: 1.1, 1.2_

  - [x] 9.2 Implement server startup function
    - Create `startServer()` function if not exists
    - Load configuration
    - Create PythonBridge instance
    - Call `bridge.start()` and await completion
    - Create Express app
    - Start Express server on port 8080
    - Log startup messages
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 9.3 Implement shutdown handlers
    - Register SIGINT handler
    - Register SIGTERM handler
    - Create `shutdown()` function
    - Call `bridge.stop()` in shutdown function
    - Exit Express process with code 0
    - _Requirements: 4.1, 4.2, 4.5_

  - [ ]* 9.4 Write property test for mode-based configuration
    - **Property 11: Mode-Based Configuration**
    - **Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

- [x] 10. Update package.json scripts
  - [x] 10.1 Verify `pnpm dev` script configuration
    - Ensure `pnpm dev` runs Vite dev server
    - Vite should use Express plugin (already configured in vite.config.ts)
    - Express plugin should start PythonBridge
    - _Requirements: 1.1_

  - [x] 10.2 Update Vite config if needed
    - Ensure `expressPlugin()` in vite.config.ts calls updated `createServer()`
    - Ensure PythonBridge is started in development mode
    - Verify proxy configuration for `/api/deepfake` can be removed (now handled by Express)
    - _Requirements: 1.1_

- [x] 11. Checkpoint - Ensure integration tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Add integration tests
  - [ ]* 12.1 Write end-to-end startup test
    - Start Express server with PythonBridge
    - Verify Flask process spawns
    - Verify health check passes
    - Make request to `/api/deepfake/stats`
    - Verify successful response
    - _Requirements: 1.1, 1.2, 1.3, 3.1, 3.2_

  - [ ]* 12.2 Write end-to-end shutdown test
    - Start both servers
    - Send SIGINT to Express
    - Verify Flask terminates within timeout
    - Verify Express exits with code 0
    - _Requirements: 4.1, 4.2, 4.3, 4.5_

  - [ ]* 12.3 Write proxy integration test
    - Start both servers
    - Upload test file to `/api/deepfake/analyze`
    - Verify request reaches Flask
    - Verify response returns to client with correct data
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

  - [ ]* 12.4 Write Flask unavailable test
    - Start Express without Flask (simulate Flask failure)
    - Make request to `/api/deepfake/analyze`
    - Verify 503 response with helpful error message
    - _Requirements: 3.5, 9.3_

  - [ ]* 12.5 Write property test for graceful degradation on Flask crash
    - **Property 13: Graceful Degradation on Flask Crash**
    - **Validates: Requirements 2.4**

- [x] 13. Add environment variable documentation
  - [x] 13.1 Update .env.example file
    - Add FLASK_PORT with default value and description
    - Add FLASK_HOST with default value and description
    - Add FLASK_HEALTH_TIMEOUT with default value and description
    - Add FLASK_HEALTH_INTERVAL with default value and description
    - Add NODE_ENV with description
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 7.5_

  - [x] 13.2 Update README or documentation
    - Document unified startup with `pnpm dev`
    - Document Python environment setup requirements
    - Document new environment variables
    - Document troubleshooting steps for common issues
    - _Requirements: 1.1, 5.2_

- [x] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate end-to-end flows
- The implementation uses TypeScript with Node.js child process management
- The `fast-check` library will be used for property-based testing
- The existing `vitest` framework will be used for unit and integration tests
