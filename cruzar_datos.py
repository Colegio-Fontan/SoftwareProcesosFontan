import openpyxl
import json
from difflib import SequenceMatcher

def normalizar(nombre):
    import unicodedata
    if not nombre:
        return ''
    n = str(nombre).strip().lower()
    n = unicodedata.normalize('NFD', n)
    n = ''.join(c for c in n if unicodedata.category(c) != 'Mn')
    return n

# ====== LEER SALARIOS ======
wb_sal = openpyxl.load_workbook('Listado salarios empleados 2026.xlsx', data_only=True)
ws_sal = wb_sal['Hoja1']

salarios = {}
for row in ws_sal.iter_rows(min_row=2, values_only=True):
    if row[3]:  # Nombre
        salario = row[0]
        fecha_ingreso = str(row[1])[:10] if row[1] else ''
        cargo = str(row[2]).strip() if row[2] else ''
        nombre = str(row[3]).strip()
        cedula = str(int(row[4])) if row[4] and str(row[4]).replace('.0','').isdigit() else str(row[4]) if row[4] else ''
        salarios[normalizar(nombre)] = {
            'nombre': nombre,
            'cedula': cedula,
            'cargo': cargo,
            'salario': salario,
            'fecha_ingreso': fecha_ingreso,
        }

# ====== LEER AUSENTISMO CONSOLIDADO ======
wb_aus = openpyxl.load_workbook('Matriz Registro ausentismo Def..xlsx', data_only=True)
ws_con = wb_aus['Consolidado']

ausentes = {}
for row in ws_con.iter_rows(min_row=4, values_only=True):
    if row[0] is not None and isinstance(row[0], (int, float)) and row[1]:
        nombre = str(row[1]).strip()
        cedula = str(int(row[2])) if row[2] and str(row[2]).replace('.0','').isdigit() else str(row[2]) if row[2] else ''
        cargo = str(row[3]).strip() if row[3] else ''
        area = str(row[4]).strip() if row[4] else ''
        dias = row[5] if row[5] else 0
        ausentes[normalizar(nombre)] = {
            'nombre': nombre,
            'cedula': cedula,
            'cargo': cargo,
            'area': area,
            'total_dias_ausencia': dias,
        }

# ====== LEER AUSENCIAS INDIVIDUALES ======
ausencias_por_empleado = {}
for sheet_name in wb_aus.sheetnames:
    if sheet_name in ('Consolidado', 'Listados', 'COD DIAGNOSTICO'):
        continue
    ws_emp = wb_aus[sheet_name]
    registros = []
    for row in ws_emp.iter_rows(min_row=7, values_only=True):
        mes = row[0]
        fecha = row[1]
        tipo = row[2]
        concepto = row[3]
        horas = row[6]
        dias = row[7]
        if mes and tipo:
            fecha_str = str(fecha)[:10] if fecha else ''
            registros.append({
                'mes': str(mes).strip(),
                'fecha': fecha_str,
                'tipo_ausencia': str(tipo).strip() if tipo else '',
                'concepto': str(concepto).strip() if concepto else '',
                'horas': float(horas) if horas and str(horas) not in ('#N/A','#REF!') else 0,
                'dias_decimal': float(dias) if dias and str(dias) not in ('#N/A','#REF!') else 0,
            })
    if registros:
        ausencias_por_empleado[normalizar(sheet_name)] = {
            'sheet_name': sheet_name,
            'registros': registros
        }

# ====== CRUZAR ======
empleados_completos = []
solo_en_salarios = []
solo_en_ausencias = []

# Todos los de salarios como base
for key_sal, datos_sal in salarios.items():
    # Buscar en ausentismo por cédula primero, luego por nombre similar
    encontrado = None
    # Por cédula
    for key_aus, datos_aus in ausentes.items():
        if datos_sal['cedula'] and datos_sal['cedula'] == datos_aus['cedula']:
            encontrado = datos_aus
            break
    # Por nombre similar
    if not encontrado:
        mejor = 0
        for key_aus, datos_aus in ausentes.items():
            sim = SequenceMatcher(None, key_sal, key_aus).ratio()
            if sim > 0.75 and sim > mejor:
                mejor = sim
                encontrado = datos_aus

    # Buscar ausencias individuales
    ausencias_ind = None
    for key_emp, datos_emp in ausencias_por_empleado.items():
        sim = SequenceMatcher(None, key_sal, key_emp).ratio()
        if sim > 0.7:
            ausencias_ind = datos_emp
            break

    emp = {
        'nombre': datos_sal['nombre'],
        'cedula': datos_sal['cedula'],
        'cargo': datos_sal['cargo'],
        'salario': datos_sal['salario'],
        'fecha_ingreso': datos_sal['fecha_ingreso'],
        'area': encontrado['area'] if encontrado else '',
        'total_dias_ausencia': encontrado['total_dias_ausencia'] if encontrado else 0,
        'ausencias': ausencias_ind['registros'] if ausencias_ind else [],
        'tiene_area': bool(encontrado and encontrado['area']),
        'tiene_ausencias': bool(ausencias_ind),
    }
    empleados_completos.append(emp)

# Empleados en ausentismo que NO están en salarios
for key_aus, datos_aus in ausentes.items():
    encontrado = False
    for key_sal, datos_sal in salarios.items():
        if datos_aus['cedula'] and datos_aus['cedula'] == datos_sal['cedula']:
            encontrado = True
            break
        sim = SequenceMatcher(None, key_aus, key_sal).ratio()
        if sim > 0.75:
            encontrado = True
            break
    if not encontrado:
        solo_en_ausencias.append(datos_aus)

# ====== RESUMEN ======
sin_area = [e for e in empleados_completos if not e['tiene_area']]
sin_ausencias = [e for e in empleados_completos if not e['tiene_ausencias']]

lines = []
lines.append(f'Total empleados en salarios: {len(salarios)}')
lines.append(f'Total empleados en ausentismo: {len(ausentes)}')
lines.append(f'Total empleados cruzados: {len(empleados_completos)}')
lines.append(f'Solo en ausencias (no en salarios): {len(solo_en_ausencias)}')
lines.append(f'Sin area definida: {len(sin_area)}')
lines.append(f'Sin registros de ausencia: {len(sin_ausencias)}')

lines.append('\n=== EMPLEADOS SIN ÁREA ===')
for e in sin_area:
    lines.append(f"  {e['nombre']} | CC: {e['cedula']} | {e['cargo']}")

lines.append('\n=== SOLO EN AUSENTISMO (sin salario registrado) ===')
for e in solo_en_ausencias:
    lines.append(f"  {e['nombre']} | CC: {e['cedula']} | {e['cargo']} | Área: {e['area']}")

lines.append('\n=== LISTA COMPLETA EMPLEADOS ===')
for e in sorted(empleados_completos, key=lambda x: x['nombre']):
    area_flag = '(SIN ÁREA)' if not e['tiene_area'] else ''
    lines.append(f"  {e['nombre']} | CC: {e['cedula']} | {e['cargo']} | {e['area']} | Sal: {e['salario']:,} | {area_flag}")

with open('resultado_cruce.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

# Guardar JSON para uso en el software
with open('empleados_data.json', 'w', encoding='utf-8') as f:
    json.dump(empleados_completos, f, ensure_ascii=False, indent=2, default=str)

print('Listo')
print(f'Empleados en salarios: {len(salarios)}')
print(f'Empleados en ausentismo: {len(ausentes)}')
print(f'Sin area: {len(sin_area)}')
print(f'Solo en ausencias: {len(solo_en_ausencias)}')
