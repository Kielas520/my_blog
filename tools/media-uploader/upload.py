#!/usr/bin/env python3
"""Upload media through the locally installed PicGo S3 plugin."""

from __future__ import annotations

import argparse
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any


CONFIG_NAMES = {
    "image": "kielas-nas-picture",
    "sound": "kielas-nas-music",
    "video": "Kielas-nas-video",
}
LOG_PATH = Path(__file__).resolve().parent / "upload.log"
MAX_UPLOAD_ATTEMPTS = 4
RETRY_DELAYS_SECONDS = (1, 2, 4)
TRANSIENT_ERROR_PATTERN = re.compile(
    r"network socket|TLS connection|ECONNRESET|ETIMEDOUT|ECONNREFUSED|"
    r"EAI_AGAIN|socket hang up|fetch failed|timed?\s*out|RequestTimeout|"
    r"SlowDown|InternalError|ServiceUnavailable|HTTP\s+5\d\d",
    re.IGNORECASE,
)


def picgo_locations() -> list[tuple[Path, Path]]:
    home = Path.home()
    if sys.platform == "win32":
        root = Path(os.environ.get("APPDATA", home / "AppData" / "Roaming")) / "picgo"
        roots = [root, home / "AppData" / "Roaming" / "picgo"]
        cli_names = ("picgo.cmd", "picgo.exe", "picgo")
    elif sys.platform == "darwin":
        roots = [
            home / "Library" / "Application Support" / "picgo",
            home / ".config" / "picgo",
            home / ".picgo",
        ]
        cli_names = ("picgo", "picgo.cmd")
    else:
        roots = [home / ".config" / "picgo", home / ".picgo"]
        cli_names = ("picgo", "picgo.cmd")

    locations: list[tuple[Path, Path]] = []
    executable = shutil.which("picgo")
    if executable:
        locations.append((Path(executable).parent, Path(executable)))
    for root in dict.fromkeys(roots):
        for name in cli_names:
            locations.append((root, root / "node_modules" / ".bin" / name))
    return locations


def locate_picgo() -> tuple[Path, Path, Path]:
    for directory, cli in picgo_locations():
        config = directory / "data.json"
        if config.is_file() and cli.is_file():
            return directory, config, cli
    searched = ", ".join(str(path) for _, path in picgo_locations())
    raise RuntimeError(f"找不到 PicGo 配置或 CLI，请检查这些路径：{searched}")


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="根据 PicGo 配置上传图片、音频或视频。")
    parser.add_argument("--type", required=True, choices=CONFIG_NAMES)
    parser.add_argument("--source", required=True, type=Path)
    return parser.parse_args()


def load_config(config_path: Path) -> dict[str, Any]:
    try:
        return json.loads(config_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"无法读取 PicGo 配置：{error}") from error


def select_config(config: dict[str, Any], media_type: str) -> dict[str, Any]:
    config_name = CONFIG_NAMES[media_type]
    try:
        uploader_store = config["uploader"]["aws-s3"]
        selected = next(item for item in uploader_store["configList"] if item.get("_configName") == config_name)
    except (KeyError, TypeError, StopIteration) as error:
        raise RuntimeError(f"PicGo 中找不到配置：{config_name}") from error

    endpoint = os.environ.get("R2_ENDPOINT")
    access_key = os.environ.get("R2_ACCESS_KEY_ID")
    secret_key = os.environ.get("R2_SECRET_ACCESS_KEY")
    if any((endpoint, access_key, secret_key)):
        if not all((endpoint, access_key, secret_key)):
            raise RuntimeError("R2_ENDPOINT、R2_ACCESS_KEY_ID、R2_SECRET_ACCESS_KEY 必须同时设置")
        selected = selected.copy()
        selected.update(endpoint=endpoint, accessKeyID=access_key, secretAccessKey=secret_key)

    uploader_store["defaultId"] = selected["_id"]
    config.setdefault("picBed", {})["uploader"] = "aws-s3"
    config["picBed"]["current"] = "aws-s3"
    config["picBed"]["aws-s3"] = selected
    return config


def extract_url(output: str, media_type: str) -> str:
    expected_hosts = {"image": "image.kielasovo.com", "sound": "sound.kielasovo.com", "video": "video.kielasovo.com"}
    urls = re.findall(r"https?://[^\s\]\[\"'<>]+", output)
    matching_urls = [url.rstrip(".,;)") for url in urls if expected_hosts[media_type] in url]
    if not matching_urls:
        raise RuntimeError("PicGo 未返回可识别的上传 URL，请检查下面的 PicGo 输出。")
    return matching_urls[-1]


def upload(source: Path, media_type: str, config: dict[str, Any], directory: Path, cli: Path) -> str:
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".json", prefix="media-uploader-", dir=directory, delete=False) as temporary_file:
            json.dump(config, temporary_file, ensure_ascii=False, indent=2)
            temporary_path = Path(temporary_file.name)
        result = subprocess.run([str(cli), "--config", str(temporary_path), "upload", str(source)], cwd=directory, capture_output=True, text=True, encoding="utf-8", errors="replace", check=False)
        combined_output = "\n".join(part for part in (result.stdout, result.stderr) if part).strip()
        if result.returncode != 0:
            raise RuntimeError(f"PicGo 上传失败（退出码 {result.returncode}）：\n{combined_output}")
        try:
            return extract_url(combined_output, media_type)
        except RuntimeError as error:
            raise RuntimeError(f"{error}\n{combined_output}") from error
    finally:
        if temporary_path is not None:
            temporary_path.unlink(missing_ok=True)


def append_log(source: Path, url: str) -> None:
    timestamp = datetime.now().astimezone().isoformat(timespec="seconds")
    with LOG_PATH.open("a", encoding="utf-8", newline="\n") as log_file:
        log_file.write(f"[{timestamp}]\nsource: {source}\nurl: {url}\n\n")


def main() -> int:
    arguments = parse_arguments()
    source = arguments.source.expanduser().resolve()
    if not source.is_file():
        print(f"上传失败：源文件不存在或不是文件：{source}", file=sys.stderr)
        return 1
    try:
        directory, config_path, cli = locate_picgo()
        config = select_config(load_config(config_path), arguments.type)
        for attempt in range(1, MAX_UPLOAD_ATTEMPTS + 1):
            try:
                url = upload(source, arguments.type, config, directory, cli)
                break
            except RuntimeError as error:
                if not TRANSIENT_ERROR_PATTERN.search(str(error)) or attempt == MAX_UPLOAD_ATTEMPTS:
                    raise
                delay = RETRY_DELAYS_SECONDS[attempt - 1]
                print(f"上传连接中断，将在 {delay} 秒后重试（{attempt + 1}/{MAX_UPLOAD_ATTEMPTS}）…", file=sys.stderr)
                time.sleep(delay)
        append_log(source, url)
    except RuntimeError as error:
        print(f"上传失败：{error}", file=sys.stderr)
        return 1
    print(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
