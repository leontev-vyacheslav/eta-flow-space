#!/usr/bin/env python3
"""Compare flows.json with a git revision node by node.

Node-RED rewrites the whole flows.json on every Deploy, so `git diff` often shows
changed lines although no node changed (other node or key order). This script tells
the two apart: it lists added, removed and changed nodes, and shows function code
changes as line diffs.

Usage (inside the repository):
    python3 flow-space/flows-diff.py                    # flows.json next to the script vs HEAD
    python3 flow-space/flows-diff.py origin/master
    python3 /tmp/flows-diff.py HEAD flow-space/flows.json   # a copy of the script, explicit file
"""
import difflib
import json
import os
import subprocess
import sys

CODE_KEYS = ('func', 'initialize', 'finalize', 'info')


def load_revision(revision, path):
    top = subprocess.check_output(['git', 'rev-parse', '--show-toplevel'], text=True).strip()
    relative = os.path.relpath(os.path.abspath(path), top)
    return json.loads(subprocess.check_output(['git', '-C', top, 'show', f'{revision}:{relative}']))


def label(node, nodes):
    tab = nodes.get(node.get('z'), {})
    where = tab.get('label') or tab.get('name') or node.get('z') or '-'
    return f"{node.get('type')} {node.get('name') or node.get('label') or ''!r} ({node['id']}, on {where})"


def main():
    revision = sys.argv[1] if len(sys.argv) > 1 else 'HEAD'
    path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(os.path.dirname(os.path.abspath(__file__)), 'flows.json')
    old = {n['id']: n for n in load_revision(revision, path)}
    with open(path, encoding='utf-8') as f:
        new = {n['id']: n for n in json.load(f)}

    changes = 0
    for node_id in sorted(set(old) | set(new)):
        a, b = old.get(node_id), new.get(node_id)
        if a == b:
            continue
        changes += 1
        if a is None:
            print(f'+ added    {label(b, new)}')
            continue
        if b is None:
            print(f'- removed  {label(a, old)}')
            continue
        print(f'~ changed  {label(b, new)}')
        for key in sorted(set(a) | set(b)):
            if a.get(key) == b.get(key):
                continue
            if key in CODE_KEYS and isinstance(a.get(key), str) and isinstance(b.get(key), str):
                diff = difflib.unified_diff(a[key].splitlines(), b[key].splitlines(), lineterm='', n=1)
                print(f'    {key}:')
                for line in list(diff)[2:]:
                    print(f'      {line}')
            else:
                print(f'    {key}: {json.dumps(a.get(key), ensure_ascii=False)[:120]}'
                      f' -> {json.dumps(b.get(key), ensure_ascii=False)[:120]}')

    if changes:
        print(f'\n{changes} node(s) differ from {revision}.')
    else:
        print(f'No node differs from {revision}: only the order or formatting of the file changed.')


if __name__ == '__main__':
    main()
