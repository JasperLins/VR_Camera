# -*- coding: utf-8 -*-
# 职责:生成任务全链路 e2e(创建→SSE 进度→终态→余额),Windows 控制台中文安全(PKG-14 T9 验收)
# 用法:python scripts/e2e-gen.py [--cancel]  —— --cancel 演示中途取消比例退款
import json
import sys
import threading
import urllib.request

BASE = 'http://127.0.0.1:3000/v1'
import random
DEVICE = f'gen-e2e-py-{random.randrange(16**6):06x}'
TAGS = {'style': '卡通', 'material': '哑光', 'texture': '4K', 'addons': ['PBR']}
CANCEL_MODE = '--cancel' in sys.argv


def post(path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method='POST')
    req.add_header('Content-Type', 'application/json; charset=utf-8')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    data = json.dumps(body or {}).encode('utf-8')
    with urllib.request.urlopen(req, data) as resp:
        return json.loads(resp.read().decode('utf-8'))


def get(path, token):
    req = urllib.request.Request(BASE + path)
    req.add_header('Authorization', f'Bearer {token}')
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode('utf-8'))


def main():
    login = post('/auth/guest', body={'deviceId': DEVICE})
    token = login['data']['token']
    print('login ok, balance =', get('/ledger/balance', token)['data']['balance'])

    created = post('/gen/tasks', token, {'tags': TAGS})
    print('create:', json.dumps(created['data'], ensure_ascii=False))
    task_id = created['data']['taskId']

    # SSE 后台收集帧
    frames = []

    def listen():
        req = urllib.request.Request(f'{BASE}/tasks/{task_id}/events')
        req.add_header('Authorization', f'Bearer {token}')
        req.add_header('Accept', 'text/event-stream')
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                for line in resp:
                    text = line.decode('utf-8').strip()
                    if text.startswith('data:'):
                        frames.append(json.loads(text[5:]))
        except Exception:
            pass

    listener = threading.Thread(target=listen, daemon=True)
    listener.start()

    if CANCEL_MODE:
        import time
        time.sleep(1.2)
        cancel = post(f'/gen/tasks/{task_id}/cancel', token)
        print('cancel:', json.dumps(cancel['data'], ensure_ascii=False))

    listener.join(timeout=25)
    print('SSE frames:')
    for f in frames:
        print('  ', json.dumps(f, ensure_ascii=False))

    final = get(f'/gen/tasks/{task_id}', token)
    print('final task:', json.dumps(final['data'], ensure_ascii=False))
    print('final balance:', get('/ledger/balance', token)['data']['balance'])
    entries = get('/ledger/entries?pageSize=5', token)['data']['items']
    print('ledger entries:')
    for e in entries:
        print('  ', e['delta'], e['reason'])


if __name__ == '__main__':
    main()
