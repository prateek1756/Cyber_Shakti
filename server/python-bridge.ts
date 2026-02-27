/**
 * PythonBridge Module
 * 
 * This module manages the Python Flask server as a child process of the Node.js
 * Express server. It handles process lifecycle management, health monitoring,
 * log forwarding, and graceful shutdown with enhanced error handling.
 * 
 * Features:
 * - Automatic retry with exponential backoff
 * - Detailed error categorization and reporting
 * - Process crash detection and recovery
 * - Dependency validation
 * - Network error handling
 * 
 * Validates: Requirements 1.2, 2.5
 */

import { ChildProcess, execSync, spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Error types for better error handling
 */
export enum PythonBridgeErrorType {
  PYTHON_NOT_FOUND = 'PYTHON_NOT_FOUND',
  SCRIPT_NOT_FOUND = 'SCRIPT_NOT_FOUND',
  DEPENDENCY_ERROR = 'DEPENDENCY_ERROR',
  PORT_IN_USE = 'PORT_IN_USE',
  PROCESS_SPAWN_ERROR = 'PROCESS_SPAWN_ERROR',
  PROCESS_CRASH = 'PROCESS_CRASH',
  HEALTH_CHECK_TIMEOUT = 'HEALTH_CHECK_TIMEOUT',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * Custom error class for Python bridge errors
 */
export class PythonBridgeError extends Error {
  constructor(
    public type: PythonBridgeErrorType,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PythonBridgeError';
  }
}

/**
 * Configuration interface for PythonBridge
 */
export interface PythonBridgeConfig {
  /** Path to the Python Flask server script (api_server.py) */
  pythonScript: string;
  /** Flask server port (default: 5001) */
  port: number;
  /** Flask server host (default: 0.0.0.0) */
  host: string;
  /** Maximum time to wait for Flask health check in milliseconds (default: 10000) */
  healthCheckTimeout: number;
  /** Interval between health check retries in milliseconds (default: 500) */
  healthCheckInterval: number;
  /** Maximum number of health check retry attempts (default: 20) */
  healthCheckMaxRetries: number;
  /** Maximum time to wait for graceful shutdown in milliseconds (default: 5000) */
  shutdownTimeout: number;
  /** Whether running in development mode (enables verbose logging) */
  isDevelopment: boolean;
  /** External Flask service URL (if provided, local process won't be started) */
  externalUrl?: string;
  /** Enable automatic restart on crash (default: true in development) */
  autoRestart?: boolean;
  /** Maximum number of restart attempts (default: 3) */
  maxRestartAttempts?: number;
  /** Delay between restart attempts in milliseconds (default: 2000) */
  restartDelay?: number;
}

/**
 * Internal state interface for PythonBridge
 */
export interface BridgeState {
  /** The Flask child process instance */
  process: ChildProcess | null;
  /** Whether the Flask server is ready to accept requests */
  isReady: boolean;
  /** Timestamp when the Flask process was started */
  startTime: number | null;
  /** Timestamp of the last successful health check */
  lastHealthCheck: number | null;
  /** Number of restart attempts made */
  restartAttempts: number;
  /** Last error encountered */
  lastError: PythonBridgeError | null;
  /** Whether the bridge is currently restarting */
  isRestarting: boolean;
  /** Accumulated stderr output for error diagnosis */
  stderrBuffer: string[];
}

/**
 * PythonBridge class manages the Flask server lifecycle
 * 
 * This class is responsible for:
 * - Spawning and managing the Flask server child process
 * - Monitoring Flask server health
 * - Capturing and forwarding Flask logs
 * - Handling graceful shutdown
 * - Detecting Python environment issues
 */
export class PythonBridge {
  /** Bridge configuration */
  private config: PythonBridgeConfig;
  
  /** Current bridge state */
  private state: BridgeState;

  /**
   * Create a new PythonBridge instance
   * 
   * @param config - Partial configuration object (merged with defaults)
   */
  constructor(config: Partial<PythonBridgeConfig>) {
    // Merge provided config with defaults
    this.config = {
      pythonScript: config.pythonScript || '',
      port: config.port || 5001,
      host: config.host || '0.0.0.0',
      healthCheckTimeout: config.healthCheckTimeout || 10000,
      healthCheckInterval: config.healthCheckInterval || 500,
      healthCheckMaxRetries: config.healthCheckMaxRetries || 20,
      shutdownTimeout: config.shutdownTimeout || 5000,
      isDevelopment: config.isDevelopment !== undefined ? config.isDevelopment : process.env.NODE_ENV !== 'production',
      externalUrl: config.externalUrl,
      autoRestart: config.autoRestart !== undefined ? config.autoRestart : config.isDevelopment !== false,
      maxRestartAttempts: config.maxRestartAttempts || 3,
      restartDelay: config.restartDelay || 2000,
    };

    // Initialize state
    this.state = {
      process: null,
      isReady: false,
      startTime: null,
      lastHealthCheck: null,
      restartAttempts: 0,
      lastError: null,
      isRestarting: false,
      stderrBuffer: [],
    };
  }

  /**
   * Start the Flask server
   * 
   * This method:
   * 1. Validates the Python environment
   * 2. Spawns the Flask child process
   * 3. Sets up process handlers for logs and exit
   * 4. Waits for the Flask server to become healthy
   * 5. Logs confirmation or error messages
   * 
   * @throws Error if Flask fails to start (in strict mode)
   */
  async start(): Promise<void> {
    if (this.config.externalUrl) {
      console.log(`[Python] Using external Flask service at: ${this.config.externalUrl}`);
      this.state.isReady = true;
      return;
    }

    console.log('[Python] Starting Flask server integration...');
    
    try {
      // Step 1: Validate environment
      await this.validateEnvironmentWithRetry();
      
      console.log('[Python] ✓ Environment validation passed');
      
      // Step 2: Spawn Flask process
      const proc = this.spawnFlaskProcess();
      
      // Step 3: Set up process handlers
      this.setupProcessHandlers(proc);
      
      // Step 4: Wait for health check with retry
      await this.waitForHealthWithRetry();
      
      // Step 5: Log final status
      if (this.state.isReady) {
        console.log('[Python] ✓ Flask server started successfully');
        console.log(`[Python] Flask URL: ${this.getFlaskUrl()}`);
        this.state.restartAttempts = 0; // Reset restart counter on success
      } else {
        throw new PythonBridgeError(
          PythonBridgeErrorType.HEALTH_CHECK_TIMEOUT,
          'Flask server failed to become ready after all retries'
        );
      }
      
    } catch (error) {
      // Handle startup errors
      this.handleStartupError(error);
    }
  }

  /**
   * Handle startup errors with detailed logging and recovery suggestions
   * @private
   */
  private handleStartupError(error: any): void {
    const bridgeError = error instanceof PythonBridgeError 
      ? error 
      : new PythonBridgeError(
          PythonBridgeErrorType.UNKNOWN_ERROR,
          error instanceof Error ? error.message : 'Unknown error',
          error
        );

    this.state.lastError = bridgeError;
    this.state.isReady = false;
    this.state.process = null;

    console.error(`[Python] ❌ Failed to start Flask server: ${bridgeError.message}`);
    console.error(`[Python] Error type: ${bridgeError.type}`);

    // Provide specific troubleshooting based on error type
    switch (bridgeError.type) {
      case PythonBridgeErrorType.PYTHON_NOT_FOUND:
        console.error('[Python] Troubleshooting:');
        console.error('[Python]   1. Install Python 3.8+ from https://www.python.org/downloads/');
        console.error('[Python]   2. Ensure Python is added to your system PATH');
        console.error('[Python]   3. Restart your terminal/IDE after installation');
        console.error('[Python]   4. Verify installation: python --version or python3 --version');
        break;

      case PythonBridgeErrorType.SCRIPT_NOT_FOUND:
        console.error('[Python] Troubleshooting:');
        console.error('[Python]   1. Ensure python/api_server.py exists in your project');
        console.error('[Python]   2. Check file permissions');
        console.error('[Python]   3. Verify project structure is intact');
        break;

      case PythonBridgeErrorType.DEPENDENCY_ERROR:
        console.error('[Python] Troubleshooting:');
        console.error('[Python]   1. Install Python dependencies:');
        console.error('[Python]      cd python && pip install -r requirements.txt');
        console.error('[Python]   2. If using virtual environment, activate it first');
        console.error('[Python]   3. Check for conflicting package versions');
        console.error('[Python] Recent errors from Flask:');
        this.state.stderrBuffer.slice(-5).forEach(line => {
          console.error(`[Python]   ${line}`);
        });
        break;

      case PythonBridgeErrorType.PORT_IN_USE:
        console.error('[Python] Troubleshooting:');
        console.error(`[Python]   1. Port ${this.config.port} is already in use`);
        console.error('[Python]   2. Stop the process using this port:');
        console.error(`[Python]      Windows: netstat -ano | findstr :${this.config.port}`);
        console.error(`[Python]      Linux/Mac: lsof -i :${this.config.port}`);
        console.error('[Python]   3. Or change FLASK_PORT in your .env file');
        break;

      case PythonBridgeErrorType.HEALTH_CHECK_TIMEOUT:
        console.error('[Python] Troubleshooting:');
        console.error('[Python]   1. Flask server started but health check failed');
        console.error('[Python]   2. Check Flask logs above for startup errors');
        console.error('[Python]   3. Try manually starting Flask:');
        console.error('[Python]      cd python && python api_server.py');
        console.error('[Python]   4. Verify Flask dependencies are installed');
        if (this.state.stderrBuffer.length > 0) {
          console.error('[Python] Recent Flask errors:');
          this.state.stderrBuffer.slice(-5).forEach(line => {
            console.error(`[Python]   ${line}`);
          });
        }
        break;

      case PythonBridgeErrorType.PROCESS_CRASH:
        console.error('[Python] Troubleshooting:');
        console.error('[Python]   1. Flask process crashed during startup');
        console.error('[Python]   2. Check error messages above');
        console.error('[Python]   3. Verify Python code syntax');
        console.error('[Python]   4. Check for missing dependencies');
        break;

      default:
        console.error('[Python] Troubleshooting:');
        console.error('[Python]   1. Check the error messages above');
        console.error('[Python]   2. Try restarting the development server');
        console.error('[Python]   3. Check GitHub issues for similar problems');
    }

    console.error('[Python] Express server will continue running without Flask integration');
    console.error('[Python] Deepfake endpoints will return 503 Service Unavailable');
  }

  /**
   * Validate environment with retry logic
   * @private
   */
  private async validateEnvironmentWithRetry(): Promise<void> {
    const maxAttempts = 2;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const validation = this.validateEnvironment();
        
        if (!validation.valid) {
          throw new PythonBridgeError(
            validation.errorType || PythonBridgeErrorType.UNKNOWN_ERROR,
            validation.error || 'Environment validation failed'
          );
        }

        return; // Success
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxAttempts) {
          console.log(`[Python] Environment validation attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  }

  /**
   * Check if the Flask server is ready to accept requests
   * 
   * @returns true if Flask is ready, false otherwise
   */
  isFlaskReady(): boolean {
    if (this.config.externalUrl) {
      return this.state.isReady;
    }
    return this.state.isReady && this.state.process !== null && this.state.process.exitCode === null;
  }

  /**
   * Get the Flask server URL
   * 
   * @returns Flask server URL (e.g., "http://localhost:5001")
   */
  getFlaskUrl(): string {
    if (this.config.externalUrl) {
      return this.config.externalUrl;
    }
    return `http://localhost:${this.config.port}`;
  }

  /**
   * Stop the Flask server gracefully
   * 
   * This method:
   * 1. Sends SIGTERM to the Flask process
   * 2. Waits up to shutdownTimeout for the process to exit
   * 3. Forcefully kills the process if it doesn't exit in time
   * 4. Cleans up process references
   * 5. Logs shutdown progress
   */
  async stop(): Promise<void> {
    if (!this.state.process) {
      console.log('[Python] No Flask process to stop');
      return;
    }

    console.log('[Python] Stopping Flask server...');
    
    const proc = this.state.process;
    const pid = proc.pid;
    
    // Mark as not ready immediately
    this.state.isReady = false;
    
    try {
      // Send SIGTERM for graceful shutdown
      const isWindows = process.platform === 'win32';
      
      if (isWindows) {
        // On Windows, use taskkill
        console.log(`[Python] Sending termination signal to Flask process (PID: ${pid})...`);
        proc.kill('SIGTERM'); // Node.js handles this on Windows
      } else {
        // On Unix, send SIGTERM
        console.log(`[Python] Sending SIGTERM to Flask process (PID: ${pid})...`);
        proc.kill('SIGTERM');
      }
      
      // Wait for process to exit with timeout
      const exitPromise = new Promise<void>((resolve) => {
        proc.once('exit', () => {
          resolve();
        });
      });
      
      const timeoutPromise = new Promise<void>((resolve) => {
        setTimeout(() => {
          resolve();
        }, this.config.shutdownTimeout);
      });
      
      // Race between exit and timeout
      await Promise.race([exitPromise, timeoutPromise]);
      
      // Check if process is still running
      if (proc.exitCode === null && !proc.killed) {
        // Process didn't exit in time, force kill
        console.warn(`[Python] Flask process did not exit within ${this.config.shutdownTimeout}ms, forcing kill...`);
        proc.kill('SIGKILL');
        
        // Wait a bit more for forced kill
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      console.log('[Python] ✓ Flask server stopped');
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[Python] Error stopping Flask server: ${errorMessage}`);
    } finally {
      // Clean up state
      this.state.process = null;
      this.state.isReady = false;
    }
  }

  /**
   * Spawn the Flask child process
   * 
   * This method:
   * 1. Detects the appropriate Python command
   * 2. Spawns the Flask process with appropriate arguments
   * 3. Configures stdio pipes for log capture
   * 4. Stores the process reference
   * 
   * @returns The spawned child process
   * @private
   */
  private spawnFlaskProcess(): ChildProcess {
    // Detect the appropriate Python command for the platform
    const pythonCommand = this.detectPythonCommand();
    
    // Resolve the absolute path to the Flask script
    const scriptPath = resolve(this.config.pythonScript);
    
    // Prepare command-line arguments for Flask
    // Pass port and host as command-line arguments
    const args = [
      scriptPath,
      '--port', this.config.port.toString(),
      '--host', this.config.host,
    ];
    
    // Add debug flag in development mode
    if (this.config.isDevelopment) {
      args.push('--debug');
    }
    
    // Prepare environment variables
    // Pass configuration through environment as well (Flask can use either)
    const env = {
      ...process.env,
      FLASK_PORT: this.config.port.toString(),
      FLASK_HOST: this.config.host,
      FLASK_ENV: this.config.isDevelopment ? 'development' : 'production',
    };
    
    // Determine working directory (parent of the script)
    const cwd = resolve(scriptPath, '..');
    
    // Spawn the Flask process
    const proc = spawn(pythonCommand, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'], // stdin ignored, stdout and stderr piped
    });
    
    // Store process reference in state
    this.state.process = proc;
    this.state.startTime = Date.now();
    
    // Log spawn information
    console.log(`[Python] Spawning Flask server: ${pythonCommand} ${args.join(' ')}`);
    console.log(`[Python] Working directory: ${cwd}`);
    console.log(`[Python] Process PID: ${proc.pid}`);
    
    return proc;
  }


  /**
   * Detect the appropriate Python command for the current platform
   * 
   * This method checks for:
   * - `python` command (Windows, some Unix systems)
   * - `python3` command (Unix systems)
   * 
   * @returns The Python command to use
   * @throws Error if Python is not found
   * @private
   */
  private detectPythonCommand(): string {
    const isWindows = process.platform === 'win32';
    
    // On Windows, use 'where' command; on Unix, use 'which'
    const checkCommand = isWindows ? 'where' : 'which';
    
    // Commands to check in order of preference
    const commandsToCheck = isWindows ? ['python'] : ['python3', 'python'];
    
    for (const cmd of commandsToCheck) {
      try {
        // Try to find the command in PATH
        execSync(`${checkCommand} ${cmd}`, { 
          stdio: 'pipe',
          encoding: 'utf-8'
        });
        
        // If execSync doesn't throw, the command exists
        return cmd;
      } catch (error) {
        // Command not found, try next one
        continue;
      }
    }
    
    // No Python command found
    throw new Error(
      'Python executable not found in system PATH. ' +
      'Please install Python 3.8+ and ensure it is added to your PATH. ' +
      'Visit https://www.python.org/downloads/ for installation instructions.'
    );
  }

  /**
   * Validate the Python environment
   * 
   * This method checks:
   * 1. Python is available in the system PATH
   * 2. The Flask server script exists
   * 3. Python dependencies are installed
   * 
   * @returns Validation result with error messages if any
   * @private
   */
  private validateEnvironment(): { valid: boolean; error?: string; errorType?: PythonBridgeErrorType } {
    // Check 1: Verify Python is available
    try {
      this.detectPythonCommand();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        valid: false,
        error: `Python environment validation failed: ${errorMessage}`,
        errorType: PythonBridgeErrorType.PYTHON_NOT_FOUND,
      };
    }

    // Check 2: Verify Flask server script exists
    const scriptPath = resolve(this.config.pythonScript);
    if (!existsSync(scriptPath)) {
      return {
        valid: false,
        error: `Flask server script not found at: ${scriptPath}. ` +
               'Please ensure the Python backend is properly set up. ' +
               'Expected file: python/api_server.py',
        errorType: PythonBridgeErrorType.SCRIPT_NOT_FOUND,
      };
    }

    // Check 3: Verify Python dependencies (basic check)
    try {
      const pythonCommand = this.detectPythonCommand();
      const checkScript = `${pythonCommand} -c "import flask; import flask_cors"`;
      execSync(checkScript, { stdio: 'pipe', encoding: 'utf-8' });
    } catch (error) {
      return {
        valid: false,
        error: 'Python dependencies not installed. Run: cd python && pip install -r requirements.txt',
        errorType: PythonBridgeErrorType.DEPENDENCY_ERROR,
      };
    }

    // All checks passed
    return { valid: true };
  }

  /**
   * Set up process handlers for the Flask child process
   * 
   * This method attaches handlers for:
   * - stdout (Flask logs)
   * - stderr (Flask errors)
   * - exit event
   * 
   * @param proc - The Flask child process
   * @private
   */
  private setupProcessHandlers(proc: ChildProcess): void {
    // Handle stdout - Flask application logs
    if (proc.stdout) {
      proc.stdout.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          // In development mode, log all Flask output
          // In production mode, only log if it looks important
          if (this.config.isDevelopment) {
            console.log(`[Python] ${output}`);
          } else {
            // In production, only log warnings and errors
            const lowerOutput = output.toLowerCase();
            if (lowerOutput.includes('error') || 
                lowerOutput.includes('warning') || 
                lowerOutput.includes('exception')) {
              console.log(`[Python] ${output}`);
            }
          }
        }
      });
    }

    // Handle stderr - Flask errors and warnings
    if (proc.stderr) {
      proc.stderr.on('data', (data: Buffer) => {
        const output = data.toString().trim();
        if (output) {
          // Store in buffer for error diagnosis
          this.state.stderrBuffer.push(output);
          
          // Keep buffer size manageable (last 50 lines)
          if (this.state.stderrBuffer.length > 50) {
            this.state.stderrBuffer.shift();
          }

          // Always log stderr output with [Python] prefix
          console.error(`[Python] ${output}`);

          // Detect specific error patterns
          this.detectErrorPatterns(output);
        }
      });
    }

    // Handle process exit
    proc.on('exit', (code, signal) => {
      this.handleProcessExit(code, signal);
    });

    // Handle process errors (e.g., failed to spawn)
    proc.on('error', (error: Error) => {
      console.error(`[Python] Process error: ${error.message}`);
      console.error('[Python] Failed to spawn Flask server process');
      
      const bridgeError = new PythonBridgeError(
        PythonBridgeErrorType.PROCESS_SPAWN_ERROR,
        `Failed to spawn Flask process: ${error.message}`,
        error
      );

      this.state.lastError = bridgeError;
      this.state.isReady = false;
      this.state.process = null;
    });
  }

  /**
   * Detect specific error patterns in stderr output
   * @private
   */
  private detectErrorPatterns(output: string): void {
    const lowerOutput = output.toLowerCase();

    // Port in use error
    if (lowerOutput.includes('address already in use') || 
        lowerOutput.includes('port is already in use')) {
      this.state.lastError = new PythonBridgeError(
        PythonBridgeErrorType.PORT_IN_USE,
        `Port ${this.config.port} is already in use`,
        { port: this.config.port }
      );
    }

    // Import/dependency errors
    if (lowerOutput.includes('modulenotfounderror') || 
        lowerOutput.includes('importerror') ||
        lowerOutput.includes('no module named')) {
      this.state.lastError = new PythonBridgeError(
        PythonBridgeErrorType.DEPENDENCY_ERROR,
        'Python dependency missing',
        { stderr: output }
      );
    }
  }

  /**
   * Wait for the Flask server to become healthy with retry logic
   * 
   * This method:
   * 1. Performs health checks at configured intervals
   * 2. Uses exponential backoff for retries
   * 3. Updates the isReady state on success
   * 4. Logs warnings with troubleshooting steps on failure
   * 
   * @private
   */
  private async waitForHealthWithRetry(): Promise<void> {
    console.log(`[Python] Waiting for Flask server to become ready...`);
    console.log(`[Python] Health check URL: http://localhost:${this.config.port}/api/deepfake/stats`);
    console.log(`[Python] Max retries: ${this.config.healthCheckMaxRetries}, Interval: ${this.config.healthCheckInterval}ms`);
    
    let attempts = 0;
    const maxAttempts = this.config.healthCheckMaxRetries;
    let currentInterval = this.config.healthCheckInterval;
    
    while (attempts < maxAttempts) {
      attempts++;
      
      // Perform health check
      const healthResult = await this.performHealthCheck();
      
      if (healthResult.healthy) {
        // Flask is ready!
        this.state.isReady = true;
        const elapsedTime = this.state.startTime ? Date.now() - this.state.startTime : 0;
        console.log(`[Python] Flask server is ready! (took ${(elapsedTime / 1000).toFixed(2)}s, ${attempts} attempts)`);
        return;
      }
      
      // Check if process has exited
      if (!this.state.process || this.state.process.exitCode !== null) {
        throw new PythonBridgeError(
          PythonBridgeErrorType.PROCESS_CRASH,
          'Flask process exited during health check',
          { exitCode: this.state.process?.exitCode }
        );
      }
      
      // Log progress periodically
      if (attempts % 5 === 0 || attempts === 1) {
        console.log(`[Python] Health check attempt ${attempts}/${maxAttempts}... (${healthResult.error || 'waiting'})`);
      }
      
      // Wait before next attempt with exponential backoff
      if (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, currentInterval));
        
        // Exponential backoff (cap at 2 seconds)
        currentInterval = Math.min(currentInterval * 1.2, 2000);
      }
    }
    
    // Health check failed after all retries
    throw new PythonBridgeError(
      PythonBridgeErrorType.HEALTH_CHECK_TIMEOUT,
      `Flask server health check failed after ${maxAttempts} attempts`,
      { stderrBuffer: this.state.stderrBuffer }
    );
  }

  /**
   * Perform a single health check
   * 
   * This method makes an HTTP GET request to the Flask stats endpoint
   * and returns whether the server is responsive.
   * 
   * @returns Health check result with error details
   * @private
   */
  private async performHealthCheck(): Promise<{ healthy: boolean; error?: string }> {
    try {
      const url = `http://localhost:${this.config.port}/api/deepfake/stats`;
      
      // Make HTTP GET request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout per request
      
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Check if response is successful
      if (response.ok) {
        // Try to parse JSON to ensure Flask is responding correctly
        const data = await response.json();
        
        // Verify response has expected structure
        if (typeof data === 'object' && data !== null) {
          this.state.lastHealthCheck = Date.now();
          return { healthy: true };
        }
      }
      
      return { healthy: false, error: `HTTP ${response.status}` };
    } catch (error) {
      // Health check failed (network error, timeout, etc.)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Categorize the error
      if (errorMessage.includes('ECONNREFUSED')) {
        return { healthy: false, error: 'Connection refused' };
      } else if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('aborted')) {
        return { healthy: false, error: 'Timeout' };
      } else if (errorMessage.includes('ENOTFOUND')) {
        return { healthy: false, error: 'Host not found' };
      }
      
      return { healthy: false, error: errorMessage };
    }
  }

  /**
   * Handle Flask process exit
   * 
   * This method:
   * 1. Logs exit code and signal information
   * 2. Updates bridge state
   * 3. Provides troubleshooting guidance
   * 4. Attempts automatic restart if configured
   * 
   * @param code - Exit code (null if killed by signal)
   * @param signal - Signal that caused exit (null if exited normally)
   * @private
   */
  private handleProcessExit(code: number | null, signal: string | null): void {
    // Update state immediately
    const wasReady = this.state.isReady;
    this.state.isReady = false;
    this.state.process = null;

    // Determine exit reason and log appropriately
    if (signal) {
      // Process was killed by a signal
      console.log(`[Python] Flask server process terminated by signal: ${signal}`);
      
      // Don't restart if manually killed
      if (signal === 'SIGTERM' || signal === 'SIGINT') {
        return;
      }
    } else if (code === 0) {
      // Normal exit
      console.log('[Python] Flask server process exited normally');
      return; // Don't restart on normal exit
    } else if (code !== null) {
      // Abnormal exit with error code
      console.error(`[Python] Flask server process exited with code: ${code}`);
      
      // Provide troubleshooting guidance based on exit code
      if (code === 1) {
        console.error('[Python] Troubleshooting: This usually indicates a Python error.');
        console.error('[Python] Check the error messages above for details.');
        console.error('[Python] Common causes:');
        console.error('[Python]   - Missing Python dependencies (run: cd python && pip install -r requirements.txt)');
        console.error('[Python]   - Syntax errors in Python code');
        console.error('[Python]   - Port already in use (check if another process is using port ' + this.config.port + ')');
      } else if (code === 2) {
        console.error('[Python] Troubleshooting: This may indicate a command-line argument error.');
        console.error('[Python] Check that the Flask server script accepts the provided arguments.');
      } else {
        console.error('[Python] Troubleshooting: Unexpected exit code.');
        console.error('[Python] Check the Flask server logs above for error details.');
        console.error('[Python] You may need to restart the development server: pnpm dev');
      }
    } else {
      // Unknown exit reason
      console.error('[Python] Flask server process exited unexpectedly');
    }

    // Log runtime duration if available
    if (this.state.startTime) {
      const runtime = Date.now() - this.state.startTime;
      const runtimeSeconds = (runtime / 1000).toFixed(2);
      console.log(`[Python] Flask server ran for ${runtimeSeconds} seconds`);
    }

    // Attempt automatic restart if configured and was previously ready
    if (this.config.autoRestart && wasReady && !this.state.isRestarting) {
      this.attemptRestart(code, signal);
    }
  }

  /**
   * Attempt to restart the Flask server automatically
   * @private
   */
  private async attemptRestart(exitCode: number | null, signal: string | null): Promise<void> {
    if (this.state.restartAttempts >= (this.config.maxRestartAttempts || 3)) {
      console.error('[Python] ❌ Maximum restart attempts reached, giving up');
      console.error('[Python] Please fix the issue and restart the development server manually');
      return;
    }

    this.state.restartAttempts++;
    this.state.isRestarting = true;

    console.log(`[Python] 🔄 Attempting automatic restart (${this.state.restartAttempts}/${this.config.maxRestartAttempts})...`);
    
    // Wait before restarting (exponential backoff)
    const delay = (this.config.restartDelay || 2000) * this.state.restartAttempts;
    console.log(`[Python] Waiting ${delay}ms before restart...`);
    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      // Clear error buffer
      this.state.stderrBuffer = [];
      
      // Attempt to start again
      await this.start();
      
      if (this.state.isReady) {
        console.log('[Python] ✓ Flask server restarted successfully');
        this.state.restartAttempts = 0; // Reset counter on success
      }
    } catch (error) {
      console.error('[Python] ❌ Restart attempt failed');
      
      // Try again if we haven't hit the limit
      if (this.state.restartAttempts < (this.config.maxRestartAttempts || 3)) {
        await this.attemptRestart(exitCode, signal);
      }
    } finally {
      this.state.isRestarting = false;
    }
  }

  /**
   * Get the last error encountered by the bridge
   * @returns The last error or null if no error
   */
  getLastError(): PythonBridgeError | null {
    return this.state.lastError;
  }

  /**
   * Get detailed status information about the bridge
   * @returns Status object with detailed information
   */
  getStatus(): {
    isReady: boolean;
    isRestarting: boolean;
    restartAttempts: number;
    lastError: PythonBridgeError | null;
    uptime: number | null;
    lastHealthCheck: number | null;
  } {
    return {
      isReady: this.state.isReady,
      isRestarting: this.state.isRestarting,
      restartAttempts: this.state.restartAttempts,
      lastError: this.state.lastError,
      uptime: this.state.startTime ? Date.now() - this.state.startTime : null,
      lastHealthCheck: this.state.lastHealthCheck,
    };
  }
}
