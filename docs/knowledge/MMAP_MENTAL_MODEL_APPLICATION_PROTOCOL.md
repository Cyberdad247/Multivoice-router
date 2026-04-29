# MMAP – Mental Model Application Protocol

Camelot-OS | Reasoning Tool Cartridge

MMAP is the structured reasoning protocol for applying mental models to problem-solving. It extends the Lord Nexus mental model library with a usable selection, ranking, synthesis, and reflection workflow.

## Source Upload

- Component Type: Tool
- Codename: MMAP
- Version: 1.0
- Framework: Core Systems
- Core Function: Structured approach for applying mental models to problem-solving
- Associated Agents: Arthur, Guinevere, Merlin, Round Table
- LLM Compatibility: Any LLM, Claude Opus, GPT-4, Gemini

## Purpose

```text
MMAP
= select the right mental models
+ explain why they apply
+ synthesize them into a reasoning lattice
+ generate reflection prompts
```

MMAP is not just a list of models. It is the application layer that turns the 100-model cartridge into runtime reasoning.

## Five-Stage Workflow

### 1. Input Clarification

Parse the user request for:

- problem domain,
- uncertainty level,
- decision type,
- constraints,
- timeframe,
- stakes.

If confidence is low, ask one clarifying question at a time.

### 2. Model Selection

Map the clarified problem to candidate mental models using metadata:

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
- origin or rationale,
- when to apply,
- limitations,
- tailored example.

### 4. Latticework Synthesis

Combine selected models into a coherent reasoning map.

Output should identify:

- complementary models,
- conflicts or tradeoffs,
- application order,
- decision implications.

### 5. Reflection and Learning

Generate reflection prompts to improve user reasoning over time.

Examples:

- What assumption did this model expose?
- Which model changed the recommendation the most?
- What evidence would change the conclusion?

## Runtime Algorithm

```python
def mental_model_navigator(user_input):
    context = parse_input(user_input)
    while confidence(context) < 0.95:
        question = generate_clarifying_question(context)
        user_response = get_response(question)
        context.update(user_response)

    candidates = query_model_library(context)
    ranked = rank_models(candidates, context)
    selected = select_top_models(ranked, max=7)
    explanations = [explain_model(m, context) for m in selected]
    synthesis = synthesize_models(selected, explanations)
    reflection = generate_reflection_prompts(selected)
    return compile_report(explanations, synthesis, reflection)
```

## Camelot Integration

### Merlin / Videneptus

Use MMAP to select reasoning frameworks before planning.

```text
Titan Prompt
  -> MMAP model selection
  -> Videneptus topology selection
  -> Merlin plan synthesis
```

### Veritas

Use MMAP to detect reasoning failures:

- base-rate neglect,
- confirmation bias,
- weak causality,
- opportunity-cost blindness,
- missing second-order effects.

### Genesis

Use MMAP to create Knight cognition profiles.

### Ouroboros

Store selected mental models as UKG anchors so future sessions can recover the reasoning path.

## Core Model Starter Set

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

## Golden Rule

Do not merely name mental models. Apply them, explain their limits, synthesize their interactions, and preserve the reasoning trace.
