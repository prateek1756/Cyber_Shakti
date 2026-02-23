/**
 * Unit tests for PythonBridge module
 * 
 * Tests the Python command detection functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PythonBridge } from './python-bridge';

// Mock child_process module
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}));

// Mock fs module
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

// Mock path module
vi.mock('path', () => ({
  resolve: vi.fn((path: string) => path),
}));

describe('PythonBridge - detectPythonCommand', () => {
  let originalPlatform: string;
  let execSyncMock: any;

  beforeEach(async () => {
    // Store original platform
    originalPlatform = process.platform;
    
    // Get the mocked execSync
    const child_process = await import('child_process');
    execSyncMock = child_process.execSync as any;
    
    // Reset mock before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it('should detect python on Windows when available', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    // Mock execSync to simulate 'where python' succeeding
    execSyncMock.mockReturnValue('C:\\Python\\python.exe');

    const bridge = new PythonBridge({ pythonScript: 'test.py' });
    const command = (bridge as any).detectPythonCommand();

    expect(command).toBe('python');
    expect(execSyncMock).toHaveBeenCalledWith('where python', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  });

  it('should detect python3 on Unix when available', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock execSync to simulate 'which python3' succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({ pythonScript: 'test.py' });
    const command = (bridge as any).detectPythonCommand();

    expect(command).toBe('python3');
    expect(execSyncMock).toHaveBeenCalledWith('which python3', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  });

  it('should fall back to python on Unix when python3 is not available', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
      writable: true,
      configurable: true,
    });

    // Mock execSync to simulate 'which python3' failing but 'which python' succeeding
    execSyncMock
      .mockImplementationOnce(() => {
        throw new Error('Command not found');
      })
      .mockReturnValueOnce('/usr/bin/python');

    const bridge = new PythonBridge({ pythonScript: 'test.py' });
    const command = (bridge as any).detectPythonCommand();

    expect(command).toBe('python');
    expect(execSyncMock).toHaveBeenCalledTimes(2);
    expect(execSyncMock).toHaveBeenNthCalledWith(1, 'which python3', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    expect(execSyncMock).toHaveBeenNthCalledWith(2, 'which python', {
      stdio: 'pipe',
      encoding: 'utf-8',
    });
  });

  it('should throw error when Python is not found on Windows', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    // Mock execSync to simulate 'where python' failing
    execSyncMock.mockImplementation(() => {
      throw new Error('Command not found');
    });

    const bridge = new PythonBridge({ pythonScript: 'test.py' });

    expect(() => (bridge as any).detectPythonCommand()).toThrow(
      'Python executable not found in system PATH'
    );
  });

  it('should throw error when Python is not found on Unix', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock execSync to simulate both 'which python3' and 'which python' failing
    execSyncMock.mockImplementation(() => {
      throw new Error('Command not found');
    });

    const bridge = new PythonBridge({ pythonScript: 'test.py' });

    expect(() => (bridge as any).detectPythonCommand()).toThrow(
      'Python executable not found in system PATH'
    );
  });

  it('should include installation instructions in error message', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock execSync to simulate Python not found
    execSyncMock.mockImplementation(() => {
      throw new Error('Command not found');
    });

    const bridge = new PythonBridge({ pythonScript: 'test.py' });

    expect(() => (bridge as any).detectPythonCommand()).toThrow(
      /Please install Python 3\.8\+/
    );
    expect(() => (bridge as any).detectPythonCommand()).toThrow(
      /https:\/\/www\.python\.org\/downloads\//
    );
  });

  it('should use "where" command on Windows', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    execSyncMock.mockReturnValue('C:\\Python\\python.exe');

    const bridge = new PythonBridge({ pythonScript: 'test.py' });
    (bridge as any).detectPythonCommand();

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('where'),
      expect.any(Object)
    );
  });

  it('should use "which" command on Unix', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({ pythonScript: 'test.py' });
    (bridge as any).detectPythonCommand();

    expect(execSyncMock).toHaveBeenCalledWith(
      expect.stringContaining('which'),
      expect.any(Object)
    );
  });
});

describe('PythonBridge - validateEnvironment', () => {
  let originalPlatform: string;
  let execSyncMock: any;
  let existsSyncMock: any;

  beforeEach(async () => {
    // Store original platform
    originalPlatform = process.platform;
    
    // Get the mocked functions
    const child_process = await import('child_process');
    const fs = await import('fs');
    
    execSyncMock = child_process.execSync as any;
    existsSyncMock = fs.existsSync as any;
    
    // Reset mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it('should return valid when Python is available and script exists', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');
    
    // Mock file existence check succeeding
    existsSyncMock.mockReturnValue(true);

    const bridge = new PythonBridge({ pythonScript: 'python/api_server.py' });
    const result = (bridge as any).validateEnvironment();

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should return invalid when Python is not available', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection failing
    execSyncMock.mockImplementation(() => {
      throw new Error('Command not found');
    });
    
    // Mock file existence check (won't be reached)
    existsSyncMock.mockReturnValue(true);

    const bridge = new PythonBridge({ pythonScript: 'python/api_server.py' });
    const result = (bridge as any).validateEnvironment();

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Python environment validation failed');
    expect(result.error).toContain('Python executable not found in system PATH');
  });

  it('should return invalid when Flask script does not exist', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');
    
    // Mock file existence check failing
    existsSyncMock.mockReturnValue(false);

    const bridge = new PythonBridge({ pythonScript: 'python/api_server.py' });
    const result = (bridge as any).validateEnvironment();

    expect(result.valid).toBe(false);
    expect(result.error).toContain('Flask server script not found');
    expect(result.error).toContain('python/api_server.py');
  });

  it('should include helpful error message when script is missing', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');
    
    // Mock file existence check failing
    existsSyncMock.mockReturnValue(false);

    const bridge = new PythonBridge({ pythonScript: 'python/api_server.py' });
    const result = (bridge as any).validateEnvironment();

    expect(result.error).toContain('Please ensure the Python backend is properly set up');
    expect(result.error).toContain('Expected file: python/api_server.py');
  });

  it('should check Python availability before checking file existence', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection failing
    execSyncMock.mockImplementation(() => {
      throw new Error('Command not found');
    });
    
    // Mock file existence check
    existsSyncMock.mockReturnValue(false);

    const bridge = new PythonBridge({ pythonScript: 'python/api_server.py' });
    const result = (bridge as any).validateEnvironment();

    // Should fail on Python check, not file check
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Python environment validation failed');
    
    // File existence should not have been checked
    expect(existsSyncMock).not.toHaveBeenCalled();
  });

  it('should work on Windows platform', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('C:\\Python\\python.exe');
    
    // Mock file existence check succeeding
    existsSyncMock.mockReturnValue(true);

    const bridge = new PythonBridge({ pythonScript: 'python\\api_server.py' });
    const result = (bridge as any).validateEnvironment();

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should use resolve to get absolute path for script', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');
    
    // Mock file existence check succeeding
    existsSyncMock.mockReturnValue(true);

    const scriptPath = 'python/api_server.py';
    const bridge = new PythonBridge({ pythonScript: scriptPath });
    (bridge as any).validateEnvironment();

    // existsSync should be called with the resolved path
    expect(existsSyncMock).toHaveBeenCalledWith(scriptPath);
  });
});

describe('PythonBridge - spawnFlaskProcess', () => {
  let originalPlatform: string;
  let execSyncMock: any;
  let spawnMock: any;

  beforeEach(async () => {
    // Store original platform
    originalPlatform = process.platform;
    
    // Get the mocked functions
    const child_process = await import('child_process');
    
    execSyncMock = child_process.execSync as any;
    spawnMock = child_process.spawn as any;
    
    // Reset mocks before each test
    vi.clearAllMocks();
    
    // Setup default spawn mock behavior
    spawnMock.mockReturnValue({
      pid: 12345,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    });
  });

  afterEach(() => {
    // Restore original platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
      writable: true,
      configurable: true,
    });
  });

  it('should spawn Flask process with correct arguments', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
      port: 5001,
      host: '0.0.0.0',
      isDevelopment: true,
    });

    const proc = (bridge as any).spawnFlaskProcess();

    expect(spawnMock).toHaveBeenCalledWith(
      'python3',
      expect.arrayContaining([
        'python/api_server.py',
        '--port', '5001',
        '--host', '0.0.0.0',
        '--debug',
      ]),
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
    expect(proc.pid).toBe(12345);
  });

  it('should not include debug flag in production mode', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
      port: 5001,
      host: '0.0.0.0',
      isDevelopment: false,
    });

    (bridge as any).spawnFlaskProcess();

    const spawnArgs = spawnMock.mock.calls[0][1];
    expect(spawnArgs).not.toContain('--debug');
  });

  it('should pass environment variables to Flask process', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
      port: 5001,
      host: '0.0.0.0',
      isDevelopment: true,
    });

    (bridge as any).spawnFlaskProcess();

    expect(spawnMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          FLASK_PORT: '5001',
          FLASK_HOST: '0.0.0.0',
          FLASK_ENV: 'development',
        }),
      })
    );
  });

  it('should set FLASK_ENV to production when not in development', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
      port: 5001,
      host: '0.0.0.0',
      isDevelopment: false,
    });

    (bridge as any).spawnFlaskProcess();

    expect(spawnMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        env: expect.objectContaining({
          FLASK_ENV: 'production',
        }),
      })
    );
  });

  it('should configure stdio pipes correctly', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
    });

    (bridge as any).spawnFlaskProcess();

    expect(spawnMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(Array),
      expect.objectContaining({
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    );
  });

  it('should store process reference in state', () => {
    // Mock Unix platform
    Object.defineProperty(process, 'platform', {
      value: 'linux',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('/usr/bin/python3');

    const mockProcess = {
      pid: 12345,
      stdout: { on: vi.fn() },
      stderr: { on: vi.fn() },
      on: vi.fn(),
    };
    spawnMock.mockReturnValue(mockProcess);

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
    });

    (bridge as any).spawnFlaskProcess();

    const state = (bridge as any).state;
    expect(state.process).toBe(mockProcess);
    expect(state.startTime).toBeGreaterThan(0);
  });

  it('should use python command on Windows', () => {
    // Mock Windows platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
      writable: true,
      configurable: true,
    });

    // Mock Python detection succeeding
    execSyncMock.mockReturnValue('C:\\Python\\python.exe');

    const bridge = new PythonBridge({
      pythonScript: 'python/api_server.py',
    });

    (bridge as any).spawnFlaskProcess();

    expect(spawnMock).toHaveBeenCalledWith(
      'python',
      expect.any(Array),
      expect.any(Object)
    );
  });
});
