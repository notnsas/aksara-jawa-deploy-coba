"""Export all Aksara Jawa fine-tuned models to ONNX format for browser inference.

Run from the repo root (or any cwd) with:
    python scripts/export_onnx.py

Requirements:
    pip install torch torchvision onnx

The script:
1. Builds the MobileNetV2-HCCR architecture with 20 output classes
2. Loads the pretrained Chinese base weights (for correct architecture shape)
3. Loads each fine-tuned state_dict
4. Exports to ONNX with dynamic batch (input shape [1, 1, 64, 64])
5. Saves to aksara-jawa-app/public/models/

Model versions (file -> internal name):
    chinese_finetune_v1.pt                  -> v1
    chinese_finetune_v1.1.pt                -> v1.1
    chinese_finetune_layer10_v2.pt          -> v2
    chinese_finetune_layer10_v2.1.pt        -> v2.1
    chinese_finetune_layer14_v3.pt          -> v3
    chinese_finetune_layer14_v3.1.pt        -> v3.1
    chinese_finetune_layer14_v3.2.pt        -> v3.2   (BEST / recommended)
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import torch

REPO_ROOT = Path(__file__).resolve().parents[2]
MODELS_DIR = REPO_ROOT / "aksara-jawa" / "models"
OUTPUT_DIR = REPO_ROOT / "aksara-jawa-app" / "public" / "models"

NUM_CLASSES = 20

# display name -> checkpoint filename
MODEL_VERSIONS: dict[str, str] = {
    "v1": "chinese_finetune_v1.pt",
    "v1.1": "chinese_finetune_v1.1.pt",
    "v2": "chinese_finetune_layer10_v2.pt",
    "v2.1": "chinese_finetune_layer10_v2.1.pt",
    "v3": "chinese_finetune_layer14_v3.pt",
    "v3.1": "chinese_finetune_layer14_v3.1.pt",
    "v3.2": "chinese_finetune_layer14_v3.2.pt",
}


def build_finetuned_model(checkpoint_path: Path, num_classes: int) -> torch.nn.Module:
    """Load architecture from the pretrained Chinese checkpoint, then apply the
    fine-tuned state_dict with the replaced 20-class head."""
    checkpoint = torch.load(
        checkpoint_path,
        map_location="cpu",
        weights_only=False,
    )
    cfg_model_name = checkpoint["cfg"]["model"]
    sys.path.insert(0, str(MODELS_DIR))
    from pretrained_chinese.model import build_model

    model = build_model(cfg_model_name, num_classes=3755)
    model.load_state_dict(checkpoint["model"])

    model.classifier[1] = torch.nn.Linear(
        model.classifier[1].in_features, num_classes
    )
    return model


def export_version(version: str, filename: str, output_dir: Path) -> Path:
    ckpt_path = MODELS_DIR / filename
    if not ckpt_path.exists():
        raise FileNotFoundError(f"Missing checkpoint: {ckpt_path}")

    print(f"[{version}] building model from {ckpt_path.name} ...")
    model = build_finetuned_model(MODELS_DIR / "pretrained_chinese" / "pretrained_chinese.pt", NUM_CLASSES)
    state = torch.load(ckpt_path, map_location="cpu", weights_only=True)
    model.load_state_dict(state)
    model.eval()

    dummy = torch.randn(1, 1, 64, 64)
    logits = model(dummy)
    assert logits.shape == (1, NUM_CLASSES), f"Unexpected output {tuple(logits.shape)}"

    out_path = output_dir / f"{version}.onnx"
    torch.onnx.export(
        model,
        dummy,
        str(out_path),
        input_names=["input"],
        output_names=["logits"],
        dynamic_axes={
            "input": {0: "batch"},
            "logits": {0: "batch"},
        },
        opset_version=16,
        do_constant_folding=True,
        export_params=True,
    )
    size_mb = out_path.stat().st_size / 1e6
    print(f"[{version}] exported -> {out_path.name} ({size_mb:.2f} MB)")
    return out_path


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for version, filename in MODEL_VERSIONS.items():
        try:
            export_version(version, filename, OUTPUT_DIR)
        except FileNotFoundError as e:
            print(f"[{version}] SKIPPED: {e}")
    print("\nDone. Models are in:", OUTPUT_DIR)


if __name__ == "__main__":
    main()