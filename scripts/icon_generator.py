import os
from PIL import Image

SOURCE_ICON = 'public/icon-square.png'

def main():
    print("Generating PWA icons from source logo...")
    os.makedirs('public/icons', exist_ok=True)

    src = Image.open(SOURCE_ICON).convert('RGBA')

    sizes = [192, 512]
    for size in sizes:
        img = src.resize((size, size), Image.LANCZOS)
        output_path = f'public/icons/icon-{size}.png'
        img.save(output_path, 'PNG')
        print(f"Generated {output_path} successfully ({size}x{size})")

if __name__ == '__main__':
    main()
