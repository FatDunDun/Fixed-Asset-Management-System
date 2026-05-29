import base64
import hmac
import hashlib
import json
import time
import os

def _load_secret_key() -> str:
    # 1. Check environment variable first
    env_secret = os.environ.get('JWT_SECRET_KEY')
    if env_secret:
        return env_secret
        
    # 2. Check local persistent secret file
    secret_file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".jwt_secret")
    if os.path.exists(secret_file_path):
        try:
            with open(secret_file_path, "r", encoding="utf-8") as f:
                content = f.read().strip()
                if content:
                    return content
        except Exception:
            pass
            
    # 3. Generate a new high-entropy persistent secret
    try:
        new_secret = os.urandom(32).hex()
        with open(secret_file_path, "w", encoding="utf-8") as f:
            f.write(new_secret)
        return new_secret
    except Exception:
        # Final fallback to standard key if write fails
        return "assetwise-secret-key-change-in-production-2026"

SECRET_KEY = _load_secret_key()

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 with SHA-256 and a random salt."""
    salt = os.urandom(16)
    pwdhash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return salt.hex() + ":" + pwdhash.hex()

def verify_password(stored_password: str, provided_password: str) -> bool:
    """Verify a stored password hash against a provided password."""
    try:
        salt_hex, pwdhash_hex = stored_password.split(':')
        salt = bytes.fromhex(salt_hex)
        pwdhash = bytes.fromhex(pwdhash_hex)
        new_hash = hashlib.pbkdf2_hmac('sha256', provided_password.encode('utf-8'), salt, 100000)
        return hmac.compare_digest(new_hash, pwdhash)
    except Exception:
        return False

def generate_token(username: str, role: str, real_name: str = "") -> str:
    """Generate a custom secure JWT signed with HMAC-SHA256."""
    header = base64.urlsafe_b64encode(json.dumps({"alg": "HS256", "typ": "JWT"}).encode()).decode().rstrip("=")
    payload = base64.urlsafe_b64encode(json.dumps({
        "sub": username,
        "role": role,
        "name": real_name,
        "exp": int(time.time()) + 86400  # Token valid for 1 day
    }).encode()).decode().rstrip("=")
    
    signature_base = f"{header}.{payload}"
    signature = base64.urlsafe_b64encode(
        hmac.new(SECRET_KEY.encode(), signature_base.encode(), hashlib.sha256).digest()
    ).decode().rstrip("=")
    
    return f"{signature_base}.{signature}"

def verify_token(token: str) -> dict:
    """Verify the JWT token and return its payload if valid, else None."""
    try:
        parts = token.split('.')
        if len(parts) != 3:
            return None
        header, payload, signature = parts
        
        # Verify the signature
        signature_base = f"{header}.{payload}"
        expected_signature = base64.urlsafe_b64encode(
            hmac.new(SECRET_KEY.encode(), signature_base.encode(), hashlib.sha256).digest()
        ).decode().rstrip("=")
        
        if not hmac.compare_digest(signature, expected_signature):
            return None
            
        # Add base64 padding back if necessary
        def pad(s):
            return s + "=" * (4 - len(s) % 4)
            
        decoded_payload = json.loads(base64.urlsafe_b64decode(pad(payload)).decode())
        
        # Check expiration
        if decoded_payload['exp'] < time.time():
            return None
            
        return decoded_payload
    except Exception:
        return None
