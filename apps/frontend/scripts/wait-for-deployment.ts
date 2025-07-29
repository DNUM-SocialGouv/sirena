/**
 * Wait for deployment script
 * Pings /api/version until the expected version is deployed
 */

//TODO:?
declare const process: {
  env: Record<string, string | undefined>;
  exit: (code: number) => never;
};

const EXPECTED_VERSION = process.env.EXPECTED_VERSION;
const BACKEND_URL = process.env.BACKEND_URL;

if (!EXPECTED_VERSION) {
  console.error('❌ EXPECTED_VERSION environment variable is required');
  process.exit(1);
}

if (!BACKEND_URL) {
  console.error('❌ BACKEND_URL environment variable is required');
  process.exit(1);
}

const MAX_ATTEMPTS = 60; // 5 minutes
const DELAY_MS = 5000;   // 5 seconds

async function checkVersion(): Promise<boolean> {
  try {
    console.log(`🔍 Checking version at ${BACKEND_URL}/api/version...`);
    
    const response = await fetch(`${BACKEND_URL}/api/version`);
    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}: ${response.statusText}`);
      return false;
    }

    const data = await response.json();
    const deployedVersion = data.data?.version;
    
    console.log(`📋 Expected: ${EXPECTED_VERSION}`);
    console.log(`📋 Deployed: ${deployedVersion}`);
    
    if (deployedVersion === EXPECTED_VERSION) {
      console.log('✅ Version match! Deployment is ready.');
      return true;
    }
    
    console.log('⏳ Version mismatch, waiting...');
    return false;
    
  } catch (error) {
    if (error instanceof Error) {
        console.log(`❌ Error checking version: ${error.message}`);
      } else {
        console.log(`❌ Unknown error: ${JSON.stringify(error)}`);
      }
      return false;
  }
}

async function waitForDeployment() {
  console.log('🚀 Waiting for deployment to be ready...');
  console.log(`Expected version: ${EXPECTED_VERSION}`);
  
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(`\n🔄 Attempt ${attempt}/${MAX_ATTEMPTS}`);
    
    const isReady = await checkVersion();
    if (isReady) {
      console.log('🎉 Deployment is ready! Starting e2e tests...');
      process.exit(0);
    }
    
    if (attempt < MAX_ATTEMPTS) {
      console.log(`⏸️  Waiting ${DELAY_MS / 1000}s before next attempt...`);
      await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }
  }
  
  console.error(`❌ Deployment not ready after ${MAX_ATTEMPTS} attempts (${(MAX_ATTEMPTS * DELAY_MS) / 60000} minutes)`);
  console.error('This might indicate a deployment issue or the version endpoint is not working correctly.');
  process.exit(1);
}

waitForDeployment().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
}); 