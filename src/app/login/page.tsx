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
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('メールアドレスまたはパスワードが正しくありません')
      setLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, role },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    })
    if (error) {
      setError(error.message === 'User already registered' ? 'このメールアドレスは既に登録されています' : 'アカウント作成に失敗しました')
      setLoading(false)
    } else {
      setSuccess('確認メールを送信しました。メール内のリンクをクリックしてログインしてください。（確認メールが不要な場合はそのままログインできます）')
      setLoading(false)
      setMode('login')
    }
  }

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    padding: '10px 14px',
    fontSize: '16px',
    color: '#f9fafb',
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#0f0f0f' }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: '#141414' }}>
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#ffffff' }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="#111827">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-sm tracking-wide">勤怠管理システム</span>
        </div>

        <div>
          <p className="text-3xl font-bold leading-tight mb-4" style={{ color: '#f9fafb' }}>
            シフト、打刻、給与を<br />ひとつの場所で管理する。
          </p>
          <p className="text-sm leading-relaxed" style={{ color: '#6b7280' }}>
            承認フロー、給与明細発行、有給申請まで<br />チームの勤怠業務をシンプルに。
          </p>
        </div>

        <div className="flex items-center gap-3">
          {['打刻管理', 'シフト承認', '給与明細', '有給申請'].map((label) => (
            <span key={label} className="text-xs px-3 py-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)' }}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: '#ffffff' }}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="#111827">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="text-white font-semibold text-sm">勤怠管理システム</span>
          </div>

          {/* Demo buttons */}
          <div className="mb-8 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-xs font-medium mb-3" style={{ color: '#6b7280' }}>ワンクリックでログイン</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/api/demo-login?role=employee"
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#f9fafb' }}>従業員</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>田中 太郎</p>
                </div>
              </a>
              <a
                href="/api/demo-login?role=owner"
                className="flex items-center gap-3 p-3 rounded-lg transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold" style={{ color: '#f9fafb' }}>管理者</p>
                  <p className="text-xs" style={{ color: '#6b7280' }}>山田 社長</p>
                </div>
              </a>
            </div>
          </div>

          {/* Tab toggle */}
          <div className="flex mb-6 p-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }}>
            <button
              onClick={() => { setMode('login'); setError(''); setSuccess('') }}
              className="flex-1 text-xs font-medium py-2 rounded-md transition-all"
              style={{
                background: mode === 'login' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: mode === 'login' ? '#f9fafb' : '#6b7280',
              }}
            >
              ログイン
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
              className="flex-1 text-xs font-medium py-2 rounded-md transition-all"
              style={{
                background: mode === 'signup' ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: mode === 'signup' ? '#f9fafb' : '#6b7280',
              }}
            >
              アカウント作成
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg flex items-center gap-2" style={{ background: 'rgba(153,27,27,0.15)', border: '1px solid rgba(153,27,27,0.3)' }}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="#fca5a5" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs" style={{ color: '#fca5a5' }}>{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg flex items-start gap-2" style={{ background: 'rgba(6,78,59,0.2)', border: '1px solid rgba(6,78,59,0.4)' }}>
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="#6ee7b7" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs leading-relaxed" style={{ color: '#6ee7b7' }}>{success}</p>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="example@company.com" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>パスワード</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-1" style={{ background: '#ffffff', color: '#111827', borderRadius: '8px', padding: '11px' }}>
                {loading ? '確認中...' : 'ログイン'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>お名前</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="田中 太郎" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>メールアドレス</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="example@company.com" style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>パスワード</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="8文字以上" minLength={8} style={inputStyle}
                  onFocus={e => { e.target.style.borderColor = 'rgba(255,255,255,0.3)' }}
                  onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.1)' }}
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: '#9ca3af' }}>役割</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRole('employee')}
                    className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                    style={{
                      background: role === 'employee' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${role === 'employee' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: role === 'employee' ? '#f9fafb' : '#6b7280',
                    }}>
                    従業員
                  </button>
                  <button type="button" onClick={() => setRole('owner')}
                    className="flex-1 py-2 text-xs font-medium rounded-lg transition-all"
                    style={{
                      background: role === 'owner' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${role === 'owner' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                      color: role === 'owner' ? '#f9fafb' : '#6b7280',
                    }}>
                    管理者
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="btn-primary w-full mt-1" style={{ background: '#ffffff', color: '#111827', borderRadius: '8px', padding: '11px' }}>
                {loading ? '作成中...' : 'アカウントを作成'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
