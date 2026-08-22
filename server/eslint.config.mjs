/**
 * 职责:ESLint 9 扁平配置,server/ 全 workspace 统一 lint 规则(根一份,各包 lint 脚本向上解析)
 * 关联任务:PKG-02(NestJS monorepo 工程地基)
 */
// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['**/dist/**', '**/node_modules/**', '**/coverage/**', '**/*.js', '**/*.mjs', '**/*.cjs'] },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // 允许未使用变量以 _ 前缀豁免(占位参数)
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // Nest 依赖注入/装饰器场景下 any 收敛为警告,逐步清零
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-interface': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }]
    }
  },
  {
    // 测试桩(jest mock 的宽松参数类型)放开 any 限制——生产代码仍按 warn 收敛
    files: ['**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off'
    }
  }
);
