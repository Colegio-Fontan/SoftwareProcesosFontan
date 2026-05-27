import openpyxl

wb = openpyxl.load_workbook('Listado salarios empleados 2026.xlsx', data_only=True)

lines = []
lines.append(f'Hojas: {wb.sheetnames}')

for sheet in wb.sheetnames:
    ws = wb[sheet]
    lines.append(f'\n=== HOJA: {sheet} ===')
    count = 0
    for row in ws.iter_rows(min_row=1, max_row=100, values_only=True):
        non_none = [str(c)[:60] if c is not None else '' for c in row]
        if any(c.strip() != '' for c in non_none):
            lines.append(' | '.join(non_none[:10]))
            count += 1
            if count > 100:
                break

with open('resultado_salarios.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Listo')
