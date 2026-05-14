'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Header from '@/components/Header'

interface PayslipWithUser {
  id: string
  year: number
  month: number
  base_salary: number
  commute_total: number
  deduction: number
  net_salary: number | null
  is_paid: boolean
  profiles: { name: string } | null
}

interface Profile {
  id: string
  name: string
  base_salary: number
}

export default function AdminPayslipsPage() {
  const [payslips, setPayslips] = useState<PayslipWithUser[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [formUserId, setFormUserId] = useState('')
  const [formYear, setFormYear] = useState(new Date().getFullYear())
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1)
  const [formCommute, setFormCommute] = useState(0)
  const [formDeduction, setFormDeduction] = useState(0)
  const [createLoading, setCreateLoading] = useState(false)
  const supabase = createClient()

  const fetchData = useCallback(async () => {
    const [{ data: psData }, { data: profData }] = await Promise.all([
      supabase.from('payslips').select('*, profiles(name)').order('year', { ascending: false }).order('month', { ascending: false }),
      supabase.from('profiles').select('id, name, base_salary').eq('role', 'employee'),
    ])
    setPayslips((psData ?? []) as PayslipWithUser[])
    setProfiles(profData ?? [])
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  async function markPaid(id: string) {
    setLoading(id)
    await supabase.from('payslips').update({ is_paid: true }).eq('id', id)
    await fetchData()
    setLoading(null)
  }

  async function createPayslip(e: React.FormEvent) {
    e.preventDefault()
    setCreateLoading(true)
    const profile = profiles.find((p) => p.id === formUserId)
    if (!profile) return
    const net = profile.base_salary + formCommute - formDeduction
    await supabase.from('payslips').insert({
      user_id: formUserId,
      year: formYear,
      month: formMonth,
      base_salary: profile.base_salary,
      commute_total: formCommute,
      deduction: formDeduction,
      net_salary: net,
    })
    setShowCreate(false)
    setFormUserId(''); setFormCommute(0); setFormDeduction(0)
    await fetchData()
    setCreateLoading(false)
  }

  const unpaidCount = payslips.filter(p => !p.is_paid).length
  const selectedProfile = profiles.find(p => p.id === formUserId)
  const previewNet = selectedProfile ? selectedProfile.base_salary + formCommute - formDeduction : 0

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: '#f2f2f7' }}>
      <Header
        title="給料明細管理"
        subtitle="明細の作成と支払い管理"
        action={
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-4 py-2.5 rounded-2xl font-bold text-sm text-white shadow-sm"
            style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
          >
            + 明細を作成
          </button>
        }
      />

      <div className="px-8 pb-10 space-y-6">

        {/* Stats */}
        <div className="rounded-3xl p-6 shadow-sm" style={{ background: 'linear-gradient(135deg, #ff9500, #ff6b00)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium mb-1" style={{ color: 'rgba(255,255,255,0.7)' }}>未払い明細</p>
              <p className="text-5xl font-bold text-white">{unpaidCount}</p>
              <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.6)' }}>件の支払いが残っています</p>
            </div>
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Create form */}
        {showCreate && (
          <div className="bg-white rounded-3xl shadow-sm p-6">
            <h3 className="text-lg font-bold mb-4" style={{ color: '#1c1c1e' }}>新規給料明細作成</h3>
            <form onSubmit={createPayslip} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>従業員</label>
                <select value={formUserId} onChange={(e) => setFormUserId(e.target.value)} required className="ios-input">
                  <option value="">選択してください</option>
                  {profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}（基本給 ¥{p.base_salary.toLocaleString()}）</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>年</label>
                  <input type="number" value={formYear} onChange={(e) => setFormYear(parseInt(e.target.value))} className="ios-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>月</label>
                  <input type="number" min="1" max="12" value={formMonth} onChange={(e) => setFormMonth(parseInt(e.target.value))} className="ios-input" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>交通費（円）</label>
                  <input type="number" min="0" value={formCommute} onChange={(e) => setFormCommute(parseInt(e.target.value) || 0)} className="ios-input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2" style={{ color: '#3c3c43' }}>控除額（円）</label>
                  <input type="number" min="0" value={formDeduction} onChange={(e) => setFormDeduction(parseInt(e.target.value) || 0)} className="ios-input" />
                </div>
              </div>
              {selectedProfile && (
                <div className="rounded-2xl p-4" style={{ background: 'rgba(0,122,255,0.06)' }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: '#3c3c43' }}>差引支給額（見込み）</span>
                    <span className="text-xl font-bold" style={{ color: '#007aff' }}>¥{previewNet.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createLoading}
                  className="flex-1 py-3.5 rounded-2xl font-bold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #007aff, #5856d6)' }}
                >
                  {createLoading ? '作成中...' : '作成する'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-6 py-3.5 rounded-2xl font-bold"
                  style={{ background: 'rgba(118,118,128,0.12)', color: '#8e8e93' }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        )}

        {/* List */}
        <div className="space-y-3">
          {payslips.length === 0 ? (
            <div className="bg-white rounded-3xl py-16 text-center shadow-sm" style={{ color: '#8e8e93' }}>
              <p className="text-4xl mb-3">💴</p>
              <p className="font-medium">給料明細がありません</p>
            </div>
          ) : (
            payslips.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,149,0,0.1)' }}>
                    <span className="text-xl font-bold" style={{ color: '#ff9500' }}>
                      {p.profiles?.name?.slice(0, 1) ?? '?'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold" style={{ color: '#1c1c1e' }}>{p.profiles?.name ?? '不明'}</p>
                      <span className="text-sm" style={{ color: '#8e8e93' }}>— {p.year}年 {p.month}月</span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm" style={{ color: '#8e8e93' }}>基本給 ¥{p.base_salary.toLocaleString()}</span>
                      <span className="text-xs" style={{ color: '#c7c7cc' }}>+交通費 ¥{p.commute_total.toLocaleString()}</span>
                      <span className="text-xs" style={{ color: '#ff3b30' }}>-控除 ¥{p.deduction.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold" style={{ color: '#1c1c1e' }}>¥{(p.net_salary ?? 0).toLocaleString()}</p>
                    <span
                      className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mt-1"
                      style={{ background: p.is_paid ? 'rgba(52,199,89,0.12)' : 'rgba(255,149,0,0.12)', color: p.is_paid ? '#34c759' : '#ff9500' }}
                    >
                      {p.is_paid ? '支払済' : '未払い'}
                    </span>
                  </div>
                </div>
                {!p.is_paid && (
                  <div className="mt-4 pt-4" style={{ borderTop: '1px solid #f2f2f7' }}>
                    <button
                      onClick={() => markPaid(p.id)}
                      disabled={loading === p.id}
                      className="w-full py-2.5 rounded-xl font-bold text-sm text-white disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #34c759, #30d158)' }}
                    >
                      {loading === p.id ? '処理中...' : '支払い完了にする'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  )
}
