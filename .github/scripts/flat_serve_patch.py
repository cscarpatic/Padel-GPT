from pathlib import Path

p = Path('src/main.js')
text = p.read_text()
old = """    const targetX = serviceTargetSign * (s.server === 'ai' ? 1.55 : 1.85);\n    const targetZ = s.server === 'player' ? -4.4 : 4.4;\n"""
new = """    const targetX = serviceTargetSign * (s.server === 'ai' ? 1.45 : 1.85);\n    const targetZ = s.server === 'player' ? -4.4 : 6.2;\n"""
if old not in text:
    raise SystemExit('serve target block not found')
text = text.replace(old, new, 1)
old2 = """    horizontalSpeed: cpuServe ? 18.0 : 13.8,\n    liftHint: cpuServe ? 2.35 : 4.1,\n    netHeight: COURT.netH,\n    ballRadius: ball.radius,\n    clearanceMargin: cpuServe ? 0.025 : 0.1\n"""
new2 = """    horizontalSpeed: cpuServe ? 30.0 : 13.8,\n    liftHint: cpuServe ? 1.5 : 4.1,\n    netHeight: COURT.netH,\n    ballRadius: ball.radius,\n    clearanceMargin: cpuServe ? 0.0 : 0.1\n"""
if old2 not in text:
    raise SystemExit('serve velocity block not found')
text = text.replace(old2, new2, 1)
p.write_text(text)
