#!/usr/bin/env python3
"""Print the cells of an .xlsx workbook as text, one line per row: `<row> <col>:<value> | ...`.

Standard library only (no openpyxl). Shared strings and inline strings are resolved; formulas show their
cached values; line breaks inside a cell are printed as ' ⏎ '.

Usage:
    python3 xlsx_dump.py BOOK.xlsx [--sheet NAME] [--require-col N ...]

--sheet NAME      only this sheet (default: all sheets, each under a '#### SHEET <name>' line)
--require-col N   only rows that have a value in column N (1 = A); repeat for several columns
"""
import argparse
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

NS = {
    'm': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}
TEXT = '{%s}t' % NS['m']


def column_number(reference):
    number = 0
    for letter in re.match(r'[A-Z]+', reference).group():
        number = number * 26 + ord(letter) - 64
    return number


def sheets(book):
    shared = []
    if 'xl/sharedStrings.xml' in book.namelist():
        for item in ET.fromstring(book.read('xl/sharedStrings.xml')).findall('m:si', NS):
            shared.append(''.join(t.text or '' for t in item.iter(TEXT)))
    workbook = ET.fromstring(book.read('xl/workbook.xml'))
    relations = ET.fromstring(book.read('xl/_rels/workbook.xml.rels'))
    targets = {relation.get('Id'): relation.get('Target') for relation in relations}
    for sheet in workbook.find('m:sheets', NS):
        target = targets[sheet.get('{%s}id' % NS['r'])]
        path = target.lstrip('/') if target.startswith('/') else 'xl/' + target
        yield sheet.get('name'), ET.fromstring(book.read(path)), shared


def rows(root, shared):
    for row in root.iter('{%s}row' % NS['m']):
        cells = {}
        for cell in row.findall('m:c', NS):
            kind, value = cell.get('t'), cell.find('m:v', NS)
            if kind == 'inlineStr':
                text = ''.join(t.text or '' for t in cell.iter(TEXT))
            elif value is None:
                continue
            elif kind == 's':
                text = shared[int(value.text)]
            else:
                text = value.text
            if text not in (None, ''):
                cells[column_number(cell.get('r'))] = text.replace('\n', ' ⏎ ')
        if cells:
            yield row.get('r'), cells


def main():
    arguments = argparse.ArgumentParser(description=__doc__.split('\n\n')[0])
    arguments.add_argument('book')
    arguments.add_argument('--sheet')
    arguments.add_argument('--require-col', type=int, action='append', default=[])
    options = arguments.parse_args()

    with zipfile.ZipFile(options.book) as book:
        for name, root, shared in sheets(book):
            if options.sheet and name != options.sheet:
                continue
            print('#### SHEET', name)
            for number, cells in rows(root, shared):
                if all(column in cells for column in options.require_col):
                    print(number, ' | '.join(f'{column}:{text}' for column, text in sorted(cells.items())))


if __name__ == '__main__':
    sys.exit(main())
