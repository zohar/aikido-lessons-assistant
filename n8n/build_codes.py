"""Builds the n8n Code node sources from src/common.js + one tail per node."""
from pathlib import Path
here = Path(__file__).parent
common = (here / 'src' / 'common.js').read_text()
for tail in sorted((here / 'src').glob('*.tail.js')):
    name = tail.name.replace('.tail.js', '.js')
    (here / name).write_text(common + '\n' + tail.read_text())
    print('built', name)
