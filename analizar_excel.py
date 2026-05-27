import openpyxl

wb = openpyxl.load_workbook('Matriz Registro ausentismo Def..xlsx', data_only=True)

with open('resultado_analisis.txt', 'w', encoding='utf-8') as f:
    # Hoja consolidado - primeras 20 filas
    ws = wb['Consolidado']
    f.write('=== CONSOLIDADO (primeras 20 filas) ===\n')
    for row in ws.iter_rows(min_row=1, max_row=20, values_only=True):
        if any(c is not None for c in row):
            f.write(str(list(row)) + '\n')
    
    # Primera hoja de empleado
    sheet_name = wb.sheetnames[1]
    ws2 = wb[sheet_name]
    f.write(f'\n=== HOJA EMPLEADO: {sheet_name} ===\n')
    for row in ws2.iter_rows(min_row=1, max_row=40, values_only=True):
        if any(c is not None for c in row):
            f.write(str(list(row)) + '\n')

    # Hoja Listados
    if 'Listados' in wb.sheetnames:
        ws3 = wb['Listados']
        f.write('\n=== HOJA LISTADOS (primeras 30 filas) ===\n')
        for row in ws3.iter_rows(min_row=1, max_row=30, values_only=True):
            if any(c is not None for c in row):
                f.write(str(list(row)) + '\n')

    # Hoja COD DIAGNOSTICO
    if 'COD DIAGNOSTICO' in wb.sheetnames:
        ws4 = wb['COD DIAGNOSTICO']
        f.write('\n=== HOJA COD DIAGNOSTICO (primeras 20 filas) ===\n')
        for row in ws4.iter_rows(min_row=1, max_row=20, values_only=True):
            if any(c is not None for c in row):
                f.write(str(list(row)) + '\n')

print('Listo')
