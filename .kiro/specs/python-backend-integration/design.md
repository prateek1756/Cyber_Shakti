# Design Document: Python Backend Integration

## Overview

This design implements a unified backend architecture where the Node.js Express server spawns and manages the Python Flask server as a child process. The integration uses a dedicated `PythonBridge` module that handles process lifecycle management, health monitoring, and graceful shutdown. API requests to deepfake endpoints are proxied from Express to Flask, providing a seamless single-server experience for frontend clients.

The design prioritizes developer experience with clear error messages, automatic process management, and cross-platform compatibility. The system gracefully degrades when the Flask server is unavailable, allowing the Express server to continue serving other endpoints.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Developer Terminal                       │
│                      $ pnpm dev                              │
└────────────────────────────────┬────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│                   Express Server (Port 8080)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Python Bridge Module                      │  │
│  │  • Spawns Flask process                               │  │
│  │  • Monitors health                                    │  │
│  │  • Captures logs                                      │  │
│  │  • Handles shutdown                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              API Proxy Middleware                      │  │
│  │  • Routes /api/deepfake/* to Flask                    │  │
│  │  • Returns 503 if Flask unavailable                   │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────┬────────────────────────────┘
                                 │ HTTP (localhost:5001)
                                 ▼
┌─────────────────────────────────────────────────────────────┐
│              Flask Server (Port 5001)                        │
│              Child Process of Express                        │
│  • /api/deepfake/analyze                                    │
│  • /api/deepfake/feedback                                   │
│  • /api/deepfake/stats                                      │
│  • /api/deepfake/retrain                                    │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

**Startup Sequence:**
1. Express server starts
2. PythonBridge spawns Flask child process
3. PythonBridge polls Flask health endpoint
4. Once healthy, Express accepts deepfake API requests
5. Vite dev server proxies requests to Express

**Request Flow:**
1. Client → Vite dev server (port 8080)
2. Vite → Express server (via middleware)
3. Express → Flask server (via HTTP proxy)
4. Flask → Express → Vite → Client

**Shutdown Sequence:**
1. Developer presses Ctrl+C
2. Express receives SIGINT
3. PythonBridge sends SIGTERM to Flask
4. PythonBridge waits up to 5s for Flask exit
5. Express exits

## Components and Interfaces

### 1. PythonBridge Module

**File:** `server/python-bridge.ts`

**Responsibilities:**
- Spawn and manage Flask server child process
- Monitor Flask server health
- Capture and forward Flask logs
- Handle graceful shutdown
- Detect Python environment issues

**Interface:**

```typescript
interface PythonBridgeConfig {
  pythonScript: string;        // Path to api_server.py
  port: number;                // Flask server port (default: 5001)
  host: string;                // Flask server host (default: 0.0.0.0)
  healthCheckTimeout: number;  // Max time to wait for health (default: 10000ms)
  healthCheckInterval: number; // Time between health checks (default: 500ms)
  healthCheckMaxRetries: number; // Max health check attempts (default: 10)
  shutdownTimeout: number;     // Max time to wait for graceful shutdown (default: 5000ms)
  isDevelopment: boolean;      // Enable verbose logging
}

class PythonBridge {
  private process: ChildProcess | null;
  private isReady: boolean;
  private config: PythonBridgeConfig;
  
  constructor(config: Partial<PythonBridgeConfig>);
  
  // Start the Flask server
  async start(): Promise<void>;
  
  // Check if Flask server is ready
  isFlaskReady(): boolean;
  
  // Get Flask server URL
  getFlaskUrl(): string;
  
  // Stop the Flask server
  async stop(): Promise<void>;
  
  // Private methods
  private spawnFlaskProcess(): ChildProcess;
  private detectPythonCommand(): string;
  private setupProcessHandlers(proc: ChildProcess): void;
  private waitForHealth(): Promise<void>;
  private performHealthCheck(): Promise<boolean>;
  private handleProcessExit(code: number | null, signal: string | null): void;
}
```

**Key Methods:**

- `start()`: Spawns Flask process, sets up handlers, waits for health check
- `isFlaskReady()`: Returns whether Flask is ready to accept requests
- `stop()`: Sends SIGTERM, waits for exit, forcefully kills if needed
- `detectPythonCommand()`: Determines correct Python command for platform
- `waitForHealth()`: Polls Flask health endpoint until ready or timeout
- `performHealthCheck()`: Makes HTTP request to `/api/deepfake/stats`

### 2. Flask Proxy Middleware

**File:** `server/routes/deepfake-proxy.ts`

**Responsibilities:**
- Proxy requests from Express to Flask
- Handle Flask unavailability gracefully
- Preserve request/response headers and body
- Support multipart/form-data for file uploads

**Interface:**

```typescript
interface ProxyMiddlewareOptions {
  bridge: PythonBridge;
  targetUrl: string;
}

function createDeepfakeProxy(options: ProxyMiddlewareOptions): RequestHandler;
```

**Implementation Approach:**
- Use `node-fetch` to forward requests to Flask
- Check `bridge.isFlaskReady()` before proxying
- Return 503 with helpful error if Flask unavailable
- Stream request body for file uploads
- Forward all headers except host-related ones

### 3. Updated Express Server

**File:** `server/index.ts`

**Changes:**
- Import and instantiate PythonBridge
- Start PythonBridge during server initialization
- Register deepfake proxy middleware
- Set up shutdown handlers for SIGINT/SIGTERM

**Modified Interface:**

```typescript
export function createServer(pythonBridge?: PythonBridge): express.Application;

export async function startServer(): Promise<void> {
  const bridge = new PythonBridge({
    pythonScript: path.join(__dirname, '../python/api_server.py'),
    port: parseInt(process.env.FLASK_PORT || '5001'),
    isDevelopment: process.env.NODE_ENV !== 'production'
  });
  
  await bridge.start();
  
  const app = createServer(bridge);
  
  // Setup shutdown handlers
  process.on('SIGINT', () => shutdown(bridge));
  process.on('SIGTERM', () => shutdown(bridge));
  
  // Start Express server
  app.listen(8080);
}
```

### 4. Configuration Module

**File:** `server/config.ts`

**Responsibilities:**
- Load and validate environment variables
- Provide default values
- Export typed configuration object

**Interface:**

```typescript
interface FlaskConfig {
  port: number;
  host: string;
  healthCheckTimeout: number;
  healthCheckInterval: number;
  healthCheckMaxRetries: number;
  shutdownTimeout: number;
}

export function loadFlaskConfig(): FlaskConfig;
```

## Data Models

### PythonBridge State

```typescript
interface BridgeState {
  process: ChildProcess | null;  // Flask child process
  isReady: boolean;               // Health check passed
  startTime: number | null;       // Process start timestamp
  lastHealthCheck: number | null; // Last successful health check
}
```

### Health Check Response

```typescript
interface HealthCheckResponse {
  training_samples: number;
  model_loaded: boolean;
  last_updated: string;
}
```

### Error Response

```typescript
interface FlaskUnavailableError {
  error: string;
  message: string;
  suggestion: string;
  timestamp: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Process Lifecycle Consistency

*For any* PythonBridge instance, if `start()` completes successfully, then `isFlaskReady()` should return true, the Flask child process should be running, and a confirmation message should be logged.

**Validates: Requirements 1.2, 1.3, 2.5**

### Property 2: Health Check Convergence

*For any* Flask server that is running and responsive, performing health checks with retries (up to configured maximum) should eventually succeed and mark the server as ready, or fail after exhausting retries and mark it as unavailable with a warning.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 3: Graceful Shutdown Completeness

*For any* PythonBridge instance with a running Flask process, when receiving a termination signal (SIGINT or SIGTERM), the bridge should send a termination signal to Flask, wait up to the configured timeout, forcefully kill if necessary, and exit with code 0.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 4: Proxy Request Preservation

*For any* valid HTTP request to a deepfake endpoint when Flask is ready, the proxied request should preserve the original method, headers, body, query parameters, and support multipart/form-data, and the response should preserve the original status code and headers from Flask.

**Validates: Requirements 9.1, 9.2, 9.4, 9.5**

### Property 5: Error Response Consistency

*For any* request to a deepfake endpoint when Flask is unavailable, the Express server should return a 503 status code with a JSON error response without attempting to proxy the request.

**Validates: Requirements 3.5, 9.3, 8.3**

### Property 6: Cross-Platform Command Detection

*For any* supported platform (Windows, Linux, macOS), the `detectPythonCommand()` method should check the system PATH and return the appropriate Python executable command (`python` on Windows, `python3` or `python` on Unix).

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 7: Log Forwarding with Prefix

*For any* output from the Flask process (stdout or stderr), the PythonBridge should capture and forward it to the Express console with the `[Python]` prefix for easy identification.

**Validates: Requirements 2.1, 2.2, 8.4**

### Property 8: Configuration Loading with Defaults

*For any* configuration environment variable (FLASK_PORT, FLASK_HOST, FLASK_HEALTH_TIMEOUT, FLASK_HEALTH_INTERVAL), if the variable is missing or invalid, the configuration loader should use the documented default value, log a warning for invalid values, and continue operation.

**Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5**

### Property 9: Environment Validation and Error Messaging

*For any* attempt to spawn the Flask server, the PythonBridge should validate that Python is available in PATH and that `python/api_server.py` exists, and if either check fails, should log a helpful error message with instructions and continue running Express without Flask integration.

**Validates: Requirements 5.1, 5.2, 5.4, 5.5**

### Property 10: Comprehensive Error Logging

*For any* Flask process failure (startup failure, unexpected exit, dependency errors), the PythonBridge should log the full error output from stderr, exit code, signal information, and provide troubleshooting guidance.

**Validates: Requirements 1.4, 2.3, 5.3, 8.1, 8.2, 8.5**

### Property 11: Mode-Based Configuration

*For any* execution mode (development or production, determined by NODE_ENV), the Flask server should start with appropriate debug settings (enabled in development, disabled in production) and the PythonBridge should apply appropriate log verbosity (verbose in development, errors/warnings only in production).

**Validates: Requirements 7.1, 7.2, 7.3, 7.4, 7.5**

### Property 12: Request Timing and Readiness

*For any* request to a deepfake endpoint made before Flask is ready, the Express server should either queue the request until Flask is ready or return an appropriate error response, ensuring no requests are processed before the health check passes.

**Validates: Requirements 1.5**

### Property 13: Graceful Degradation on Flask Crash

*For any* Flask process that crashes or exits unexpectedly during runtime, the Express server should continue running, log the crash details, and return 503 errors for subsequent deepfake endpoint requests.

**Validates: Requirements 2.4**

### Property 14: Platform-Specific Path Resolution

*For any* platform (Windows, Linux, macOS), the PythonBridge should use platform-independent path resolution to locate `python/api_server.py` and use platform-appropriate termination signals (SIGTERM on Unix, taskkill on Windows).

**Validates: Requirements 6.4, 6.5**

## Error Handling

### Error Categories

**1. Python Environment Errors**
- Python not found in PATH
- Missing Python dependencies
- Wrong Python version

**Response:**
```typescript
{
  error: 'Python environment not configured',
  message: 'Python executable not found in system PATH',
  suggestion: 'Install Python 3.8+ and run: cd python && pip install -r requirements.txt',
  timestamp: '2024-01-15T10:30:00Z'
}
```

**2. Flask Startup Errors**
- Flask script not found
- Port already in use
- Import errors in Flask code

**Response:**
```typescript
{
  error: 'Flask server failed to start',
  message: 'Port 5001 is already in use',
  suggestion: 'Stop other processes using port 5001 or set FLASK_PORT environment variable',
  timestamp: '2024-01-15T10:30:00Z'
}
```

**3. Health Check Timeout**
- Flask not responding after max retries
- Flask responding with errors

**Response:**
```typescript
{
  error: 'Flask server health check failed',
  message: 'Flask server did not become ready within 10 seconds',
  suggestion: 'Check Flask logs for errors. Ensure all Python dependencies are installed.',
  timestamp: '2024-01-15T10:30:00Z'
}
```

**4. Runtime Errors**
- Flask process crashes during operation
- Flask becomes unresponsive

**Response:**
```typescript
{
  error: 'Flask server unavailable',
  message: 'The deepfake detection service is currently unavailable',
  suggestion: 'Restart the development server with: pnpm dev',
  timestamp: '2024-01-15T10:30:00Z'
}
```

### Error Handling Strategy

**Startup Phase:**
- Log all errors to console with clear formatting
- Continue running Express server even if Flask fails
- Mark Flask as unavailable but don't crash Express

**Runtime Phase:**
- Return 503 for deepfake endpoints if Flask unavailable
- Log Flask process crashes with exit codes
- Don't attempt automatic restart (developer should investigate)

**Shutdown Phase:**
- Log warnings if Flask doesn't exit gracefully
- Force kill Flask if it doesn't respond to SIGTERM
- Always exit Express cleanly

## Testing Strategy

### Unit Tests

**PythonBridge Unit Tests:**
- Test configuration loading with various environment variables
- Test Python command detection on different platforms (mocked)
- Test error message formatting
- Test state transitions (not ready → ready → stopped)

**Proxy Middleware Unit Tests:**
- Test 503 response when Flask unavailable
- Test header forwarding logic
- Test error response formatting

**Configuration Unit Tests:**
- Test default value application
- Test environment variable parsing
- Test invalid value handling

### Property-Based Tests

Each property test should run a minimum of 100 iterations to ensure comprehensive coverage through randomization.

**Property 1: Process Lifecycle Consistency**
- Generate random valid configurations
- Start PythonBridge with each configuration
- Verify `isFlaskReady()` returns true after successful start
- Verify process is running and confirmation logged
- **Tag:** Feature: python-backend-integration, Property 1: Process lifecycle consistency

**Property 2: Health Check Convergence**
- Generate random health check configurations (timeout, interval, retries)
- Mock Flask server with random response delays (within timeout)
- Verify health check eventually succeeds or fails appropriately
- Verify correct state transitions (ready or unavailable)
- **Tag:** Feature: python-backend-integration, Property 2: Health check convergence

**Property 3: Graceful Shutdown Completeness**
- Generate random running PythonBridge instances
- Send random termination signals (SIGINT or SIGTERM)
- Verify Flask receives termination signal
- Verify wait timeout is respected
- Verify forceful kill if needed
- Verify exit code 0
- **Tag:** Feature: python-backend-integration, Property 3: Graceful shutdown completeness

**Property 4: Proxy Request Preservation**
- Generate random HTTP requests (methods, headers, bodies, query params, multipart data)
- Proxy through middleware when Flask is ready
- Verify all request properties are preserved
- Verify response status and headers are preserved
- **Tag:** Feature: python-backend-integration, Property 4: Proxy request preservation

**Property 5: Error Response Consistency**
- Generate random requests to deepfake endpoints
- Mock Flask as unavailable
- Verify all responses have 503 status and JSON error format
- Verify no proxy attempt is made
- **Tag:** Feature: python-backend-integration, Property 5: Error response consistency

**Property 6: Cross-Platform Command Detection**
- Generate random platform identifiers (Windows, Linux, macOS)
- Mock PATH environment with various Python executables
- Verify correct command is detected for each platform
- **Tag:** Feature: python-backend-integration, Property 6: Cross-platform command detection

**Property 7: Log Forwarding with Prefix**
- Generate random log messages from Flask process (stdout and stderr)
- Verify all messages are captured and forwarded with `[Python]` prefix
- **Tag:** Feature: python-backend-integration, Property 7: Log forwarding with prefix

**Property 8: Configuration Loading with Defaults**
- Generate random environment variable values (valid, invalid, missing)
- Verify correct values are used (provided or default)
- Verify warnings logged for invalid values
- Verify no crashes occur
- **Tag:** Feature: python-backend-integration, Property 8: Configuration loading with defaults

**Property 9: Environment Validation and Error Messaging**
- Generate random environment states (Python missing, file missing, both present)
- Attempt to spawn Flask server
- Verify appropriate validation checks occur
- Verify helpful error messages for failures
- Verify Express continues running
- **Tag:** Feature: python-backend-integration, Property 9: Environment validation and error messaging

**Property 10: Comprehensive Error Logging**
- Generate random Flask failure scenarios (startup, crash, dependency errors)
- Verify full error details are logged (stderr, exit code, signal)
- Verify troubleshooting guidance is provided
- **Tag:** Feature: python-backend-integration, Property 10: Comprehensive error logging

**Property 11: Mode-Based Configuration**
- Generate random NODE_ENV values (development, production, undefined)
- Start Flask server
- Verify debug mode matches environment
- Verify log verbosity matches environment
- **Tag:** Feature: python-backend-integration, Property 11: Mode-based configuration

**Property 12: Request Timing and Readiness**
- Generate random requests to deepfake endpoints
- Make requests at various stages (before ready, during health check, after ready)
- Verify requests are handled appropriately based on readiness state
- **Tag:** Feature: python-backend-integration, Property 12: Request timing and readiness

**Property 13: Graceful Degradation on Flask Crash**
- Start both servers successfully
- Simulate Flask crash during runtime
- Verify Express continues running
- Verify crash details are logged
- Verify subsequent requests return 503
- **Tag:** Feature: python-backend-integration, Property 13: Graceful degradation on Flask crash

**Property 14: Platform-Specific Path Resolution**
- Generate random platforms (Windows, Linux, macOS)
- Verify path resolution uses platform-independent methods
- Verify termination signals are platform-appropriate
- **Tag:** Feature: python-backend-integration, Property 14: Platform-specific path resolution

### Integration Tests

**End-to-End Startup Test:**
- Start Express server with PythonBridge
- Verify Flask process spawns
- Verify health check passes
- Make request to `/api/deepfake/stats`
- Verify response is successful

**End-to-End Shutdown Test:**
- Start both servers
- Send SIGINT to Express
- Verify Flask terminates within timeout
- Verify Express exits cleanly

**Proxy Integration Test:**
- Start both servers
- Upload file to `/api/deepfake/analyze`
- Verify request reaches Flask
- Verify response returns to client

**Flask Unavailable Test:**
- Start Express without Flask
- Make request to `/api/deepfake/analyze`
- Verify 503 response with helpful error

### Testing Library

**Property-Based Testing:** Use `fast-check` library for TypeScript property-based testing.

**Unit Testing:** Use `vitest` (already in project dependencies).

**HTTP Mocking:** Use `vitest` mocking capabilities for HTTP requests.

### Test Configuration

- Minimum 100 iterations per property test
- Each test tagged with feature name and property number
- Integration tests run against real Flask server (in CI/CD)
- Unit tests use mocked child processes and HTTP clients
