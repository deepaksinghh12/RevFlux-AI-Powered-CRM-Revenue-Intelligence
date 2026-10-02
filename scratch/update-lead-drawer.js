const fs = require('fs');
let code = fs.readFileSync('frontend/src/components/leads/LeadDrawer.jsx', 'utf8');

const target = `<h2 className="truncate text-xl font-bold text-ink">{lead.name}</h2>
            <p className="truncate text-sm text-ink-soft">{lead.company || "—"}</p>
          </div>`;
          
const target2 = `<h2 className="truncate text-xl font-bold text-ink">{lead.name}</h2>\r\n            <p className="truncate text-sm text-ink-soft">{lead.company || "—"}</p>\r\n          </div>`;

const replacement = `<h2 className="truncate text-xl font-bold text-ink">{lead.name}</h2>
            <p className="truncate text-sm text-ink-soft">{lead.company || "—"}</p>
            {lead.owner && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-ink-soft">
                <span className="bg-surface-muted px-1.5 py-0.5 rounded border border-line text-ink">Assigned to</span>
                <span className="flex items-center gap-1 text-brand-700">
                   <div className="h-4 w-4 bg-brand-100 rounded text-[9px] flex items-center justify-center font-bold text-brand-700 uppercase">{lead.owner.name?.charAt(0)}</div>
                   {lead.owner.name}
                </span>
              </p>
            )}
          </div>`;

code = code.replace(target, replacement);
code = code.replace(target2, replacement);

fs.writeFileSync('frontend/src/components/leads/LeadDrawer.jsx', code);
