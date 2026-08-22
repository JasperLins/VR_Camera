/**
 * 职责:生成参数映射——结构化标签(中文枚举)→ 供应商 API 参数(O-6,禁客户端传 prompt 字符串)
 * 关联需求:FR-04;关联任务:PKG-14(T7);决策:D-014 单服务商 / 版权第二层防线(无角色名输入)
 * 说明:标签枚举与 UX S14 配置页选项一一对应;映射目标是 Meshy 系参数口径(Rodin 乙案由适配器自行换算)
 */

export const GEN_STYLES = ['卡通', 'Q版', '写实', '低多边形', '原创动漫风'] as const;
export type GenStyle = (typeof GEN_STYLES)[number];

export const GEN_MATERIALS = ['哑光', '光泽', '金属', '陶瓷'] as const;
export type GenMaterial = (typeof GEN_MATERIALS)[number];

export const GEN_TEXTURES = ['2K', '4K', '8K'] as const;
export type GenTexture = (typeof GEN_TEXTURES)[number];

export const GEN_ADDONS = ['PBR', '优化拓扑'] as const;
export type GenAddon = (typeof GEN_ADDONS)[number];

/** 客户端提交的结构化标签(唯一允许的生成输入面) */
export interface GenTags {
  style: GenStyle;
  material: GenMaterial;
  texture: GenTexture;
  addons: GenAddon[];
}

/** 映射后的供应商参数(网关层拼装,客户端不可见不可拼) */
export interface GenTagParams {
  /** 英文材质/风格提示词(由标签枚举查表生成,非用户输入) */
  texturePrompt: string;
  enablePbr: boolean;
  textureResolution: '2K' | '4K' | '8K';
  poseMode: 'T-pose' | 'A-pose';
  shouldRemesh: boolean;
  targetPolycount: number;
}

const STYLE_PROMPT: Readonly<Record<GenStyle, string>> = Object.freeze({
  卡通: 'cartoon style, clean shapes',
  Q版: 'chibi figurine style, cute proportions',
  写实: 'photorealistic style',
  低多边形: 'low-poly style, faceted geometry',
  原创动漫风: 'original anime figure style'
});

const MATERIAL_PROMPT: Readonly<Record<GenMaterial, string>> = Object.freeze({
  哑光: 'matte finish',
  光泽: 'glossy finish',
  金属: 'metallic finish',
  陶瓷: 'ceramic glazed finish'
});

/** 标签合法性校验(非法值返回错误消息,null=通过) */
export function validateGenTags(tags: Partial<GenTags> | null | undefined): string | null {
  if (!tags || typeof tags !== 'object') {
    return '生成标签缺失';
  }
  if (!GEN_STYLES.includes(tags.style as GenStyle)) {
    return `非法风格标签: ${String(tags.style)}`;
  }
  if (!GEN_MATERIALS.includes(tags.material as GenMaterial)) {
    return `非法材质标签: ${String(tags.material)}`;
  }
  if (!GEN_TEXTURES.includes(tags.texture as GenTexture)) {
    return `非法贴图精度: ${String(tags.texture)}`;
  }
  if (!Array.isArray(tags.addons)) {
    return '附加选项缺失';
  }
  for (const addon of tags.addons) {
    if (!GEN_ADDONS.includes(addon)) {
      return `非法附加选项: ${String(addon)}`;
    }
  }
  return null;
}

/** 标签 → 参数映射(纯函数;优化拓扑 → remesh + 3 万面预算) */
export function mapTagsToParams(tags: GenTags): GenTagParams {
  const error = validateGenTags(tags);
  if (error) {
    throw new Error(error);
  }

  const addons = new Set(tags.addons);
  return {
    texturePrompt: `${STYLE_PROMPT[tags.style]}, ${MATERIAL_PROMPT[tags.material]}`,
    enablePbr: addons.has('PBR'),
    textureResolution: tags.texture,
    poseMode: 'T-pose',
    shouldRemesh: addons.has('优化拓扑'),
    targetPolycount: addons.has('优化拓扑') ? 30_000 : 50_000
  };
}
