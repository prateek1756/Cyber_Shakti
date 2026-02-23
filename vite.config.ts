import { defineConfig, Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createServer } from "./server";
import { PythonBridge } from "./server/python-bridge";
import { loadFlaskConfig } from "./server/config";

// https://vitejs.dev/config/
export default defineConfig(() => ({
  server: {
    host: "::",
    port: 8080,
    // Remove the deepfake proxy - now handled by Express middleware
    fs: {
      allow: [".", "./client", "./shared"],
      deny: [".env", ".env.*", "*.{crt,pem}", "**/.git/**", "server/**"],
    },
  },
  build: {
    outDir: "dist/spa",
  },
  plugins: [react(), expressPlugin()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
}));

function expressPlugin(): Plugin {
  let pythonBridge: PythonBridge | undefined;

  return {
    name: "express-plugin",
    apply: "serve", // Only apply during development (serve mode)
    async configureServer(server) {
      // Load Flask configuration
      const flaskConfig = loadFlaskConfig();
      
      // Create and start PythonBridge
      pythonBridge = new PythonBridge({
        pythonScript: path.join(__dirname, 'python/api_server.py'),
        port: flaskConfig.port,
        host: flaskConfig.host,
        healthCheckTimeout: flaskConfig.healthCheckTimeout,
        healthCheckInterval: flaskConfig.healthCheckInterval,
        healthCheckMaxRetries: flaskConfig.healthCheckMaxRetries,
        shutdownTimeout: flaskConfig.shutdownTimeout,
        isDevelopment: flaskConfig.isDevelopment,
      });
      
      // Start Flask server
      await pythonBridge.start();
      
      // Create Express app with PythonBridge
      const app = createServer(pythonBridge);

      // Add Express app as middleware to Vite dev server
      server.middlewares.use(app);
      
      // Set up cleanup on server close
      server.httpServer?.on('close', async () => {
        if (pythonBridge) {
          await pythonBridge.stop();
        }
      });
    },
  };
}
