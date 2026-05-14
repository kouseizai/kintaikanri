'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { DEMO_COMPANY_SETTINGS } from '@/lib/demo'
import Header from '@/components/Header'

interface CompanySettings {
  company_name: string
  standard_work_hours: number
  overtime_threshold_hours: number
  payroll_cutoff_day: number
  payroll_payday: number
  social_insurance_rate: number
  income_tax_rate: number
}

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

export default function AdminSettingsPage() {
  const [demoMode, setDemoMode] = useState(false)
  const [settings, setSettings] = useState<CompanySettings>(DEMO_COMPANY_SETTINGS)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)
  const supabase = createClient()

  const fetchSettings = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      setSettings(DEMO_COMPANY_SETTINGS)
      return
    }
    const { data } = await supabase.from('company_settings').select('*').eq('id', 1).single()
    if (data) setSettings(data as CompanySettings)
  }, [supabase])

  useEffect(() => { fetchSettings() }, [fetchSettings])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setMessage(null)
    if (demoMode) {
      // デモはローカル状態のみ
      setMessage({ text: '会社設定を保存しました', type: 'success' })
      setLoading(false); return
    }
    const { error } = await supabase.from('company_settings').update({
      ...settings, updated_at: new Date().toISOString(),
    }).eq('id', 1)
    if (error) setMessage({ text: 'エラーが発生しました', type: 'error' })
    else setMessage({ text: '会社設定を保存しました', type: 'success' })
    setLoading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="会社設定" subtitle="社名・所定労働時間・給与計算設定" />
      <div className="px-4 md:px-8 pb-10 space-y-6 max-w-3xl">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        <form onSubmit={save} className="space-y-6">

          {/* 基本情報 */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>基本情報</h2>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>会社名</label>
              <input type="text" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} required className="field-input" />
            </div>
          </div>

          {/* 労働時間 */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>労働時間</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>所定労働時間（1日）</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.5" min="1" max="24" value={settings.standard_work_hours}
                    onChange={(e) => setSettings({ ...settings, standard_work_hours: parseFloat(e.target.value) || 0 })} className="field-input" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>時間</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>残業判定の閾値</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.5" min="1" max="24" value={settings.overtime_threshold_hours}
                    onChange={(e) => setSettings({ ...settings, overtime_threshold_hours: parseFloat(e.target.value) || 0 })} className="field-input" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>時間</span>
                </div>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>1日の勤務時間がこの閾値を超えると残業として計算されます</p>
          </div>

          {/* 給与計算 */}
          <div className="card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>給与計算</h2>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>給与締日</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="31" value={settings.payroll_cutoff_day}
                    onChange={(e) => setSettings({ ...settings, payroll_cutoff_day: parseInt(e.target.value) || 0 })} className="field-input" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>日</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>給与支払日</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="1" max="31" value={settings.payroll_payday}
                    onChange={(e) => setSettings({ ...settings, payroll_payday: parseInt(e.target.value) || 0 })} className="field-input" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>日</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>社会保険料率</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.0001" min="0" max="1" value={settings.social_insurance_rate}
                    onChange={(e) => setSettings({ ...settings, social_insurance_rate: parseFloat(e.target.value) || 0 })} className="field-input" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>({(settings.social_insurance_rate * 100).toFixed(2)}%)</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>所得税率</label>
                <div className="flex items-center gap-2">
                  <input type="number" step="0.0001" min="0" max="1" value={settings.income_tax_rate}
                    onChange={(e) => setSettings({ ...settings, income_tax_rate: parseFloat(e.target.value) || 0 })} className="field-input" />
                  <span className="text-sm" style={{ color: 'var(--text-muted)' }}>({(settings.income_tax_rate * 100).toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full md:w-auto md:px-12 disabled:opacity-50">
            {loading ? '保存中...' : '設定を保存'}
          </button>
        </form>
      </div>
    </div>
  )
}
