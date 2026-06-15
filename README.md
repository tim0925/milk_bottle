# MILK BOTTLE

A simple milk bottle & energy tracker with two tabs: MILK and EMOTION.

## Features

### MILK
- Charge milk manually (+MILK)
- Auto recovery (+0.5 every 12 hours)
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
- Add your own images via "画像を追加" — stored locally in the browser (IndexedDB), never uploaded to GitHub; falls back to the bundled `icon/` folder if none are registered

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
- 12時間ごとに+0.5自動回復
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
- 「画像を追加」から自分の好きな画像を登録可能。画像はブラウザ内（IndexedDB）に保存されGitHubには公開されない。未登録の場合は同梱の`icon/`フォルダの画像を表示

## その他
- 日付ヘッダー付きのタブ切り替え（MILK / EMOTION）
- ブラウザ保存対応
- スマホ利用可能

## 備考

個人利用向けプロジェクト
