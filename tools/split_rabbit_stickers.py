from pathlib import Path
from PIL import Image

source = Path('/home/ubuntu/upload/1787063087666.jpg')
out_dir = Path('/home/ubuntu/webdev-static-assets/rabbit-example-stickers')
out_dir.mkdir(parents=True, exist_ok=True)
image = Image.open(source).convert('RGB')
# The supplied board contains a title band followed by three rows and three columns.
# Slight overlap keeps the white sticker border and avoids trimming ears or captions.
boxes = [
    (42, 190, 345, 530), (346, 190, 650, 530), (654, 190, 890, 530),
    (42, 515, 335, 855), (346, 515, 650, 855), (654, 515, 890, 855),
    (42, 850, 345, 1195), (346, 850, 650, 1195), (654, 850, 890, 1195),
]
for index, box in enumerate(boxes, start=1):
    crop = image.crop(box)
    crop.save(out_dir / f'rabbit-sticker-{index:02d}.jpg', quality=95, optimize=True)
print(f'created {len(boxes)} files in {out_dir}')
