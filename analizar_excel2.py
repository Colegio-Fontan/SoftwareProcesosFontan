import openpyxl

wb = openpyxl.load_workbook('Matriz Registro ausentismo Def..xlsx', data_only=True)

lines = []

# Hoja consolidado - primeras 20 filas
ws = wb['Consolidado']
lines.append('=== CONSOLIDADO (primeras 20 filas) ===')
count = 0
for row in ws.iter_rows(min_row=1, max_row=20, values_only=True):
    non_none = [str(c)[:50] if c is not None else '' for c in row]
    if any(c != '' for c in non_none):
        lines.append(' | '.join(non_none[:12]))
        count += 1
        if count > 20:
            break

# Primera hoja de empleado
sheet_name = wb.sheetnames[1]
ws2 = wb[sheet_name]
lines.append(f'\n=== HOJA EMPLEADO: {sheet_name} ===')
count = 0
for row in ws2.iter_rows(min_row=1, max_row=40, values_only=True):
    non_none = [str(c)[:40] if c is not None else '' for c in row]
    if any(c != '' for c in non_none):
        lines.append(' | '.join(non_none[:15]))
        count += 1
        if count > 40:
            break

# Hoja Listados
if 'Listados' in wb.sheetnames:
    ws3 = wb['Listados']
    lines.append('\n=== HOJA LISTADOS (primeras 30 filas) ===')
    count = 0
    for row in ws3.iter_rows(min_row=1, max_row=30, values_only=True):
        non_none = [str(c)[:40] if c is not None else '' for c in row]
        if any(c != '' for c in non_none):
            lines.append(' | '.join(non_none[:10]))
            count += 1
            if count > 30:
                break

# Hoja COD DIAGNOSTICO
if 'COD DIAGNOSTICO' in wb.sheetnames:
    ws4 = wb['COD DIAGNOSTICO']
    lines.append('\n=== COD DIAGNOSTICO (primeras 20 filas) ===')
    count = 0
    for row in ws4.iter_rows(min_row=1, max_row=20, values_only=True):
        non_none = [str(c)[:40] if c is not None else '' for c in row]
        if any(c != '' for c in non_none):
            lines.append(' | '.join(non_none[:5]))
            count += 1
            if count > 20:
                break

with open('resultado2.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Listo. Lineas:', len(lines))
