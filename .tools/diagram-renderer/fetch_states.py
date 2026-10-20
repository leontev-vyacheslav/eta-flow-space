# Latest stored state of every device of one flow (by the boiler room's code), read-only; isConnected true like the web API's live state.
# Usage: flow-space-reporting/.venv/bin/python fetch_states.py <boiler room code> <out.json>
import asyncio,asyncpg,json,sys
from urllib.parse import urlparse
u=urlparse([l.split('=',1)[1].strip().strip('"\'') for l in open(__import__('os').path.join(__import__('os').path.dirname(__file__),'../../flow-space-reporting/.env-reporting')) if l.startswith('DATABASE_URL')][0].replace('+asyncpg',''))
async def main(code,out):
    c=await asyncpg.connect(host='localhost',port=35432,user=u.username,password=u.password,database=u.path[1:],timeout=10,ssl=False)
    await c.execute('SET SESSION CHARACTERISTICS AS TRANSACTION READ ONLY')
    async with c.transaction(readonly=True):
        rows=await c.fetch('''select d.code,(select state from device_state s where s."deviceId"=d.id order by id desc limit 1) state
            from device d where d."flowId"=(select "flowId" from device where code=$1) order by d.id''',code)
    states={r['code']:{'isConnected':True,**json.loads(r['state'] or '{}')} for r in rows}
    json.dump(states,open(out,'w'),ensure_ascii=False,indent=1)
    print({k:len(v) for k,v in states.items()})
asyncio.run(main(sys.argv[1],sys.argv[2]))
