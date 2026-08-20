from pathlib import Path
from PIL import Image, ImageDraw

source = Path('/home/ubuntu/sticker-tycoon-replica/generated-stickers')
files = sorted(source.glob('*.png'))
thumb_size = 320
margin = 24
cols = 3
rows = (len(files) + cols - 1) // cols
sheet = Image.new('RGB', (cols * (thumb_size + margin) + margin, rows * (thumb_size + 70 + margin) + margin), '#07182d')
draw = ImageDraw.Draw(sheet)
for index, path in enumerate(files):
    image = Image.open(path).convert('RGBA')
    image.thumbnail((thumb_size, thumb_size))
    x = margin + (index % cols) * (thumb_size + margin)
    y = margin + (index // cols) * (thumb_size + 70 + margin)
    tile = Image.new('RGBA', (thumb_size, thumb_size), '#102b47')
    tile.alpha_composite(image, ((thumb_size - image.width) // 2, (thumb_size - image.height) // 2))
    sheet.paste(tile.convert('RGB'), (x, y))
    draw.text((x, y + thumb_size + 14), path.stem, fill='#dcecff')
sheet.save('/home/ubuntu/sticker-tycoon-replica/generated-stickers-contact-sheet.jpg', quality=92)
