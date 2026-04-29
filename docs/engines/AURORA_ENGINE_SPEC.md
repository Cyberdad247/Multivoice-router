# AURORA Engine – Multimodal Vision Engine Spec

Camelot-OS | Multimodal Vision Layer

AURORA is Camelot-OS's dedicated multimodal vision engine. It converts images and videos into rich, queryable visual tokens and serves as the system's visual cortex, enabling agents to reason over pixels instead of only text.

## 1. Role and Scope

### Primary Role

AURORA specializes in multimodal vision. It is responsible for:

- Encoding images and videos into structured visual tokens.
- Grounding visual state in long-context memory.
- Supporting vision-language-action planning and agentic workflows.

### Non-goals

AURORA is not:

- a full-stack UI framework,
- a rendering engine,
- a game engine,
- or a replacement for desktop/mobile execution agents.

AURORA feeds perceptual understanding into agents and planners.

## 2. Core Architecture

AURORA has three main layers:

1. Visual Encoder
2. Perception-Token Layer
3. Multimodal Fusion Layer

## 2.1 Visual Encoder

The visual encoder converts raw pixels into patch-based embeddings.

### Input

- RGB image: `(B, C, H, W)`
- Video clip: `(B, T, C, H, W)`

### Processing

- Patchify into `N` visual patches.
- Encode with a ViT-style backbone.
- Emit `patch_embeddings` with shape `(B, N, D)`.

### Bounds

- Default image resolution: `224-336px`
- Video frame cap: configurable, usually `1-16` frames.
- Large frames should use windowed or multi-resolution processing.

## 2.2 Perception-Token Layer

The perception-token layer converts embeddings into sparse, indexable visual tokens.

### Option A: VQVAE-style perception tokens

Input:

```text
patch_embeddings
```

Process:

- optional auxiliary heads for objectness, depth, bounding boxes, or pose,
- low-dimensional latent projection,
- VQ codebook quantization,
- output discrete or dense perception tokens.

Output:

```text
visual_tokens: (B, N, D_token)
```

or:

```text
visual_tokens: (B, N, num_codes)
```

### Option B: Sparse patch indexing

Process:

- map each patch to top-k learned visual indices,
- store index ids and weights,
- optionally aggregate to a fused visual embedding.

Output:

```text
patch_id -> [index_1, index_2, ... index_k] + weights
```

## 2.3 Multimodal Fusion Layer

AURORA exposes a multimodal stream that downstream agents can consume.

### Input Streams

- `visual_tokens`
- `text_tokens`
- optional `audio_tokens`

### Fusion

- Interleave text and visual tokens.
- Optionally use MoE-style routing for specialized perception lanes.
- Emit context-aware multimodal embeddings.

### Output Consumers

AURORA outputs can feed:

- Merlin/Videneptus for reasoning,
- PhoneClaw for Android visual state,
- RustDesk Agent for desktop visual state,
- superpowers-chrome for browser screenshots,
- OUROBOROS for visual memory storage,
- AETHER for visual-tool routing.

## 3. Python Package Shape

```text
aurora_engine/
  vision/
    encoder.py
    tokenizers.py
  multimodal/
    fusion.py
  langgraph/
    nodes.py
```

## 3.1 AuroraProcessor Interface

```python
from typing import List, Dict, Any
import torch

class AuroraProcessor:
    def __init__(self, config: Dict[str, Any]):
        """
        Config fields:
          - vision_model: ViT-style backbone
          - tokenizer_type: vqvae | ovis_index
          - vq_codebook_size: int
          - max_frames: int
          - fusion_mode: interleave | moe | pooled
        """
        ...

    def encode(self, image_or_video: torch.Tensor) -> Dict[str, torch.Tensor]:
        """
        Args:
          image_or_video: (B, C, H, W) or (B, T, C, H, W)

        Returns:
          {
            visual_tokens,
            patch_indices,
            embedding
          }
        """
        ...

    def query_visual(self, query_text: str, visual_tokens_history: List[Dict]) -> Dict[str, Any]:
        """
        Ground text query into stored visual tokens.
        """
        ...

    def decode_action(self, plan_text: str, current_visual_tokens: Dict) -> Dict[str, Any]:
        """
        Suggest vision-language-action subgoals grounded in current visual state.
        """
        ...
```

## 3.2 LangGraph Nodes

```python
from langgraph.graph import State

def extract_visual_state(state: State) -> State:
    frames = state['frames']
    processor = state['aurora_processor']
    tokens = processor.encode(frames)
    state['visual_tokens'] = tokens
    return state

def retrieve_visual_memory(state: State) -> State:
    query = state['query']
    history = state['visual_tokens_history']
    result = state['aurora_processor'].query_visual(query, history)
    state['retrieved_visual_memory'] = result
    return state

def plan_visual_action(state: State) -> State:
    plan = state['plan_text']
    current = state['visual_tokens']
    subgoals = state['aurora_processor'].decode_action(plan, current)
    state['visual_subgoals'] = subgoals
    return state
```

## 4. Camelot Runtime Integration

### AURORA in the engine pipeline

```text
image/video input
  -> AURORA encode
  -> visual tokens
  -> VIDENEPTUS reasoning
  -> AETHER tool route
  -> ANTIGRAVITY execution gate
  -> OUROBOROS memory write
```

### AURORA with edge nodes

```text
PhoneClaw screenshot     -> AURORA visual state
RustDesk screenshot      -> AURORA desktop state
Chrome tab screenshot    -> AURORA browser state
Camera/image upload      -> AURORA object/context extraction
```

## 5. Memory Integration

AURORA visual outputs should be stored through OUROBOROS using L0/L1/L2 tiering.

```text
L0: one-line visual summary
L1: structured visual scene description
L2: full image/video artifact reference
```

Recommended visual memory path:

```text
viking://camelot/vision/l0
viking://camelot/vision/l1
viking://camelot/vision/l2
```

## 6. Upgrade Hooks

AURORA can support:

- auxiliary perception heads,
- perception-token codebooks,
- sparse patch indexing,
- unified multimodal fusion,
- EM-CoT-style visual action chains,
- visual memory search,
- screen-state comparison over time.

## 7. Reality / Design Legend

### Published or directly aligned concepts

- ViT-style visual encoders
- patch embeddings
- multimodal token fusion
- VQ-style discrete tokenization patterns
- vision-language-action planning patterns

### Plausible Camelot extrapolations

- perception tokens as OS-level visual memory,
- sparse visual filesystem indexing,
- using visual tokens for PhoneClaw/RustDesk/Chrome agent state,
- visual memory recall through OpenViking.

### Camelot internal design fiction

- Camelot-OS as a complete AI operating system label,
- AURORA as one of nine named core engines,
- runic engine metaphors and Knight-layer persona bindings.

## 8. Golden Rule

AURORA does not execute actions. AURORA sees, encodes, grounds, and explains. Execution still routes through AETHER and must pass ANTIGRAVITY when touching real devices or files.
