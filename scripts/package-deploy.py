"""Build a portable ZIP: Netlify requires forward-slash asset paths."""
from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
import sys
source = Path("dist")
target = Path(sys.argv[1])
with ZipFile(target, "w", ZIP_DEFLATED) as archive:
    for file in sorted(source.rglob("*")):
        if file.is_file():
            archive.write(file, file.relative_to(source).as_posix())
with ZipFile(target) as archive:
    assert "index.html" in archive.namelist()
    assert any(name.startswith("assets/") for name in archive.namelist())
    assert not any("\\" in name for name in archive.namelist())
print("Portable deployment archive verified")
