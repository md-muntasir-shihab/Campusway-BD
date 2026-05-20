import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const rawKey = `-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQDWozYFI2tfq9m6\n+dN+MSPZFX9+oKBCFntMvR73KF+LKhgbRhKUVt7bVEyxf0ozJeRhH6tinjgx3j2L\nEjXC2+31PKeXSfvtVLvcndkFeFhd6diDShQVZ5psQHMwI790Voejut8DU+Yw+Eyc\nHTluS8E5Miy1wjdm127QcrfL1r1G079y6vPki3ngpn+MDMR3yekYiVRgg7iJOEI9\ns/aOCnxV0mXmCZna9z8WHnB5SS/oXsJaRdSosPqpawe9atnXzxaIqSHTVMd9L3RF\ns3dBUafJfn2edTEDc0/dvZdYjEUHvVzGpzM+vE1y7YsLm1scVTn+65XKq2fe8rlf\nlUun++lvAgMBAAECggEAKEX9l986gXwUYaIIzg/YYx5GivMGvv/K6O4/hi68Jrei\nSFPQnqbiMBNURKXWvVwpyxOPK/T2JF1H/PVQwxxTPQXBiICoVbLlgRLZKs6W/iAn\nsRLQS+fhsNgzBOBgRysJTm588/nlImEkttJA+XIbcmj4vK4RiSl5MIGl/QhxAX3X\n4YNbxrHkhW0HJOs5FIjjp3BArzJxeuxGyrViGwAq7IYISl2PI6ML8tQHbrTw4qLZ\nPs81S/3D5BOw087y5tlHXawv6JolJ9c8mr2ZM1xGrvmTiMB9nq/r0QJfHzpurkwD\nGH3amLl8/DfKVk2wkMiNtNgyyBvhqvWxrU0dxcHq0QKBgQDrhG7r5GkCBNr4YQWr\nIvhIho3uoPEjvW/cGrXJpkdVenrbQwkJA+JmgZIH2vbfhNjmFRoRUHGV8EfyS7sA\nXEzreIVRyDC9t+aJPFecmFl4dCDjH0+4lsbgZbs0yshgVl4tqJP8Gx5v6B+R/j+G\nXUnNiTzcFjyd6dahnTUm5zw9OQKBgQDpTejct/cZgR7vJ9Bo7IVYiGhbVHX74SsF\nKpZ8AYzcGwEr0qhurHEuz7bEnnr1nCH/oF2UGrVElVaxnGkITnmmLqXPPGqDLphp\nwbg0UwsWOLxAs5DXpIm99FS9FEJiyyv79PswgcZs0YHpr7092NCfifttUR3fpzjE\nUgukNDED5wKBgC+2g7Y8bt2e2DGrjjdufThMMiLe7htcfHXt31g73IW/q3YSLZlq\n9QnpRAldXdhIlJyAN+i8EFbc9+ZpWzgmetrVbsTztpQo1oaE+Abcgnu5oxQAOuld\nemrpkTSPxGpn9OpxFZHkeJUZRJQSGxKAgbwnCnJX+u3O+tGBBMyd2gFZAoGBANsD\n042YebSMnVCfjKtjFk8lRuot4NCC8dLYxwpEnkpmY3QTPyEeauYqAoaTzBRT7Sq/\nDfoiFHb8xrTXg1ZT7SlPc0KXkdnyXQwy2kzshGTo//ixWVDG2rPi8cXKhgOefXz6\n3vALdA3lo9KPstSjfD2417oowyWZItZRuzH7+OOTAoGAMFc8TyBeLf2AT6aSib2l\nsMpY7ILBjh+U935bg9xRHKGdfWs96vH/1UUWMhnFvuqjO7XQG7Z/Eh0V3pLBSGXs\nKWxZaIKxMF/vVc+e+wfcOQIvGCL9dhXxX7rpEc1pQuIMmImS9ai3OF5o/aq6u7Er\nmD2/LZrdpbS4rZ0TySX2Iqw=\n-----END PRIVATE KEY-----`;

const privateKey = rawKey.replace(/\\n/g, '\n');

const serviceAccount = {
    type: 'service_account',
    project_id: 'campuswaybd',
    private_key: privateKey,
    client_email: 'firebase-adminsdk-fbsvc@campuswaybd.iam.gserviceaccount.com',
    token_uri: 'https://oauth2.googleapis.com/token'
};

const keyPath = path.resolve('firebase-key.json');
fs.writeFileSync(keyPath, JSON.stringify(serviceAccount, null, 2));
console.log('Wrote firebase-key.json');

try {
    console.log('Running firebase projects:list...');
    const result = execSync('npx firebase projects:list', {
        env: {
            ...process.env,
            GOOGLE_APPLICATION_CREDENTIALS: keyPath
        },
        encoding: 'utf8'
    });
    console.log('Success!');
    console.log(result);
} catch (error) {
    console.error('Failed to run firebase command:', error.message);
    if (error.stdout) console.log('stdout:', error.stdout);
    if (error.stderr) console.log('stderr:', error.stderr);
} finally {
    // Delete key file for security
    if (fs.existsSync(keyPath)) {
        fs.unlinkSync(keyPath);
        console.log('Cleaned up firebase-key.json');
    }
}
