from pathlib import Path
from pillow_heif import register_heif_opener
from PIL import Image

register_heif_opener()
source = Path('/home/ubuntu/upload')
target = Path('/home/ubuntu/webdev-static-assets/sticker-inputs')
target.mkdir(parents=True, exist_ok=True)
for path in sorted(source.glob('*.heic')):
    with Image.open(path) as image:
        rgb = image.convert('RGB')
        output = target / f'{path.stem}.jpg'
        rgb.save(output, quality=94, optimize=True)
        print(f'{path.name} -> {output.name} {rgb.size}')
