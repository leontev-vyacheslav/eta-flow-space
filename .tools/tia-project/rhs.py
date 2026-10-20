import re,html
def rhs_text(x):
    """Syntax-tree fragment → compact SCL text; constants from ODN, else TE."""
    toks=re.findall(r'<(Sub|SymVa|Const|OpMu|OpDi|OpAd|OpSu|OpE|OpNe|OpAnd|OpOr|OpNot|BracO|BracC|Dot|BoxO|BoxC)\b([^>]*)>',x)
    out=[]
    for tag,attrs in toks:
        def g(a):
            m=re.search(a+r'="([^"]*)"',attrs); return html.unescape(m.group(1)) if m else ''
        val=g('ODN') or (g('TE') if tag=='Const' else '')
        out.append({'OpMu':'*','OpDi':'/','OpAd':'+','OpSu':'-','OpE':'=','OpNe':'<>','OpAnd':'AND','OpOr':'OR','OpNot':'NOT','BracO':'(','BracC':')','Dot':'.','BoxO':'[','BoxC':']'}.get(tag,val.strip('"')))
    s=''.join(t if t in '().[]' else (' '+t+' ' if t in ('*','/','+','-','=','<>','AND','OR','NOT') else t) for t in out if t)
    return re.sub(r'\.\.','.',s)
