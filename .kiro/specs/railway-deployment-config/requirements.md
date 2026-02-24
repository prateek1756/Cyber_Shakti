# Requirements Document

## Introduction

This document specifies the requirements for deploying the CyberShakti full-stack cybersecurity platform to Railway. The deployment must support a multi-service architecture including Node.js backend, Python AI/ML services (fraud detection and deepfake detection), MySQL database, and persistent file storage without requiring code changes to the existing application.

## Glossary

- **Railway_Platform**: The cloud deployment platform (Railway.app) that hosts the application
- **Node_Service**: The Express.js backend server running on Node.js
- **Python_Service**: Flask servers for AI/ML operations (fraud detection on port 8000, deepfake detection on port 5001)
- **MySQL_Service**: The MySQL database service managed by Railway
- **Volume_Service**: Persistent storage for uploaded evidence files
- **Build_System**: The Railway build process using nixpacks or custom configuration
- **Environment_Variables**: Configuration values injected at runtime (database credentials, API keys, ports)
- **PythonBridge**: The Node.js component that manages Python child processes
- **Deployment_Config**: Configuration files that define Railway deployment behavior (railway.json, railway.toml, Procfile, nixpacks.toml)
- **Auto_Deploy**: Automatic deployment triggered by GitHub repository changes
- **Health_Check**: Automated verification that services are running correctly
- **File_Upload_Directory**: The uploads/evidence/ directory for storing user-submitted evidence files

## Requirements

### Requirement 1: Multi-Service Deployment

**User Story:** As a developer, I want to deploy the complete CyberShakti application to Railway, so that all services (Node.js, Python, MySQL) run together in production.

#### Acceptance Criteria

1. THE Railway_Platform SHALL deploy the Node_Service, Python_Service, and MySQL_Service as separate but connected services
2. THE Node_Service SHALL communicate with Python_Service via HTTP on configured ports
3. THE Node_Service SHALL connect to MySQL_Service using Railway-provided connection strings
4. THE PythonBridge SHALL successfully start and manage Python child processes in the Railway environment
5. WHEN all services are deployed, THE Railway_Platform SHALL provide a single public URL for the application

### Requirement 2: Database Service Configuration

**User Story:** As a developer, I want Railway to provision and manage a MySQL database, so that the application has persistent data storage.

#### Acceptance Criteria

1. THE Railway_Platform SHALL provision a MySQL_Service with version 8.0 or higher
2. THE MySQL_Service SHALL automatically inject connection environment variables (MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE)
3. WHEN the database is provisioned, THE Deployment_Config SHALL map Railway variables to application variables (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME)
4. THE Node_Service SHALL execute database schema migrations from database/schema.sql on first deployment
5. THE MySQL_Service SHALL persist data across deployments and restarts

### Requirement 3: Persistent File Storage

**User Story:** As a user, I want my uploaded evidence files to persist across deployments, so that submitted scam reports remain accessible.

#### Acceptance Criteria

1. THE Railway_Platform SHALL provision a Volume_Service mounted to the File_Upload_Directory path
2. THE Volume_Service SHALL persist files across application restarts and redeployments
3. WHEN a file is uploaded to uploads/evidence/, THE Volume_Service SHALL store it permanently
4. THE Node_Service SHALL serve uploaded files via the /uploads static route
5. THE Volume_Service SHALL have a minimum capacity of 1GB

### Requirement 4: Python Dependencies Installation

**User Story:** As a developer, I want Railway to install Python dependencies automatically, so that AI/ML services function correctly.

#### Acceptance Criteria

1. WHEN the Build_System detects requirements.txt, THE Railway_Platform SHALL install Python packages using pip
2. THE Build_System SHALL install opencv-python, numpy, pillow, scikit-learn, flask, and flask-cors from requirements.txt
3. THE Build_System SHALL install system-level dependencies required by opencv-python (libGL, libglib)
4. WHEN Python dependencies are installed, THE Python_Service SHALL start without import errors
5. THE Build_System SHALL cache Python dependencies to speed up subsequent builds

### Requirement 5: Build Process Configuration

**User Story:** As a developer, I want Railway to build both frontend and backend correctly, so that the application runs without code changes.

#### Acceptance Criteria

1. THE Build_System SHALL execute "pnpm install" to install Node.js dependencies
2. THE Build_System SHALL execute "pnpm run build:client" to build the React frontend
3. THE Build_System SHALL execute "pnpm run build:server" to build the Express backend
4. WHEN the build completes, THE Build_System SHALL output compiled files to dist/spa and dist/server directories
5. THE Build_System SHALL use pnpm version 10.14.0 or compatible

### Requirement 6: Application Startup Configuration

**User Story:** As a developer, I want Railway to start the application correctly, so that all services run in the proper order.

#### Acceptance Criteria

1. THE Railway_Platform SHALL execute "node dist/server/node-build.mjs" as the start command for Node_Service
2. WHEN Node_Service starts, THE PythonBridge SHALL automatically start Python_Service processes
3. THE Node_Service SHALL wait for Python_Service health checks before accepting requests
4. THE Railway_Platform SHALL restart services automatically if they crash
5. THE Node_Service SHALL listen on the PORT environment variable provided by Railway

### Requirement 7: Environment Variables Management

**User Story:** As a developer, I want to configure environment variables in Railway, so that the application uses production settings.

#### Acceptance Criteria

1. THE Deployment_Config SHALL provide a template listing all required Environment_Variables
2. THE Railway_Platform SHALL inject database connection variables automatically from MySQL_Service
3. THE developer SHALL manually configure API keys (VIRUSTOTAL_API_KEY, URLVOID_API_KEY, GOOGLE_SAFE_BROWSING_API_KEY)
4. THE Railway_Platform SHALL set NODE_ENV to "production" by default
5. THE Deployment_Config SHALL map FLASK_PORT to 5001 and FRAUD_API_URL to http://localhost:8000

### Requirement 8: GitHub Auto-Deployment

**User Story:** As a developer, I want Railway to automatically deploy when I push to GitHub, so that updates go live without manual intervention.

#### Acceptance Criteria

1. WHEN the developer connects a GitHub repository, THE Railway_Platform SHALL enable Auto_Deploy
2. WHEN code is pushed to the main branch, THE Railway_Platform SHALL trigger a new deployment
3. THE Railway_Platform SHALL show build logs and deployment status in real-time
4. IF the build fails, THE Railway_Platform SHALL keep the previous deployment running
5. THE Railway_Platform SHALL send notifications when deployments succeed or fail

### Requirement 9: Service Health Monitoring

**User Story:** As a developer, I want Railway to monitor service health, so that I know when something goes wrong.

#### Acceptance Criteria

1. THE Railway_Platform SHALL perform Health_Check requests to verify Node_Service is responding
2. THE Node_Service SHALL expose a /api/ping endpoint that returns 200 OK when healthy
3. IF Health_Check fails repeatedly, THE Railway_Platform SHALL restart the Node_Service
4. THE Railway_Platform SHALL log health check failures for debugging
5. THE developer SHALL receive alerts when services are unhealthy for more than 5 minutes

### Requirement 10: Deployment Documentation

**User Story:** As a developer, I want step-by-step deployment instructions, so that I can deploy the application successfully on the first try.

#### Acceptance Criteria

1. THE Deployment_Config SHALL include a RAILWAY_DEPLOYMENT.md file with complete setup instructions
2. THE documentation SHALL list all prerequisite steps (GitHub connection, environment variables, database setup)
3. THE documentation SHALL provide commands for database migration and verification
4. THE documentation SHALL include troubleshooting steps for common deployment issues
5. THE documentation SHALL explain how to access logs and monitor service health

### Requirement 11: Configuration File Generation

**User Story:** As a developer, I want Railway configuration files generated automatically, so that I don't have to write them manually.

#### Acceptance Criteria

1. THE Deployment_Config SHALL include a railway.json or railway.toml file defining service configuration
2. THE Deployment_Config SHALL include a Procfile defining process types if needed
3. WHERE nixpacks requires customization, THE Deployment_Config SHALL include a nixpacks.toml file
4. THE configuration files SHALL specify build commands, start commands, and health check endpoints
5. THE configuration files SHALL work without modification when committed to the repository

### Requirement 12: Port Configuration and Service Discovery

**User Story:** As a developer, I want services to discover each other automatically, so that inter-service communication works in production.

#### Acceptance Criteria

1. THE Node_Service SHALL read the PORT environment variable provided by Railway
2. THE Python_Service SHALL run on ports 5001 and 8000 as configured in Environment_Variables
3. WHEN PythonBridge starts Python processes, THE Node_Service SHALL use localhost URLs for communication
4. THE Railway_Platform SHALL expose only the Node_Service port publicly
5. THE Python_Service SHALL remain accessible only to Node_Service (internal communication)
