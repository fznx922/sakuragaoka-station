# Your own station sounds for 大阪駅 and the 山手線

The game synthesizes every sound, but you can swap in recordings of the real thing: station melodies, gate beeps and
chimes. Only use recordings you're allowed to use.

1. Put the audio files (`.mp3`, `.ogg`, `.m4a` or `.wav`) in this folder.
2. Map sound names to file names in `manifest.json`:

   ```json
   {
     "approachD": "osaka-2-approach.mp3",
     "depart2": "osaka-2-depart.mp3",
     "departBell": "shinkansen-bell.mp3",
     "icTouch": "ic-gate.wav"
   }
   ```

3. Reload the page. A file replaces the synthesized sound as soon as it has loaded; if a file is missing, the
   synthesized sound plays instead.

## Sound names

| Where | Approach melody (接近) | Departure melody (発車) |
|---|---|---|
| Track 1 (桜川線) | `approachA` | `departMelody` (also used at Sakuragaoka) |
| Track 2 (JR京都線 新快速) | `approachD` | `departA` |
| Track 3 (JR神戸線 新快速) | `approachB` | `departB` |
| Track 4 (JR京都線 普通) | `approachE` | `departD` |
| Track 5 (大阪環状線) | `approachF` | `departF` |
| Track 6 (JRゆめ咲線) | `approachC` | `departE` |

| Sound | Name |
|---|---|
| Shinkansen arrival / passing chime | `shinChime` |
| Shinkansen departure jingle | `shinDepart` |
| Shinkansen departure bell (発車ベル) | `departBell` |
| Shinkansen door chime | `shinDoor` |
| Commuter train door chime | `doorChime` |
| IC gate: one beep (ピッ) | `icPass` |
| IC gate: two beeps (ピピッ) | `icTouch` |
| IC gate: three beeps (ピピピッ) | `icLow` |
| IC gate error | `icError` |
| PA chime before announcements | `announce` (the announcement text is still spoken) |
| Guide chime (concourse, ピンポーン) | `guideChime` |

### 山手線 (Tokyo)

Each station has its own departure melody, `jy01` to `jy30`. They're all original jingles except `jy22` (駒込),
which is the traditional さくらさくら. For example, `"jy11": "ebisu.mp3"` plays your recording at 恵比寿.

| Name | Station | Name | Station | Name | Station |
|---|---|---|---|---|---|
| `jy01` | 東京 (Tōkyō) | `jy11` | 恵比寿 (Ebisu) | `jy21` | 巣鴨 (Sugamo) |
| `jy02` | 有楽町 (Yūrakuchō) | `jy12` | 渋谷 (Shibuya) | `jy22` | 駒込 (Komagome) |
| `jy03` | 新橋 (Shimbashi) | `jy13` | 原宿 (Harajuku) | `jy23` | 田端 (Tabata) |
| `jy04` | 浜松町 (Hamamatsuchō) | `jy14` | 代々木 (Yoyogi) | `jy24` | 西日暮里 (Nishi-Nippori) |
| `jy05` | 田町 (Tamachi) | `jy15` | 新宿 (Shinjuku) | `jy25` | 日暮里 (Nippori) |
| `jy06` | 高輪ゲートウェイ (Takanawa Gateway) | `jy16` | 新大久保 (Shin-Ōkubo) | `jy26` | 鶯谷 (Uguisudani) |
| `jy07` | 品川 (Shinagawa) | `jy17` | 高田馬場 (Takadanobaba) | `jy27` | 上野 (Ueno) |
| `jy08` | 大崎 (Ōsaki) | `jy18` | 目白 (Mejiro) | `jy28` | 御徒町 (Okachimachi) |
| `jy09` | 五反田 (Gotanda) | `jy19` | 池袋 (Ikebukuro) | `jy29` | 秋葉原 (Akihabara) |
| `jy10` | 目黒 (Meguro) | `jy20` | 大塚 (Ōtsuka) | `jy30` | 神田 (Kanda) |

| Sound | Name |
|---|---|
| JR East door chime | `eastDoor` |

Custom recordings only load when the game is served (`node tools/serve.mjs`). The single-file
`play/Sakuragaoka.html`, opened by double-clicking, always uses the synthesized sounds.
