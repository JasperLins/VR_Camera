# -*- coding: utf-8 -*-
# 职责:B2 安全/举报/积分/打卡四模块 live e2e(T10-T13 验收辅助)
# 用法:python scripts/e2e-b2.py(前提:api 已起,seed 锚点已入)
import json
import random
import subprocess
import sys
import urllib.request
import urllib.error

BASE = 'http://127.0.0.1:3000/v1'
DEVICE = f'b2-e2e-{random.randrange(16**6):06x}'
FAILED = []


def call(method, path, token=None, body=None):
    req = urllib.request.Request(BASE + path, method=method)
    req.add_header('Content-Type', 'application/json; charset=utf-8')
    if token:
        req.add_header('Authorization', f'Bearer {token}')
    data = json.dumps(body or {}).encode('utf-8') if method != 'GET' else None
    try:
        with urllib.request.urlopen(req, data) as resp:
            return json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        return json.loads(e.read().decode('utf-8'))


def check(name, ok, detail=''):
    mark = 'PASS' if ok else 'FAIL'
    if not ok:
        FAILED.append(name)
    print(f'[{mark}] {name} {detail}')


def main():
    login = call('POST', '/auth/guest', body={'deviceId': DEVICE})
    token = login['data']['token']
    user_id = login['data'].get('user', {}).get('id') if isinstance(login['data'].get('user'), dict) else login['data'].get('userId')
    check('游客登录', token is not None)

    # 新号冷却会让刚注册的账号打不了卡:回拨注册时间模拟老账号(规则引擎 live 验证过的行为)
    if user_id:
        subprocess.run(
            ['docker', 'exec', 'vrm-postgres', 'psql', '-U', 'vr', '-d', 'vrmemento', '-c',
             f"UPDATE users SET created_at = now() - interval '2 hours' WHERE id = '{user_id}'"],
            capture_output=True)

    # T10: agreements + consents
    ag = call('GET', '/agreements')
    keys = [a['key'] for a in ag['data']['items']]
    check('协议清单含五项敏感权限', len(keys) == 5, str(keys))
    ver = ag['data']['items'][0]['version']
    r = call('POST', '/consents', token, {'agreementKey': 'face-photo', 'version': ver, 'accepted': True})
    check('单独同意留痕', r['code'] == 0 and r['data']['accepted'] is True)
    mine = call('GET', '/consents/me', token)
    check('我的同意状态可查', any(c['agreementKey'] == 'face-photo' for c in mine['data']['items']))

    # T10: 举报文本机审(违规词拒绝)
    bad = call('POST', '/reports', token, {
        'targetType': 'ANCHOR', 'targetId': '00000000-0000-0000-0000-000000000000',
        'reason': 'OTHER', 'note': '这里有赌博信息'})
    check('举报文本机审拦截违规词', bad['code'] == 40000, bad.get('message', ''))

    # T11: 举报正常提交 + 重复举报
    anchor_id = sys.argv[1] if len(sys.argv) > 1 else None
    if anchor_id:
        rep = call('POST', '/reports', token, {
            'targetType': 'ANCHOR', 'targetId': anchor_id, 'reason': 'COPYRIGHT', 'note': '疑似侵权内容'})
        check('举报提交成功(48h SLA)', rep['code'] == 0 and 'slaDeadline' in rep['data'], str(rep.get('data', {}))[:120])
        dup = call('POST', '/reports', token, {
            'targetType': 'ANCHOR', 'targetId': anchor_id, 'reason': 'COPYRIGHT'})
        check('重复举报返回既有工单', dup['data'].get('duplicated') is True)
        mine = call('GET', '/reports/mine', token)
        check('我的举报列表可查', mine['data']['total'] >= 1)

    # T12/T13: 积分与打卡
    bal = call('GET', '/points/balance', token)
    check('积分余额(初始 0)', bal['data']['balance'] == 0)
    if anchor_id:
        ck = call('POST', '/checkins', token, {'anchorId': anchor_id})
        check('打卡 +2(今日 2/10)', ck['code'] == 0 and ck['data']['todayEarned'] == 2, str(ck.get('data', ''))[:100])
        ck2 = call('POST', '/checkins', token, {'anchorId': anchor_id})
        check('同锚点重复打卡幂等(今日仍 2)', ck2['data']['todayEarned'] == 2 and ck2['data']['replayed'] is True)
        bal2 = call('GET', '/points/balance', token)
        check('积分余额 2', bal2['data']['balance'] == 2)

    print()
    if FAILED:
        print('FAILED:', FAILED)
        sys.exit(1)
    print('ALL PASS')


if __name__ == '__main__':
    main()
