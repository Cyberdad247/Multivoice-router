# MMAP – Mental Model Application Protocol

Camelot-OS | Merlin Reasoning Cartridge for Knight Forging

MMAP is the structured reasoning protocol Merlin uses during the schematic phase of Knight creation. It selects and applies mental models before GENESIS forges a Knight, ensuring each Knight receives a stable cognition lattice instead of a loose persona description.

## Source Upload

- Component Type: Tool
- Codename: MMAP
- Version: 1.0
- Framework: Core Systems
- Core Function: Structured approach for applying mental models to problem-solving
- Associated Agents: Arthur, Guinevere, Merlin, Round Table
- LLM Compatibility: Any LLM, Claude Opus, GPT-4, Gemini

## Correct Camelot Role

```text
MMAP belongs to Merlin.
```

MMAP is not primarily a generic user-facing decision-support module. In Camelot, its core use is:

```text
Anya scan
  -> Merlin MMAP cognitive lattice
  -> GENESIS Knight forge
  -> Soul Matrix / νKG output
  -> OUROBOROS memory write
```

## Purpose

```text
MMAP
= select mental models for a Knight's cognition
+ explain why they apply
+ synthesize a reasoning lattice
+ produce Proteus and SkillGraph hints
+ preserve the reasoning trace
```

MMAP turns the Lord Nexus 100 Mental Models cartridge into a practical Knight-design layer.

## Five-Stage Workflow

### 1. Input Clarification

Parse the Knight request for:

- domain,
- mission,
- constraints,
- risk profile,
- required behavior,
- reasoning style,
- failure modes.

If confidence is low, ask one clarifying question at a time.

### 2. Model Selection

Map the Knight mission to candidate mental models using metadata:

- domain relevance,
- decision type,
- risk pattern,
- bias exposure,
- systems complexity,
- user experience level.

### 3. Ranking and Explanation

Rank candidates and select 3-7 models.

Each selected model should include:

- definition,
- why it applies to the Knight,
- what behavior it creates,
- limitations,
- failure modes it prevents.

### 4. Latticework Synthesis

Combine selected models into a cognitive lattice.

Output should identify:

- complementary models,
- conflicts or tradeoffs,
- application order,
- Proteus vector hints,
- SkillGraph4 hints.

### 5. Reflection and Learning

Generate reflection prompts to preserve design rationale.

Examples:

- What assumption did this model expose?
- Which model most shaped this Knight's behavior?
- What downstream consequence must this Knight always check?

## Runtime Algorithm

```python
def mmap_for_knight_forge(knight_request):
    context = parse_knight_request(knight_request)
    while confidence(context) < 0.95:
        question = generate_clarifying_question(context)
        user_response = get_response(question)
        context.update(user_response)

    candidates = query_lord_nexus_model_library(context)
    ranked = rank_models(candidates, context)
    selected = select_top_models(ranked, max=7)
    lattice = synthesize_cognitive_lattice(selected)
    proteus_hints = derive_proteus_biases(lattice, context)
    skillgraph_hints = derive_skillgraph_hints(lattice, context)
    reflection = generate_reflection_prompts(selected)
    return {
        "selected_models": selected,
        "cognitive_lattice": lattice,
        "proteus_hints": proteus_hints,
        "skillgraph_hints": skillgraph_hints,
        "reflection": reflection,
    }
```

## Camelot Integration

### Merlin / Videneptus

Use MMAP during Knight schematic design.

```text
Titan Prompt
  -> MMAP model selection
  -> cognitive lattice
  -> Proteus hints
  -> SkillGraph hints
  -> GENESIS forgeKnight()
```

### Genesis

GENESIS consumes MMAP output to create:

- Proteus vector defaults,
- SkillGraph4 tiers,
- mythos anchors,
- νKG Crystal,
- activation prompt.

### Veritas

Veritas audits MMAP output for:

- unsupported reasoning models,
- bias overfitting,
- weak causality,
- missing inversion,
- missing second-order effects.

### Ouroboros

OUROBOROS stores selected mental models as UKG anchors so future sessions can recover why a Knight behaves the way it does.

## Core Model Starter Set for Knight Forging

- First Principles Thinking
- Second-Order Thinking
- Inversion
- Opportunity Cost
- Circle of Competence
- Occam's Razor
- Hanlon's Razor
- Probabilistic Thinking
- Bayesian Updating
- Margin of Safety
- Compounding
- Incentives
- Bottlenecks
- Feedback Loops
- Network Effects

## Runtime Adapter

The TypeScript adapter lives at:

```text
src/merlin/mmap-knight-forge.ts
```

It exposes:

```ts
applyMmapToKnightForge(input)
```

## Golden Rule

MMAP does not forge the Knight. MMAP designs the cognition lattice Merlin hands to GENESIS.
