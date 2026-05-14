'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_PAYSLIPS } from '@/lib/demo'
import Header from '@/components/Header'

interface Payslip { id: string; year: number; month: number; base_salary: number; commute_total: number; deduction: number; net_salary: number | null; is_paid: boolean }

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function PayslipPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [selected, setSelected] = useState<Payslip | null>(null)
  const supabase = createClient()

  const fetchPayslips = useCallback(async () => {
    if (isDemoMode()) { setPayslips(DEMO_PAYSLIPS as Payslip[]); setSelected(DEMO_PAYSLIPS[0] as Payslip); return }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('payslips').select('*').eq('user_id', user.id).order('year', { ascending: false }).order('month', { ascending: false })
    setPayslips(data ?? [])
    if (data && data.length > 0) setSelected(data[0])
  }, [supabase])

  useEffect(() => { fetchPayslips() }, [fetchPayslips])

  function exportPDF() {
    if (!selected) return
    const net = selected.net_salary ?? (selected.base_salary + selected.commute_total - selected.deduction)
    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <title>給料明細 ${selected.year}年${selected.month}月</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, 'Hiragino Sans', 'Yu Gothic UI', 'Meiryo', sans-serif; padding: 48px 56px; color: #111; max-width: 640px; margin: 0 auto; }
    h1 { font-size: 26px; font-weight: 700; text-align: center; margin-bottom: 6px; }
    .period { text-align: center; font-size: 14px; color: #666; margin-bottom: 36px; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-bottom: 1px solid #e5e7eb; font-size: 15px; }
    .row .label { color: #444; }
    .row .value { font-weight: 600; }
    .row .minus { color: #dc2626; }
    .total-row { display: flex; justify-content: space-between; align-items: center; padding: 18px 0 0; font-size: 18px; font-weight: 700; }
    .status { text-align: center; margin-top: 28px; font-size: 13px; color: #666; }
    .badge { display: inline-block; padding: 3px 10px; border-radius: 99px; font-size: 12px; font-weight: 600; }
    .paid { background: #dcfce7; color: #166534; }
    .unpaid { background: #fef9c3; color: #854d0e; }
    @media print { @page { margin: 20mm; } body { padding: 0; } }
  </style>
</head>
<body>
  <h1>給料明細</h1>
  <p class="period">${selected.year}年 ${selected.month}月</p>
  <div class="row"><span class="label">基本給</span><span class="value">¥${selected.base_salary.toLocaleString()}</span></div>
  <div class="row"><span class="label">交通費</span><span class="value">¥${selected.commute_total.toLocaleString()}</span></div>
  <div class="row"><span class="label">控除額</span><span class="value minus">-¥${selected.deduction.toLocaleString()}</span></div>
  <div class="total-row"><span>差引支給額</span><span>¥${net.toLocaleString()}</span></div>
  <p class="status"><span class="badge ${selected.is_paid ? 'paid' : 'unpaid'}">${selected.is_paid ? '支払済' : '未払い'}</span></p>
</body>
</html>`
    const w = window.open('', '_blank', 'width=700,height=850')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.addEventListener('load', () => w.print())
  }

  const net = selected ? (selected.net_salary ?? selected.base_salary + selected.commute_total - selected.deduction) : 0

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="給料明細" subtitle="給与明細の確認とPDF出力" />
      <div className="px-4 md:px-8 pb-10">
        {payslips.length === 0 ? (
          <div className="card py-20 text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>給料明細がまだありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Payslip list */}
            <div className="card overflow-hidden">
              <div className="px-4 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>明細一覧</h3>
              </div>
              <div>
                {payslips.map((p, i) => (
                  <button key={p.id} onClick={() => setSelected(p)} className="w-full px-4 py-4 text-left flex items-center justify-between table-row"
                    style={{ background: selected?.id === p.id ? 'rgba(17,24,39,0.04)' : 'transparent', borderBottom: i < payslips.length - 1 ? '1px solid var(--border-light)' : 'none' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{p.year}年 {p.month}月</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>¥{(p.net_salary ?? 0).toLocaleString()}</p>
                    </div>
                    <span className={`badge ${p.is_paid ? 'badge-green' : 'badge-amber'}`}>{p.is_paid ? '支払済' : '未払い'}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Payslip detail */}
            {selected && (
              <div className="lg:col-span-2 space-y-4">
                {/* Header card */}
                <div className="rounded-xl p-6" style={{ background: '#141414' }}>
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <p className="text-xs font-medium mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>{selected.year}年 {selected.month}月</p>
                      <p className="text-4xl font-bold text-white">¥{net.toLocaleString()}</p>
                      <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.4)' }}>差引支給額</p>
                    </div>
                    <span className={`badge ${selected.is_paid ? 'badge-green' : 'badge-amber'}`} style={{ marginTop: 4 }}>
                      {selected.is_paid ? '支払済' : '未払い'}
                    </span>
                  </div>
                  <button onClick={exportPDF} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.8)', border: '1px solid rgba(255,255,255,0.15)' }}>
                    PDFで出力
                  </button>
                </div>

                {/* Breakdown */}
                <div className="card overflow-hidden">
                  <div className="px-4 md:px-6 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>給与明細内訳</h3>
                  </div>
                  <div>
                    {[
                      { label: '基本給',  value: `¥${selected.base_salary.toLocaleString()}`,    plus: true },
                      { label: '交通費',  value: `¥${selected.commute_total.toLocaleString()}`,   plus: true },
                      { label: '控除額',  value: `-¥${selected.deduction.toLocaleString()}`,      plus: false },
                    ].map((item, i) => (
                      <div key={item.label} className="flex items-center justify-between px-4 md:px-6 py-4 table-row" style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                        <span className="text-sm font-semibold" style={{ color: item.plus ? 'var(--text-primary)' : 'var(--red-text)' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between px-6 py-5">
                    <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>差引支給額</span>
                    <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>¥{net.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
