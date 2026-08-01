'use strict';

const PRODUCT_FIELDS = ['name', 'description', 'imageUrl', 'cost', 'stock', 'active', 'sortOrder'];

function integer(value, label, { min, max }) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`${label}须为 ${min}-${max} 的整数`);
  }
  return parsed;
}

function normalizeStoreProductInput(raw = {}, { partial = false } = {}) {
  const source = Object.fromEntries(Object.entries(raw).filter(([key]) => PRODUCT_FIELDS.includes(key)));
  const result = {};

  if (!partial || Object.hasOwn(source, 'name')) {
    const name = String(source.name ?? '').trim();
    if (!name) throw new Error('商品名称必填');
    if (name.length > 80) throw new Error('商品名称最多 80 个字符');
    result.name = name;
  }

  if (!partial || Object.hasOwn(source, 'description')) {
    const description = String(source.description ?? '').trim();
    if (description.length > 2000) throw new Error('商品描述最多 2000 个字符');
    result.description = description;
  }

  if (!partial || Object.hasOwn(source, 'imageUrl')) {
    const imageUrl = String(source.imageUrl ?? '').trim();
    if (imageUrl.length > 2048) throw new Error('商品图片地址过长');
    if (imageUrl && !/^https?:\/\//i.test(imageUrl) && !imageUrl.startsWith('/')) {
      throw new Error('商品图片地址格式非法');
    }
    result.imageUrl = imageUrl;
  }

  if (!partial || Object.hasOwn(source, 'cost')) {
    result.cost = integer(source.cost, '积分价值', { min: 1, max: 1_000_000_000 });
  }
  if (!partial || Object.hasOwn(source, 'stock')) {
    result.stock = integer(source.stock ?? 0, '库存数量', { min: 0, max: 1_000_000 });
  }
  if (!partial || Object.hasOwn(source, 'sortOrder')) {
    result.sortOrder = integer(source.sortOrder ?? 0, '排序值', { min: -1_000_000, max: 1_000_000 });
  }
  if (!partial || Object.hasOwn(source, 'active')) {
    if (source.active !== undefined && typeof source.active !== 'boolean') throw new Error('上架状态格式非法');
    result.active = source.active ?? false;
  }

  if (partial && Object.keys(result).length === 0) throw new Error('没有可更新的商品字段');
  return result;
}

module.exports = { PRODUCT_FIELDS, normalizeStoreProductInput };
