from pathlib import Path
from PIL import Image
import pillow_heif

pillow_heif.register_heif_opener()
source = Path('/home/ubuntu/upload')
target = Path('/tmp/sticker-heic-verification')
target.mkdir(exist_ok=True)

for heic in sorted(source.glob('100002786[5-9].heic')):
    image = Image.open(heic).convert('RGB')
    output = target / f'{heic.stem}.jpg'
    image.save(output, 'JPEG', quality=92, optimize=True)
    print(output)
