# Decompress every zlib page of the TIA project database into one text file (pages separated by markers).
import re,zlib,pickle
data=open('Царево_last/System/PEData.plf','rb').read()
pages=[]
for m in re.finditer(rb'\x78[\x01\x5e\x9c\xda]',data):
    try:
        d=zlib.decompressobj(); r=d.decompress(data[m.start():m.start()+70000])
        if len(r)>=64 and d.eof: pages.append((m.start(),r))
    except Exception: pass
pickle.dump(pages,open('pages.pkl','wb'))
open('allpages.txt','w').write(''.join(r.decode('utf-8','replace') for _,r in pages))
print('pages',len(pages))
