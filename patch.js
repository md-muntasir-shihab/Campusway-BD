const fs = require('fs');
const file = 'backend/src/controllers/questionBankAdvancedController.ts';
let code = fs.readFileSync(file, 'utf8');

// The issue is `mapping` is typed as `Record<string, string> | undefined` in controller,
// but service `importCommit` expects `Record<string, string>`
// We should provide a default empty object or assert it if undefined.
code = code.replace(
    'const data = await svc.importCommit(req.file.buffer, req.file.originalname, mapping, mode, adminId(req));',
    'const data = await svc.importCommit(req.file.buffer, req.file.originalname, mapping || {}, mode, adminId(req));'
);

fs.writeFileSync(file, code);
