/**
 * Master Application Central Configuration
 * All paths, endpoints, AI providers, storage keys, and simulator mappings
 */
window.APP_CONFIG = {
  appName: 'AI Full-Stack Architecture Hub',
  repoName: 'ai-fullstack-architecture-hub',
  repoUrl: 'https://github.com/adarshsince90/ai-fullstack-architecture-hub',
  version: '1.0.0',

  // Content & Schema Data Paths
  paths: {
    mindmapSchema: 'docs/mindmap_schema.json',
    recapMarkdown: 'docs/Definitions.md',
    searchIndex: 'docs/search_index.json'
  },

  // Browser Storage Keys
  storage: {
    recapChecklist: 'master_prep_recap_checklist',
    aiApiKey: 'ai_prep_key',
    aiChatHistory: 'ai_prep_chat_history'
  },

  // Bring-Your-Own-Key (BYOK) AI Assistant Config
  ai: {
    defaultProvider: 'groq',
    systemPrompt: `You are an expert Senior/Lead Software Engineer Interview Coach specializing in .NET 8/10, Cloud Native (AWS/Azure), Distributed Systems, OWASP Security, Modern Frontend (Angular/React), and AI Engineering. Provide clear, direct, first-principles explanations with trade-offs.`,
    providers: {
      groq: {
        id: 'groq',
        name: 'Groq (Llama 3.3 70B - Fast & Free)',
        endpoint: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'llama-3.3-70b-versatile',
        placeholder: 'Paste Groq API Key (gsk_...)...',
        type: 'openai_compat'
      },
      gemini: {
        id: 'gemini',
        name: 'Google Gemini (1.5 / 2.5 Flash)',
        endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent',
        model: 'gemini-1.5-flash',
        placeholder: 'Paste Gemini API Key...',
        type: 'gemini'
      },
      openai: {
        id: 'openai',
        name: 'OpenAI (GPT-4o / 4o-mini)',
        endpoint: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini',
        placeholder: 'Paste OpenAI API Key (sk-...)...',
        type: 'openai_compat'
      },
      openrouter: {
        id: 'openrouter',
        name: 'OpenRouter (Claude / DeepSeek)',
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'google/gemini-2.5-flash',
        placeholder: 'Paste OpenRouter Key...',
        type: 'openai_compat'
      }
    }
  },

  // Simulator Registry & Guide Mappings
  simulators: {
    'guides/01_dotnet_backend/02_aspnetcore_webapi.md': {
      url: 'interactive/01_dotnet_backend/aspnet_middleware_di_simulator.html',
      title: 'ASP.NET Core Middleware & DI Scope Simulator',
      label: '⚡ Launch Middleware & DI Simulator'
    },
    'guides/02_distributed_systems/03_saga_outbox_resiliency.md': {
      url: 'interactive/02_distributed_systems/distributed_saga_simulator.html',
      title: 'Distributed Saga Orchestrator & Compensating Actions',
      label: '⚡ Launch Saga Orchestrator Simulator'
    },
    'guides/04_security_database/01_oauth2_oidc_jwt.md': {
      url: 'interactive/04_security_database/oauth2_pkce_token_flow_simulator.html',
      title: 'OAuth 2.0 PKCE & JWT Flow Simulator',
      label: '⚡ Launch OAuth 2.0 PKCE Simulator'
    },
    'guides/05_frontend_engineering/03_js_core_event_loop.md': {
      url: 'interactive/05_frontend_engineering/browser_event_loop_simulator.html',
      title: 'Browser Event Loop & Microtask Queue Simulator',
      label: '⚡ Launch JS Event Loop Visualizer'
    },
    'guides/05_frontend_engineering/07_react_fiber_reconciliation.md': {
      url: 'interactive/05_frontend_engineering/react_rendering_visualizer.html',
      title: 'React Fiber & Reconciliation Tree Visualizer',
      label: '⚡ Launch React Fiber Visualizer'
    },
    'guides/05_frontend_engineering/06_rxjs_ngrx_signals.md': {
      url: 'interactive/05_frontend_engineering/angular_signals_reactivity_simulator.html',
      title: 'Signals vs React Virtual DOM Simulator',
      label: '⚡ Launch Signals Reactivity Simulator'
    },
    'guides/05_frontend_engineering/08_react_hooks_redux_toolkit.md': {
      url: 'interactive/05_frontend_engineering/redux_flow_simulator.html',
      title: 'Redux Toolkit State Flow & Immer Visualizer',
      label: '⚡ Launch Redux Toolkit Simulator'
    },
    'guides/05_frontend_engineering/01_fe_foundations.md': {
      url: 'interactive/05_frontend_engineering/transpile_pipeline_visualizer.html',
      title: 'esbuild / PostCSS Transpile Pipeline Visualizer',
      label: '⚡ Launch Transpile Pipeline Visualizer'
    },
    'guides/06_ai_engineering/01_rag_vector_search.md': {
      url: 'interactive/06_ai_engineering/rag_pipeline_simulator.html',
      title: 'RAG & Vector Search Pipeline Simulator',
      label: '⚡ Launch RAG Vector Search Simulator'
    }
  }
};
