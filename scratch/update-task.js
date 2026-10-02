const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'backend', 'controllers', 'task.controller.js');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'const filter = { organization: req.organization._id };',
  `const filter = { organization: req.organization._id };
  if (req.membership && req.membership.role === 'rep') {
    filter.owner = req.user._id;
  }`
);

c = c.replace(
  '.populate("relatedContact", "name company");',
  `.populate("relatedContact", "name company")
    .populate("owner", "name avatar");`
);

fs.writeFileSync(p, c);
