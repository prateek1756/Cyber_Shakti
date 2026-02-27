# Python Bridge Error Handling Improvements

## Overview

The Python Bridge has been significantly enhanced with robust error handling, automatic recovery, and detailed diagnostics. These improvements make the development experience smoother and production deployments more reliable.

## Key Improvements

### 1. **Error Categorization & Custom Error Types**

Added `PythonBridgeError` class with specific error types:

- `PYTHON_NOT_FOUND` - Python executable not in PATH
- `SCRIPT_NOT_FOUND` - Flask script missing
- `DEPENDENCY_ERROR` - Missing Python packages
- `PORT_IN_USE` - Port already occupied
- `PROCESS_SPAWN_ERROR` - Failed to start process
- `PROCESS_CRASH` - Process crashed unexpectedly
- `HEALTH_CHECK_TIMEOUT` - Server didn't respond in time
- `NETWORK_ERROR` - Network connectivity issues
- `UNKNOWN_ERROR` - Unclassified errors

### 2. **Automatic Retry with Exponential Backoff**

**Health Checks:**
- Initial interval: 500ms
- Exponential backoff: 1.2x multiplier
- Max interval: 2 seconds
- Max attempts: 20 (configurable)

**Environment Validation:**
- Retries validation up to 2 times
- 1 second delay between attempts

### 3. **Automatic Restart on Crash**

**Configuration:**
```typescript
{
  autoRestart: true,           // Enable auto-restart (default: true in dev)
  maxRestartAttempts: 3,       // Max restart attempts
  restartDelay: 2000,          // Base delay between restarts (ms)
}
```

**Behavior:**
- Detects unexpected process exits
- Waits with exponential backoff before restart
- Resets counter on successful restart
- Gives up after max attempts with clear error message

### 4. **Enhanced Error Detection**

**Pattern Recognition:**
- Port in use: `"address already in use"`
- Missing dependencies: `"ModuleNotFoundError"`, `"ImportError"`
- Import errors: `"no module named"`

**Error Buffer:**
- Stores last 50 lines of stderr
- Used for detailed error diagnosis
- Included in error reports

### 5. **Dependency Validation**

**Pre-flight Checks:**
```bash
python -c "import flask; import flask_cors"
```

Validates critical dependencies before attempting to start the server.

### 6. **Detailed Troubleshooting Guidance**

Each error type provides specific troubleshooting steps:

**Example - PYTHON_NOT_FOUND:**
```
[Python] Troubleshooting:
[Python]   1. Install Python 3.8+ from https://www.python.org/downloads/
[Python]   2. Ensure Python is added to your system PATH
[Python]   3. Restart your terminal/IDE after installation
[Python]   4. Verify installation: python --version or python3 --version
```

**Example - DEPENDENCY_ERROR:**
```
[Python] Troubleshooting:
[Python]   1. Install Python dependencies:
[Python]      cd python && pip install -r requirements.txt
[Python]   2. If using virtual environment, activate it first
[Python]   3. Check for conflicting package versions
[Python] Recent errors from Flask:
[Python]   ModuleNotFoundError: No module named 'flask'
```

### 7. **Status Monitoring**

**New Methods:**

```typescript
// Get last error
const error = pythonBridge.getLastError();

// Get detailed status
const status = pythonBridge.getStatus();
// Returns:
// {
//   isReady: boolean,
//   isRestarting: boolean,
//   restartAttempts: number,
//   lastError: PythonBridgeError | null,
//   uptime: number | null,
//   lastHealthCheck: number | null
// }
```

### 8. **Improved Health Check Reporting**

**Before:**
```
[Python] Health check attempt 1/20...
[Python] Health check attempt 5/20...
```

**After:**
```
[Python] Health check attempt 1/20... (Connection refused)
[Python] Health check attempt 5/20... (Timeout)
[Python] Health check attempt 10/20... (HTTP 500)
```

### 9. **Better Logging Context**

**Categorized Logs:**
- `[Python]` - General messages
- `[Python] ✓` - Success messages
- `[Python] ❌` - Error messages
- `[Python] ⚠️` - Warning messages
- `[Python] 🔄` - Restart messages

**Structured Information:**
- Process PID
- Uptime duration
- Restart attempt count
- Error context from stderr

## Usage Examples

### Basic Usage (No Changes Required)

```typescript
const pythonBridge = new PythonBridge({
  pythonScript: path.join(__dirname, '../python/api_server.py'),
  port: 5001,
  host: '0.0.0.0',
});

await pythonBridge.start();
```

### Advanced Configuration

```typescript
const pythonBridge = new PythonBridge({
  pythonScript: path.join(__dirname, '../python/api_server.py'),
  port: 5001,
  host: '0.0.0.0',
  
  // Error handling configuration
  autoRestart: true,              // Enable auto-restart
  maxRestartAttempts: 5,          // Allow 5 restart attempts
  restartDelay: 3000,             // 3 second base delay
  
  // Health check configuration
  healthCheckTimeout: 15000,      // 15 second total timeout
  healthCheckMaxRetries: 30,      // 30 attempts
  healthCheckInterval: 500,       // 500ms initial interval
});

await pythonBridge.start();

// Monitor status
const status = pythonBridge.getStatus();
console.log(`Uptime: ${status.uptime}ms`);
console.log(`Restart attempts: ${status.restartAttempts}`);

// Check for errors
const lastError = pythonBridge.getLastError();
if (lastError) {
  console.error(`Error type: ${lastError.type}`);
  console.error(`Message: ${lastError.message}`);
}
```

### Error Handling in Routes

```typescript
app.use('/api/deepfake', (req, res, next) => {
  if (!pythonBridge.isFlaskReady()) {
    const lastError = pythonBridge.getLastError();
    
    return res.status(503).json({
      error: 'Flask service unavailable',
      type: lastError?.type || 'UNKNOWN',
      message: lastError?.message || 'Service is starting or encountered an error',
      status: pythonBridge.getStatus(),
    });
  }
  
  next();
});
```

## Error Scenarios & Handling

### Scenario 1: Python Not Installed

**Error:**
```
[Python] ❌ Failed to start Flask server: Python environment validation failed: Python executable not found
[Python] Error type: PYTHON_NOT_FOUND
[Python] Troubleshooting:
[Python]   1. Install Python 3.8+ from https://www.python.org/downloads/
[Python]   2. Ensure Python is added to your system PATH
```

**Resolution:** Install Python and restart

### Scenario 2: Missing Dependencies

**Error:**
```
[Python] ❌ Failed to start Flask server: Python dependencies not installed
[Python] Error type: DEPENDENCY_ERROR
[Python] Recent Flask errors:
[Python]   ModuleNotFoundError: No module named 'flask'
```

**Resolution:** Run `cd python && pip install -r requirements.txt`

### Scenario 3: Port Already in Use

**Error:**
```
[Python] ❌ Failed to start Flask server: Port 5001 is already in use
[Python] Error type: PORT_IN_USE
[Python] Troubleshooting:
[Python]   1. Port 5001 is already in use
[Python]   2. Stop the process using this port
```

**Resolution:** Kill the process or change `FLASK_PORT` in `.env`

### Scenario 4: Process Crashes During Startup

**Error:**
```
[Python] Flask server process exited with code: 1
[Python] ❌ Failed to start Flask server: Flask process exited during health check
[Python] Error type: PROCESS_CRASH
```

**Auto-Recovery:**
```
[Python] 🔄 Attempting automatic restart (1/3)...
[Python] Waiting 2000ms before restart...
[Python] Starting Flask server integration...
[Python] ✓ Flask server restarted successfully
```

### Scenario 5: Health Check Timeout

**Error:**
```
[Python] Health check attempt 1/20... (Connection refused)
[Python] Health check attempt 5/20... (Connection refused)
[Python] Health check attempt 10/20... (Timeout)
[Python] ❌ Failed to start Flask server: Flask server health check failed after 20 attempts
[Python] Error type: HEALTH_CHECK_TIMEOUT
```

**Resolution:** Check Flask logs for startup errors

## Configuration Reference

### PythonBridgeConfig

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pythonScript` | string | required | Path to Flask script |
| `port` | number | 5001 | Flask server port |
| `host` | string | '0.0.0.0' | Flask server host |
| `healthCheckTimeout` | number | 10000 | Total health check timeout (ms) |
| `healthCheckInterval` | number | 500 | Initial interval between checks (ms) |
| `healthCheckMaxRetries` | number | 20 | Max health check attempts |
| `shutdownTimeout` | number | 5000 | Graceful shutdown timeout (ms) |
| `isDevelopment` | boolean | auto | Enable verbose logging |
| `externalUrl` | string | undefined | External Flask URL (skip local process) |
| `autoRestart` | boolean | true (dev) | Enable automatic restart |
| `maxRestartAttempts` | number | 3 | Max restart attempts |
| `restartDelay` | number | 2000 | Base delay between restarts (ms) |

## Benefits

### For Development

1. **Faster Debugging** - Detailed error messages with context
2. **Auto-Recovery** - Automatic restart on crashes
3. **Better Visibility** - Clear status and error reporting
4. **Less Friction** - Helpful troubleshooting guidance

### For Production

1. **Reliability** - Automatic recovery from transient failures
2. **Observability** - Detailed error logging and status monitoring
3. **Graceful Degradation** - Express continues running even if Flask fails
4. **Better Diagnostics** - Error categorization helps with debugging

## Migration Guide

### No Breaking Changes

The improvements are **100% backward compatible**. Existing code will work without modifications.

### Optional Enhancements

If you want to take advantage of new features:

1. **Add error monitoring:**
```typescript
const status = pythonBridge.getStatus();
if (status.lastError) {
  // Log to monitoring service
  logger.error('Python bridge error', {
    type: status.lastError.type,
    message: status.lastError.message,
  });
}
```

2. **Configure auto-restart:**
```typescript
const pythonBridge = new PythonBridge({
  // ... existing config
  autoRestart: true,
  maxRestartAttempts: 5,
});
```

3. **Add health check endpoint:**
```typescript
app.get('/api/health/python', (req, res) => {
  const status = pythonBridge.getStatus();
  res.json({
    healthy: pythonBridge.isFlaskReady(),
    ...status,
  });
});
```

## Testing

### Manual Testing

1. **Test Python not installed:**
   - Temporarily rename Python executable
   - Start server
   - Verify error message and troubleshooting steps

2. **Test missing dependencies:**
   - Remove Flask from Python environment
   - Start server
   - Verify dependency error detection

3. **Test port in use:**
   - Start Flask manually on port 5001
   - Start server
   - Verify port conflict detection

4. **Test auto-restart:**
   - Start server successfully
   - Kill Flask process manually
   - Verify automatic restart

### Automated Testing

```typescript
describe('PythonBridge Error Handling', () => {
  it('should detect Python not found', async () => {
    // Mock execSync to throw
    const bridge = new PythonBridge({ pythonScript: 'test.py' });
    await bridge.start();
    
    const error = bridge.getLastError();
    expect(error?.type).toBe(PythonBridgeErrorType.PYTHON_NOT_FOUND);
  });
  
  it('should auto-restart on crash', async () => {
    const bridge = new PythonBridge({
      pythonScript: 'test.py',
      autoRestart: true,
    });
    
    await bridge.start();
    // Simulate crash
    bridge.state.process?.kill();
    
    // Wait for restart
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    expect(bridge.isFlaskReady()).toBe(true);
  });
});
```

## Future Enhancements

Potential future improvements:

1. **Circuit Breaker Pattern** - Stop retrying after repeated failures
2. **Health Check Metrics** - Track response times and failure rates
3. **Graceful Degradation** - Fallback to cached responses
4. **Process Pool** - Multiple Flask instances for load balancing
5. **Remote Monitoring** - Send metrics to monitoring services
6. **Smart Restart** - Analyze error patterns to decide restart strategy

## Summary

The improved Python Bridge provides:

✅ **Better error handling** with categorized error types  
✅ **Automatic recovery** with exponential backoff  
✅ **Detailed diagnostics** with troubleshooting guidance  
✅ **Status monitoring** with comprehensive state tracking  
✅ **Production-ready** reliability and observability  
✅ **100% backward compatible** with existing code

Your Flask integration is now more robust, easier to debug, and production-ready!
