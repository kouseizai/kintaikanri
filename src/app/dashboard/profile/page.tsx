'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { DEMO_PROFILES } from '@/lib/demo'
import Header from '@/components/Header'

function isDemoMode() {
  if (typeof document === 'undefined') return false
  return document.cookie.includes('demo_role=')
}

function getDemoRole(): 'employee' | 'owner' | null {
  if (typeof document === 'undefined') return null
  const m = document.cookie.match(/demo_role=(employee|owner)/)
  return m ? (m[1] as 'employee' | 'owner') : null
}

export default function ProfilePage() {
  const router = useRouter()
  const [demoMode, setDemoMode] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'employee' | 'owner'>('employee')
  const [baseSalary, setBaseSalary] = useState(0)
  const [annualDays, setAnnualDays] = useState(0)

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const supabase = createClient()

  const fetchProfile = useCallback(async () => {
    if (isDemoMode()) {
      setDemoMode(true)
      const r = getDemoRole() ?? 'employee'
      const p = DEMO_PROFILES[r]
      setName(p.name); setRole(r); setBaseSalary(p.base_salary); setAnnualDays(p.annual_leave_days)
      setEmail(r === 'owner' ? 'owner@demo.local' : 'employee@demo.local')
      return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    setEmail(user.email ?? '')
    const { data } = await supabase.from('profiles').select('name, role, base_salary, annual_leave_days').eq('id', user.id).single()
    if (data) {
      setName(data.name); setRole(data.role); setBaseSalary(data.base_salary); setAnnualDays(data.annual_leave_days ?? 20)
    }
  }, [supabase])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function saveName() {
    if (!name.trim()) { setMessage({ text: '名前を入力してください', type: 'error' }); return }
    setLoading(true); setMessage(null)
    if (demoMode) {
      setMessage({ text: 'デモモードでは保存されません（本番では更新されます）', type: 'error' })
      setLoading(false); return
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }
    const { error } = await supabase.from('profiles').update({ name: name.trim() }).eq('id', user.id)
    if (error) setMessage({ text: 'エラーが発生しました', type: 'error' })
    else { setMessage({ text: '名前を更新しました', type: 'success' }); router.refresh() }
    setLoading(false)
  }

  async function changePassword() {
    if (newPassword.length < 8) { setMessage({ text: 'パスワードは8文字以上にしてください', type: 'error' }); return }
    if (newPassword !== confirmPassword) { setMessage({ text: 'パスワードが一致しません', type: 'error' }); return }
    setLoading(true); setMessage(null)
    if (demoMode) {
      setMessage({ text: 'デモモードではパスワード変更できません', type: 'error' })
      setLoading(false); return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) setMessage({ text: error.message, type: 'error' })
    else { setMessage({ text: 'パスワードを変更しました', type: 'success' }); setNewPassword(''); setConfirmPassword('') }
    setLoading(false)
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: 'var(--bg)' }}>
      <Header title="プロフィール" subtitle="アカウント情報の確認と設定" />
      <div className="px-4 md:px-8 pb-10 space-y-6 max-w-2xl">

        {message && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium"
            style={{ background: message.type === 'success' ? 'var(--green-bg)' : 'var(--red-bg)', color: message.type === 'success' ? 'var(--green-text)' : 'var(--red-text)', border: `1px solid ${message.type === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
            <span>{message.type === 'success' ? '✓' : '!'}</span>
            {message.text}
          </div>
        )}

        {/* アカウント情報 */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>アカウント情報</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>名前</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="field-input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>メールアドレス</label>
                <input type="email" value={email} readOnly className="field-input" style={{ background: 'var(--border-light)', cursor: 'not-allowed' }} />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>ロール</label>
                <input type="text" value={role === 'owner' ? '管理者' : '従業員'} readOnly className="field-input" style={{ background: 'var(--border-light)', cursor: 'not-allowed' }} />
              </div>
            </div>
            <button onClick={saveName} disabled={loading} className="btn-primary">名前を保存</button>
          </div>
        </div>

        {/* 雇用情報 */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>雇用情報</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>変更は管理者にお問い合わせください</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>基本給</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>¥{baseSalary.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: 'var(--text-muted)' }}>有給付与日数</p>
              <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{annualDays} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>日 / 年</span></p>
            </div>
          </div>
        </div>

        {/* パスワード変更 */}
        {!demoMode && (
          <div className="card p-6">
            <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>パスワード変更</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>新しいパスワード（8文字以上）</label>
                <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="field-input" autoComplete="new-password" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>確認のためもう一度</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="field-input" autoComplete="new-password" />
              </div>
              <button onClick={changePassword} disabled={loading || !newPassword} className="btn-primary">パスワードを変更</button>
            </div>
          </div>
        )}

        {/* ログアウト */}
        <div className="card p-6">
          <h2 className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>ログアウト</h2>
          <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>アカウントからサインアウトします</p>
          <button onClick={async () => {
            if (demoMode) { window.location.href = '/api/demo-logout'; return }
            await supabase.auth.signOut()
            router.push('/login')
            router.refresh()
          }} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--red-bg)', color: 'var(--red-text)' }}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  )
}
