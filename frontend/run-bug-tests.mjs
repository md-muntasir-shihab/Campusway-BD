import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

let output = '';
try {
    const result = execSync(
        'npx vitest run --testTimeout=20000 --reporter=verbose --testNamePattern="Navbar" src/__tests__/properties/uiAccessBugCondition.prop.test.tsx',
        {
            cwd: process.cwd(),
            encoding: 'utf-8',
            timeout: 60000,
            stdio: ['pipe', 'pipe', 'pipe']
        }
    );
    output = 'SUCCESS\n' + result;
} catch (err) {
    output = 'FAILED\nSTDOUT:\n' + (err.stdout || '') + '\nSTDERR:\n' + (err.stderr || '') + '\nEXIT CODE: ' + err.status;
}
writeFileSync('test-output.txt', output, 'utf-8');
console.log('Done');
