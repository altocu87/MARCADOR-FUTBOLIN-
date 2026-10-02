#!/usr/bin/env python3
"""Imita el paso del IDE de Arduino que declara todas las funciones del .ino antes de la primera función.
Uso: arduino_prototypes.py <entrada.ino> <salida.ino>. Permite que g++ detecte en el PC los errores
de «X does not name a type» que solo aparecen al compilar con el IDE."""
import re, sys

src = open(sys.argv[1], encoding='utf-8').read()
lines = src.split('\n')
sig = re.compile(r'^((?:static\s+)?(?:const\s+)?[\w:<>]+[\s\*&]+[\w]+\s*\([^;{]*\))\s*\{')
protos, first = [], None
for i, l in enumerate(lines):
    m = sig.match(l)
    if m and not l.startswith(('if', 'for', 'while', 'switch', 'return', 'else')):
        protos.append(re.sub(r'\s*=\s*[^,)]+', '', m.group(1)) + ';')
        if first is None:
            first = i
# Las declaraciones se insertan justo antes de la primera función (y después de los #include previos).
out = lines[:first] + protos + lines[first:]
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(out))
print(f'{len(protos)} declaraciones antes de la línea {first + 1}')
