'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface Payslip {
  id: string
  year: number
  month: number
  base_salary: number
  commute_total: number
  deduction: number
  net_salary: number | null
  is_paid: boolean
}

export default function PayslipPage() {
  const [payslips, setPayslips] = useState<Payslip[]>([])
  const [selected, setSelected] = useState<Payslip | null>(null)
  const supabase = createClient()

  const fetchPayslips = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('payslips').select('*').eq('user_id', user.id).order('year', { ascending: false }).order('month', { ascending: false })
    setPayslips(data ?? [])
    if (data && data.length > 0) setSelected(data[0])
  }, [supabase])

  useEffect(() => { fetchPayslips() }, [fetchPayslips])

  async function exportPDF() {
    if (!selected) return
    const { default: jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    doc.setFontSize(22)
    doc.text('Salary Slip', 105, 25, { align: 'center' })
    doc.setFontSize(13)
    doc.text(`${selected.year}年 ${selected.month}月`, 105, 38, { align: 'center' })
    doc.setDrawColor(220)
    doc.line(20, 46, 190, 46)
    const net = selected.net_salary ?? (selected.base_salary + selected.commute_total - selected.deduction)
    const rows = [
      ['Base Salary (基本給)', `JPY ${selected.base_salary.toLocaleString()}`],
      ['Commute Allowance (交通費)', `JPY ${selected.commute_total.toLocaleString()}`],
      ['Deductions (控除)', `-JPY ${selected.deduction.toLocaleString()}`],
    ]
    let y = 60
    doc.setFontSize(11)
    rows.forEach(([label, value]) => {
      doc.text(label, 25, y)
      doc.text(value, 185, y, { align: 'right' })
      y += 14
    })
    doc.setDrawColor(200)
    doc.line(20, y, 190, y)
    y += 10
    doc.setFontSize(14)
    doc.text('Net Salary (差引支給額)', 25, y)
    doc.text(`JPY ${net.toLocaleString()}`, 185, y, { align: 'right' })
    y += 14
    doc.setFontSize(10)
    doc.setTextColor(150)
    doc.text(`Status: ${selected.is_paid ? 'Paid 支払済' : 'Unpaid 未払い'}`, 105, y + 10, { align: 'center' })
    doc.save(`payslip_${selected.year}_${String(selected.month).padStart(2, '0')}.pdf`)
  }

  const net = selected
    ? (selected.net_salary ?? selected.base_salary + selected.commute_total - selected.deduction)
    : 0

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header title="給料明細" subtitle="給与明細の確認とPDF出力" />

      <div className="px-8 pb-10">
        {payslips.length === 0 ? (
          <div className="bg-white rounded-3xl py-20 text-center shadow-sm" style={{ color: '#8e8e93' }}>
            <p className="text-5xl mb-4">💴</p>
            <p className="font-semibold text-lg" style={{ color: '#1c1c1e' }}>給料明細がまだありません</p>
            <p className="text-sm mt-1">管理者が明細を作成するまでお待ちください</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Month list */}
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
              <div className="px-5 py-4" style={{ borderBottom: '1px solid #f2f2f7' }}>
                <h3 className="font-bold" style={{ color: '#1c1c1e' }}>明細一覧</h3>
              </div>
              <div>
                {payslips.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setSelected(p)}
                    className="w-full px-5 py-4 text-left flex items-center justify-between"
                    style={{
                      background: selected?.id === p.id ? 'rgba(0,122,255,0.06)' : 'transparent',
                      borderBottom: '1px solid #f2f2f7',
                    }}
                  >
                    <div>
                      <p className="font-semibold" style={{ color: '#1c1c1e' }}>{p.year}年 {p.month}月</p>
                      <p className="text-sm mt-0.5" style={{ color: '#8e8e93' }}>
                        ¥{(p.net_salary ?? 0).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className="px-2.5 py-1 rounded-full text-xs font-semibold"
                      style={{ background: p.is_paid ? 'rgba(52,199,89,0.12)' : 'rgba(255,149,0,0.12)', color: p.is_paid ? '#34c759' : '#ff9500' }}
                    >
                      {p.is_paid ? '支払済' : '未払い'}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Detail */}
            {selected && (
              <div className="lg:col-span-2 space-y-4">
                {/* Header card */}
                <div
                  className="rounded-3xl p-6 shadow-sm"
                  style={{ background: 'linear-gradient(135deg, #1a1a3e, #2d2d6b)' }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.6)' }}>{selected.year}年 {selected.month}月</p>
                      <p className="text-4xl font-bold text-white mt-1">¥{net.toLocaleString()}</p>
                      <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>差引支給額</p>
                    </div>
                    <span
                      className="px-3 py-1.5 rounded-full text-sm font-bold"
                      style={{ background: selected.is_paid ? 'rgba(52,199,89,0.25)' : 'rgba(255,149,0,0.25)', color: selected.is_paid ? '#86efac' : '#fcd34d' }}
                    >
                      {selected.is_paid ? '✓ 支払済' : '未払い'}
                    </span>
                  </div>
                  <button
                    onClick={exportPDF}
                    className="w-full py-3 rounded-2xl font-bold text-sm"
                    style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
                  >
                    PDFで出力 ↓
                  </button>
                </div>

                {/* Breakdown */}
                <div className="bg-white rounded-3xl shadow-sm overflow-hidden">
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid #f2f2f7' }}>
                    <h3 className="font-bold" style={{ color: '#1c1c1e' }}>給与明細内訳</h3>
                  </div>
                  <div className="px-6 py-2">
                    {[
                      { label: '基本給', value: `¥${selected.base_salary.toLocaleString()}`, color: '#1c1c1e', positive: true },
                      { label: '交通費', value: `¥${selected.commute_total.toLocaleString()}`, color: '#007aff', positive: true },
                      { label: '控除額', value: `-¥${selected.deduction.toLocaleString()}`, color: '#ff3b30', positive: false },
                    ].map((item, i, arr) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between py-4"
                        style={{ borderBottom: i < arr.length - 1 ? '1px solid #f2f2f7' : 'none' }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-2 h-2 rounded-full" style={{ background: item.positive ? (item.color === '#1c1c1e' ? '#8e8e93' : item.color) : '#ff3b30' }} />
                          <span className="font-medium" style={{ color: '#3c3c43' }}>{item.label}</span>
                        </div>
                        <span className="font-bold text-lg" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mx-6 mb-4 p-4 rounded-2xl flex items-center justify-between" style={{ background: 'rgba(0,122,255,0.06)' }}>
                    <span className="font-bold" style={{ color: '#1c1c1e' }}>差引支給額</span>
                    <span className="text-2xl font-bold" style={{ color: '#007aff' }}>¥{net.toLocaleString()}</span>
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
