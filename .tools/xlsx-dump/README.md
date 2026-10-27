# xlsx dump

Prints an `.xlsx` workbook as plain text, one line per row (`<row> <column>:<value> | ...`), with the Python
standard library only — `openpyxl` is not installed in this environment. Used for Modbus register maps
(e.g. `.docs/.sources/Весна-2/Карта_регистров_ул_Кирова_Гагарина_Комарова.xlsx`, 2026-10-27).

```bash
python3 .tools/xlsx-dump/xlsx_dump.py BOOK.xlsx                        # every sheet, every non-empty row
python3 .tools/xlsx-dump/xlsx_dump.py BOOK.xlsx --sheet Лист1          # one sheet
python3 .tools/xlsx-dump/xlsx_dump.py BOOK.xlsx --require-col 1        # only rows with a value in column A
python3 .tools/xlsx-dump/xlsx_dump.py BOOK.xlsx --require-col 1 --require-col 11   # ...and in column K
```

Columns are numbered from 1 (A = 1). Shared and inline strings are resolved, formulas show their cached value,
line breaks inside a cell print as ` ⏎ `. Formatting, merged cells and hidden rows are not reported.
