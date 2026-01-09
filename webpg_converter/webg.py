import os
from pathlib import Path
from PIL import Image
import cairosvg

def convert_to_webp(input_path, output_path):
    """Convert image to WebP format based on file extension"""
    input_path = Path(input_path)
    output_path = Path(output_path)
    
    try:
        if input_path.suffix.lower() in ['.png', '.jpg', '.jpeg']:
            with Image.open(input_path) as img:
                # Convert RGBA to RGB for JPEG compatibility if needed
                if img.mode == 'RGBA' and input_path.suffix.lower() in ['.jpg', '.jpeg']:
                    background = Image.new('RGB', img.size, (255, 255, 255))
                    background.paste(img, mask=img.split()[-1])
                    img = background
                elif img.mode not in ['RGB', 'RGBA']:
                    img = img.convert('RGB')
                
                img.save(output_path, 'WEBP', quality=90)
                
        elif input_path.suffix.lower() == '.svg':
            # Convert SVG to PNG first using CairoSVG, then to WebP
            png_temp = output_path.with_suffix('.temp.png')
            cairosvg.svg2png(url=str(input_path), write_to=str(png_temp))
            
            with Image.open(png_temp) as img:
                img.save(output_path, 'WEBP', quality=90)
            png_temp.unlink()  # Remove temporary PNG file
            
    except Exception as e:
        print(f"Error converting {input_path}: {str(e)}")

def main():
    # Get input and output directories from user
    input_dir = input("Enter input directory path: ").strip()
    output_dir = input("Enter output directory path: ").strip()
    
    input_path = Path(input_dir)
    output_path = Path(output_dir)
    
    if not input_path.exists():
        print("Input directory does not exist!")
        return
        
    # Create output directory if it doesn't exist
    output_path.mkdir(parents=True, exist_ok=True)
    
    # Supported extensions
    extensions = ('.png', '.jpg', '.jpeg', '.svg')
    
    # Process all files recursively
    for root, _, files in os.walk(input_dir):
        for file in files:
            if file.lower().endswith(extensions):
                # Calculate relative path to maintain folder structure
                rel_path = os.path.relpath(root, input_dir)
                src_file = os.path.join(root, file)
                
                # Create corresponding output directory
                dst_dir = os.path.join(output_dir, rel_path)
                os.makedirs(dst_dir, exist_ok=True)
                
                # Generate output filename with .webp extension
                name_without_ext = os.path.splitext(file)[0]
                dst_file = os.path.join(dst_dir, f"{name_without_ext}.webp")
                
                print(f"Converting: {src_file} -> {dst_file}")
                convert_to_webp(src_file, dst_file)

if __name__ == "__main__":
    main()