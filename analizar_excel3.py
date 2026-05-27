import openpyxl

wb = openpyxl.load_workbook('Matriz Registro ausentismo Def..xlsx', data_only=True)

lines = []

# Hoja consolidado - todas las filas con datos
ws = wb['Consolidado']
lines.append('=== CONSOLIDADO COMPLETO ===')
for row in ws.iter_rows(values_only=True):
    non_none = [str(c)[:50] if c is not None else '' for c in row]
    if any(c.strip() != '' for c in non_none):
        lines.append(' | '.join(non_none[:12]))

# Ver si hay tabla mensual en Consolidado (buscar mas alla de fila 80)
lines.append('\n=== CONSOLIDADO FILAS 70-120 ===')
count = 0
for i, row in enumerate(ws.iter_rows(min_row=70, max_row=120, values_only=True), start=70):
    non_none = [str(c)[:50] if c is not None else '' for c in row]
    if any(c.strip() != '' for c in non_none):
        lines.append(f'Fila {i}: ' + ' | '.join(non_none[:12]))

with open('resultado3.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

# Contar cuantos empleados hay
emp_count = 0
for row in ws.iter_rows(min_row=4, values_only=True):
    if row[0] is not None and isinstance(row[0], (int, float)):
        emp_count += 1

print(f'Total empleados en consolidado: {emp_count}')
print('Listo')
