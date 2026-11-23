import openpyxl

wb = openpyxl.load_workbook(r'c:\Users\reage\Documents\ChatGPT\testlfidash\prototype-src\storage\CRM_User_Management_Prefix_Specification_v4.xlsx')
ws = wb['02_Codebase_Lines_Inventory']
print("Sheet 2 rows:", ws.max_row)
dept_rows = []
for r in range(6, ws.max_row + 1):
    target = ws.cell(r, 2).value
    code = ws.cell(r, 8).value
    if target in ['users_departments', 'users_users'] or (code and 'dept' in str(code).lower()):
        dept_rows.append((r, target, ws.cell(r, 3).value, ws.cell(r, 4).value, ws.cell(r, 6).value, code))

print(f"Found {len(dept_rows)} department / users queries in Sheet 2. Sample:")
for d in dept_rows[:8]:
    print(d)
