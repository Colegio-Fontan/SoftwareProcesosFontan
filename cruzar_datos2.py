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
    if row[3]:
        salario = row[0]
        fecha_ingreso = str(row[1])[:10] if row[1] else ''
        cargo = str(row[2]).strip() if row[2] else ''
        nombre = str(row[3]).strip()
        cedula_raw = row[4]
        if cedula_raw:
            try:
                cedula = str(int(float(str(cedula_raw))))
            except:
                cedula = str(cedula_raw)
        else:
            cedula = ''
        salarios[normalizar(nombre)] = {
            'nombre': nombre,
            'cedula': cedula,
            'cargo': cargo,
            'salario': int(salario) if salario else 0,
            'fecha_ingreso': fecha_ingreso,
        }

print(f'Salarios leidos: {len(salarios)}')

# ====== LEER AUSENTISMO CONSOLIDADO SOLO ======
wb_aus = openpyxl.load_workbook('Matriz Registro ausentismo Def..xlsx', data_only=True, read_only=True)
ws_con = wb_aus['Consolidado']

ausentes = {}
for row in ws_con.iter_rows(min_row=4, values_only=True):
    if row[0] is not None and row[1]:
        try:
            num = int(float(str(row[0])))
        except:
            continue
        nombre = str(row[1]).strip()
        cedula_raw = row[2]
        if cedula_raw:
            try:
                cedula = str(int(float(str(cedula_raw))))
            except:
                cedula = str(cedula_raw)
        else:
            cedula = ''
        cargo = str(row[3]).strip() if row[3] else ''
        area = str(row[4]).strip() if row[4] else ''
        dias = row[5] if row[5] else 0
        ausentes[normalizar(nombre)] = {
            'nombre': nombre,
            'cedula': cedula,
            'cargo': cargo,
            'area': area,
            'total_dias_ausencia': float(dias) if dias else 0,
        }

wb_aus.close()
print(f'Ausentes leidos: {len(ausentes)}')

# ====== CRUZAR ======
empleados = []
solo_en_ausencias = []

for key_sal, datos_sal in salarios.items():
    encontrado_aus = None
    # Por cedula
    if datos_sal['cedula']:
        for k, v in ausentes.items():
            if v['cedula'] == datos_sal['cedula']:
                encontrado_aus = v
                break
    # Por nombre similar
    if not encontrado_aus:
        mejor = 0
        for k, v in ausentes.items():
            sim = SequenceMatcher(None, key_sal, k).ratio()
            if sim > 0.78 and sim > mejor:
                mejor = sim
                encontrado_aus = v

    emp = {
        'nombre': datos_sal['nombre'],
        'cedula': datos_sal['cedula'],
        'cargo': datos_sal['cargo'],
        'salario': datos_sal['salario'],
        'fecha_ingreso': datos_sal['fecha_ingreso'],
        'area': encontrado_aus['area'] if encontrado_aus else '',
        'total_dias_ausencia': encontrado_aus['total_dias_ausencia'] if encontrado_aus else 0,
    }
    empleados.append(emp)

# Los que estan en ausencias pero no en salarios
cedulas_salario = {v['cedula'] for v in salarios.values() if v['cedula']}
nombres_sal_norm = list(salarios.keys())

for key_aus, datos_aus in ausentes.items():
    encontrado = False
    if datos_aus['cedula'] and datos_aus['cedula'] in cedulas_salario:
        encontrado = True
    if not encontrado:
        for k in nombres_sal_norm:
            if SequenceMatcher(None, key_aus, k).ratio() > 0.78:
                encontrado = True
                break
    if not encontrado:
        solo_en_ausencias.append(datos_aus)

sin_area = [e for e in empleados if not e['area']]
lines = []
lines.append(f'Total en salarios: {len(salarios)}')
lines.append(f'Total en ausentismo: {len(ausentes)}')
lines.append(f'Total combinados: {len(empleados)}')
lines.append(f'Solo en ausentismo (sin salario): {len(solo_en_ausencias)}')
lines.append(f'Sin area: {len(sin_area)}')

lines.append('\n=== SIN ÁREA ===')
for e in sin_area:
    lines.append(f"  {e['nombre']} | CC: {e['cedula']} | {e['cargo']}")

lines.append('\n=== SOLO EN AUSENTISMO ===')
for e in solo_en_ausencias:
    lines.append(f"  {e['nombre']} | CC: {e['cedula']} | Area: {e['area']}")

lines.append('\n=== LISTA COMPLETA ===')
for e in sorted(empleados, key=lambda x: x['nombre']):
    area_flag = ' *** SIN AREA' if not e['area'] else ''
    lines.append(f"  {e['nombre']} | {e['cedula']} | {e['cargo']} | {e['area']} | ${e['salario']:,}{area_flag}")

with open('resultado_cruce.txt', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

with open('empleados_data.json', 'w', encoding='utf-8') as f:
    json.dump(empleados, f, ensure_ascii=False, indent=2)

print('Listo')
