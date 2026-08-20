import json
from pathlib import Path
import requests

manifest_path = Path('/home/ubuntu/sticker-tycoon-replica/generated-10-stickers.json')
out_dir = Path('/home/ubuntu/sticker-tycoon-replica/generated-stickers')
out_dir.mkdir(exist_ok=True)
data = json.loads(manifest_path.read_text())
base = 'http://localhost:3000'
for item in data['results']:
    if not item.get('url'):
        continue
    response = requests.get(base + item['url'], allow_redirects=True, timeout=60)
    response.raise_for_status()
    target = out_dir / f"{item['position']:02d}-{item['phrase']}.png"
    target.write_bytes(response.content)
    print(target, len(response.content))
