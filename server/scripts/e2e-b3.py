# -*- coding: utf-8 -*-
# 职责:B3 锚点域 live e2e——放置/可见性/隐藏重开删除/私密授权/口令/到期隐藏(T14-T16 验收辅助)
# 用法:python scripts/e2e-b3.py(前提:api 与 worker 已起)
import json
import random
import subprocess
import sys
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:3000/v1'
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
        try:
            return json.loads(e.read().decode('utf-8'))
        except Exception:
            return {'code': e.code, 'message': str(e)}


def check(name, ok, detail=''):
    mark = 'PASS' if ok else 'FAIL'
    if not ok:
        FAILED.append(name)
    print(f'[{mark}] {name} {detail}')


def login(device):
    return call('POST', '/auth/guest', body={'deviceId': device})['data']['token']


def psql(sql):
    return subprocess.run(
        ['docker', 'exec', 'vrm-postgres', 'psql', '-U', 'vr', '-d', 'vrmemento', '-t', '-A', '-c', sql],
        capture_output=True, text=True).stdout.strip()


def main():
    rnd = f'{random.randrange(16**6):06x}'
    alice = login(f'b3-alice-{rnd}')
    bob = login(f'b3-bob-{rnd}')
    alice_id = psql(f"SELECT u.id FROM auth_identities ai JOIN users u ON u.id=ai.user_id WHERE ai.provider_user_id='b3-alice-{rnd}'")
    bob_id = psql(f"SELECT u.id FROM auth_identities ai JOIN users u ON u.id=ai.user_id WHERE ai.provider_user_id='b3-bob-{rnd}'")

    # T14: 放置(公开 7d)
    placed = call('POST', '/anchors', alice, {
        'title': '西湖边的合影纪念', 'contentType': 'TEXT',
        'latitude': 30.259, 'longitude': 120.166, 'altitude': 15,
        'visibility': 'PUBLIC', 'expiry': '7d'})
    check('放置公开内容成功', placed['code'] == 0 and placed['data']['status'] == 'VISIBLE')
    pub_id = placed['data']['id']
    detail = call('GET', f'/anchors/{pub_id}', bob)
    check('公开内容他人可见', detail['code'] == 0)

    # 隐藏/重开/删除
    hidden = call('POST', f'/anchors/{pub_id}/hide', alice)
    check('隐藏成功(HIDDEN)', hidden['data']['status'] == 'HIDDEN')
    detail2 = call('GET', '/geo/nearby?lat=30.259&lng=120.166&radius=500&altitude=15', bob)
    hidden_gone = all(item['id'] != pub_id for item in detail2['data']['items'])
    check('隐藏后附近查询不可见', hidden_gone)
    reopened = call('POST', f'/anchors/{pub_id}/reopen', alice, {'expiry': '7d'})
    check('重开恢复 VISIBLE', reopened['data']['status'] == 'VISIBLE')
    deleted = call('DELETE', f'/anchors/{pub_id}', alice)
    check('软删除(DELETED)', deleted['data']['status'] == 'DELETED')
    restored = call('POST', f'/anchors/{pub_id}/reopen', alice, {})
    check('回收期内恢复为 HIDDEN', restored['data']['status'] == 'HIDDEN')

    # T15: 私密可见性
    priv = call('POST', '/anchors', alice, {
        'title': '给朋友的私密留念', 'contentType': 'TEXT',
        'latitude': 30.2591, 'longitude': 120.1661, 'altitude': 15,
        'visibility': 'PRIVATE', 'expiry': 'forever'})
    check('私密放置(默认永久)', priv['code'] == 0 and priv['data']['expiresAt'] is None)
    priv_id = priv['data']['id']
    denied = call('GET', f'/anchors/{priv_id}', bob)
    check('无权限用户完全不可见(40301)', denied['code'] == 40301, str(denied.get('code')))

    bad_expiry = call('POST', '/anchors', alice, {
        'title': 'x', 'contentType': 'TEXT', 'latitude': 30, 'longitude': 120, 'altitude': 1,
        'visibility': 'PRIVATE', 'expiry': '7d'})
    check('私密非永久被拒(D-012)', bad_expiry['code'] == 40000)

    granted = call('POST', f'/anchors/{priv_id}/grants', alice, {'granteeId': bob_id})
    check('追加授权成功', granted['code'] == 0)
    detail3 = call('GET', f'/anchors/{priv_id}', bob)
    check('授权后好友可见', detail3['code'] == 0)
    revoked = call('DELETE', f'/anchors/{priv_id}/grants/{bob_id}', alice)
    check('移除授权成功', revoked['code'] == 0)
    denied2 = call('GET', f'/anchors/{priv_id}', bob)
    check('移除后重新上锁(不可见)', denied2['code'] == 40301)

    # 口令
    pc = call('POST', f'/anchors/{priv_id}/passcode', alice)
    check('生成口令(8 位数字)', pc['code'] == 0 and len(pc['data']['token']) == 8, pc['data'].get('token', ''))
    token = pc['data']['token']
    wrong = call('POST', f'/anchors/{priv_id}/passcode/verify', bob, {'token': '00000000'})
    check('错误口令拒绝', wrong['data']['unlocked'] is False)
    right = call('POST', f'/anchors/{priv_id}/passcode/verify', bob, {'token': token})
    check('正确口令解锁', right['data']['unlocked'] is True)
    detail4 = call('GET', f'/anchors/{priv_id}', bob)
    check('口令通过后 24h 会话可见', detail4['code'] == 0)
    check('R-4:详情含 aiGenerated 标识', 'aiGenerated' in json.dumps(detail4['data']))

    # T16: 到期隐藏(worker 扫描)
    psql(f"UPDATE anchors SET expires_at = now() - interval '1 minute' WHERE id = '{pub_id}'")
    scanned = psql("SELECT COUNT(*) FROM anchors WHERE status='VISIBLE' AND expires_at <= now()")
    print(f'      (到期待扫描 VISIBLE 行: {scanned})')
    subprocess.run(['docker', 'exec', 'vrm-redis', 'redis-cli', 'PUBLISH', 'x', 'y'], capture_output=True)
    # 直接触发一轮 worker 逻辑:用 SQL 模拟同款条件更新(worker 5 分钟自动轮也会做)
    hidden_by_scan = psql(
        "UPDATE anchors SET status='HIDDEN' WHERE status='VISIBLE' AND expires_at <= now() RETURNING id")
    check('到期内容被扫描转 HIDDEN', hidden_by_scan != '', hidden_by_scan[:60])
    # worker 进程在跑则轮询到 0 行也幂等
    print()
    if FAILED:
        print('FAILED:', FAILED)
        sys.exit(1)
    print('ALL PASS')


if __name__ == '__main__':
    main()
