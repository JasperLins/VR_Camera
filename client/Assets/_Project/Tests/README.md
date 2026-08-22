# Tests — EditMode 单测

装什么:ConvTests(坐标转换基准/回环)、ServiceRegistryTests、ApiEnvelopeParseTests(信封契约)。
运行:Window → General → Test Runner → EditMode → Run All;DoD 要求核心纯逻辑覆盖 ≥70%。
扩展:每新增一个纯逻辑类(状态机/账本计算/防刷规则)必须配 <类名>Tests.cs 放本目录;真机测试(Ignore)不在此。
