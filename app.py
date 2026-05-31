from flask import Flask, jsonify, request, send_from_directory, abort
import pandas as pd
import os
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
    df = pd.read_csv(ARCHIVOS[cuenta])
    df['Fecha'] = pd.to_datetime(df['Fecha'])
    df['Total'] = pd.to_numeric(df['Total'])
    df['Saldo'] = pd.to_numeric(df['Saldo'])
    return df.sort_values('Fecha', kind='mergesort').reset_index(drop=True)


def recalcular_saldo(df):
    saldo = 0.0
    for i, row in df.iterrows():
        saldo += row['Total'] if row['Tipo'] in TIPOS_POSITIVOS else -row['Total']
        df.at[i, 'Saldo'] = round(saldo, 2)
    return df


def guardar(df, cuenta):
    df = df.copy()
    df['Fecha'] = df['Fecha'].dt.strftime('%Y-%m-%d %H:%M:%S.%f')
    df.to_csv(ARCHIVOS[cuenta], index=False)


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
    df['Fecha'] = df['Fecha'].dt.strftime('%Y-%m-%d %H:%M:%S')
    return jsonify(df.to_dict(orient='records'))


@app.route('/api/movimiento/<cuenta>', methods=['POST'])
def add_movimiento(cuenta):
    if cuenta not in ARCHIVOS:
        abort(404)

    data = request.json
    df = cargar(cuenta)

    tipo = data.get('tipo', '')
    concepto = data.get('concepto', '').strip()
    total = float(data['total'])
    fecha = pd.to_datetime(data['fecha']) if data.get('fecha') else datetime.now()

    # Validación: retorno/devolución requiere origen previo con ese concepto
    if tipo == 'Devolución':
        if df[(df['Tipo'] == 'Gasto') & (df['Concepto'] == concepto)].empty:
            return jsonify({'error': f"No existe 'Gasto' con concepto '{concepto}'"}), 400
    elif tipo in ('Inversión_r', 'Apuestas_r'):
        tipo_origen = 'Inversión' if tipo == 'Inversión_r' else 'Apuestas'
        if df[(df['Tipo'] == tipo_origen) & (df['Concepto'] == concepto)].empty:
            return jsonify({'error': f"No existe '{tipo_origen}' con concepto '{concepto}'"}), 400
        if tipo == 'Apuestas_r' and not df[(df['Tipo'] == 'Apuestas_r') & (df['Concepto'] == concepto)].empty:
            return jsonify({'error': f"La apuesta '{concepto}' ya tiene retorno registrado"}), 400

    nuevo = pd.DataFrame([{
        'Fecha': fecha, 'Tipo': tipo, 'Concepto': concepto, 'Total': total, 'Saldo': 0.0
    }])
    df = pd.concat([df, nuevo], ignore_index=True)
    df = df.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
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
    data = request.json
    origen = data['origen']
    destino = data['destino']
    total = float(data['total'])
    fecha = pd.to_datetime(data['fecha']) if data.get('fecha') else datetime.now()

    if origen not in ARCHIVOS or destino not in ARCHIVOS or origen == destino:
        return jsonify({'error': 'Cuentas inválidas'}), 400

    df_o = cargar(origen)
    df_o = pd.concat([df_o, pd.DataFrame([{
        'Fecha': fecha, 'Tipo': 'Transferencia',
        'Concepto': f'A {destino.upper()}', 'Total': total, 'Saldo': 0.0
    }])], ignore_index=True)
    df_o = df_o.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
    df_o = recalcular_saldo(df_o)
    guardar(df_o, origen)

    df_d = cargar(destino)
    df_d = pd.concat([df_d, pd.DataFrame([{
        'Fecha': fecha, 'Tipo': 'Ingreso',
        'Concepto': f'Desde {origen.upper()}', 'Total': total, 'Saldo': 0.0
    }])], ignore_index=True)
    df_d = df_d.sort_values('Fecha', kind='mergesort').reset_index(drop=True)
    df_d = recalcular_saldo(df_d)
    guardar(df_d, destino)

    return jsonify({
        'ok': True,
        'saldo_origen': float(df_o.iloc[-1]['Saldo']),
        'saldo_destino': float(df_d.iloc[-1]['Saldo'])
    })


@app.route('/api/ultima_apuesta_r/<cuenta>')
def ultima_apuesta_r(cuenta):
    if cuenta not in ARCHIVOS:
        abort(404)
    df = cargar(cuenta)
    filtrado = df[df['Tipo'] == 'Apuestas_r']
    if filtrado.empty:
        return jsonify({'banca': None, 'concepto': None})
    ultimo = filtrado.iloc[-1]
    return jsonify({'banca': float(ultimo['Total']), 'concepto': ultimo['Concepto']})


if __name__ == '__main__':
    if not os.path.exists('openbank.csv') or not os.path.exists('ibkr.csv'):
        print("⚠️  Faltan los CSV. Ejecuta primero: python migrate.py")
    else:
        if os.environ.get('WERKZEUG_RUN_MAIN') != 'true':
            print("✅  Abriendo en http://localhost:5000")
        app.run(debug=True, port=5000, use_reloader=False)
