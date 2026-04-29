import { registerEngine } from './registry';
import { CamelotEngine, EngineRequest, EngineResult } from './types';

function createStubEngine(id: CamelotEngine['id'], name: string, domain: CamelotEngine['domain'], description: string): CamelotEngine {
  return {
    id,
    name,
    domain,
    description,
    async run(request: EngineRequest): Promise<EngineResult> {
      return {
        engineId: id,
        ok: true,
        output: {
          note: `${name} executed (stub). Replace with real implementation.`,
          input: request.input,
          context: request.context,
        },
      };
    },
  };
}

// Register all 9 engines as stubs
registerEngine(createStubEngine('APEE', 'APEE (Prompt Compiler)', 'input_compilation', 'Triple-QFT input normalization and Titan prompt compilation'));
registerEngine(createStubEngine('VIDENEPTUS', 'VIDENEPTUS (Reasoning)', 'logic_reasoning', 'ToT/GoT reasoning with LaC'));
registerEngine(createStubEngine('OUROBOROS', 'OUROBOROS (Memory)', 'memory_truth', 'UKG generation, compression, GraphRAG'));
registerEngine(createStubEngine('ANTIGRAVITY', 'ANTIGRAVITY (Safety/I-O)', 'execution_io', 'Atomic writes, safety middleware'));
registerEngine(createStubEngine('AETHER', 'AETHER (Connectivity)', 'connectivity', 'MCP routing via Saltare gateway'));
registerEngine(createStubEngine('GENESIS', 'GENESIS (Persona)', 'persona', 'Persona forge via MPI vectors'));
registerEngine(createStubEngine('VERITAS', 'VERITAS (Verification)', 'verification', 'Fact/logic auditing and hallucination prevention'));
registerEngine(createStubEngine('AURORA', 'AURORA (Vision)', 'vision', 'Visual embedding processing'));
registerEngine(createStubEngine('LYRICUS', 'LYRICUS (Audio)', 'audio_voice', 'Audio generation and phonetic synthesis'));
