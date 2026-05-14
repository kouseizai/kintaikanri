'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState<'employee' | 'owner'>('employee')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError('メールアドレスまたはパスワードが正しくありません'); setLoading(false) }
    else { router.push('/dashboard'); router.refresh() }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setSuccess('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { name, role }, emailRedirectTo: `${window.location.origin}/dashboard` },
    })
    if (error) { setError(error.message === 'User already registered' ? 'このメールアドレスは既に登録されています' : 'アカウント作成に失敗しました'); setLoading(false) }
    else { setSuccess('確認メールを送信しました。リンクをクリックしてログインしてください'); setLoading(false); setMode('login') }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0a0a0a' }}>
      {/* ===== Left Hero ===== */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        {/* Background gradients */}
        <div className="absolute inset-0" style={{
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 60%, #16213e 100%)'
        }} />
        <div className="absolute inset-0" style={{
          background: 'radial-gradient(circle at 25% 20%, rgba(99,102,241,0.18), transparent 50%), radial-gradient(circle at 75% 80%, rgba(236,72,153,0.10), transparent 50%)'
        }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.04]" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }} />

        <div className="relative z-10 flex flex-col justify-between p-14 w-full text-white">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
              background: 'linear-gradient(135deg, #fff 0%, #e5e7eb 100%)',
              boxShadow: '0 8px 24px rgba(255,255,255,0.12)',
            }}>
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-xl font-display font-bold tracking-tight">TIMECARD</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>勤怠管理システム</p>
            </div>
          </div>

          {/* Hero copy */}
          <div className="space-y-8 max-w-lg">
            <div>
              <span className="inline-block px-3 py-1 text-[11px] font-semibold tracking-widest uppercase rounded-full mb-6"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.7)' }}>
                Enterprise Ready
              </span>
              <h1 className="text-5xl font-display font-bold leading-[1.05] tracking-tight">
                すべての勤怠業務を、<br />
                <span style={{
                  background: 'linear-gradient(135deg, #fff 0%, #a5b4fc 100%)',
                  WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                  美しく、シンプルに。
                </span>
              </h1>
              <p className="text-base leading-relaxed mt-6" style={{ color: 'rgba(255,255,255,0.65)' }}>
                打刻、シフト、有給、給与明細まで<br />
                チームのワークフローをひとつの画面に。
              </p>
            </div>

            {/* Feature highlights */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '打刻管理', desc: '休憩・残業も自動集計' },
                { label: 'シフト承認', desc: 'カレンダーで一目瞭然' },
                { label: '給与明細', desc: 'PDFで即時発行' },
                { label: '有給管理', desc: '残数を可視化' },
              ].map((f) => (
                <div key={f.label} className="p-3.5 rounded-xl" style={{
                  background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', backdropFilter: 'blur(10px)',
                }}>
                  <p className="text-sm font-semibold mb-0.5">{f.label}</p>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © 2026 TIMECARD. Enterprise grade attendance management.
          </p>
        </div>
      </div>

      {/* ===== Right Form ===== */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12" style={{ background: '#0a0a0a' }}>
        <div className="w-full max-w-md animate-in">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-10">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: '#ffffff' }}>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#0a0a0a">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-display font-bold text-lg tracking-tight">TIMECARD</p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>勤怠管理システム</p>
            </div>
          </div>

          <div className="mb-7">
            <h2 className="text-2xl font-display font-bold text-white mb-1.5">
              {mode === 'login' ? 'ようこそ' : 'はじめましょう'}
            </h2>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {mode === 'login' ? 'アカウントにログインして開始' : '新規アカウントを作成'}
            </p>
          </div>

          {/* Demo card */}
          <div className="mb-6 p-4 rounded-2xl" style={{
            background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
              <p className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: 'rgba(255,255,255,0.7)' }}>
                体験モード
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <a href="/api/demo-login?role=employee"
                className="group flex flex-col gap-1.5 p-3 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)',
                  }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <svg className="w-3.5 h-3.5 opacity-30 group-hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">従業員として</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>田中 太郎</p>
                </div>
              </a>
              <a href="/api/demo-login?role=owner"
                className="group flex flex-col gap-1.5 p-3 rounded-xl transition-all hover:scale-[1.02]"
                style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div className="flex items-center justify-between">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #ef4444 100%)',
                  }}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2.2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                  </div>
                  <svg className="w-3.5 h-3.5 opacity-30 group-hover:opacity-80 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">管理者として</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.5)' }}>山田 社長</p>
                </div>
              </a>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
            <span className="text-[10px] font-medium tracking-widest uppercase" style={{ color: 'rgba(255,255,255,0.4)' }}>または</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>

          {/* Tab toggle */}
          <div className="flex mb-5 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
              style={{
                background: mode === 'login' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: mode === 'login' ? '#f9fafb' : 'rgba(255,255,255,0.5)',
                boxShadow: mode === 'login' ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
              }}>
              ログイン
            </button>
            <button onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              className="flex-1 text-xs font-semibold py-2 rounded-lg transition-all"
              style={{
                background: mode === 'signup' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: mode === 'signup' ? '#f9fafb' : 'rgba(255,255,255,0.5)',
              }}>
              アカウント作成
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)' }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#fca5a5" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: '#fecaca' }}>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl flex items-start gap-2" style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)' }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#6ee7b7" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: '#a7f3d0' }}>{success}</p>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <DarkInput label="メールアドレス" type="email" value={email} onChange={setEmail} required placeholder="you@company.com" />
              <DarkInput label="パスワード" type="password" value={password} onChange={setPassword} required placeholder="••••••••" />
              <button type="submit" disabled={loading} className="w-full py-3 mt-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
                  color: '#0a0a0a',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset, 0 8px 24px rgba(255,255,255,0.08)',
                }}>
                {loading ? '確認中...' : 'ログイン'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <DarkInput label="お名前" type="text" value={name} onChange={setName} required placeholder="田中 太郎" />
              <DarkInput label="メールアドレス" type="email" value={email} onChange={setEmail} required placeholder="you@company.com" />
              <DarkInput label="パスワード（8文字以上）" type="password" value={password} onChange={setPassword} required minLength={8} placeholder="••••••••" />
              <div>
                <label className="block text-[11px] font-medium mb-1.5 tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>役割</label>
                <div className="flex gap-2">
                  {(['employee', 'owner'] as const).map(r => (
                    <button key={r} type="button" onClick={() => setRole(r)}
                      className="flex-1 py-2.5 text-xs font-semibold rounded-xl transition-all"
                      style={{
                        background: role === r ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${role === r ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.08)'}`,
                        color: role === r ? '#f9fafb' : 'rgba(255,255,255,0.55)',
                      }}>
                      {r === 'employee' ? '従業員' : '管理者'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 mt-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%)',
                  color: '#0a0a0a',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.5) inset',
                }}>
                {loading ? '作成中...' : 'アカウントを作成'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

function DarkInput({ label, type, value, onChange, required, placeholder, minLength }: {
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  required?: boolean
  placeholder?: string
  minLength?: number
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium mb-1.5 tracking-wide" style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        minLength={minLength}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm transition-all outline-none"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          color: '#f9fafb',
          fontSize: '16px',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(255,255,255,0.25)'
          e.target.style.background = 'rgba(255,255,255,0.06)'
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(255,255,255,0.08)'
          e.target.style.background = 'rgba(255,255,255,0.04)'
        }}
      />
    </div>
  )
}
