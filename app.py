from flask import Flask, jsonify, request, send_from_directory, abort
import pandas as pd
import os
import math
import tempfile
from datetime import datetime

app = Flask(__name__, static_folder='.')

ARCHIVOS = {
    'openbank': 'openbank.csv',
    'ibkr': 'ibkr.csv'
}

TIPOS_POSITIVOS = {'Ingreso', 'Saldo Inicial', 'Nómina', 'Inversión_r', 'Devolución', 'Apuestas_r'}

TIPOS_POR_CUENTA = {
    'openbank': ['Gasto', 'Devolución', 'Ingreso', 'Nómina', 'Apuestas', 'Apuestas_r', 'Transferencia'],
    'ibkr': ['Gasto', 'Ingreso', 'Inversión', 'Inversión_r']
}


def cargar(cuenta):
    try:
        df = pd.read_csv(ARCHIVOS[cuenta])
        df['Fecha'] = pd.to_datetime(df['Fecha'])
        df['Total'] = pd.to_numeric(df['Total'], errors='coerce')
        df['Saldo'] = pd.to_numeric(df['Saldo'], errors='coerce')
        return df.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
    except FileNotFoundError:
        abort(404, description=f"CSV de {cuenta} no encontrado")
    except Exception as e:
        abort(500, description=f"Error leyendo datos: {e}")


def recalcular_saldo(df):
    saldo = 0.0
    for i, row in df.iterrows():
        saldo += row['Total'] if row['Tipo'] in TIPOS_POSITIVOS else -row['Total']
        df.at[i, 'Saldo'] = round(saldo, 2)
    return df


def guardar(df, cuenta):
    df = df.copy()
    df['Fecha'] = df['Fecha'].dt.strftime('%Y-%m-%d %H:%M:%S.%f')
    ruta = ARCHIVOS[cuenta]
    with tempfile.NamedTemporaryFile('w', delete=False, dir='.', suffix='.tmp') as f:
        df.to_csv(f, index=False)
        tmp = f.name
    os.replace(tmp, ruta)


def _parse_total(data):
    try:
        total = float(data['total'])
    except (KeyError, TypeError, ValueError):
        return None, jsonify({'error': 'Importe inválido'}), 400
    if math.isnan(total) or math.isinf(total) or total <= 0:
        return None, jsonify({'error': 'El importe debe ser mayor que cero'}), 400
    return total, None, None


def _parse_fecha(data):
    try:
        return pd.to_datetime(data['fecha']) if data.get('fecha') else datetime.now(), None, None
    except Exception:
        return None, jsonify({'error': 'Fecha inválida'}), 400


@app.route('/')
def index():
    return send_from_directory('.', 'index.html')


@app.route('/api/patrimonio')
def get_patrimonio():
    result = {}
    for cuenta, archivo in ARCHIVOS.items():
        try:
            df = pd.read_csv(archivo)
            df = df.sort_values('Fecha', kind='mergesort')
            result[cuenta] = round(float(df.iloc[-1]['Saldo']), 2) if not df.empty else 0.0
        except Exception:
            result[cuenta] = 0.0
    return jsonify(result)


@app.route('/api/data/<cuenta>')
def get_data(cuenta):
    if cuenta not in ARCHIVOS:
        abort(404)
    df = cargar(cuenta)
    records = df.to_dict(orient='records')
    for i, r in enumerate(records):
        r['_idx'] = i
        r['Fecha'] = r['Fecha'].strftime('%Y-%m-%d %H:%M:%S') if hasattr(r['Fecha'], 'strftime') else str(r['Fecha'])
    return jsonify(records)


def _validar_tipo_concepto(df, cuenta, tipo, concepto, exclude_idx=None):
    """Valida tipo/concepto. exclude_idx excluye esa fila (útil al editar)."""
    if tipo not in TIPOS_POR_CUENTA.get(cuenta, []):
        return jsonify({'error': f"Tipo '{tipo}' no válido para esta cuenta"}), 400
    if not concepto:
        return jsonify({'error': 'El concepto no puede estar vacío'}), 400

    check = df if exclude_idx is None else df.drop(index=exclude_idx)

    if tipo == 'Devolución':
        if check[(check['Tipo'] == 'Gasto') & (check['Concepto'] == concepto)].empty:
            return jsonify({'error': f"No existe 'Gasto' con concepto '{concepto}'"}), 400
    elif tipo in ('Inversión_r', 'Apuestas_r'):
        tipo_origen = 'Inversión' if tipo == 'Inversión_r' else 'Apuestas'
        if check[(check['Tipo'] == tipo_origen) & (check['Concepto'] == concepto)].empty:
            return jsonify({'error': f"No existe '{tipo_origen}' con concepto '{concepto}'"}), 400
        if tipo == 'Apuestas_r' and not check[(check['Tipo'] == 'Apuestas_r') & (check['Concepto'] == concepto)].empty:
            return jsonify({'error': f"La apuesta '{concepto}' ya tiene retorno registrado"}), 400
    return None, None


@app.route('/api/movimiento/<cuenta>', methods=['POST'])
def add_movimiento(cuenta):
    if cuenta not in ARCHIVOS:
        abort(404)

    data = request.get_json(force=False, silent=True)
    if not data:
        return jsonify({'error': 'JSON inválido o Content-Type incorrecto'}), 400

    tipo = data.get('tipo', '')
    concepto = data.get('concepto', '').strip()

    total, err, code = _parse_total(data)
    if err:
        return err, code

    fecha, err, code = _parse_fecha(data)
    if err:
        return err, code

    df = cargar(cuenta)

    err, code = _validar_tipo_concepto(df, cuenta, tipo, concepto)
    if err:
        return err, code

    nuevo = pd.DataFrame([{
        'Fecha': fecha, 'Tipo': tipo, 'Concepto': concepto, 'Total': total, 'Saldo': 0.0
    }])
    df = pd.concat([df, nuevo], ignore_index=True)
    df = df.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
    df = recalcular_saldo(df)
    guardar(df, cuenta)

    return jsonify({'ok': True, 'saldo': float(df.iloc[-1]['Saldo'])})


@app.route('/api/movimiento/<cuenta>', methods=['PUT'])
def edit_movimiento(cuenta):
    if cuenta not in ARCHIVOS:
        abort(404)

    data = request.get_json(force=False, silent=True)
    if not data:
        return jsonify({'error': 'JSON inválido o Content-Type incorrecto'}), 400

    try:
        idx = int(data['idx'])
    except (KeyError, TypeError, ValueError):
        return jsonify({'error': 'Índice de movimiento inválido'}), 400

    tipo = data.get('tipo', '')
    concepto = data.get('concepto', '').strip()

    total, err, code = _parse_total(data)
    if err:
        return err, code

    df = cargar(cuenta)
    if idx < 0 or idx >= len(df):
        return jsonify({'error': 'Movimiento no encontrado'}), 404

    if df.at[idx, 'Tipo'] == 'Saldo Inicial':
        return jsonify({'error': 'No se puede editar el saldo inicial'}), 400

    err, code = _validar_tipo_concepto(df, cuenta, tipo, concepto, exclude_idx=idx)
    if err:
        return err, code

    # Fecha intacta; solo tipo, concepto y total
    df.at[idx, 'Tipo'] = tipo
    df.at[idx, 'Concepto'] = concepto
    df.at[idx, 'Total'] = total
    df = recalcular_saldo(df)
    guardar(df, cuenta)

    return jsonify({'ok': True, 'saldo': float(df.iloc[-1]['Saldo'])})


@app.route('/api/movimiento/<cuenta>', methods=['DELETE'])
def delete_movimiento(cuenta):
    if cuenta not in ARCHIVOS:
        abort(404)

    df = cargar(cuenta)
    if len(df) <= 1:
        return jsonify({'error': 'No se puede borrar el saldo inicial'}), 400

    ultimo = df.iloc[-1]
    eliminado = {
        'fecha': str(ultimo['Fecha']),
        'tipo': ultimo['Tipo'],
        'concepto': ultimo['Concepto'],
        'total': float(ultimo['Total'])
    }

    df = df.iloc[:-1].copy().reset_index(drop=True)
    df = recalcular_saldo(df)
    guardar(df, cuenta)

    return jsonify({'ok': True, 'eliminado': eliminado, 'saldo': float(df.iloc[-1]['Saldo'])})


@app.route('/api/transferencia', methods=['POST'])
def transferencia():
    data = request.get_json(force=False, silent=True)
    if not data:
        return jsonify({'error': 'JSON inválido o Content-Type incorrecto'}), 400

    origen  = data.get('origen', '')
    destino = data.get('destino', '')

    if origen not in ARCHIVOS or destino not in ARCHIVOS or origen == destino:
        return jsonify({'error': 'Cuentas inválidas'}), 400

    total, err, code = _parse_total(data)
    if err:
        return err, code

    fecha, err, code = _parse_fecha(data)
    if err:
        return err, code

    # Preparar ambos DataFrames antes de escribir ninguno
    df_o = cargar(origen)
    df_o = pd.concat([df_o, pd.DataFrame([{
        'Fecha': fecha, 'Tipo': 'Transferencia',
        'Concepto': f'A {destino.upper()}', 'Total': total, 'Saldo': 0.0
    }])], ignore_index=True)
    df_o = df_o.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
    df_o = recalcular_saldo(df_o)

    df_d = cargar(destino)
    df_d = pd.concat([df_d, pd.DataFrame([{
        'Fecha': fecha, 'Tipo': 'Ingreso',
        'Concepto': f'Desde {origen.upper()}', 'Total': total, 'Saldo': 0.0
    }])], ignore_index=True)
    df_d = df_d.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
    df_d = recalcular_saldo(df_d)

    guardar(df_o, origen)
    guardar(df_d, destino)

    return jsonify({
        'ok': True,
        'saldo_origen': float(df_o.iloc[-1]['Saldo']),
        'saldo_destino': float(df_d.iloc[-1]['Saldo'])
    })


if __name__ == '__main__':
    if not os.path.exists('openbank.csv') or not os.path.exists('ibkr.csv'):
        print("⚠️  Faltan los CSV. Ejecuta primero: python migrate.py")
    else:
        if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
            print("✅  Abriendo en http://localhost:5000")
        debug = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
        app.run(debug=debug, port=5000, use_reloader=False)
