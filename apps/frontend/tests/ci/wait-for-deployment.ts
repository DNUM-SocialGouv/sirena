/**
 * Wait for deployment script
 * Pings /api/version until the expected version is deployed
 */

const EXPECTED_VERSION = process.env.EXPECTED_VERSION;
const BACKEND_URL = process.env.BACKEND_URL;
const FRONTEND_URL = process.env.FRONTEND_URL;

if (!EXPECTED_VERSION) {
  console.error('❌ EXPECTED_VERSION environment variable is required');
  process.exit(1);
}

const MAX_ATTEMPTS = 60; // 5 minutes
const DELAY_MS = 5000; // 5 seconds

async function checkBackendVersion(): Promise<boolean> {
  try {
    console.log(`🔍 Checking backend version at ${BACKEND_URL}/version...`);

    if (!BACKEND_URL) {
      console.error('❌ BACKEND_URL environment variable is required');
      process.exit(1);
    }

    const response = await fetch(`${BACKEND_URL}/version`);
    if (!response.ok) {
      console.log(`❌ Backend HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const data: unknown = await response.json();
    if (typeof data !== 'object' || data === null || !('data' in data)) {
      console.log('❌ Invalid backend response format');
      return false;
    }

    const deployedVersion = (data as { data: { version?: string } }).data.version;

    console.log(`📋 Backend Expected: ${EXPECTED_VERSION}`);
    console.log(`📋 Backend Deployed: ${deployedVersion}`);

    if (deployedVersion === EXPECTED_VERSION) {
      console.log('✅ Backend version match!');
      return true;
    }

    console.log('⏳ Backend version mismatch, waiting...');
    return false;
  } catch (error) {
    if (error instanceof Error) {
      console.log(`❌ Error checking backend version: ${error.message}`);
    } else {
      console.log(`❌ Unknown backend error: ${JSON.stringify(error)}`);
    }
    return false;
  }
}

async function checkFrontendVersion(): Promise<boolean> {
  try {
    console.log(`🔍 Checking frontend version at ${FRONTEND_URL}...`);

    if (!FRONTEND_URL) {
      console.error('❌ FRONTEND_URL environment variable is required');
      process.exit(1);
    }

    const response = await fetch(FRONTEND_URL);
    if (!response.ok) {
      console.log(`❌ Frontend HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const html = await response.text();

    const versionMatch = html.match(/<meta name="app-version" content="([^"]+)"/);
    const deployedVersion = versionMatch?.[1];

    console.log(`📋 Frontend Expected: ${EXPECTED_VERSION}`);
    console.log(`📋 Frontend Deployed: ${deployedVersion}`);

    if (deployedVersion === EXPECTED_VERSION) {
      console.log('✅ Frontend version match!');
      return true;
    }

    console.log('⏳ Frontend version mismatch, waiting...');
    return false;
  } catch (error) {
    if (error instanceof Error) {
      console.log(`❌ Error checking frontend version: ${error.message}`);
    } else {
      console.log(`❌ Unknown frontend error: ${JSON.stringify(error)}`);
    }
    return false;
  }
}

async function checkBothVersions(): Promise<boolean> {
  const [backendReady, frontendReady] = await Promise.all([checkBackendVersion(), checkFrontendVersion()]);

  if (backendReady && frontendReady) {
    console.log('🎉 Both backend and frontend versions match!');
    return true;
  }

  if (!backendReady) console.log('⏳ Backend not ready...');
  if (!frontendReady) console.log('⏳ Frontend not ready...');

  return false;
}

async function waitForDeployment() {
  console.log('🚀 Waiting for deployment to be ready...');
  console.log(`Expected version: ${EXPECTED_VERSION}`);

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${MAX_ATTEMPTS}`);

    const isReady = await checkBothVersions();
    if (isReady) {
      console.log('🎉 Deployment is ready! Starting e2e tests...');
      process.exit(0);
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`⏸️  Waiting ${DELAY_MS / 1000}s before next attempt...`);
      await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    }
  }

  console.error(
    `❌ Deployment not ready after ${MAX_ATTEMPTS} attempts (${(MAX_ATTEMPTS * DELAY_MS) / 60000} minutes)`,
  );
  console.error('This might indicate a deployment issue or the version endpoint is not working correctly.');
  process.exit(1);
}

waitForDeployment().catch((error) => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});
