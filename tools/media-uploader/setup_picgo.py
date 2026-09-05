#!/usr/bin/env python3
"""Install/configure PicGo S3 settings for this site's Cloudflare R2 buckets."""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from datetime import datetime
from pathlib import Path

CONFIGS = {
    "image": ("kielas-nas-picture", "kielas-blog-assets", "https://image.kielasovo.com"),
    "sound": ("kielas-nas-music", "kielas-blog-assets", "https://sound.kielasovo.com"),
    "video": ("Kielas-nas-video", "kielas-blog-assets", "https://video.kielasovo.com"),
}


def roots() -> list[Path]:
    home = Path.home()
    if sys.platform == "win32":
        return [Path(os.environ.get("APPDATA", home / "AppData" / "Roaming")) / "picgo"]
    if sys.platform == "darwin":
        return [home / "Library/Application Support/picgo", home / ".config/picgo", home / ".picgo"]
    return [home / ".config/picgo", home / ".picgo"]


def choose_root() -> Path:
    for root in roots():
        if (root / "data.json").is_file():
            return root
    root = roots()[0]
    root.mkdir(parents=True, exist_ok=True)
    return root

def install_picgo() -> Path:
    npm = shutil.which("npm")
    if not npm:
        raise RuntimeError("未找到 npm，请先安装 Node.js： https://nodejs.org/")
    root = choose_root()
    if not shutil.which("picgo"):
        subprocess.run([npm, "install", "--global", "picgo", "picgo-plugin-s3"], check=True)
    subprocess.run([npm, "install", "--prefix", str(root), "@aws-sdk/client-s3"], check=True)
    return root


def main() -> int:
    endpoint = os.environ.get("R2_ENDPOINT")
    access = os.environ.get("R2_ACCESS_KEY_ID")
    secret = os.environ.get("R2_SECRET_ACCESS_KEY")
    if not all((endpoint, access, secret)):
        raise RuntimeError("R2_ENDPOINT、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 必须同时设置")
    print("检查并安装 PicGo CLI/S3 插件…")
    root = install_picgo()
    config_path = root / "data.json"
    config = json.loads(config_path.read_text(encoding="utf-8")) if config_path.is_file() else {}
    backup = config_path.with_name(f"data.json.backup-{datetime.now():%Y%m%d-%H%M%S}")
    if config_path.is_file():
        shutil.copy2(config_path, backup)
    store = config.setdefault("uploader", {}).setdefault("aws-s3", {})
    existing = store.setdefault("configList", [])
    for media_type, (name, default_bucket, custom_url) in CONFIGS.items():
        bucket = input(f"{media_type} Bucket [{default_bucket}]: ").strip() or default_bucket
        item = next((x for x in existing if x.get("_configName") == name), None)
        if item is None:
            item = {"_configName": name, "_id": name}
            existing.append(item)
        item.update(accessKeyID=access, secretAccessKey=secret, bucketName=bucket, region="auto",
                    endpoint=endpoint, uploadPath="{year}/{month}/{fullName}",
                    outputURLPattern=f"{custom_url}/{{path}}", pathStyleAccess=False, acl="public-read")
    store["defaultId"] = existing[0]["_id"]
    config_path.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"已写入 PicGo 配置：{config_path}")
    if backup.exists():
        print(f"原配置备份：{backup}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"配置失败：{error}", file=sys.stderr)
        raise SystemExit(1)
