#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Fix crypto import issue
const tenantServicePath = path.join(__dirname, '../backend/src/tenant/tenant.service.ts');

if (fs.existsSync(tenantServicePath)) {
  let content = fs.readFileSync(tenantServicePath, 'utf8');
  
  // Replace crypto import
  content = content.replace(
    "import * as crypto from 'crypto';",
    "import { createHash, randomBytes } from 'crypto';"
  );
  
  // Replace crypto usage
  content = content.replace(/crypto\./g, '');
  
  fs.writeFileSync(tenantServicePath, content);
  console.log('✅ Fixed crypto imports in tenant.service.ts');
}

console.log('✅ Import fixes completed');
