import { createServer } from "../server/index";
import { PythonBridge } from "../server/python-bridge";
import { loadFlaskConfig } from "../server/config";
import path from "path";

// Load Flask configuration
const flaskConfig = loadFlaskConfig();

// Create PythonBridge instance
// Note: In serverless, this will only work if externalUrl is provided
const pythonBridge = new PythonBridge({
  pythonScript: path.join(process.cwd(), 'python/api_server.py'),
  port: flaskConfig.port,
  host: flaskConfig.host,
  externalUrl: flaskConfig.externalUrl,
});

// Initialize bridge (will be fast if using externalUrl)
if (flaskConfig.externalUrl) {
  pythonBridge.start().catch(err => {
    console.error('[Vercel] Failed to initialize Python bridge:', err);
  });
}

const app = createServer(pythonBridge);

export default app;
