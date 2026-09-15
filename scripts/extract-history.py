"""Read legacy exports without retaining emails, secret codes or network IDs.
Usage: python scripts/extract-history.py [archive-directory]
Requires openpyxl (read-only extraction).
"""
import csv, hashlib, json, re, sys, warnings
from pathlib import Path
import openpyxl

warnings.filterwarnings('ignore', category=UserWarning, module='openpyxl')
root = Path(sys.argv[1] if len(sys.argv) > 1 else '.historical-source/Results')
teams = 'Cardinals Falcons Ravens Bills Panthers Bears Bengals Browns Cowboys Broncos Lions Packers Texans Colts Jaguars Chiefs Dolphins Vikings Patriots Saints Giants Jets Raiders Eagles Steelers Chargers 49ers Seahawks Rams Buccaneers Titans Commanders'.split()
def team(value):
    text = re.sub(r'^at\s+', '', str(value or '').strip(), flags=re.I).lower()
    text = {'redskins':'commanders','washington':'commanders','football team':'commanders',
            'sewhawks':'seahawks','cheifs':'chiefs','bangals':'bengals','raideres':'raiders','flacons':'falcons'}.get(text,text)
    return next((i+1 for i,t in enumerate(teams) if t.lower()==text), None)

output=[]
for path in sorted(root.rglob('*')):
    if not path.is_file() or path.suffix not in ('.csv','.xlsx'): continue
    match=re.search(r'(20\d\d) Week (\d+)',path.name)
    if path.suffix=='.csv':
        rows=list(csv.reader(path.read_text(encoding='utf-8-sig').splitlines()))
    else:
        book=openpyxl.load_workbook(path,data_only=True,read_only=True)
        rows=list(book.active.values)
        book.close()
    header=next((i for i,r in enumerate(rows) if any('player name' in str(v).lower() for v in r)),None)
    if header is None: raise ValueError(f'No player header: {path}')
    names=rows[header]
    namecol=next(i for i,v in enumerate(names) if 'player name' in str(v).lower())
    cols=[i for i in range(len(names)) if any(i<len(r) and team(r[i]) for r in rows[header+1:])]
    datecol=next((i for i,v in enumerate(names) if 'submit date' in str(v).lower() or str(v).lower()=='timestamp'),None)
    submissions=[]
    for index,row in enumerate(rows[header+1:],header+2):
        if not row[namecol]: continue
        submissions.append({'name':' '.join(str(row[namecol]).split()),'row':index,'timestamp':str(row[datecol] or '') if datecol is not None else '', 'picks':[{'column':i+1,'team':team(row[i]),'value':str(row[i] or '')} for i in cols]})
    output.append({'source':path.relative_to(root).as_posix(),'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'year':int(match[1]) if match else None,'week':int(match[2]) if match else None,'submissions':submissions})
Path('.historical-source/extracted.json').write_text(json.dumps(output,indent=2),encoding='utf-8')
print(json.dumps({'files':len(output),'players':sorted({s['name'] for f in output for s in f['submissions']}),'unassigned':[f['source'] for f in output if not f['year']]}))
