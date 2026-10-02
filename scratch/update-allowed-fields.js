const fs = require('fs');
let code = fs.readFileSync('backend/controllers/lead.controller.js', 'utf8');

code = code.replace(
  'const allowedFields = [\n      "name",',
  'const allowedFields = [\n      "owner",\n      "name",'
);
code = code.replace(
  'const allowedFields = [\r\n      "name",',
  'const allowedFields = [\r\n      "owner",\r\n      "name",'
);

fs.writeFileSync('backend/controllers/lead.controller.js', code);
