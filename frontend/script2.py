import sys

with open('src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Target 1: <AiAttentionCenter /> -> <div className="tour-ai-attention"><AiAttentionCenter /></div>
content = content.replace('<AiAttentionCenter />', '<div className="tour-ai-attention"><AiAttentionCenter /></div>')

# Target 2: Pipeline Engagement Card
old_eng = '        <Card className="p-6 lg:col-span-6 h-full flex flex-col">'
new_eng = '        <Card className="tour-pipeline-engagement p-6 lg:col-span-6 h-full flex flex-col">'
content = content.replace(old_eng, new_eng)

# Target 3: Add New Lead button
old_btn = '            <Plus className="h-4 w-4" /> Add New Lead'
new_btn = '            <Plus className="h-4 w-4" /> <span className="tour-add-lead">Add New Lead</span>'
content = content.replace(old_btn, new_btn)

# Target 3 Alternative (Header button):
old_btn2 = '            <Plus className="h-4 w-4" /> Add New Lead'
# Actually wait, let's just replace className="brand-gradient brand-gradient-hover inline-flex h-11
old_header_btn = '<Link\n            to="/leads"\n            className="brand-gradient brand-gradient-hover inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition"'
new_header_btn = '<Link\n            to="/leads"\n            className="tour-add-lead brand-gradient brand-gradient-hover inline-flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold text-white shadow-sm transition"'
content = content.replace(old_header_btn, new_header_btn)

with open('src/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Success")
