from pathlib import Path
from PIL import Image, ImageDraw

source_dir = Path('/home/ubuntu/webdev-static-assets/rabbit-example-stickers')
files = sorted(source_dir.glob('rabbit-sticker-*.jpg'))
thumb_w, thumb_h = 260, 260
canvas = Image.new('RGB', (thumb_w * 3, (thumb_h + 28) * 3), '#f5efe7')
draw = ImageDraw.Draw(canvas)
for i, path in enumerate(files):
    image = Image.open(path).convert('RGB')
    image.thumbnail((thumb_w - 12, thumb_h - 12))
    x = (i % 3) * thumb_w + (thumb_w - image.width) // 2
    y = (i // 3) * (thumb_h + 28) + (thumb_h - image.height) // 2
    canvas.paste(image, (x, y))
    draw.text(((i % 3) * thumb_w + 10, (i // 3) * (thumb_h + 28) + thumb_h + 5), f'#{i + 1:02d}', fill='#4a3325')
canvas.save('/home/ubuntu/webdev-static-assets/rabbit-example-stickers-contact-sheet.jpg', quality=95)
