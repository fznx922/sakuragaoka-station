# Your own station sounds for 大阪駅

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
