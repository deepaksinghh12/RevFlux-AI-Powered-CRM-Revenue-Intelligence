const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'backend', 'controllers', 'lead.controller.js');
let c = fs.readFileSync(p, 'utf8');

c = c.replace(
  'const query = { organization: req.organization._id };',
  `const query = { organization: req.organization._id };
  // If the user is just a rep, only show their assigned leads.
  // Managers, Ops, Owners, and Superadmins see all leads.
  if (req.membership && req.membership.role === 'rep') {
    query.owner = req.user._id;
  }`
);

c = c.replace(
  'const leads = await Lead.find(query).sort(sortOption);',
  'const leads = await Lead.find(query).sort(sortOption).populate("owner", "name avatar email");'
);

fs.writeFileSync(p, c);
