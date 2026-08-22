# common/ — 全站公共层

装什么:异常与信封(biz.exception / filters / interceptors)、公共 DTO(分页)、全局 Prisma 与 Redis 连接。
边界:只放跨模块复用件;业务模块禁止相互 import,共享逻辑下沉到这里或 packages/shared。
