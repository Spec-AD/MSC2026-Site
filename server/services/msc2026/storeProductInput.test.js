'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { normalizeStoreProductInput } = require('./storeProductInput');

test('normalizes complete store product input', () => {
  assert.deepEqual(normalizeStoreProductInput({
    name: '  MSC 徽章  ', description: ' 限定纪念品 ', imageUrl: 'https://example.com/item.webp',
    cost: '5000', stock: '12', active: true, sortOrder: '3'
  }), {
    name: 'MSC 徽章', description: '限定纪念品', imageUrl: 'https://example.com/item.webp',
    cost: 5000, stock: 12, active: true, sortOrder: 3
  });
});

test('rejects fractional or negative stock', () => {
  assert.throws(() => normalizeStoreProductInput({ name: '商品', cost: 1000, stock: 1.5 }), /库存数量/);
  assert.throws(() => normalizeStoreProductInput({ name: '商品', cost: 1000, stock: -1 }), /库存数量/);
});

test('partial updates accept stock replenishment without overwriting other fields', () => {
  assert.deepEqual(normalizeStoreProductInput({ stock: '20' }, { partial: true }), { stock: 20 });
});
