# MILK BOTTLE

A simple milk bottle & energy tracker with two tabs: MILK and EMOTION.

## Features

### MILK
- Charge milk manually (+MILK)
- Auto recovery (+0.1 every 2.4 hours, i.e. +1 per 24 hours)
- Drink (💦) to empty the bottle and log the result
- Status display continues beyond 3/3 (e.g. 3.5/3, up to 10/3), capped as "10+/3" with an OVERFLOW indicator
- "Tracking started" shows the date of the oldest saved log
- Procedurally generated, randomized milk drip/texture effects on the bottle
- Activity logs
- Achievement counters
- Floating heart effects based on fill level
- Reaction characters: a random one of 20 personalities comments on the current milk level (empty/better/hot/full/overflow) via a face thumbnail + speech bubble. Re-rolled on page load, on switching to the MILK tab, on +MILK, and on 💦 — not on the per-second/auto-recovery tick. Register a face image per personality via "リアクションキャラ設定"; images are center-cropped, resized, and stored locally (IndexedDB), never uploaded to GitHub. Personalities without a registered image show the line with no face thumbnail.
- The personalities and their lines live in `reaction_lines.txt` (plain text, not JS) and are loaded at startup — edit that file and reload the page to change them, no script.js editing needed. See the format guide at the top of the file. If the file can't be fetched (e.g. opened directly via `file://`), built-in defaults in script.js are used instead.
- Since `reaction_lines.txt` is fetched by the app itself, it has to be committed and pushed to be served by GitHub Pages, which means anyone can view it at its public URL — keep only lines you're fine with the public seeing in that file. For your own personal/uncensored set, use the "セリフをPCから同期" (sync lines from PC) panel inside "リアクションキャラ設定": save a private URL (e.g. a secret Gist raw URL) pointing to a file in the same format, then tap "今すぐ同期". That URL and the fetched data are stored only in this device's localStorage, never committed to the repo, and take priority over `reaction_lines.txt` on every future load — the same private-sync pattern used for EMOTION images below.

### EMOTION
- ⚡ button to add energy, "-" to subtract
- A heart icon that pulses continuously; the pulse speed and icon size increase with accumulated energy ("Lv" status)
- Pulse speed persists across days and resets when 💦 is pressed on the MILK page
- Daily energy history shown as a line graph
- Floating heart effects based on energy level
- Random illustration shown in the energy icon, re-randomized each time you open the EMOTION tab
- Tap the energy icon to view it enlarged in a lightbox; tap the background, the close button, or press Escape to dismiss
- Add your own images via "画像を追加" — stored locally in the browser (IndexedDB), never uploaded to GitHub; falls back to the bundled `icon/` folder if none are registered
- Optional "PCから同期" panel: save a private URL (e.g. a secret Gist raw URL) pointing to a JSON array of data URLs, then tap "今すぐ同期" to pull that image set into the device's IndexedDB. The URL is stored only in that browser's localStorage and is never committed to the repo, so other visitors of the public site never see it or the images it points to.

## General
- Tab navigation (MILK / EMOTION) with a date header
- Local storage support
- Works on mobile browsers

## Status

Personal project.

---

# MILK BOTTLE

自身のミルクボトルとエナジーを管理するアプリです。MILKタブとEMOTIONタブがあります。

## 機能

### MILK
- 「+MILK」ボタンでミルク追加
- 2.4時間ごとに+0.1自動回復（24時間で+1相当）
- 「💦」ボタンでボトルを空にしてログに記録
- ステータス表示は3/3を超えても継続表示（例: 3.5/3）、最大10/3に達すると「10+/3」と表記しOVERFLOWを表示
- 「Tracking started」には保存されているログの中で一番古い日時を表示
- 瓶に付着する牛乳の滴・質感をランダムに自動生成
- プレイ履歴の記録
- 達成回数の集計
- ミルクの溜まり具合に応じたハートの浮遊エフェクト
- リアクションキャラ：20体の性格からランダムに1体が選ばれ、現在のミルク帯（empty/better/hot/full/overflow）に応じたセリフを顔アイコン＋吹き出しで表示。引き直しはページ読み込み時・MILKタブ表示時・+MILK時・💦時のみ（毎秒の自動回復処理では引き直さない）。「リアクションキャラ設定」から性格ごとに顔画像を登録可能（中央正方形クロップ＋縮小してIndexedDBに保存、GitHubには公開されない）。画像未登録の性格はセリフのみ表示（顔枠は非表示）
- 性格とセリフの実体は`script.js`ではなく`reaction_lines.txt`（プレーンテキスト）にあり、起動時に読み込まれる。このファイルを編集してページをリロードするだけで反映され、`script.js`を触る必要はない（書式はファイル先頭の説明を参照）。`file://`で直接開く等で読み込めない場合は`script.js`内蔵のデフォルト値で動作する
- `reaction_lines.txt`はアプリ自身がfetchで読み込む都合上、GitHub Pagesに公開するためリポジトリにpushする必要があり、URLを知っていれば誰でも内容を見られる。そのため公開して問題ない内容だけをこのファイルに置くこと。自分専用の検閲なしセットを使いたい場合は、「リアクションキャラ設定」内の「セリフをPCから同期（任意設定）」から、同じ書式のテキストを置いた秘密URL（例: 秘密GistのrawURL）を保存して「今すぐ同期」を押す。このURLと取得結果はこの端末のlocalStorageにのみ保存されリポジトリには含まれず、`reaction_lines.txt`より優先され次回以降も自動的に使われる（下記EMOTION画像の同期と同じ仕組み）

### EMOTION
- 「⚡」ボタンでエナジー追加、「-」で減少
- 中心のアイコンが常に鼓動しており、エナジーが溜まるほど鼓動が速く・アイコンが大きくなる（「Lv」表示）
- 鼓動の速さは日をまたいでも蓄積され、MILKページの「💦」を押すとリセットされる
- 1日ごとのエナジー量を線グラフで表示
- エナジー量に応じたハートの浮遊エフェクト
- アイコンにはランダムな画像を表示し、EMOTIONタブを開くたびに切り替わる
- アイコンをタップすると拡大表示（ライトボックス）。背景タップ・閉じるボタン・Escキーで閉じる
- 「画像を追加」から自分の好きな画像を登録可能。画像はブラウザ内（IndexedDB）に保存されGitHubには公開されない。未登録の場合は同梱の`icon/`フォルダの画像を表示
- 「PCから同期（任意設定）」：data URL（base64画像）の配列を返すJSONを置いた秘密のURL（例: secret Gistのraw URL）を保存しておくと、「今すぐ同期」一発でその画像セットを取り込める。URLはそのブラウザのlocalStorageにのみ保存され、リポジトリには含まれないため、公開サイトの他の利用者には見えない

## その他
- 日付ヘッダー付きのタブ切り替え（MILK / EMOTION）
- ブラウザ保存対応
- スマホ利用可能

## 備考

個人利用向けプロジェクト
