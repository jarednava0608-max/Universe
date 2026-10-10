"""Copia los pendientes y hábitos de Centro (proyecto Supabase "Centro") a Universe ("Memoria Bíblica").

Uso (lo corre Claude, no hace falta computadora):
  1. En Centro, sacar el JSON con:
       select json_build_object(
         'tasks', (select json_agg(t) from public.tasks t where coalesce(t.source,'') <> 'Hábitos'),
         'habits', (select json_agg(h) from public.habits h),
         'reminders', (select json_agg(r) from public.habit_reminders r),
         'logs', (select json_agg(l) from public.habit_logs l));
  2. python3 centro-a-universe.py centro.json <user_id> > copia.sql
  3. Correr copia.sql en Universe.

Los ids son fijos ('centro-<id>' y 'centro-habito-<id>') y se usa ON CONFLICT DO NOTHING:
se puede volver a correr para traer lo nuevo de Centro sin duplicar ni pisar lo que ya editaste en Universe.
No borra nada en ningún lado.
"""
import json
import re
import sys
import time
from datetime import datetime, timezone

EMOJI = re.compile('[\U0001F000-\U0001FAFF☀-➿⬀-⯿️‍⃣]')


def clean(s):
    return re.sub(r'\s+', ' ', EMOJI.sub('', s or '')).strip()


def iso(ts):
    d = datetime.fromisoformat(ts.replace('Z', '+00:00')).astimezone(timezone.utc)
    return d.strftime('%Y-%m-%dT%H:%M:%S.') + f'{d.microsecond // 1000:03d}Z'


def ms(ts):
    return int(datetime.fromisoformat(ts.replace('Z', '+00:00')).timestamp() * 1000)


def q(s):
    return "'" + s.replace("'", "''") + "'"


def main():
    data = json.load(open(sys.argv[1], encoding='utf-8'))
    user = sys.argv[2]
    now = int(time.time() * 1000)
    rows = []
    for t in data.get('tasks') or []:
        fields = {
            'title': clean(t['title']),
            'dueAt': iso(t['due_at']) if t.get('due_at') else None,
            'category': t.get('category') or 'Personal',
            'priority': t.get('priority') or 'Media',
            'type': t.get('type') or 'Tarea',
            'repeat': t.get('repeat') or 'none',
            'reminderMinutes': t.get('reminder_minutes'),
            'notes': t.get('notes') or '',
            'source': t.get('source') or 'Centro',
            'done': bool(t.get('done')),
            'centroId': t['id'],
        }
        rows.append((f"centro-{t['id']}", 'pendiente', fields, ms(t['created_at'])))
    reminders = data.get('reminders') or []
    logs = data.get('logs') or []
    for h in data.get('habits') or []:
        title = clean(h['title'])
        slots = []
        for r in sorted((r for r in reminders if r['habit_id'] == h['id'] and r.get('active', True)), key=lambda r: r['id']):
            label = clean(r['title'])
            slots.append({
                'days': sorted(r['dows']),
                'time': r['at_time'][:5],
                'label': '' if label == title else label,
                'biweekly': r.get('biweekly_anchor'),
            })
        log = {l['day']: True for l in logs if l['habit_id'] == h['id'] and l.get('done')}
        fields = {
            'title': title,
            'goal': h.get('goal') or '',
            'notes': h.get('notes') or '',
            'active': h.get('active', True) is not False,
            'slots': slots,
            'log': log,
            'centroId': h['id'],
        }
        rows.append((f"centro-habito-{h['id']}", 'habito', fields, ms(h['created_at'])))
    print('insert into public.universe_entries (user_id, id, kind, fields, created_at, updated_at) values')
    print(',\n'.join(
        f"  ({q(user)}, {q(i)}, {q(k)}, {q(json.dumps(f, ensure_ascii=False))}::jsonb, {c}, {now})" for i, k, f, c in rows
    ))
    print('on conflict (user_id, id) do nothing returning id;')


if __name__ == '__main__':
    main()
