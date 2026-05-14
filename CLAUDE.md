# 勤怠管理システム — 要件定義書

## システム概要

Next.js 14 App Router + TypeScript + Tailwind CSS + Supabase をベースにした
日本語勤怠管理Webアプリケーション。

---

## ユーザーロール

| ロール | 説明 |
|--------|------|
| `employee` | 一般従業員。自分の打刻・申請・明細のみ操作可能 |
| `owner` | 管理者（社長）。全従業員のデータ閲覧・承認・明細作成が可能 |

---

## 一般ユーザー機能（6機能）

### 1. 打刻（出勤・退勤記録）
- 出勤ボタンを押すと現在時刻が `clock_in` として記録される
- 退勤ボタンを押すと現在時刻が `clock_out` として記録される
- 1日1レコード。出勤後に退勤可能
- 当月・過去の打刻履歴を一覧表示する

### 2. 交通費設定
- 通勤ルート名と往復金額（円）を登録する
- 登録済みルートは一覧表示・削除できる
- 当月の打刻日数 × 登録金額 = 当月交通費合計として給料明細に反映される

### 3. シフト申請
- 希望日・開始時刻・終了時刻を入力して申請する
- 申請後のステータスは `pending`（申請中）
- 申請履歴を一覧表示する（ステータス付き）

### 4. シフトカレンダー
- 当月の確定済みシフト（`approved`）を月カレンダーで表示する
- カレンダー上にシフト時間帯を色付きで表示する
- 月の切り替えが可能

### 5. 有給申請
- 取得希望日と理由（任意）を入力して申請する
- 申請後のステータスは `pending`（申請中）
- 申請履歴と現在のステータスを表示する

### 6. 給料明細
- 当月の給与明細（基本給・交通費・控除額・差引支給額）を表示する
- 過去の明細も月別に選択して確認できる
- 支払いステータス（支払済 / 未払い）を表示する
- jsPDF を使ってPDFとして出力できる

---

## 管理者（owner）機能（3機能）

### 1. シフト管理（シフトの許可）
- 全従業員のシフト申請一覧を表示する
- 「承認」するとステータスが `approved` になり、従業員のカレンダーに「確定」として表示される
- 「却下」するとステータスが `rejected` になる
- 申請中のみ / 全件 で絞り込みできる

### 2. 有給申請管理（有給申請許可）
- 全従業員の有給申請一覧を表示する
- 「承認」「却下」でステータスを更新し、従業員側にもリアルタイムで反映される

### 3. 給料明細管理（支払い完了）
- 全従業員の給料明細を一覧表示する
- 新規明細を作成できる（従業員選択・年月・交通費・控除額を入力）
- 「支払完了」ボタンで `is_paid = true` に更新し、従業員側にも「支払済」として表示される

---

## 申請→承認フロー

```
一般: シフト申請    → 管理者: シフトの許可    → 一般カレンダーに「確定」表示
一般: 有給申請      → 管理者: 有給申請許可    → 一般側のステータスに反映
管理者: 明細作成    → 一般: 給料明細確認      → 管理者: 支払い完了 → 一般に「支払済」表示
```

---

## データベース設計

### テーブル一覧

| テーブル名 | 説明 |
|------------|------|
| `profiles` | ユーザープロフィール（auth.usersの拡張） |
| `attendance` | 打刻記録（日付・出退勤時刻） |
| `commute` | 交通費設定（ルート・往復金額） |
| `shifts` | シフト申請（日付・時間・ステータス） |
| `leaves` | 有給申請（日付・理由・ステータス） |
| `payslips` | 給料明細（基本給・交通費・控除・支払状態） |

### profiles
```sql
id uuid PRIMARY KEY REFERENCES auth.users
name text NOT NULL
role text NOT NULL CHECK (role IN ('employee', 'owner'))
base_salary integer DEFAULT 250000
created_at timestamptz DEFAULT now()
```

### attendance
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES profiles(id) NOT NULL
date date NOT NULL
clock_in timestamptz
clock_out timestamptz
created_at timestamptz DEFAULT now()
```

### commute
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES profiles(id) NOT NULL
route text NOT NULL
amount integer NOT NULL
created_at timestamptz DEFAULT now()
```

### shifts
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES profiles(id) NOT NULL
date date NOT NULL
start_time time NOT NULL
end_time time NOT NULL
status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
created_at timestamptz DEFAULT now()
```

### leaves
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES profiles(id) NOT NULL
date date NOT NULL
reason text
status text DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))
created_at timestamptz DEFAULT now()
```

### payslips
```sql
id uuid PRIMARY KEY DEFAULT gen_random_uuid()
user_id uuid REFERENCES profiles(id) NOT NULL
year integer NOT NULL
month integer NOT NULL
base_salary integer NOT NULL
commute_total integer DEFAULT 0
deduction integer DEFAULT 0
net_salary integer
is_paid boolean DEFAULT false
created_at timestamptz DEFAULT now()
```

---

## RLS（Row Level Security）方針

- 従業員は自分のレコードのみ CRUD 可能
- owner は全レコードを参照・更新可能
- profiles テーブルは自分のみ参照（owner は全員参照可）

---

## テクノロジースタック

| 項目 | 技術 |
|------|------|
| フレームワーク | Next.js 14 App Router |
| 言語 | TypeScript（.tsx） |
| スタイリング | Tailwind CSS |
| バックエンド | Supabase（認証 + PostgreSQL） |
| SSR対応 | @supabase/ssr |
| PDF出力 | jsPDF |

---

## UIデザイン方針（SwiftUI風）

- **背景色**: `#f2f2f7`（iOSシステムグレー）
- **サイドバー**: ダーク系グラデーション（indigo-navy）
- **カード**: 白背景、角丸2xl、ソフトシャドウ
- **アクセントカラー**: iOS Blue `#007aff`
- **成功色**: iOS Green `#34c759`
- **警告色**: iOS Orange `#ff9500`
- **危険色**: iOS Red `#ff3b30`
- **タイポグラフィ**: 太字・大きめの見出し
- **ボタン**: 大きめ・角丸・グラデーション
- **入力フォーム**: 角丸・ライトグレー背景

---

## ディレクトリ構成

```
src/
  app/
    layout.tsx              # ルートレイアウト
    page.tsx                # /dashboard へリダイレクト
    login/page.tsx          # ログインページ
    dashboard/
      layout.tsx            # サイドバー付きレイアウト
      page.tsx              # ダッシュボード（今日の状況）
      attendance/page.tsx   # 打刻
      commute/page.tsx      # 交通費設定
      shifts/page.tsx       # シフト申請・カレンダー
      leaves/page.tsx       # 有給申請
      payslip/page.tsx      # 給料明細
      admin/
        shifts/page.tsx     # 管理者: シフト許可
        leaves/page.tsx     # 管理者: 有給許可
        payslips/page.tsx   # 管理者: 給料明細管理
  lib/
    supabase/
      client.ts             # ブラウザ用Supabaseクライアント
      server.ts             # サーバー用Supabaseクライアント
  middleware.ts             # 認証ガード
  components/
    Sidebar.tsx             # ナビゲーションサイドバー
    Header.tsx              # ページヘッダー
```
