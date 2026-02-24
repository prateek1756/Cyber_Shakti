# Implementation Plan: Railway Deployment Configuration

## Overview

This plan creates Railway deployment configuration files and documentation for the CyberShakti platform. The implementation focuses on creating configuration artifacts that enable zero-code-change deployment to Railway with support for Node.js backend, Python AI/ML services, MySQL database, and persistent file storage.

## Tasks

- [x] 1. Create Railway service configuration file
  - Create `railway.json` in project root
  - Configure nixpacks builder with build and deploy commands
  - Set start command to `node dist/server/node-build.mjs`
  - Configure health check endpoint `/api/ping` with 300s timeout
  - Set restart policy to ON_FAILURE with max 10 retries
  - _Requirements: 11.1, 11.4, 6.1, 9.2_

- [x] 2. Create nixpacks build configuration
  - Create `nixpacks.toml` in project root
  - Configure setup phase with nodejs_20, python311, and pip packages
  - Configure install phase to run pnpm install and pip install
  - Configure build phase to run build:client and build:server scripts
  - Add system dependencies for opencv-python (libGL, libglib)
  - Set start command to match railway.json
  - _Requirements: 4.3, 5.1, 5.2, 5.3, 11.3_

- [x] 3. Update Procfile for Railway compatibility
  - Verify existing Procfile has correct web process definition
  - Ensure start command matches package.json start script
  - Remove python_api process (handled by PythonBridge)
  - _Requirements: 11.2, 6.2_

- [x] 4. Create environment variables template
  - Create `.env.railway` template file in project root
  - Document all required environment variables with descriptions
  - Include Railway auto-injected variables (MYSQLHOST, MYSQLPORT, etc.)
  - Include manual configuration variables (API keys, ports)
  - Add variable mapping instructions (DB_HOST=${{MYSQLHOST}})
  - Include comments explaining each variable's purpose
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 2.3_

- [x] 5. Create database migration script
  - [x] 5.1 Add migration runner to server startup
    - Modify `server/index.ts` to check for existing tables
    - Execute `database/schema.sql` if tables don't exist
    - Log migration status (success/failure/skipped)
    - Handle errors gracefully without blocking startup
    - _Requirements: 2.4_
  
  - [ ]* 5.2 Write unit tests for migration runner
    - Test migration execution with empty database
    - Test migration skip with existing tables
    - Test error handling for invalid SQL
    - _Requirements: 2.4_
  
  - [x] 5.3 Create schema migrations tracking table
    - Add `schema_migrations` table definition to schema.sql
    - Track migration version and applied timestamp
    - _Requirements: 2.5_

- [x] 6. Create deployment documentation
  - Create `RAILWAY_DEPLOYMENT.md` in project root
  - Document prerequisites (GitHub connection, Railway account)
  - Provide step-by-step deployment instructions
  - List all environment variables to configure
  - Include database setup and migration steps
  - Add volume configuration instructions (mount path, size)
  - Document service health verification steps
  - Include troubleshooting section for common issues
  - Add log access and monitoring instructions
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ] 7. Checkpoint - Review configuration files
  - Ensure all configuration files are created
  - Verify syntax of JSON and TOML files
  - Check that all requirements are addressed
  - Ask user if questions arise

- [ ] 8. Add health check endpoint validation
  - [ ] 8.1 Verify /api/ping endpoint exists
    - Check `server/routes/` for ping endpoint
    - If missing, create endpoint that returns {status: 'ok'}
    - Ensure endpoint responds with 200 OK status
    - _Requirements: 9.2, 11.4_
  
  - [ ]* 8.2 Write property test for health endpoint
    - **Property 11: Health Endpoint Availability**
    - **Validates: Requirements 9.2**
    - Test that /api/ping always returns 200 OK when service is running
    - Use fast-check to generate random request scenarios
    - _Requirements: 9.2_

- [ ] 9. Add environment variable validation
  - [ ] 9.1 Create environment validation utility
    - Create `server/utils/validateEnv.ts`
    - Check for required variables (DB_HOST, DB_PORT, etc.)
    - Validate variable formats (port numbers, URLs)
    - Log validation results on startup
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  
  - [ ]* 9.2 Write unit tests for environment validation
    - Test validation with all required variables present
    - Test validation with missing variables
    - Test validation with invalid formats
    - _Requirements: 7.1_

- [ ] 10. Add Python service health check integration
  - [ ] 10.1 Enhance PythonBridge health monitoring
    - Verify health check logic in PythonBridge
    - Ensure 20 retry attempts with exponential backoff
    - Add detailed logging for health check failures
    - Implement graceful degradation (503 for Python endpoints)
    - _Requirements: 1.4, 6.3, 9.1_
  
  - [ ]* 10.2 Write property test for Python service startup
    - **Property 3: Python Process Management**
    - **Validates: Requirements 1.4, 6.2**
    - Test that Python services respond to health checks within timeout
    - Use fast-check to generate different startup scenarios
    - _Requirements: 1.4, 6.2_

- [ ] 11. Add port configuration handling
  - [ ] 11.1 Verify dynamic port binding
    - Check that server listens on process.env.PORT
    - Add fallback to port 3000 for local development
    - Log the port being used on startup
    - _Requirements: 6.5, 12.1_
  
  - [ ]* 11.2 Write property test for port binding
    - **Property 10: Dynamic Port Binding**
    - **Validates: Requirements 6.5, 12.1**
    - Test that server binds to any valid PORT value
    - Use fast-check to generate random port numbers
    - _Requirements: 6.5, 12.1_

- [ ] 12. Add file storage validation
  - [ ] 12.1 Add uploads directory validation
    - Check that uploads/evidence/ directory exists on startup
    - Create directory if missing
    - Verify write permissions
    - Log validation results
    - _Requirements: 3.1, 3.3_
  
  - [ ]* 12.2 Write integration test for file persistence
    - **Property 5: File Persistence Across Deployments**
    - **Validates: Requirements 3.2, 3.3**
    - Test file upload and retrieval
    - Simulate deployment restart
    - Verify file still accessible
    - _Requirements: 3.2, 3.3_

- [ ] 13. Final checkpoint - Configuration validation
  - Verify all configuration files are syntactically valid
  - Check that documentation is complete and accurate
  - Ensure all environment variables are documented
  - Run local validation tests if possible
  - Ask user if ready to deploy or if changes needed

## Notes

- Tasks marked with `*` are optional and can be skipped for faster deployment
- Configuration files (railway.json, nixpacks.toml) must be committed to repository
- Environment variables must be configured manually in Railway dashboard
- Database migrations run automatically on first deployment
- Python services are managed by PythonBridge, not separate Railway services
- Health checks ensure services are ready before accepting traffic
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples and edge cases
