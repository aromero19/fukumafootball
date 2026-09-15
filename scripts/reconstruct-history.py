"""Match sanitized archive selections to NFL games; emit an auditable import plan."""
import csv, json, hashlib
from collections import defaultdict, Counter
from datetime import datetime, timedelta
from pathlib import Path

base=Path('.historical-source')
files=json.loads((base/'extracted.json').read_text())
# The Week 10 export contains a copied block from 2021 Week 18 (rows 2–17).
# Both timestamps and all sixteen matchups establish that block's season/week.
mixed=next(f for f in files if f['source']=='2022/2022 Week 10.csv/2022 Week 10.csv')
files.append({**mixed,'year':2021,'week':18,'submissions':[s for s in mixed['submissions'] if s['row']<=17]})
mixed['submissions']=[s for s in mixed['submissions'] if s['row']>=18]
aliases=json.loads(Path('scripts/historical-aliases.json').read_text())
codes='ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX KC MIA MIN NE NO NYG NYJ LV PHI PIT LAC SF SEA LA TB TEN WAS'.split()
ids={t:i+1 for i,t in enumerate(codes)}
ids.update(OAK=23,SD=26,STL=29)
schedule=defaultdict(list)
for g in csv.DictReader((base/'nfl-games.csv').open()):
    if g['game_type']!='REG' or not 2016<=int(g['season'])<=2024: continue
    away,home=ids[g['away_team']],ids[g['home_team']]
    # Canceled games have no result and are excluded from scoring/import.
    winner=34 if not g['home_score'] else 33 if g['home_score']==g['away_score'] else home if float(g['home_score'])>float(g['away_score']) else away
    schedule[int(g['season']),int(g['week'])].append({'key':g['game_id'],'year':int(g['season']),'week':int(g['week']),'away':away,'home':home,'winner':winner,'date':g['gameday']})

issues=[]; candidates=defaultdict(list); usedgames={}; sources=[]
excluded={'TestAccount_DoNotUse','zzTestPerson'}
for f in files:
    year,week=f['year'],f['week']
    if f['source']=='2019/responses.xlsx': year,week=2019,9
    games=schedule[year,week]
    # A column must contain selections from exactly one scheduled matchup.
    values=defaultdict(set)
    for s in f['submissions']:
        if s['name'] in excluded: continue
        for p in s['picks']:
            if p['team']: values[p['column']].add(p['team'])
    mapping={}
    for col,teams in values.items():
        matches=[g for g in games if teams <= {g['away'],g['home']}]
        if f['source']=='2023/2023 Week 06.csv' and col==8:
            mapping[col]=next(g for g in games if {g['away'],g['home']}=={27,8})
        elif len(matches)==1: mapping[col]=matches[0]
        else: issues.append({'source':f['source'],'column':col,'teams':sorted(teams),'reason':'Column does not match one scheduled game'})
    sources.append({'source':f['source'],'sha256':f['sha256'],'year':year,'week':week,'rows':len(f['submissions'])})
    for s in f['submissions']:
        if s['name'] in excluded: continue
        name=aliases.get(s['name'],s['name'])
        raw=s['timestamp']
        stamp=None
        zone=raw.split()[-1] if raw else ''
        offset={'CST':6,'CDT':5,'MST':7,'MDT':6}.get(zone,0)
        parsed=raw.rsplit(' ',1)[0] if offset else raw
        for fmt in ('%Y-%m-%d %H:%M:%S','%Y/%m/%d %I:%M:%S %p','%m/%d/%Y %H:%M:%S','%m/%d/%Y'):
            try: stamp=(datetime.strptime(parsed,fmt)+timedelta(hours=offset)).isoformat()+'Z'; break
            except ValueError: pass
        if stamp is None: raise ValueError(f'Unrecognized timestamp in {f["source"]} row {s["row"]}')
        seen=set()
        for p in s['picks']:
            g=mapping.get(p['column'])
            if not g or not p['team']: continue
            if p['team'] not in (g['away'],g['home']):
                issues.append({'source':f['source'],'row':s['row'],'column':p['column'],'reason':'Invalid matchup selection; withheld','value':p['value']}); continue
            if g['key'] in seen: raise ValueError(f'Duplicate matchup column {f["source"]}')
            seen.add(g['key'])
            if g['winner']==34:
                issues.append({'source':f['source'],'row':s['row'],'reason':'Canceled/unscored game excluded','game':g['key']}); continue
            usedgames[g['key']]=g
            candidates[name,g['key']].append({'name':name,'game':g['key'],'team':p['team'],'timestamp':stamp,'source':f['source'],'row':s['row'],'column':p['column']})

picks=[]; revisions=[]
for (name,game),rows in sorted(candidates.items()):
    newest=max(r['timestamp'] for r in rows)
    latest=[r for r in rows if r['timestamp']==newest]
    if len({r['team'] for r in latest})>1:
        issues.append({'name':name,'game':game,'reason':'Conflicting picks at identical timestamp; withheld','sources':latest}); continue
    chosen=sorted(latest,key=lambda r:(r['source'],r['row']))[0]
    picks.append(chosen)
    if len({r['team'] for r in rows})>1: revisions.append({'name':name,'game':game,'selected':chosen,'earlier':rows})

coverage=[]
for year in range(2016,2025):
    weeks=sorted({g['week'] for g in usedgames.values() if g['year']==year})
    coverage.append({'year':year,'weeks':weeks,'missingWeeks':[w for w in range(1,19 if year>=2021 else 18) if w not in weeks],'games':sum(g['year']==year for g in usedgames.values()),'picks':sum(usedgames[p['game']]['year']==year for p in picks)})
plan={'scheduleSource':'https://github.com/nflverse/nfldata/blob/master/data/games.csv','scheduleSha256':hashlib.sha256((base/'nfl-games.csv').read_bytes()).hexdigest(),'sources':sources,'players':sorted({p['name'] for p in picks}),'games':list(usedgames.values()),'picks':picks,'coverage':coverage,'issues':issues,'revisions':revisions}
(base/'import-plan.json').write_text(json.dumps(plan,indent=2))
print(json.dumps({'players':plan['players'],'games':len(usedgames),'picks':len(picks),'revisions':len(revisions),'issues':issues[:40],'issueCount':len(issues),'coverage':coverage},indent=2))
