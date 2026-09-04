#!/usr/bin/env python3
"""
Li3ht Clip — FAST ffmpeg-native renderer (SINGLE PASS: cut + reframe + speed + audio).

Performance tuned for tiny cloud CPUs (Render free = 0.1 core):
- preset ultrafast + CRF 25 (override via RENDER_PRESET / RENDER_CRF env)
- caps output to 30fps when the source is 60fps (halves encode cost)
- monotonic, frame-based progress reporting (no more "stuck at 85%")
- captures ffmpeg stderr so failures report a *real* reason

Usage: python3 render_engine.py <input> <output> [speed] [9_16|16_9] [--start SECS] [--end SECS]
"""
import os, sys, json, glob, shutil, tempfile, threading, subprocess

TARGET = {"9_16": (640, 1136), "16_9": (1136, 640)}
PRESET = os.environ.get("RENDER_PRESET", "ultrafast")
CRF = os.environ.get("RENDER_CRF", "25")
MAX_FPS = 30

def run(cmd, **kw):
    return subprocess.run(cmd, capture_output=True, text=True, **kw)

def probe(path):
    out = run(["ffprobe", "-v", "error", "-print_format", "json",
               "-show_format", "-show_streams", path])
    d = json.loads(out.stdout or "{}")
    fmt = d.get("format", {})
    dur = float(fmt.get("duration") or 0)
    v = next((s for s in d.get("streams", []) if s["codec_type"] == "video"), None)
    if not v:
        raise RuntimeError("No video stream found")
    w, h = int(v["width"]), int(v["height"])
    fps = 30.0
    try:
        num, den = (v.get("avg_frame_rate") or "30/1").split("/")
        fps = float(num) / float(den) if float(den) else 30.0
    except Exception:
        pass
    has_audio = any(s["codec_type"] == "audio" for s in d.get("streams", []))
    return {"duration": dur, "width": w, "height": h, "fps": fps, "has_audio": has_audio}

def sample_frames(path, n=6):
    info = probe(path)
    dur = info["duration"]
    if dur <= 0:
        return [], None
    d = tempfile.mkdtemp(prefix="lc_frames_")
    step = max(dur / (n + 1), 0.3)
    pat = os.path.join(d, "f_%02d.jpg")
    r = subprocess.run(["ffmpeg", "-y", "-i", path,
                        "-vf", f"fps=1/{step:.3f},scale=240:-2",
                        "-frames:v", str(n), "-q:v", "5", pat],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    files = sorted(glob.glob(os.path.join(d, "f_*.jpg"))) if r.returncode == 0 else []
    return files, d

def face_x_fractions(frames):
    try:
        import cv2
    except Exception:
        return None
    detection = None
    try:
        cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
        if not cascade.empty():
            def detect_haar(img):
                gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
                faces = cascade.detectMultiScale(gray, 1.2, 5, minSize=(40, 40))
                if len(faces) == 0:
                    return None
                fx, fy, fw, fh = max(faces, key=lambda f: f[2] * f[3])
                return (fx + fw / 2) / img.shape[1]
            detection = detect_haar
    except Exception:
        detection = None
    if detection is None:
        try:
            model = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                 "face_detection_yunet_2023mar.onnx")
            if os.path.exists(model):
                det = cv2.FaceDetectorYN.create(model, "", (240, 240), 0.6, 0.3, 500)
                def detect_yunet(img):
                    det.setInputSize((img.shape[1], img.shape[0]))
                    ok, faces = det.detect(img)
                    if not ok or faces is None or len(faces) == 0:
                        return None
                    f = max(faces, key=lambda x: x[2] * x[3])
                    return (f[0] + f[2] / 2) / img.shape[1]
                detection = detect_yunet
        except Exception:
            detection = None
    if detection is None:
        return None
    xs = []
    for fp in frames:
        try:
            import cv2
            img = cv2.imread(fp)
            if img is None:
                continue
            x = detection(img)
            if x is not None:
                xs.append(x)
        except Exception:
            continue
    return xs if xs else None

def build_filter(frac_x, info, speed, ratio):
    w, h = info["width"], info["height"]
    tw, th = TARGET[ratio]
    parts = []
    if ratio == "9_16" and frac_x is not None and w > h * 9 / 16 * 1.08:
        crop_w = int(h * 9 / 16)
        x = int(frac_x * w - crop_w / 2)
        x = max(0, min(w - crop_w, x))
        parts.append(f"crop={crop_w}:{h}:{x}:0")
        parts.append(f"scale={tw}:{th}:flags=lanczos")
    else:
        parts.append(f"scale={tw}:{th}:force_original_aspect_ratio=increase:flags=lanczos")
        parts.append(f"crop={tw}:{th}")
    if info["fps"] > MAX_FPS + 1:
        parts.append(f"fps={MAX_FPS}")
    parts.append("setsar=1")
    parts.append(f"setpts=PTS/{speed}")
    return ",".join(parts)

def render(input_path, output_path, speed=1.12, ratio="9_16", start_secs=None, end_secs=None):
    info = probe(input_path)
    frames, frame_dir = sample_frames(input_path)
    frac = face_x_fractions(frames)
    shutil.rmtree(frame_dir, ignore_errors=True)
    vf = build_filter(frac, info, speed, ratio)

    gen_dur = (end_secs - start_secs) if end_secs else info["duration"]
    if start_secs and not end_secs:
        gen_dur = max(info["duration"] - start_secs, 0)
    out_fps = MAX_FPS if info["fps"] > MAX_FPS + 1 else info["fps"]
    expected_frames = int(max(gen_dur, 0) * out_fps)

    cmd = ["ffmpeg", "-y", "-loglevel", "error"]
    if start_secs and start_secs > 0:
        cmd += ["-ss", f"{float(start_secs):.3f}"]
    if end_secs and end_secs > (start_secs or 0):
        cmd += ["-t", f"{float(end_secs - (start_secs or 0)):.3f}"]
    cmd += ["-i", input_path]
    cmd += ["-filter:v", vf, "-progress", "pipe:1", "-nostats"]
    if info["has_audio"]:
        cmd += ["-filter:a", f"atempo={speed}", "-c:a", "aac", "-b:a", "160k"]
    else:
        cmd += ["-an"]
    cmd += ["-c:v", "libx264", "-preset", PRESET, "-crf", CRF,
            "-pix_fmt", "yuv420p", "-movflags", "+faststart", output_path]

    proc = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    err_lines = []
    def drain():
        for line in proc.stderr:
            line = line.strip()
            if line:
                err_lines.append(line)
    t = threading.Thread(target=drain, daemon=True)
    t.start()

    pct = 0
    seen_pct = -1
    for line in proc.stdout:
        line = line.strip()
        try:
            if line.startswith("frame="):
                fr = int(line.split("=", 1)[1])
                if expected_frames > 0:
                    pct = min(100, int(fr / expected_frames * 100))
            elif line.startswith("out_time_us=") or line.startswith("out_time_ms="):
                us = int(line.split("=", 1)[1])
                secs = us / 1_000_000 if line.startswith("out_time_us=") else us / 1_000
                if (gen_dur or 0) > 0:
                    pct = max(pct, min(100, int(secs / (gen_dur / speed) * 100)))
        except Exception:
            pass
        if pct > seen_pct:
            seen_pct = pct
            print(f"PROGRESS {pct}", flush=True)
    proc.wait()
    t.join(timeout=2)
    if proc.returncode != 0:
        detail = " | ".join(err_lines[-3:]) or "ffmpeg exited non-zero"
        raise RuntimeError(f"ffmpeg error: {detail[:180]}")
    print("PROGRESS 100", flush=True)

def main():
    args = sys.argv[1:]
    if len(args) < 2:
        print("Usage: python3 render_engine.py <input> <output> [speed] [9_16|16_9] [--start SECS] [--end SECS]")
        sys.exit(1)
    inp, out = args[0], args[1]
    speed = float(args[2]) if len(args) > 2 else 1.12
    ratio = args[3] if len(args) > 3 else "9_16"
    start = end = None
    for i, a in enumerate(args):
        if a == "--start" and i + 1 < len(args):
            start = float(args[i + 1])
        if a == "--end" and i + 1 < len(args):
            end = float(args[i + 1])
    render(inp, out, speed=speed, ratio=ratio, start_secs=start, end_secs=end)
    print("[++] Render complete", flush=True)

if __name__ == "__main__":
    main()
