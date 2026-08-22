-- 职责:PostGIS 能力正式并入迁移链(geog 生成列/GiST/生命周期部分索引),db:patch 保留作幂等补丁
-- 职责:PostGIS 补丁(幂等,可重复执行)——Prisma 无法表达的地理能力统一在此落装
-- 关联需求:FR-01(M-1 附近查询);关联任务:PKG-08;执行:pnpm db:patch(migrate:deploy 已串接)
-- 索引口径来源:tech-stack.md §7.2 schema 要点

-- 1. 启用 PostGIS 扩展(RDS 需控制台预开通,ECS docker 镜像自带)
CREATE EXTENSION IF NOT EXISTS postgis;

-- 2. anchors.geog 生成列:由经纬度(WGS84)自动生成 geography 点,业务写入无需感知
ALTER TABLE anchors
  ADD COLUMN IF NOT EXISTS geog geography(Point, 4326)
  GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography) STORED;

-- 3. GiST 空间索引:ST_DWithin 半径查询的性能基线(P95 ≤500ms 验收依赖)
CREATE INDEX IF NOT EXISTS anchors_geog_gist ON anchors USING gist (geog);

-- 4. 生命周期调度部分索引:到期扫描只扫可见且设置了失效时间的行(tech-stack §7.2)
CREATE INDEX IF NOT EXISTS anchors_visible_expires_part
  ON anchors (expires_at)
  WHERE status = 'VISIBLE' AND expires_at IS NOT NULL;
