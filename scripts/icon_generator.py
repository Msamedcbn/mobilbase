import os
import math
from PIL import Image, ImageDraw

def create_gradient_background(size):
    # Create an image with a linear gradient from dark teal (#0f766e) to deep dark teal/black (#022d2a)
    base = Image.new('RGB', (size, size), '#022d2a')
    draw = ImageDraw.Draw(base)
    
    # Draw linear gradient
    for i in range(size * 2):
        # Calculate color transition
        ratio = i / (size * 2.0)
        r = int(15 * (1 - ratio) + 2 * ratio)
        g = int(118 * (1 - ratio) + 45 * ratio)
        b = int(110 * (1 - ratio) + 42 * ratio)
        
        # Draw line perpendicular to diagonal
        # diagonal from top-left to bottom-right
        draw.line([(i, 0), (0, i)], fill=(r, g, b))
        
    return base

def draw_logo_mark(image, size):
    draw = ImageDraw.Draw(image)
    
    # Let's draw a modern tech mark:
    # A stylized smartphone frame (rounded rect) containing a clean geometric 'M' inside.
    
    # 1. Draw Phone Frame Outline
    # Coordinates of phone
    w_factor = 0.35
    h_factor = 0.6
    phone_w = int(size * w_factor)
    phone_h = int(size * h_factor)
    
    x1 = (size - phone_w) // 2
    y1 = (size - phone_h) // 2
    x2 = x1 + phone_w
    y2 = y1 + phone_h
    
    # Draw phone outline with rounded corners
    border_w = max(4, int(size * 0.03))
    # Draw outer rounded rect
    draw.rounded_rectangle([x1, y1, x2, y2], radius=int(size * 0.05), fill=None, outline='#38bdf8', width=border_w)
    
    # Draw speaker grill at top
    speaker_w = int(phone_w * 0.3)
    speaker_h = max(2, int(phone_h * 0.015))
    sx1 = x1 + (phone_w - speaker_w) // 2
    sy1 = y1 + int(phone_h * 0.06)
    sx2 = sx1 + speaker_w
    sy2 = sy1 + speaker_h
    draw.rounded_rectangle([sx1, sy1, sx2, sy2], radius=1, fill='#38bdf8')
    
    # Draw home button line or notch indicator at bottom
    bx1 = x1 + (phone_w - int(phone_w * 0.35)) // 2
    by1 = y2 - int(phone_h * 0.06)
    bx2 = bx1 + int(phone_w * 0.35)
    by2 = by1 + max(2, int(phone_h * 0.012))
    draw.rounded_rectangle([bx1, by1, bx2, by2], radius=1, fill='#38bdf8')
    
    # 2. Draw 'M' inside the phone
    # Draw a stylized modern 'M'
    # It consists of 3 vertical-ish columns or lines
    margin_x = int(phone_w * 0.2)
    margin_y = int(phone_h * 0.22)
    
    mx1 = x1 + margin_x
    my1 = y1 + margin_y
    mx2 = x2 - margin_x
    my2 = y2 - margin_y
    
    # Draw stylized geometric M
    col_w = max(3, int(phone_w * 0.12))
    
    # Left column
    draw.rounded_rectangle([mx1, my1, mx1 + col_w, my2], radius=2, fill='#ffffff')
    
    # Right column
    draw.rounded_rectangle([mx2 - col_w, my1, mx2, my2], radius=2, fill='#ffffff')
    
    # Center V-shape
    # Draw diagonal lines
    points = [
        (mx1 + col_w // 2, my1),
        ((mx1 + mx2) // 2, (my1 + my2) // 2 + int(phone_h * 0.05)),
        (mx2 - col_w // 2, my1),
        (mx2 - col_w // 2, my1 + col_w),
        ((mx1 + mx2) // 2, (my1 + my2) // 2 + int(phone_h * 0.05) + col_w),
        (mx1 + col_w // 2, my1 + col_w)
    ]
    draw.polygon(points, fill='#ffffff')

def main():
    print("Generating PWA icons...")
    os.makedirs('public/icons', exist_ok=True)
    
    sizes = [192, 512]
    for size in sizes:
        img = create_gradient_background(size)
        draw_logo_mark(img, size)
        
        output_path = f'public/icons/icon-{size}.png'
        img.save(output_path, 'PNG')
        print(f"Generated {output_path} successfully ({size}x{size})")

if __name__ == '__main__':
    main()
