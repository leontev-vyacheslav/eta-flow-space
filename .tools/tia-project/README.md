# TIA Portal project reader

Reads a Siemens TIA Portal project archive without TIA Portal. Used on 2026-10-19/20 for the Царёво-1 PLC
(`.docs/.sources/Царево_last.7z`, a V17 project) to build `.docs/tsarevo1-siemens-modbus-map.xlsx`.

Setup once: `python3 -m venv venv && venv/bin/pip install py7zr openpyxl`, then extract the archive here
(`venv/bin/python -c "import py7zr; py7zr.SevenZipFile('../../.docs/.sources/Царево_last.7z').extractall('.')"`).

- `pages.py` — decompresses every zlib page of `System/PEData.plf` (the project database) into `pages.pkl` and
  `allpages.txt`. Block code is stored there as an SCL syntax tree in XML, split into 4 KB pages; several saved
  versions of a block coexist (newer ones later in the file).
- `rhs.py` — turns a syntax-tree fragment into readable SCL (`DWORD_TO_WORD(dbs_b1_pout.std.out_mode)`).

What the project database gave: block code and comments, interface member names, network parameters (IP, mask,
router), HMI alarm and text-list texts. What it did not: values of block constants and text-list entries, alarm bit
numbers (binary object store) — those need an export from TIA Portal.
