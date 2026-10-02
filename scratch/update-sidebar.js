const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/layout/Sidebar.jsx', 'utf8');

const target1 = '<p className="truncate text-xs capitalize text-ink-soft">\n              {user?.name}\n            </p>';
const target2 = '<p className="truncate text-xs capitalize text-ink-soft">\r\n              {user?.name}\r\n            </p>';

const replacement = `<p className="truncate text-xs capitalize text-ink-soft flex items-center gap-1">
              {user?.name} 
              <span className="text-[10px] bg-brand-100 text-brand-700 px-1 rounded ml-1 font-bold uppercase tracking-wider">{activeOrg?.role || "member"}</span>
            </p>`;

code = code.replace(target1, replacement);
code = code.replace(target2, replacement);

fs.writeFileSync('frontend/src/components/layout/Sidebar.jsx', code);
