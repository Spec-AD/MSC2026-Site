import { useCallback, useEffect, useState } from 'react';
import { Check, Coins, Copy, PackageOpen, ShieldCheck, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import * as api from '../api/msc2026Api';

const number = new Intl.NumberFormat('zh-CN');

export default function PointsStorePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [account, setAccount] = useState(null);
  const [pendingId, setPendingId] = useState(null);
  const [issued, setIssued] = useState(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [verifyMessage, setVerifyMessage] = useState('');
  const [verifying, setVerifying] = useState(false);

  const load = useCallback(async () => {
    const [productResult, accountResult, redemptionResult] = await Promise.allSettled([
      api.getStoreProducts(),
      user ? api.getPointsAccount() : Promise.resolve(null),
      user ? api.getStoreRedemptions() : Promise.resolve(null)
    ]);
    if (productResult.status === 'fulfilled') setProducts(productResult.value.data.data || []);
    if (accountResult.status === 'fulfilled' && accountResult.value) setAccount(accountResult.value.data.data);
    if (redemptionResult.status === 'fulfilled' && redemptionResult.value) setRedemptions(redemptionResult.value.data.data || []);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const redeem = async (product) => {
    if (!window.confirm(`确认使用 ${number.format(product.cost)} 积分兑换“${product.name}”？兑换后将立即生成唯一兑奖凭证。`)) return;
    setPendingId(product._id);
    setMessage('');
    try {
      const response = await api.redeemStoreProduct(product._id);
      setIssued(response.data.data.redemption);
      setAccount(current => current ? { ...current, balance: response.data.data.balance } : current);
      await load();
    } catch (err) {
      setMessage(err.response?.data?.msg || '兑换失败，请稍后再试');
    } finally {
      setPendingId(null);
    }
  };

  const copyVoucher = async (code) => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const verifyVoucher = async () => {
    setVerifying(true);
    setVerifyMessage('');
    try {
      const response = await api.verifyStoreVoucher(voucherInput);
      setVerifyMessage(`核销成功：${response.data.data.product.name}`);
      setVoucherInput('');
    } catch (err) {
      setVerifyMessage(err.response?.data?.msg || '凭证核销失败');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      <section className="msc-editorial-hero px-5 py-8 md:px-9">
        <div className="relative z-10 flex flex-wrap items-end justify-between gap-8">
          <div>
            <p className="msc-kicker text-amber-200">MSC26 POINTS EXCHANGE</p>
            <h1 className="msc-editorial-heading mt-3 text-6xl md:text-8xl">积分商店</h1>
            <p className="mt-4 max-w-2xl text-lg text-zinc-400">使用赛事积分兑换限定商品。每次成功兑换都会签发唯一防伪凭证，由主办方现场核销。</p>
          </div>
          <div className="border border-amber-300/25 bg-amber-300/10 px-6 py-5">
            <p className="text-sm font-black text-amber-200/70">AVAILABLE BALANCE</p>
            <p className="mt-1 flex items-center gap-3 text-4xl font-black text-amber-100"><Coins className="h-8 w-8" />{user && account ? number.format(account.balance) : '—'}</p>
          </div>
        </div>
      </section>

      {!user && (
        <div className="msc-panel p-6 text-center"><p className="text-xl font-black text-white">登录后即可查看余额并兑换</p><Link to="/login" className="mt-4 inline-block bg-amber-300 px-6 py-3 font-black text-black">前往登录</Link></div>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><p className="msc-kicker">CATALOG / 兑换目录</p><h2 className="mt-2 text-3xl font-black text-white">本期商品</h2></div><span className="font-mono text-sm text-zinc-600">{products.length} ITEMS</span></div>
        {products.length === 0 ? (
          <div className="msc-panel flex min-h-64 flex-col items-center justify-center border-dashed p-8 text-center">
            <PackageOpen className="h-12 w-12 text-zinc-600" />
            <h3 className="mt-5 text-2xl font-black text-zinc-300">商品补给中</h3>
            <p className="mt-2 text-zinc-500">积分商店逻辑已经就绪，首批兑换商品将由主办方稍后上架。</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {products.map(product => (
              <article key={product._id} className="msc-panel flex min-h-64 flex-col p-6">
                <ShoppingBag className="h-8 w-8 text-amber-200" /><h3 className="mt-5 text-2xl font-black text-white">{product.name}</h3><p className="mt-2 flex-1 text-zinc-400">{product.description}</p>
                <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-2xl font-black text-amber-100">{number.format(product.cost)} 分</span><span className="text-sm text-zinc-500">库存 {product.stock}</span></div>
                <button disabled={!user || pendingId === product._id || (account?.balance || 0) < product.cost} onClick={() => redeem(product)} className="mt-4 h-12 bg-amber-300 font-black text-black disabled:opacity-30">{pendingId === product._id ? '正在签发凭证...' : '确认兑换'}</button>
              </article>
            ))}
          </div>
        )}
        {message && <p className="mt-4 font-bold text-red-200">{message}</p>}
      </section>

      {user && redemptions.length > 0 && (
        <section>
          <p className="msc-kicker">MY CERTIFICATES / 我的凭证</p><h2 className="mt-2 text-3xl font-black text-white">兑换记录</h2>
          <div className="mt-4 space-y-3">{redemptions.map(item => <div key={item.redemptionId} className="msc-panel flex flex-wrap items-center justify-between gap-4 p-5"><div><p className="text-xl font-black text-white">{item.product.name}</p><p className="mt-1 font-mono text-sm text-amber-200">{item.voucherCode}</p></div><span className={`border px-3 py-1 text-sm font-black ${item.status === 'issued' ? 'border-emerald-300/30 text-emerald-200' : 'border-white/10 text-zinc-500'}`}>{item.status === 'issued' ? '待兑奖' : item.status === 'redeemed' ? '已核销' : '已取消'}</span></div>)}</div>
        </section>
      )}

      {user && ['ADM', 'TO', 'CHM'].includes(user.role) && (
        <section className="border border-cyan-300/20 bg-cyan-300/[0.04] p-5 md:p-7">
          <div className="flex items-center gap-3 text-cyan-200"><ShieldCheck className="h-6 w-6" /><p className="msc-kicker">ORGANIZER VERIFY / 主办方核销</p></div>
          <h2 className="mt-3 text-3xl font-black text-white">核验兑奖凭证</h2>
          <p className="mt-2 text-zinc-400">核销成功后凭证将立即失效，无法再次兑奖。</p>
          <div className="mt-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
            <input value={voucherInput} onChange={event => setVoucherInput(event.target.value.toUpperCase())} placeholder="MSC26-XXXX-XXXX-XXXX-XXXXXXXXXX" className="h-14 border border-white/15 bg-black/30 px-4 py-3 font-mono text-white outline-none focus:border-cyan-300" />
            <button disabled={!voucherInput || verifying} onClick={verifyVoucher} className="bg-cyan-200 px-6 py-3 font-black text-black disabled:opacity-35">{verifying ? '正在核验...' : '验证并核销'}</button>
          </div>
          {verifyMessage && <p className={`mt-3 font-bold ${verifyMessage.startsWith('核销成功') ? 'text-emerald-200' : 'text-red-200'}`}>{verifyMessage}</p>}
        </section>
      )}

      {issued && (
        <div className="fixed inset-0 z-[400] flex items-center justify-center bg-black/80 p-5" role="dialog" aria-modal="true" aria-label="兑换成功">
          <div className="w-full max-w-xl border border-emerald-300/35 bg-[#090d0b] p-7 text-center shadow-2xl">
            <ShieldCheck className="mx-auto h-14 w-14 text-emerald-300" /><p className="mt-4 text-sm font-black text-emerald-200">AUTHENTIC CERTIFICATE ISSUED</p><h2 className="mt-2 text-3xl font-black text-white">兑换成功</h2><p className="mt-2 text-zinc-400">向主办方出示以下唯一凭证兑奖。该凭证只能核销一次。</p>
            <button onClick={() => copyVoucher(issued.voucherCode)} className="mt-6 flex w-full items-center justify-center gap-3 border border-white/15 bg-black/35 px-4 py-5 font-mono text-lg font-black text-amber-100"><span className="break-all">{issued.voucherCode}</span>{copied ? <Check className="h-5 w-5 text-emerald-300" /> : <Copy className="h-5 w-5" />}</button>
            <button onClick={() => setIssued(null)} className="mt-5 w-full bg-emerald-300 py-3 font-black text-black">我已保存</button>
          </div>
        </div>
      )}
    </div>
  );
}
