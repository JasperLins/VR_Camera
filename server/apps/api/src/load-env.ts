/**
 * 职责:进程启动前置——从 workspace 根(server/.env)加载环境变量,必须在所有业务 import 之前引入
 * 关联任务:PKG-02;注意:TS 编译为 CommonJS 后 require 按声明顺序执行,本文件必须是 main.ts 的第一条 import
 */
import { config } from 'dotenv';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

// src/ 与 dist/ 距离 server/ 根均为三级目录(apps/api/src|dist)
const envPath = join(__dirname, '..', '..', '..', '.env');
if (existsSync(envPath)) {
  config({ path: envPath });
}
