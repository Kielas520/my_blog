#!/usr/bin/env python3
"""Upload media through the locally installed PicGo S3 plugin."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tempfile
import time
from datetime import datetime
from pathlib import Path
from typing import Any


PICGO_DIRECTORY = Path.home() / "AppData" / "Roaming" / "picgo"
PICGO_CONFIG = PICGO_DIRECTORY / "data.json"
PICGO_CLI = PICGO_DIRECTORY / "node_modules" / ".bin" / "picgo.cmd"
LOG_PATH = Path(__file__).resolve().parent / "upload.log"

CONFIG_NAMES = {
    "image": "kielas-nas-picture",
    "sound": "kielas-nas-music",
    "video": "Kielas-nas-video",
}

MAX_UPLOAD_ATTEMPTS = 4
RETRY_DELAYS_SECONDS = (1, 2, 4)
TRANSIENT_ERROR_PATTERN = re.compile(
    r"network socket|TLS connection|ECONNRESET|ETIMEDOUT|ECONNREFUSED|"
    r"EAI_AGAIN|socket hang up|fetch failed|timed?\s*out|RequestTimeout|"
    r"SlowDown|InternalError|ServiceUnavailable|HTTP\s+5\d\d",
    re.IGNORECASE,
)


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="根据 PicGo 配置上传图片、音频或视频，并持久记录上传 URL。"
    )
    parser.add_argument(
        "--type",
        required=True,
        choices=CONFIG_NAMES,
        help="选择 PicGo 配置：image、sound 或 video",
    )
    parser.add_argument(
        "--source",
        required=True,
        type=Path,
        help="需要上传的本地文件路径",
    )
    return parser.parse_args()


def load_config() -> dict[str, Any]:
    if not PICGO_CONFIG.is_file():
        raise RuntimeError(f"找不到 PicGo 配置：{PICGO_CONFIG}")
    try:
        return json.loads(PICGO_CONFIG.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"无法读取 PicGo 配置：{error}") from error


def select_config(config: dict[str, Any], media_type: str) -> dict[str, Any]:
    config_name = CONFIG_NAMES[media_type]
    try:
        uploader_store = config["uploader"]["aws-s3"]
        config_list = uploader_store["configList"]
        selected = next(item for item in config_list if item.get("_configName") == config_name)
    except (KeyError, TypeError, StopIteration) as error:
        raise RuntimeError(f"PicGo 中找不到配置：{config_name}") from error

    # Only the temporary in-memory copy is changed; the real data.json is untouched.
    uploader_store["defaultId"] = selected["_id"]
    config.setdefault("picBed", {})["uploader"] = "aws-s3"
    config["picBed"]["current"] = "aws-s3"
    config["picBed"]["aws-s3"] = selected
    return config


def extract_url(output: str, media_type: str) -> str:
    expected_hosts = {
        "image": "image.kielasovo.com",
        "sound": "sound.kielasovo.com",
        "video": "video.kielasovo.com",
    }
    urls = re.findall(r"https?://[^\s\]\[\"'<>]+", output)
    matching_urls = [url.rstrip(".,;)") for url in urls if expected_hosts[media_type] in url]
    if not matching_urls:
        raise RuntimeError("PicGo 未返回可识别的上传 URL，请检查下面的 PicGo 输出。")
    return matching_urls[-1]


def upload(source: Path, media_type: str, config: dict[str, Any]) -> str:
    if not PICGO_CLI.is_file():
        raise RuntimeError(f"找不到 PicGo CLI：{PICGO_CLI}")

    temporary_path: Path | None = None
    try:
        # Keeping the temp file beside data.json lets PicGo discover its installed plugins.
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".json",
            prefix="media-uploader-",
            dir=PICGO_DIRECTORY,
            delete=False,
        ) as temporary_file:
            json.dump(config, temporary_file, ensure_ascii=False, indent=2)
            temporary_path = Path(temporary_file.name)

        command = [
            str(PICGO_CLI),
            "--config",
            str(temporary_path),
            "upload",
            str(source),
        ]
        result = subprocess.run(
            command,
            cwd=PICGO_DIRECTORY,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            check=False,
        )
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
    entry = f"[{timestamp}]\nsource: {source}\nurl: {url}\n\n"
    with LOG_PATH.open("a", encoding="utf-8", newline="\n") as log_file:
        log_file.write(entry)


def upload_with_retry(source: Path, media_type: str, config: dict[str, Any]) -> str:
    for attempt in range(1, MAX_UPLOAD_ATTEMPTS + 1):
        try:
            return upload(source, media_type, config)
        except RuntimeError as error:
            retryable = TRANSIENT_ERROR_PATTERN.search(str(error)) is not None
            if not retryable or attempt == MAX_UPLOAD_ATTEMPTS:
                raise
            delay = RETRY_DELAYS_SECONDS[attempt - 1]
            print(
                f"上传连接中断，将在 {delay} 秒后重试（{attempt + 1}/{MAX_UPLOAD_ATTEMPTS}）…",
                file=sys.stderr,
            )
            time.sleep(delay)

    raise RuntimeError("上传重试意外结束")


def main() -> int:
    arguments = parse_arguments()
    source = arguments.source.expanduser().resolve()
    if not source.is_file():
        print(f"上传失败：源文件不存在或不是文件：{source}", file=sys.stderr)
        return 1

    try:
        config = select_config(load_config(), arguments.type)
        url = upload_with_retry(source, arguments.type, config)
        append_log(source, url)
    except RuntimeError as error:
        print(f"上传失败：{error}", file=sys.stderr)
        return 1

    print(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
