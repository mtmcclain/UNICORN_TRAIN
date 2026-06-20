# Unicorn Train

A chill 2D side-scrolling browser game. Drive the Unicorn Train through the countryside with a brown-haired girl and boy at the controls.

## Play Online

**https://mtmcclain.github.io/UNICORN_TRAIN/**

## Local Development

ES modules require a local server. **Do not** open `index.html` as a file.

### Easy start (Windows)

Double-click **`serve.bat`** in this folder, then open:

**http://127.0.0.1:8765**

Ignore the `http://[::]:8765/` line Python prints — that address usually does not work in browsers.

### Manual start

```powershell
cd "C:\Users\Mtmcc\.cursor\projects\UNICORN-TRAIN 8-Bit Scroller game"
python -m http.server 8765 --bind 127.0.0.1 --directory .
```

Then visit **http://127.0.0.1:8765**

### Controls

| Action | Keys |
|--------|------|
| Speed up | `Up Arrow` / `W` |
| Slow down | `Down Arrow` / `S` |
| Honk horn | `H` / `Space` |
| Shoot magic | `X` / mouse click |

There are no obstacles or game over — just enjoy the ride.

## Tech

- HTML5 Canvas
- Vanilla JavaScript (ES modules)
- Procedural countryside parallax and 8-bit sound effects
