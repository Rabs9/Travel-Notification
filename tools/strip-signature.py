"""Remove the Authenticode signature from a Windows PE file (e.g. a copy of node.exe).

Node's single-executable docs say to remove the signature before injecting the
app blob; signtool does that on Windows, this does the same from Linux:
zero the security data directory and drop the certificate table at the end.
"""
import struct
import sys

path = sys.argv[1]
data = bytearray(open(path, 'rb').read())
pe = struct.unpack_from('<I', data, 0x3C)[0]
if data[pe:pe + 4] != b'PE\0\0':
    sys.exit('not a PE file')
opt = pe + 24
magic = struct.unpack_from('<H', data, opt)[0]
dirs = opt + (112 if magic == 0x20B else 96)   # PE32+ vs PE32
sec = dirs + 4 * 8                              # IMAGE_DIRECTORY_ENTRY_SECURITY
off, size = struct.unpack_from('<II', data, sec)
if not off:
    print('no signature present')
    sys.exit(0)
struct.pack_into('<II', data, sec, 0, 0)
if off + size >= len(data) - 8:                 # certificate table sits at the end of the file
    del data[off:]
open(path, 'wb').write(data)
print(f'signature removed ({size} bytes)')
