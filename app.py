#!/usr/bin/env python3
"""
Li3ht Clip — Phase 2 backend (async jobs) — v3
- SQLite persistence (credits, referrals, Pro tier, device-bound auth TOKENS)
- Free vs Pro gating; beta: link clipping open to all registered users
- UPLOAD ONCE, CLIP MANY: /upload returns an upload_id; /process accepts
  upload_token jobs that share the same source file (no re-upload per clip)
- ASYNC jobs: /process returns job_id instantly; /job/<id> reports stage+%
- Credit deduction by processed minute; automatic refund on failure
- Rate limiting + security headers + device-bound token auth
- RevenueCat webhook (Free/Pro only)
- YouTube: retry strategies (tv / web_safari clients) + optional YT_COOKIES env
"""
import os
import sys
import uuid
import re
import json
import time
import sqlite3
import threading
import subprocess
from contextlib import closing
from flask import Flask, request, render_template, send_from_directory, jsonify

app = Flask(__name__, template_folder='templates', static_folder='static')

# --- Portable paths: works locally AND on Render/Railway/Docker ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.environ.get('DATA_DIR', os.path.join(BASE_DIR, 'data'))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'static', 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'static', 'outputs')
DB_PATH = os.path.join(DATA_DIR, 'li3ht_clip.db')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

sys.path.append(BASE_DIR)
from thumbnail_generator import generate_viral_thumbnail

# ==========================================
# 🛡️ SQLITE DATABASE (persistent)
# ==========================================
_db_lock = threading.Lock()

def _conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with _db_lock, closing(_conn()) as conn:
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            email         TEXT PRIMARY KEY,
            credits_sec   INTEGER NOT NULL DEFAULT 900,
            referral_code TEXT NOT NULL UNIQUE,
            tier          TEXT NOT NULL DEFAULT 'free',
            devices       TEXT NOT NULL DEFAULT '[]',
            token         TEXT NOT NULL DEFAULT '',
            created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS payments (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            email      TEXT NOT NULL,
            provider   TEXT NOT NULL,
            reference  TEXT NOT NULL UNIQUE,
            plan       TEXT NOT NULL,
            amount     INTEGER,
            status     TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS referrals (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            referrer   TEXT NOT NULL,
            referred   TEXT NOT NULL UNIQUE,
            applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        """)
        # migrate older DBs (add token column if missing)
        try:
            conn.execute("ALTER TABLE users ADD COLUMN token TEXT NOT NULL DEFAULT ''")
        except sqlite3.OperationalError:
            pass
        conn.commit()

def get_user(email):
    with closing(_conn()) as conn:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    if not row:
        return None
    u = dict(row)
    u["devices"] = json.loads(u.get("devices") or "[]")
    return u

def create_user(email, credits_sec, referral_code, device_fp, token=None):
    token = token or uuid.uuid4().hex
    with _db_lock, closing(_conn()) as conn:
        conn.execute(
            "INSERT INTO users (email, credits_sec, referral_code, devices, token) VALUES (?,?,?,?,?)",
            (email, credits_sec, referral_code, json.dumps([device_fp] if device_fp else []), token)
        )
        conn.commit()
    return get_user(email)

def update_user(email, **fields):
    allowed = {"credits_sec", "tier", "devices", "token"}
    sets, vals = [], []
    for k, v in fields.items():
        if k in allowed:
            if k == "devices":
                v = json.dumps(v)
            sets.append(f"{k} = ?")
            vals.append(v)
    if not sets:
        return get_user(email)
    vals.append(email)
    with _db_lock, closing(_conn()) as conn:
        conn.execute(f"UPDATE users SET {', '.join(sets)} WHERE email = ?", vals)
        conn.commit()
    return get_user(email)

def email_has_device(email, device_fp):
    u = get_user(email)
    return bool(u and device_fp and device_fp in u["devices"])

def all_users():
    with closing(_conn()) as conn:
        rows = conn.execute("SELECT * FROM users").fetchall()
    users = []
    for r in rows:
        d = dict(r)
        d["devices"] = json.loads(d.get("devices") or "[]")
        users.append(d)
    return users

def find_referrer(code):
    with closing(_conn()) as conn:
        row = conn.execute("SELECT email FROM users WHERE referral_code = ?", (code,)).fetchone()
    return row["email"] if row else None

def add_referral(referrer, referred):
    try:
        with _db_lock, closing(_conn()) as conn:
            conn.execute("INSERT INTO referrals (referrer, referred) VALUES (?,?)", (referrer, referred))
            conn.commit()
        return True
    except sqlite3.IntegrityError:
        return False

def referrals_of(email):
    with closing(_conn()) as conn:
        rows = conn.execute("SELECT referred, applied_at FROM referrals WHERE referrer = ?", (email,)).fetchall()
    return [dict(r) for r in rows]

def auth_ok(email, token):
    """Device-bound token check. The owner gets their token via /register (any device)."""
    if not email:
        return False
    user = get_user(email)
    if not user:
        return False
    token = (token or "").strip()
    return bool(user.get("token") and token and user["token"] == token)

# ==========================================
# 🛡️ ANTI-FRAUD EMAIL ENGINE
# ==========================================
DISPOSABLE_DOMAINS = {
    'tempmail.org', '10minutemail.com', 'yopmail.com', 'mailinator.com',
    'temp-mail.org', 'guerrillamail.com', 'dispostable.com', 'getnada.com',
    'tempmail.net', 'disposablemail.com', 'sharklasers.com', 'maildrop.cc'
}
OWNER_EMAILS = {os.environ.get('OWNER_EMAIL', 'ispread2016@gmail.com').strip().lower()}

def clean_and_validate_email(email):
    email = (email or "").strip().lower()
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return None, False, "Invalid email format."
    username, domain = email.split('@', 1)
    if domain in DISPOSABLE_DOMAINS:
        return None, False, "Temporary or disposable email addresses are blocked."
    if domain in ['gmail.com', 'googlemail.com']:
        username = username.split('+', 1)[0]
        username = username.replace('.', '')
    return f"{username}@{domain}", True, None

def parse_hhmmss(t):
    if t is None:
        return None
    t = str(t).strip()
    if not t:
        return None
    if re.match(r"^\d+$", t):
        return int(t)
    if re.match(r"^\d{1,2}:\d{2}(:\d{2})?$", t):
        parts = [float(p) for p in t.split(':')]
        if len(parts) == 3:
            return int(parts[0]*3600 + parts[1]*60 + parts[2])
        return int(parts[0]*60 + parts[1])
    return None

def _fmt_dur(secs):
    secs = int(secs or 0)
    h, rem = divmod(secs, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"

def probe_duration(path):
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", path],
            capture_output=True, text=True, timeout=30
        ).stdout.strip()
        return int(float(out))
    except Exception:
        return 0

# ==========================================
# 🎯 PLAN LIMITS
# ==========================================
FREE_MAX_UPLOAD_SEC   = 5 * 60
PRO_MAX_CLIP_SEC      = 15 * 60
PRO_MONTHLY_CREDITS   = 300 * 60
FREE_START_CREDITS    = 15 * 60
REFERRAL_BONUS_SEC    = 15 * 60
JOB_MAX_SECONDS       = 45 * 60
UPLOAD_TTL_SEC        = 45 * 60          # shared upload files live 45 min
MAX_FILE_BYTES        = 500 * 1024 * 1024

# Optional: keep YouTube downloads reliable on cloud servers via cookies in env
YK_PATH = os.path.join(BASE_DIR, "youtube_cookies.txt")
if os.environ.get('YT_COOKIES') and not os.path.exists(YK_PATH):
    try:
        with open(YK_PATH, "w") as f:
            f.write(os.environ['YT_COOKIES'])
        print("[*] YT_COOKIES env -> saved to youtube_cookies.txt")
    except Exception as e:
        print(f"[!] could not write cookies: {e}")

init_db()
if not get_user("creator@li3ht.com"):
    create_user("creator@li3ht.com", 3600, "LIGHT_VIP_777", None)

# ==========================================
# 📦 ASYNC JOB ENGINE
# ==========================================
def free_space_mb(path):
    try:
        st = os.statvfs(path)
        return st.f_bavail * st.f_frsize / (1024 * 1024)
    except Exception:
        return 99999

def ensure_disk_space(emergency_mb=300, warn_mb=450):
    """Free disk before a render; raise a friendly error if still too low."""
    if free_space_mb(BASE_DIR) < warn_mb:
        print(f"[!] low disk ({free_space_mb(BASE_DIR):.0f} MB) — purging old artifacts")
        purge_old_jobs(1)
        purge_old_uploads(ttl_sec=600)
    if free_space_mb(BASE_DIR) < emergency_mb:
        raise RuntimeError("Server storage is momentarily full — try again in a minute or use a shorter clip.")

jobs = {}
_jobs_lock = threading.Lock()

def set_job(job_id, **fields):
    with _jobs_lock:
        j = jobs.setdefault(job_id, {})
        j.update(fields)
        j["updated_at"] = time.time()

def get_job(job_id):
    with _jobs_lock:
        j = jobs.get(job_id)
        return dict(j) if j else None

def purge_old_jobs(max_age_hours=8):
    now = time.time()
    with _jobs_lock:
        old = [jid for jid, j in jobs.items() if j.get("updated_at", now) < now - max_age_hours * 3600]
        for jid in old:
            jobs.pop(jid, None)
    for jid in old:
        for name in (f"li3ht_clip_{jid}.mp4", f"li3ht_thumb_{jid}.jpg"):
            p = os.path.join(OUTPUT_FOLDER, name)
            if os.path.exists(p):
                try: os.remove(p)
                except OSError: pass

def active_source_paths():
    """Paths still in use by queued/working jobs (never delete those)."""
    paths = set()
    with _jobs_lock:
        for j in jobs.values():
            if j.get("status") in ("queued", "working"):
                if j.get("raw_path"):
                    paths.add(j["raw_path"])
    return paths

def purge_old_uploads(ttl_sec=None):
    """Delete shared upload files older than TTL (unless a job uses them)."""
    cutoff = time.time() - (ttl_sec or UPLOAD_TTL_SEC)
    active = active_source_paths()
    try:
        for fn in os.listdir(UPLOAD_FOLDER):
            p = os.path.join(UPLOAD_FOLDER, fn)
            if p in active:
                continue
            try:
                if os.path.getmtime(p) < cutoff:
                    os.remove(p)
            except OSError:
                pass
    except Exception:
        pass

# ==========================================
# 🎬 METADATA (accurate titles/descriptions)
# ==========================================
STOPWORDS = set("""what when where who which why how this that these those from with your you for and the of to in on is are was were will be can not have has it its their our they we i he she them him his her an a at by or as if but so do does did done had has have been being would could should may might must about into over after before under between out up down off again more most some any all no not only own same too very just""".split())

def _title_from_filename(fn):
    stem = os.path.splitext(os.path.basename(fn or ""))[0]
    t = re.sub(r"[_\-.]+", " ", stem).strip()
    if not t or t.lower() in ("upload", "video", "clip", "movie", "trim", "final", "output", "export") or re.match(r"^(img|vid|mov|mv|video|screen|screenshot|pix|photo|image|saver|wx|mmexport)\d*$", t.lower()):
        return None
    return t.title()[:80]

def _hashtags(text):
    words = re.findall(r"[A-Za-z]{4,}", str(text).lower())
    kw = []
    for w in words:
        if w not in STOPWORDS and w not in kw and not w.isdigit():
            kw.append(w)
        if len(kw) >= 4:
            break
    tags = ["#shorts", "#trending", "#viral", "#li3htclip"]
    for k in kw[:4]:
        tags.append("#" + k)
    seen, out = set(), []
    for t in tags:
        if t not in seen:
            seen.add(t); out.append(t)
    return " ".join(out[:8])

def build_clip_meta(clip_label, part_index, total_parts, src_title, src_uploader, src_url, start_secs, end_secs, is_link):
    base = (src_title or "").strip()[:90]
    label = (clip_label or "").strip()
    if not label and total_parts > 1:
        label = f"Clip {part_index}"
    title = base
    if title and total_parts > 1:
        title = f"{title} — {label}" if label else f"{title} — Part {part_index}"
    elif label and not title:
        title = label
    if title and (start_secs is not None or end_secs is not None):
        if start_secs or end_secs:
            rng = f"{_fmt_time(start_secs or 0)}–{_fmt_time(end_secs) if end_secs else 'end'}"
            title = f"{title} ({rng})"
    if not title:
        title = "Viral Clip"
    lines = [title, ""]
    if start_secs or end_secs:
        lines.append(f"🕘 Clip {_fmt_time(start_secs or 0)} → {_fmt_time(end_secs) if end_secs else 'end'}")
    if is_link:
        if src_uploader:
            lines.append(f"▶️ Source: {src_uploader}")
        if src_url:
            lines.append(f"🔗 Full video: {src_url}")
    lines.append("")
    lines.append("⚡ Reframed 9:16 · smooth 1.12x · pitch-perfect audio — made with Li3ht Clip.")
    lines.append("")
    lines.append(_hashtags(title))
    return title, "\n".join(lines).strip()

def _fmt_time(secs):
    secs = int(secs or 0)
    m, s = divmod(secs, 60)
    h, m2 = divmod(m, 60)
    return f"{h}:{m2:02d}:{s:02d}" if h else f"{m2}:{s:02d}"

def _get_source_meta(url):
    try:
        meta_cmd = ["python3", "-m", "yt_dlp", "--skip-download", "-J",
                    "--remote-components", "ejs:github"]
        if os.path.exists(YK_PATH):
            meta_cmd += ["--cookies", YK_PATH]
        env = os.environ.copy()
        env["PATH"] = f"{os.path.join(BASE_DIR, 'bin')}:{env.get('PATH', '')}"
        proc = subprocess.run(meta_cmd + [url], env=env, capture_output=True, text=True, timeout=90)
        if proc.returncode != 0:
            return None
        d = json.loads(proc.stdout or "{}")
        return {"title": d.get("title"), "uploader": d.get("uploader") or d.get("channel") or d.get("uploader_id"),
                "duration": d.get("duration"), "webpage_url": d.get("webpage_url")}
    except Exception as e:
        print(f"[!] meta fetch failed: {e}")
        return None

# ==========================================
# ⬇️ DOWNLOADER (with retry strategies + friendly errors)
# ==========================================
YT_STRATEGIES = [
    [],
    ["--extractor-args", "youtube:player_client=tv"],
    ["--extractor-args", "youtube:player_client=web_safari"],
]

def _download_video(job_id, video_url, raw_path):
    last_err = ""
    for idx, extra in enumerate(YT_STRATEGIES):
        dl_cmd = ["python3", "-m", "yt_dlp", "--remote-components", "ejs:github",
                  "--ffmpeg-location", "/usr/bin/ffmpeg", "-f", "18/best", "-o", raw_path]
        if os.path.exists(YK_PATH):
            dl_cmd += ["--cookies", YK_PATH]
        dl_cmd += extra
        env = os.environ.copy()
        env["PATH"] = f"{os.path.join(BASE_DIR, 'bin')}:{env.get('PATH', '')}"
        try:
            proc = subprocess.run(dl_cmd + [video_url], env=env,
                                  stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True, timeout=600)
        except subprocess.TimeoutExpired:
            last_err = "Download timed out (source slow or blocked)."
            continue
        if proc.returncode == 0 and os.path.exists(raw_path) and os.path.getsize(raw_path) > 1000:
            if os.path.getsize(raw_path) > 450 * 1024 * 1024:
                try: os.remove(raw_path)
                except OSError: pass
                raise RuntimeError("That source video is too large for this server (450 MB cap). Try a shorter source or upload the file directly.")
            return
        err_lines = [l for l in (proc.stderr or "").splitlines() if l.strip()]
        last_err = err_lines[-1].replace("ERROR: ", "") if err_lines else f"attempt {idx+1} failed"
        print(f"[!] dl attempt {idx+1} failed: {last_err[:120]}")
        if os.path.exists(raw_path):
            try: os.remove(raw_path)
            except OSError: pass

    hint = last_err or "download failed"
    low = hint.lower()
    if "sign in to confirm" in low or "not a bot" in low:
        raise RuntimeError("YouTube is blocking this server's IP. Retry may work; for guaranteed results upload the file directly (recommended for your own recordings), or ask support to enable download cookies.")
    if "unsupported url" in low or "neither a valid url" in low:
        raise RuntimeError("That source isn't supported yet — try YouTube, Shorts, X/Twitter, TikTok, Instagram or HeyGen.")
    if "http error 404" in low:
        raise RuntimeError("That link doesn't exist (404). Double-check the URL and try again.")
    if "http error 403" in low or "unable to download webpage" in low or "http error 451" in low:
        raise RuntimeError("The source refused this server (403). Try a different source or upload the file directly.")
    if "requested format is not available" in low or "no video" in low:
        raise RuntimeError("Could not find a downloadable video at that link (private, region-locked, or DRM).")
    raise RuntimeError(f"Could not download that link: {hint[:140]}")

# ==========================================
# 🛡️ RATE LIMITING + SECURITY HEADERS
# ==========================================
_RL = {}
_RL_LOCK = threading.Lock()
RL_LIMIT, RL_WINDOW = 30, 60

def rate_limited(key):
    now = time.time()
    with _RL_LOCK:
        lst = [t for t in _RL.get(key, []) if now - t < RL_WINDOW]
        if len(lst) >= RL_LIMIT:
            return True
        lst.append(now)
        _RL[key] = lst
    return False

@app.before_request
def _rlimit():
    if request.path in ("/register", "/process", "/upload", "/me", "/dev/grant"):
        if rate_limited(request.remote_addr or "?"):
            return jsonify({"error": "Too many requests — please slow down and try again."}), 429
    return None

@app.after_request
def sec_headers(resp):
    if resp.mimetype == 'text/html':
        resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
        resp.headers['Pragma'] = 'no-cache'
        resp.headers['Expires'] = '0'
    resp.headers['X-Content-Type-Options'] = 'nosniff'
    resp.headers['X-Frame-Options'] = 'SAMEORIGIN'
    resp.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    return resp

# ==========================================
# 🔌 WEB ROUTES
# ==========================================
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/terms')
def terms():
    return render_template('terms.html')

@app.route('/health')
def health():
    deno = "yes" if os.path.exists("/usr/local/bin/deno") or os.path.exists(os.path.join(BASE_DIR, "bin", "deno")) else "no"
    return jsonify({"status": "ok", "service": "li3ht-clip", "deno": deno})

@app.route('/register', methods=['POST'])
def register():
    email = request.form.get('email')
    ref_code_entered = request.form.get('referral_code', '').strip().upper()
    device_fp = request.form.get('device_fingerprint', '').strip()
    if not email:
        return jsonify({"error": "Email is required"}), 400
    normalized_email, is_valid, err_msg = clean_and_validate_email(email)
    if not is_valid:
        return jsonify({"error": err_msg}), 400

    existing = get_user(normalized_email)
    if existing:
        # Device-bound login: same device (or owner) gets the account token
        if normalized_email in OWNER_EMAILS or (device_fp and email_has_device(normalized_email, device_fp)):
            if device_fp and not email_has_device(normalized_email, device_fp):
                update_user(normalized_email, devices=existing["devices"] + [device_fp])
                existing = get_user(normalized_email)
            return jsonify({"status": "success", "message": "Welcome back!", "user": existing})
        return jsonify({
            "error": "This account is registered to another device. To protect your credits, sign in from that device."
        }), 403

    if device_fp:
        for u in all_users():
            if device_fp in u["devices"]:
                print(f"[!] Blocked referral looting attempt on device: {device_fp}")
                return jsonify({
                    "error": "Security alert: Multiple accounts registered on this device. Referral credits blocked."
                }), 403

    new_code = f"LIGHT_CLIP_{uuid.uuid4().hex[:6].upper()}"
    new_user = create_user(normalized_email, FREE_START_CREDITS, new_code, device_fp)

    referral_bonus_applied = False
    referrer_email = None
    if ref_code_entered:
        referrer_email = find_referrer(ref_code_entered)
        if referrer_email and referrer_email != normalized_email:
            if add_referral(referrer_email, normalized_email):
                update_user(referrer_email, credits_sec=get_user(referrer_email)["credits_sec"] + REFERRAL_BONUS_SEC)
                update_user(normalized_email, credits_sec=FREE_START_CREDITS + REFERRAL_BONUS_SEC)
                referral_bonus_applied = True
                print(f"[++] Referral: {referrer_email} invited {normalized_email}! +{REFERRAL_BONUS_SEC//60} min each.")
    new_user = get_user(normalized_email)
    return jsonify({
        "status": "success",
        "message": "Account created successfully!",
        "referral_applied": referral_bonus_applied,
        "referrer": referrer_email,
        "user": new_user
    })

@app.route('/me', methods=['POST'])
def me():
    email = (request.form.get('email') or '').strip().lower()
    token = (request.form.get('token') or '').strip()
    if not email:
        return jsonify({"error": "Email required"}), 400
    if not auth_ok(email, token):
        return jsonify({"error": "Session expired or invalid. Please sign in again."}), 401
    normalized_email, is_valid, _ = clean_and_validate_email(email)
    user = get_user(normalized_email)
    if not user:
        return jsonify({"error": "User not found. Please register."}), 404
    user["referrals"] = referrals_of(normalized_email)
    return jsonify({"status": "success", "user": user})

@app.route('/dev/grant', methods=['POST'])
def dev_grant_pro():
    email = (request.form.get('email') or '').strip().lower()
    token = (request.form.get('token') or '').strip()
    if not email:
        return jsonify({"error": "Email required"}), 400
    normalized_email, is_valid, _ = clean_and_validate_email(email)
    if not is_valid:
        return jsonify({"error": "Invalid email"}), 400
    if not auth_ok(normalized_email, token):
        return jsonify({"error": "Not authorized"}), 403
    user = get_user(normalized_email)
    if not user:
        return jsonify({"error": "User not found. Please register first."}), 404
    if user["tier"] != "pro" or user["credits_sec"] < PRO_MONTHLY_CREDITS:
        user = update_user(normalized_email, tier="pro",
                           credits_sec=user["credits_sec"] + PRO_MONTHLY_CREDITS)
        print(f"[DEV] {normalized_email} -> PRO via dev simulator (+{PRO_MONTHLY_CREDITS//60} min)")
    return jsonify({"status": "success", "user": user})

# ==========================================
# 💳 REVENUECAT WEBHOOK (Free & Pro only)
# ==========================================
@app.route('/webhook/revenuecat', methods=['POST'])
def revenuecat_webhook():
    auth = request.headers.get('Authorization', '')
    expected = os.environ.get('REVENUECAT_AUTH_TOKEN', '')
    if expected and auth != f"Bearer {expected}":
        return jsonify({"error": "Unauthorized"}), 401
    payload = request.json or {}
    event = payload.get("event", {})
    event_type = event.get("type")
    user_email = event.get("app_user_id")
    if not user_email or not get_user(user_email):
        normalized, valid, _ = clean_and_validate_email(user_email)
        if valid and not get_user(normalized):
            create_user(normalized, 0, f"LIGHT_CLIP_{uuid.uuid4().hex[:6].upper()}", None)
            user_email = normalized
        else:
            return jsonify({"status": "ignored", "reason": "User not found"}), 200
    user = get_user(user_email)
    if event_type in ("INITIAL_PURCHASE", "RENEWAL", "PRODUCT_CHANGE", "UNCANCELLATION"):
        if event_type == "RENEWAL" or (event_type == "INITIAL_PURCHASE" and user["tier"] != "pro"):
            credits_sec = user["credits_sec"] + PRO_MONTHLY_CREDITS
        else:
            credits_sec = user["credits_sec"]
        user = update_user(user_email, tier="pro", credits_sec=credits_sec)
        print(f"[++] {user_email} -> PRO. +{PRO_MONTHLY_CREDITS//60} min credited.")
    elif event_type in ("CANCELLATION", "EXPIRATION", "BILLING_ISSUE"):
        user = update_user(user_email, tier="free")
        print(f"[--] {user_email} -> FREE (cancelled/expired).")
    return jsonify({"status": "success", "user": user})

# ==========================================
# ⬆️ UPLOAD ONCE (returns upload_id, reusable for many clips)
# ==========================================
@app.route('/upload', methods=['POST'])
def upload_file_once():
    purge_old_uploads()
    f = request.files.get('file')
    if not f:
        return jsonify({"error": "No file uploaded"}), 400
    uid = uuid.uuid4().hex[:12]
    path = os.path.join(UPLOAD_FOLDER, f"src_{uid}.mp4")
    f.save(path)
    size = os.path.getsize(path)
    if size > MAX_FILE_BYTES:
        try: os.remove(path)
        except OSError: pass
        return jsonify({"error": "File too large (max 500 MB)."}), 400
    if size < 1000:
        try: os.remove(path)
        except OSError: pass
        return jsonify({"error": "That file looks empty or unreadable."}), 400
    return jsonify({"upload_id": uid, "size": size, "expires_in": UPLOAD_TTL_SEC})

# ==========================================
# 🎬 PROCESS (async) + JOB STATUS
# ==========================================
@app.route('/process', methods=['POST'])
def process_video():
    purge_old_jobs()
    purge_old_uploads()
    job_id = str(uuid.uuid4())[:8]
    input_type = request.form.get('type')      # 'upload' | 'upload_token' | 'link'
    speed_mult = request.form.get('speed', '1.12')
    aspect_ratio = request.form.get('ratio', '9_16')
    email = (request.form.get('email') or '').strip().lower()
    token = (request.form.get('token') or '').strip()
    if aspect_ratio not in ("9_16", "16_9"):
        aspect_ratio = "9_16"
    try:
        speed_mult = float(speed_mult)
    except Exception:
        speed_mult = 1.12
    speed_mult = max(0.8, min(2.0, speed_mult))

    user = None
    if email:
        if not auth_ok(email, token):
            return jsonify({"error": "Session expired or invalid. Please sign in again.", "code": "AUTH"}), 401
        user = get_user(email)

    is_owner = email in OWNER_EMAILS
    is_pro = bool(user and (user["tier"] == "pro" or is_owner))

    if input_type == 'link' and user and not is_pro and os.environ.get('BETA_LINK_OPEN', '1') != '1':
        return jsonify({
            "error": "Link downloading is a PRO feature. Upgrade to Pro to clip from YouTube, Shorts, X, HeyGen and more.",
            "code": "UPGRADE_REQUIRED", "tier": user["tier"]
        }), 403
    if input_type == 'link' and not user:
        return jsonify({"error": "Please sign in (enter your email) before pasting a link."}), 401

    print(f"[*] Job {job_id} queued (Type: {input_type}, Speed: {speed_mult}, Ratio: {aspect_ratio}, User: {email or 'anonymous'})")
    clip_label = request.form.get('clip_label', '').strip()

    raw_path = os.path.join(UPLOAD_FOLDER, f"{job_id}_raw.mp4")
    output_video_name = f"li3ht_clip_{job_id}.mp4"
    output_thumb_name = f"li3ht_thumb_{job_id}.jpg"
    output_video_path = os.path.join(OUTPUT_FOLDER, output_video_name)
    output_thumb_path = os.path.join(OUTPUT_FOLDER, output_thumb_name)

    credits_needed = 0
    start_secs = 0
    end_secs = None
    video_url = None
    shared_source = False
    original_filename = None
    src_meta = None

    if input_type in ('upload', 'upload_token'):
        if input_type == 'upload':
            video_file = request.files.get('file')
            if not video_file:
                return jsonify({"error": "No file uploaded"}), 400
            video_file.save(raw_path)
            original_filename = video_file.filename or ""
        else:
            upload_id = (request.form.get('upload_id') or '').strip()
            src_path = os.path.join(UPLOAD_FOLDER, f"src_{upload_id}.mp4")
            if not upload_id or not os.path.exists(src_path):
                return jsonify({"error": "Upload expired — please select the file again."}), 400
            raw_path = src_path
            shared_source = True

        raw_size = os.path.getsize(raw_path)
        if raw_size > MAX_FILE_BYTES:
            if not shared_source: os.remove(raw_path)
            return jsonify({"error": "File too large (max 500 MB). Use a shorter clip."}), 400

        full_dur = probe_duration(raw_path)
        start_secs = parse_hhmmss(request.form.get('start', '')) or 0
        end_secs = parse_hhmmss(request.form.get('end', ''))
        if request.form.get('start', '').strip() and parse_hhmmss(request.form.get('start', '')) is None:
            if not shared_source: os.remove(raw_path)
            return jsonify({"error": "Start time must look like 00:02:00 (or 2:00)."}), 400
        if request.form.get('end', '').strip() and end_secs is None:
            if not shared_source: os.remove(raw_path)
            return jsonify({"error": "End time must look like 00:04:00 (or 4:00)."}), 400
        if end_secs is not None:
            if full_dur and end_secs > full_dur:
                end_secs = int(full_dur)
            if end_secs <= start_secs:
                if not shared_source: os.remove(raw_path)
                return jsonify({"error": "End time must be after start time."}), 400
            clip_secs = end_secs - start_secs
        else:
            clip_secs = max(full_dur - start_secs, 0) if full_dur else 0
        if clip_secs <= 0:
            if not shared_source: os.remove(raw_path)
            return jsonify({"error": f"That slice is outside the video — it is only {_fmt_dur(full_dur)} long."}), 400
        if not is_pro and clip_secs > FREE_MAX_UPLOAD_SEC:
            if not shared_source: os.remove(raw_path)
            return jsonify({"error": f"Free plan allows clips up to {FREE_MAX_UPLOAD_SEC//60} minutes. Use start/end times, or upgrade to Pro for longer clips."}), 403
        credits_needed = clip_secs

    elif input_type == 'link':
        video_url = request.form.get('url')
        if not video_url:
            return jsonify({"error": "No URL provided"}), 400
        src_meta = _get_source_meta(video_url)
        start_secs = parse_hhmmss(request.form.get('start', '')) or 0
        end_secs = parse_hhmmss(request.form.get('end', ''))
        if end_secs is not None:
            if end_secs <= start_secs:
                return jsonify({"error": "End time must be after start time."}), 400
            clip_secs = end_secs - start_secs
        else:
            clip_secs = parse_hhmmss(request.form.get('duration', '00:01:00')) or 60
        clip_secs = max(5, min(clip_secs, PRO_MAX_CLIP_SEC))
        credits_needed = clip_secs

    else:
        if not shared_source and os.path.exists(raw_path):
            os.remove(raw_path)
        return jsonify({"error": "Invalid input type"}), 400

    if user:
        if user["credits_sec"] < credits_needed:
            if not shared_source and os.path.exists(raw_path):
                os.remove(raw_path)
            return jsonify({
                "error": f"Not enough credits. You need {credits_needed//60 + (1 if credits_needed % 60 else 0)} min but have {user['credits_sec']//60} min.",
                "code": "INSUFFICIENT_CREDITS", "credits_remaining": user["credits_sec"]
            }), 402
        update_user(email, credits_sec=user["credits_sec"] - credits_needed)
        user = get_user(email)

    set_job(job_id, status="queued", stage="Queued", progress=1,
            type=input_type, url=video_url, email=email or None,
            clip_label=clip_label,
            src_meta=(src_meta if input_type == 'link' else None),
            original_filename=original_filename,
            speed=speed_mult, ratio=aspect_ratio,
            raw_path=raw_path, output_video_path=output_video_path,
            output_thumb_path=output_thumb_path,
            start_secs=start_secs, end_secs=end_secs,
            credits_needed=credits_needed, shared_source=shared_source,
            credits_remaining=(user["credits_sec"] if user else None),
            created_at=time.time())

    t = threading.Thread(target=_run_job, args=(job_id,), daemon=True)
    t.start()
    return jsonify({"job_id": job_id, "status": "queued",
                    "credits_remaining": user["credits_sec"] if user else None})

# ==========================================
# 💰 WEB BILLING (Paystack + Stripe) — no app store needed
# ==========================================
PRO_NGN_MONTHLY = int(os.environ.get('PRO_PRICE_NGN_MONTHLY', '500000'))   # kobo: N5,000
PRO_NGN_ANNUAL  = int(os.environ.get('PRO_PRICE_NGN_ANNUAL', '3000000'))   # kobo: N30,000
PRO_USD_MONTHLY = int(os.environ.get('PRO_PRICE_USD_MONTHLY', '999'))      # cents: $9.99
PRO_USD_ANNUAL  = int(os.environ.get('PRO_PRICE_USD_ANNUAL', '7188'))      # cents: $71.88

def payments_configured():
    return bool(os.environ.get('PAYSTACK_SECRET_KEY') or os.environ.get('STRIPE_SECRET_KEY'))

def grant_pro(email, plan="monthly"):
    """Upgrade a user to PRO and top up 300 min credits. Returns updated user or None."""
    u = get_user(email)
    if not u:
        return None
    if u["tier"] != "pro":
        u = update_user(email, tier="pro", credits_sec=u["credits_sec"] + PRO_MONTHLY_CREDITS)
    elif plan == "renewal":
        u = update_user(email, credits_sec=u["credits_sec"] + PRO_MONTHLY_CREDITS)
    return get_user(email)

def record_payment(email, provider, reference, plan, amount, status="pending"):
    with _db_lock, closing(_conn()) as conn:
        conn.execute(
            "INSERT OR IGNORE INTO payments (email, provider, reference, plan, amount, status) VALUES (?,?,?,?,?,?)",
            (email, provider, reference, plan, amount, status))
        conn.commit()

def find_payment(reference):
    with closing(_conn()) as conn:
        row = conn.execute("SELECT * FROM payments WHERE reference = ?", (reference,)).fetchone()
    return dict(row) if row else None

def mark_paid(reference, status="success"):
    with _db_lock, closing(_conn()) as conn:
        conn.execute("UPDATE payments SET status = ? WHERE reference = ?", (status, reference))
        conn.commit()

import urllib.request, urllib.parse, hmac, hashlib, base64

def _paystack_init(email, plan):
    key = os.environ.get('PAYSTACK_SECRET_KEY', '')
    amount = PRO_NGN_MONTHLY if plan == 'monthly' else PRO_NGN_ANNUAL
    ref = f"LC_{uuid.uuid4().hex[:16]}"
    body = json.dumps({
        "email": email, "amount": amount, "currency": "NGN", "reference": ref,
        "metadata": {"plan": plan},
        "callback_url": f"{request.host_url.rstrip('/')}/upgrade?success=1"
    }).encode()
    req = urllib.request.Request("https://api.paystack.co/transaction/initialize", data=body, method="POST",
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    if not d.get("status"):
        raise RuntimeError(d.get("message", "Paystack error"))
    record_payment(email, "paystack", ref, plan, amount)
    return {"url": d["data"]["authorization_url"], "reference": ref}

def _stripe_checkout(email, plan):
    key = os.environ.get('STRIPE_SECRET_KEY', '')
    price = ("STRIPE_PRICE_ANNUAL" if plan == 'annual' else "STRIPE_PRICE_MONTHLY")
    price_id = os.environ.get(price, '')
    if not price_id:
        raise RuntimeError("Stripe price not configured")
    ref = f"LC_{uuid.uuid4().hex[:16]}"
    data = urllib.parse.urlencode({
        "mode": "subscription", "success_url": f"{request.host_url.rstrip('/')}/upgrade?success=1",
        "cancel_url": f"{request.host_url.rstrip('/')}/upgrade?cancel=1",
        "client_reference_id": ref,
        "customer_email": email,
        "line_items[0][price]": price_id,
        "line_items[0][quantity]": "1",
        "metadata[plan]": plan, "metadata[ref]": ref,
    }).encode()
    req = urllib.request.Request("https://api.stripe.com/v1/checkout/sessions", data=data, method="POST",
                                 headers={"Authorization": "Basic " + base64.b64encode((key + ":").encode()).decode(),
                                          "Content-Type": "application/x-www-form-urlencoded"})
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read().decode())
    record_payment(email, "stripe", ref, plan, PRO_USD_MONTHLY if plan == 'monthly' else PRO_USD_ANNUAL)
    return {"url": d["url"], "reference": ref}

@app.route('/upgrade')
def upgrade_page():
    return render_template('upgrade.html')

@app.route('/api/payments/status')
def api_payments_status():
    return jsonify({"configured": payments_configured(),
                    "ngn_monthly": PRO_NGN_MONTHLY // 100, "ngn_annual": PRO_NGN_ANNUAL // 100})

@app.route('/api/paystack/init', methods=['POST'])
def api_paystack_init():
    email = (request.form.get('email') or '').strip().lower()
    token = (request.form.get('token') or '').strip()
    plan = request.form.get('plan', 'monthly')
    if plan not in ('monthly', 'annual'):
        plan = 'monthly'
    if not auth_ok(email, token):
        return jsonify({"error": "Not authorized"}), 403
    if not os.environ.get('PAYSTACK_SECRET_KEY'):
        return jsonify({"error": "Paystack is not configured yet. Coming soon."}), 501
    try:
        return jsonify(_paystack_init(email, plan))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/stripe/checkout', methods=['POST'])
def api_stripe_checkout():
    email = (request.form.get('email') or '').strip().lower()
    token = (request.form.get('token') or '').strip()
    plan = request.form.get('plan', 'monthly')
    if plan not in ('monthly', 'annual'):
        plan = 'monthly'
    if not auth_ok(email, token):
        return jsonify({"error": "Not authorized"}), 403
    if not os.environ.get('STRIPE_SECRET_KEY'):
        return jsonify({"error": "Stripe is not configured yet. Coming soon."}), 501
    try:
        return jsonify(_stripe_checkout(email, plan))
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/webhook/paystack', methods=['POST'])
def webhook_paystack():
    key = os.environ.get('PAYSTACK_SECRET_KEY', '')
    sig = request.headers.get('x-paystack-signature', '')
    raw = request.get_data()
    if key and sig:
        expected = hmac.new(key.encode(), raw, hashlib.sha512).hexdigest()
        if not hmac.compare_digest(expected, sig):
            return jsonify({"error": "Invalid signature"}), 400
    ev = request.json or {}
    if ev.get('event') == 'charge.success':
        data = ev.get('data', {})
        ref = data.get('reference')
        email = data.get('customer', {}).get('email') or data.get('metadata', {}).get('email')
        plan = data.get('metadata', {}).get('plan', 'monthly')
        p = find_payment(ref)
        if p:
            grant_pro(p["email"], plan)
            mark_paid(ref)
            print(f"[++ PAYSTACK] {p['email']} paid {plan} ({ref})")
    return jsonify({"status": "ok"})

@app.route('/webhook/stripe', methods=['POST'])
def webhook_stripe():
    secret = os.environ.get('STRIPE_WEBHOOK_SECRET', '')
    sig_header = request.headers.get('Stripe-Signature', '')
    raw = request.get_data()
    if secret and sig_header:
        parts = dict(kv.split('=', 1) for kv in sig_header.split(','))
        ts, sig1 = parts.get('t', ''), parts.get('v1', '')
        payload = f"{ts}.{raw.decode('utf-8', 'ignore')}".encode()
        expected = hmac.new(secret.encode(), payload, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(expected, sig1):
            return jsonify({"error": "Invalid signature"}), 400
    ev = request.json or {}
    if ev.get('type') == 'checkout.session.completed':
        obj = ev.get('data', {}).get('object', {})
        meta = obj.get('metadata') or {}
        ref = meta.get('ref')
        p = find_payment(ref)
        if p:
            grant_pro(p["email"], meta.get('plan', 'monthly'))
            mark_paid(ref)
            print(f"[++ STRIPE] {p['email']} subscribed ({ref})")
    return jsonify({"status": "ok"})

def _run_job(job_id):
    try:
        j = get_job(job_id)
        if not j:
            return
        job_type = j["type"]
        raw_path = j["raw_path"]
        output_video_path = j["output_video_path"]
        output_thumb_path = j["output_thumb_path"]
        speed = j["speed"]
        ratio = j["ratio"]
        email = j.get("email")
        start_secs = j.get("start_secs") or 0
        end_secs = j.get("end_secs")
        credits_needed = j.get("credits_needed") or 0
        shared_source = j.get("shared_source", False)

        set_job(job_id, status="working", stage="Downloading", progress=3)
        ensure_disk_space()

        if job_type == "link":
            _download_video(job_id, j["url"], raw_path)

        # ----- Validate slice (cut happens inside the render pass) -----
        set_job(job_id, stage="Preparing", progress=18)
        full_dur = probe_duration(raw_path) or 0
        if full_dur:
            if start_secs and start_secs >= max(full_dur - 0.5, 1):
                raise RuntimeError(f"That start time is outside the video — it is only {_fmt_dur(full_dur)} long.")
            if end_secs and end_secs > full_dur:
                real_end = int(full_dur)
                refund = credits_needed - (real_end - (start_secs or 0))
                if refund > 0 and email:
                    u = get_user(email)
                    if u:
                        update_user(email, credits_sec=u["credits_sec"] + refund)
                        print(f"   clamped end to {_fmt_dur(full_dur)}, refunded {refund}s to {email}")
                    credits_needed -= refund
                end_secs = real_end
            dur = (end_secs - start_secs) if end_secs else max(full_dur - (start_secs or 0), 1)
        else:
            dur = credits_needed

        # ----- Render (SINGLE PASS: cut + reframe + speed + audio) -----
        set_job(job_id, stage="Rendering", progress=30)
        render_cmd = [sys.executable, os.path.join(BASE_DIR, "render_engine.py"),
                      raw_path, output_video_path, str(speed), ratio]
        if start_secs:
            render_cmd += ["--start", str(start_secs)]
        if end_secs:
            render_cmd += ["--end", str(end_secs)]
        proc = subprocess.Popen(render_cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        for line in proc.stdout:
            line = line.strip()
            if line.startswith("PROGRESS "):
                try:
                    pct = int(line.split()[1])
                    set_job(job_id, progress=30 + int(pct * 0.55))
                except Exception:
                    pass
        try:
            proc.wait(timeout=1800)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
            raise RuntimeError("Rendering timed out — that clip is too long for the current server. Try a shorter slice (2 minutes or less).")
        if proc.returncode != 0:
            tail = ""
            try:
                tail = proc.stderr.read()[-200:] if proc.stderr else ""
            except Exception:
                pass
            raise RuntimeError("Rendering failed on the server (ffmpeg)" + (f": {tail}" if tail else "") + " — try a shorter slice (2 min or less) or a different source.")
        set_job(job_id, stage="Generating thumbnail", progress=88)

        # ----- Accurate title/description from real source metadata -----
        src = get_job(job_id) or {}
        src_meta = src.get("src_meta") or {}
        if job_type == "link":
            base_title = src_meta.get("title") or ""
            uploader = src_meta.get("uploader") or ""
            src_url = src_meta.get("webpage_url") or j.get("url")
        else:
            base_title = _title_from_filename(src.get("original_filename")) or ""
            uploader = ""
            src_url = ""
        clip_label = src.get("clip_label") or ""
        title, description = build_clip_meta(clip_label, 1, 1, base_title, uploader, src_url,
                                             start_secs, end_secs, job_type == "link")

        # ----- Thumbnail (must never fail the job) -----
        thumb_text = clip_label if clip_label else ("VIRAL CLIP!" if job_type == "upload" or job_type == "upload_token" else "CLIP READY!")
        try:
            generate_viral_thumbnail(output_video_path, output_thumb_path, thumb_text)
        except Exception as e:
            print(f"[!] thumbnail skipped: {e}")
        set_job(job_id, stage="Finalizing", progress=95)

        if not shared_source and os.path.exists(raw_path):
            os.remove(raw_path)

        resp = {
            "video_url": f"/download/{os.path.basename(output_video_path)}",
            "thumb_url": f"/download/{os.path.basename(output_thumb_path)}",
            "title": title, "description": description, "thumb_text": thumb_text,
        }
        if start_secs or end_secs is not None:
            resp["clip_start"] = start_secs
            resp["clip_end"] = (start_secs + credits_needed) if credits_needed else None
        set_job(job_id, status="done", stage="Done", progress=100, result=resp,
                credits_remaining=(get_user(email)["credits_sec"] if email else None))
        print(f"[++] Job {job_id} DONE -> {title[:60]}")

    except Exception as e:
        print(f"[!] Job {job_id} failed: {e}")
        j = get_job(job_id)
        if j:
            if not j.get("shared_source") and j.get("raw_path") and os.path.exists(j["raw_path"]):
                try: os.remove(j["raw_path"])
                except OSError: pass
            if j.get("email") and j.get("credits_needed"):
                u = get_user(j["email"])
                if u:
                    update_user(j["email"], credits_sec=u["credits_sec"] + j["credits_needed"])
                    print(f"   refunded {j['credits_needed']}s to {j['email']}")
            rem = get_user(j["email"])["credits_sec"] if j.get("email") and get_user(j["email"]) else None
            set_job(job_id, status="failed", stage="Failed", progress=0,
                    error=str(e), credits_remaining=rem)

@app.route('/job/<job_id>')
def job_status(job_id):
    j = get_job(job_id)
    if not j:
        return jsonify({"error": "Job not found"}), 404
    return jsonify({
        "status": j.get("status"), "stage": j.get("stage"), "progress": j.get("progress", 0),
        "error": j.get("error"), "result": j.get("result"),
        "credits_remaining": j.get("credits_remaining"), "queued_at": j.get("created_at"),
    })

@app.route('/download/<filename>')
def download_file(filename):
    return send_from_directory(OUTPUT_FOLDER, filename, as_attachment=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
