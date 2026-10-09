"""Registro central de eventos de seguridad (login, accesos denegados, ...).

Nunca debe recibir tokens ni contraseñas en ningún argumento.
"""
import logging

logger = logging.getLogger('seguridad')


def registrar_evento(accion, resultado, request=None, usuario=None, detalle=''):
    partes = [f'accion={accion}', f'resultado={resultado}']
    if usuario:
        partes.append(f'usuario={usuario}')
    if request is not None:
        ip = request.META.get('HTTP_X_FORWARDED_FOR', '')
        if ip:
            ip = ip.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', '')
        partes.append(f'ip={ip}')
        partes.append(f'metodo={request.method}')
        partes.append(f'ruta={request.path}')
    if detalle:
        partes.append(f'detalle={detalle}')
    logger.info(' | '.join(partes))
