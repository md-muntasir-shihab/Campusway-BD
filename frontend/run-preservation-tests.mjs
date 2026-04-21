import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

let output = '';
try {
    const result = execSync(
        'npx vitest run --testTimeout=30000 --reporter=verbose src/__tests__/properties/uiAccessPreservation.prop.test.tsx',
        {
            cwd: process.cwd(),
            encoding: 'utf-8',
            timeout: 90000,
            stdio: ['pipe', 'pipe', 'pipe'],
            env: { ...process.env, FORCE_COLOR: '0' }
        }
    );
    output = 'SUCCESS\n' + result;
} catch (err) {
    output = 'FAILED\nSTDOUT:\n' + (err.stdout || '') + '\nSTDERR:\n' + (err.stderr || '') + '\nEXIT CODE: ' + err.status;
}
writeFileSync('preservation-test-output.txt', output, 'utf-8');
console.log('Done. Output written to preservation-test-output.txt');
