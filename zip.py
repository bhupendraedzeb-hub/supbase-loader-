import zipfile
from pathlib import Path
import sys

def unzip(zip_path: str, output_dir: str | None = None) -> Path:
    zip_file = Path(zip_path).expanduser().resolve()
    if not zip_file.exists():
        raise FileNotFoundError(f"Zip not found: {zip_file}")
    if zip_file.suffix.lower() != ".zip":
        raise ValueError(f"Not a .zip file: {zip_file.name}")

    out_dir = Path(output_dir).expanduser().resolve() if output_dir else zip_file.with_suffix("")
    out_dir.mkdir(parents=True, exist_ok=True)

    with zipfile.ZipFile(zip_file, "r") as z:
        z.extractall(out_dir)

    return out_dir

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python unzip.py <file.zip> [output_folder]")
        sys.exit(1)

    zip_path = sys.argv[1]
    output_folder = sys.argv[2] if len(sys.argv) >= 3 else None

    extracted_to = unzip(zip_path, output_folder)
    print(f"Extracted to: {extracted_to}")
