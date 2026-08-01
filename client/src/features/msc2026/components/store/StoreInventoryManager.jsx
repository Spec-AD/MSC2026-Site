import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Boxes, Eye, EyeOff, ImagePlus, LoaderCircle, PackagePlus,
  Pencil, RotateCcw, Save, UploadCloud
} from 'lucide-react';
import * as api from '../../api/msc2026Api';

const number = new Intl.NumberFormat('zh-CN');
const EMPTY_FORM = {
  name: '', cost: '', stock: '', description: '', imageUrl: '', active: true, sortOrder: 0
};

function statusFor(product) {
  if (!product.active) return { label: '已下架', className: 'border-zinc-500/30 text-zinc-400' };
  if (product.stock < 1) return { label: '已售罄', className: 'border-red-300/30 text-red-200' };
  return { label: '在售', className: 'border-emerald-300/30 text-emerald-200' };
}

export default function StoreInventoryManager({ onChanged }) {
  const fileInputRef = useRef(null);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [message, setMessage] = useState(null);

  const loadInventory = useCallback(async () => {
    try {
      const response = await api.getAdminStoreProducts();
      setProducts(response.data.data || []);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.msg || '库存列表加载失败' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadInventory(); }, [loadInventory]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const editProduct = (product) => {
    setEditingId(product._id);
    setForm({
      name: product.name || '',
      cost: String(product.cost ?? ''),
      stock: String(product.stock ?? ''),
      description: product.description || '',
      imageUrl: product.imageUrl || '',
      active: Boolean(product.active),
      sortOrder: product.sortOrder || 0
    });
    setMessage(null);
    window.requestAnimationFrame(() => document.getElementById('store-product-name')?.focus());
  };

  const uploadImage = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: '请选择 JPG、PNG 或 WebP 图片' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: '商品图片不能超过 5MB' });
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const response = await api.uploadStoreProductImage(file);
      setForm(current => ({ ...current, imageUrl: response.data.data.imageUrl }));
      setMessage({ type: 'success', text: '商品图片已上传' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.msg || '图片上传失败' });
    } finally {
      setUploading(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    const payload = {
      ...form,
      cost: Number(form.cost),
      stock: Number(form.stock)
    };
    try {
      if (editingId) {
        await api.updateStoreProduct(editingId, payload);
        setMessage({ type: 'success', text: '商品资料与库存已更新' });
      } else {
        await api.createStoreProduct(payload);
        setMessage({ type: 'success', text: form.active ? '商品已进货并上架' : '商品草稿已保存' });
      }
      resetForm();
      await Promise.all([loadInventory(), onChanged?.()]);
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.msg || '商品保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const toggleProduct = async (product) => {
    setPendingId(product._id);
    setMessage(null);
    try {
      await api.updateStoreProduct(product._id, { active: !product.active });
      await Promise.all([loadInventory(), onChanged?.()]);
      setMessage({ type: 'success', text: product.active ? '商品已下架' : '商品已上架' });
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.msg || '状态更新失败' });
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section className="border border-cyan-300/20 bg-cyan-300/[0.035] p-5 md:p-7" aria-labelledby="inventory-title">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-3 text-cyan-200"><Boxes className="h-6 w-6" /><p className="msc-kicker">ADMIN SUPPLY / 管理员进货</p></div>
          <h2 id="inventory-title" className="mt-3 text-3xl font-black text-white md:text-4xl">商品与库存管理</h2>
          <p className="mt-2 text-zinc-400">上传商品图、设置积分价值与库存；可先保存为下架状态，准备好后再公开。</p>
        </div>
        <div className="grid grid-cols-2 gap-px border border-white/10 bg-white/10 text-center">
          <div className="bg-[#090c0f] px-5 py-3"><p className="text-xs font-black text-zinc-500">商品数</p><p className="mt-1 text-2xl font-black text-white">{products.length}</p></div>
          <div className="bg-[#090c0f] px-5 py-3"><p className="text-xs font-black text-zinc-500">总库存</p><p className="mt-1 text-2xl font-black text-cyan-100">{number.format(products.reduce((sum, product) => sum + product.stock, 0))}</p></div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-xl font-black text-white"><PackagePlus className="h-5 w-5 text-amber-200" />{editingId ? '编辑商品' : '新商品入库'}</h3>
            {editingId && <button type="button" onClick={resetForm} className="flex items-center gap-2 border border-white/10 px-3 py-2 text-sm font-bold text-zinc-300"><RotateCcw className="h-4 w-4" />取消编辑</button>}
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-black text-zinc-300 md:col-span-2">
              <span>商品名称 *</span>
              <input id="store-product-name" required maxLength={80} value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="例如：MSC 2026 限定徽章" className="h-14 w-full border border-white/15 bg-black/30 px-4 py-3 text-base text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="space-y-2 text-sm font-black text-zinc-300">
              <span>积分价值 *</span>
              <input type="number" required min="1" max="1000000000" step="1" inputMode="numeric" value={form.cost} onChange={event => setForm(current => ({ ...current, cost: event.target.value }))} placeholder="5000" className="h-14 w-full border border-white/15 bg-black/30 px-4 py-3 font-mono text-base text-white outline-none focus:border-cyan-300" />
            </label>
            <label className="space-y-2 text-sm font-black text-zinc-300">
              <span>入库数量 *</span>
              <input type="number" required min="0" max="1000000" step="1" inputMode="numeric" value={form.stock} onChange={event => setForm(current => ({ ...current, stock: event.target.value }))} placeholder="20" className="h-14 w-full border border-white/15 bg-black/30 px-4 py-3 font-mono text-base text-white outline-none focus:border-cyan-300" />
            </label>
          </div>

          <label className="block space-y-2 text-sm font-black text-zinc-300">
            <span>商品描述</span>
            <textarea maxLength={2000} rows="5" value={form.description} onChange={event => setForm(current => ({ ...current, description: event.target.value }))} placeholder="说明商品内容、规格与兑奖注意事项……" className="w-full resize-y border border-white/15 bg-black/30 px-4 py-3 text-base leading-7 text-white outline-none focus:border-cyan-300" />
            <span className="block text-right font-mono text-xs text-zinc-600">{form.description.length}/2000</span>
          </label>

          <div>
            <p className="mb-2 text-sm font-black text-zinc-300">描述图片</p>
            <div className="grid gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={uploadImage} className="sr-only" id="store-product-image" />
              <label htmlFor="store-product-image" className={`flex min-h-13 cursor-pointer items-center justify-center gap-2 border border-dashed px-5 py-3 font-black ${uploading ? 'pointer-events-none border-zinc-600 text-zinc-600' : 'border-cyan-300/40 text-cyan-100 hover:bg-cyan-300/10'}`}>
                {uploading ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}{uploading ? '正在上传…' : '选择图片'}
              </label>
              <input type="url" value={form.imageUrl} onChange={event => setForm(current => ({ ...current, imageUrl: event.target.value }))} placeholder="或粘贴 HTTPS 图片地址" className="h-14 min-w-0 border border-white/15 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-cyan-300" />
            </div>
            <p className="mt-2 text-xs text-zinc-600">支持 JPG、PNG、WebP，最大 5MB。建议横向 4:3 图片。</p>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 border border-white/10 bg-black/20 p-4">
            <span><strong className="block text-white">保存后立即上架</strong><span className="mt-1 block text-sm text-zinc-500">关闭时商品仍保存在库存中，但玩家不可见。</span></span>
            <input type="checkbox" checked={form.active} onChange={event => setForm(current => ({ ...current, active: event.target.checked }))} className="h-6 w-6 accent-cyan-300" />
          </label>

          <button type="submit" disabled={saving || uploading} className="flex h-14 w-full items-center justify-center gap-3 bg-cyan-200 px-6 font-black text-black disabled:opacity-40">
            {saving ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Save className="h-5 w-5" />}{saving ? '正在保存…' : editingId ? '保存商品修改' : '确认进货'}
          </button>
          {message && <p role="status" className={`font-bold ${message.type === 'success' ? 'text-emerald-200' : 'text-red-200'}`}>{message.text}</p>}
        </form>

        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-xl font-black text-white"><ImagePlus className="h-5 w-5 text-amber-200" />商品预览</h3>
          <article className="overflow-hidden border border-white/10 bg-[#090c0f]">
            <div className="aspect-[4/3] bg-black/35">
              {form.imageUrl ? <img src={form.imageUrl} alt="商品预览" className="h-full w-full object-cover" /> : <div className="flex h-full flex-col items-center justify-center text-zinc-700"><ImagePlus className="h-12 w-12" /><span className="mt-3 text-sm font-bold">尚未添加图片</span></div>}
            </div>
            <div className="p-5">
              <p className="text-xs font-black text-amber-200/70">MSC26 EXCLUSIVE ITEM</p>
              <h4 className="mt-2 text-2xl font-black text-white">{form.name || '商品名称'}</h4>
              <p className="mt-3 min-h-12 whitespace-pre-wrap text-sm leading-6 text-zinc-400">{form.description || '商品描述将在这里显示。'}</p>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4"><strong className="text-2xl text-amber-100">{form.cost ? number.format(Number(form.cost)) : '—'} 分</strong><span className="text-sm text-zinc-500">库存 {form.stock || 0}</span></div>
            </div>
          </article>
        </div>
      </div>

      <div className="mt-8 border-t border-white/10 pt-6">
        <div className="mb-4 flex items-center justify-between gap-4"><h3 className="text-xl font-black text-white">当前库存</h3><span className="font-mono text-xs text-zinc-600">INVENTORY / {products.length}</span></div>
        {loading ? <div className="flex min-h-32 items-center justify-center"><LoaderCircle className="h-7 w-7 animate-spin text-cyan-200" /></div> : products.length === 0 ? (
          <div className="border border-dashed border-white/10 p-8 text-center text-zinc-500">还没有商品，请完成第一笔进货。</div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            {products.map(product => {
              const status = statusFor(product);
              return (
                <article key={product._id} className="grid grid-cols-[80px_minmax(0,1fr)] gap-4 border border-white/10 bg-black/20 p-3 sm:grid-cols-[96px_minmax(0,1fr)_auto] sm:items-center">
                  <div className="aspect-square overflow-hidden bg-white/5">{product.imageUrl ? <img src={product.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center"><ImagePlus className="h-7 w-7 text-zinc-700" /></div>}</div>
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="truncate font-black text-white">{product.name}</h4><span className={`border px-2 py-0.5 text-[11px] font-black ${status.className}`}>{status.label}</span></div><p className="mt-2 font-mono text-sm text-amber-100">{number.format(product.cost)} 分 · 库存 {number.format(product.stock)}</p></div>
                  <div className="col-span-2 flex gap-2 sm:col-span-1">
                    <button type="button" onClick={() => editProduct(product)} className="flex flex-1 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-sm font-bold text-white"><Pencil className="h-4 w-4" />编辑</button>
                    <button type="button" disabled={pendingId === product._id} onClick={() => toggleProduct(product)} className="flex flex-1 items-center justify-center gap-2 border border-white/15 px-3 py-2 text-sm font-bold text-zinc-300 disabled:opacity-40">{product.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{product.active ? '下架' : '上架'}</button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
