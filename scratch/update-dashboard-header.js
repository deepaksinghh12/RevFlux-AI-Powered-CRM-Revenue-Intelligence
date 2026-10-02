const fs = require('fs');
let code = fs.readFileSync('frontend/src/pages/Dashboard.jsx', 'utf8');

code = code.replace(
  'function GreetingHeader({ user }) {',
  'function GreetingHeader({ user, activeOrg }) {'
);

code = code.replace(
  '<div>\r\n        <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">',
  `<div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 uppercase font-bold text-[10px]">
            {activeOrg?.name || "Workspace"}
          </Badge>
          {user?.isSuperAdmin && (
            <Badge className="bg-indigo-900 text-white border-indigo-700 uppercase font-bold text-[10px]">
              RevFlux Superadmin
            </Badge>
          )}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">`
);
code = code.replace(
  '<div>\n        <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">',
  `<div>
        <div className="flex items-center gap-2 mb-1.5">
          <Badge className="bg-brand-50 text-brand-700 border border-brand-200/60 uppercase font-bold text-[10px]">
            {activeOrg?.name || "Workspace"}
          </Badge>
          {user?.isSuperAdmin && (
            <Badge className="bg-indigo-900 text-white border-indigo-700 uppercase font-bold text-[10px]">
              RevFlux Superadmin
            </Badge>
          )}
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink flex items-center gap-2">`
);

code = code.replace(
  '<GreetingHeader user={user} />',
  '<GreetingHeader user={user} activeOrg={activeOrg} />'
);

code = code.replace(
  'export default function Dashboard() {\r\n  const { user } = useAuth();',
  'export default function Dashboard() {\r\n  const { user, activeOrg } = useAuth();'
);
code = code.replace(
  'export default function Dashboard() {\n  const { user } = useAuth();',
  'export default function Dashboard() {\n  const { user, activeOrg } = useAuth();'
);

fs.writeFileSync('frontend/src/pages/Dashboard.jsx', code);
