#!/usr/bin/env python3
"""Extract + decrypt Chrome cookies for a domain on macOS, no pip deps.

Chrome on macOS encrypts each cookie value as: b"v10" + AES-128-CBC(
    key = PBKDF2-HMAC-SHA1(keychain_password, b"saltysalt", 1003, 16),
    iv  = b" " * 16,
    plaintext = [32-byte SHA256(host) prefix on recent Chrome] + value
). Key derivation is stdlib (hashlib); AES is shelled to `openssl`.

Reading the Keychain triggers a one-time GUI prompt ("security wants to use
... Chrome Safe Storage") — the user must click Allow.

Usage: chrome-cookies.py <domain-substring>   e.g. chrome-cookies.py facebook.com
Prints a `Cookie:` header value (name=value; name=value) to stdout.
Exit 2 = no cookies found (not logged in); exit 3 = keychain/decrypt failure.
"""
import sys, os, shutil, sqlite3, subprocess, hashlib, tempfile

def keychain_password():
    try:
        out = subprocess.run(
            ["security", "find-generic-password", "-w",
             "-s", "Chrome Safe Storage", "-a", "Chrome"],
            capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        sys.exit("timed out waiting for Keychain (no Allow click?)")
    if out.returncode != 0:
        sys.exit(f"keychain read failed: {out.stderr.strip()}")
    return out.stdout.strip()

def decrypt(enc, key):
    if not enc or enc[:3] != b"v10":
        return None
    ct = enc[3:]
    iv = b" " * 16
    p = subprocess.run(
        ["openssl", "enc", "-d", "-aes-128-cbc", "-nopad",
         "-K", key.hex(), "-iv", iv.hex()],
        input=ct, capture_output=True)
    if p.returncode != 0:
        return None
    data = p.stdout
    if not data:
        return None
    data = data[:-data[-1]]            # strip PKCS7 padding
    if len(data) >= 32:                # strip 32-byte SHA256(host) prefix if present
        tail = data[32:]
        try:
            tail.decode("utf-8"); return tail.decode("utf-8")
        except UnicodeDecodeError:
            pass
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None

def main():
    if len(sys.argv) < 2:
        sys.exit("usage: chrome-cookies.py <domain-substring>")
    domain = sys.argv[1]
    src = os.path.expanduser(
        "~/Library/Application Support/Google/Chrome/Default/Cookies")
    if not os.path.exists(src):
        sys.exit(f"no Chrome cookie store at {src}")
    pw = keychain_password()
    key = hashlib.pbkdf2_hmac("sha1", pw.encode(), b"saltysalt", 1003, 16)
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as tf:
        tmp = tf.name
    try:
        shutil.copy2(src, tmp)
        con = sqlite3.connect(tmp)
        rows = con.execute(
            "select name, encrypted_value from cookies "
            "where host_key like ? order by name", (f"%{domain}%",)).fetchall()
        con.close()
    finally:
        os.unlink(tmp)
    pairs = []
    for name, enc in rows:
        val = decrypt(enc, key)
        if val is not None:
            pairs.append(f"{name}={val}")
    if not pairs:
        sys.stderr.write(f"no decryptable {domain} cookies (logged out?)\n")
        sys.exit(2)
    print("; ".join(pairs))

if __name__ == "__main__":
    main()
