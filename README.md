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
