import { execSync } from 'child_process';

import fs from 'fs';
import os from 'os';

async function checkServer() {
    try {
        // Ping the dev server to see if it's up
        const response = await fetch('http://127.0.0.1:3000/api/scrapers/health');
        return true; // As long as we get a response, the server is running
    } catch (error) {
        return false;
    }
}

function getK6Command() {
    try {
        execSync('k6 version', { stdio: 'ignore' });
        return 'k6';
    } catch (error) {
        if (os.platform() === 'win32') {
            const winPath = 'C:\\Program Files\\k6\\k6.exe';
            if (fs.existsSync(winPath)) {
                return `"${winPath}"`;
            }
        }
        return null;
    }
}

async function run() {
    console.log('🔍 [Pre-commit] Checking performance testing environment...');

    const k6Cmd = getK6Command();
    if (!k6Cmd) {
        console.log('⚠️  [Pre-commit] k6 is not installed locally. Skipping performance smoke tests.');
        process.exit(0);
    }

    const isRunning = await checkServer();
    if (!isRunning) {
        console.log('⚠️  [Pre-commit] Dev server (localhost:3000) is not running. Skipping performance smoke tests.');
        process.exit(0);
    }

    console.log(`🔥 [Pre-commit] Running performance smoke tests...`);
    try {
        const cmd = k6Cmd === 'k6' ? 'npm run perf:smoke' : `${k6Cmd} run tests/performance/k6/scenarios/smoke.js`;
        execSync(cmd, { stdio: 'inherit' });
        console.log('✅ [Pre-commit] Performance smoke tests passed!');
    } catch (error) {
        console.error('❌ [Pre-commit] Performance smoke tests failed! Please fix performance regressions before committing.');
        process.exit(1);
    }
}

run();
