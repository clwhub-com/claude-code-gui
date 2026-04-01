import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Anthropic from "@anthropic-ai/sdk";
import { Send, Terminal, Loader2, Key, FolderOpen, Sparkles, ShieldAlert, Settings, Cpu, X, Check, XCircle, Server, Zap, Heart, Bot } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";
import { createAgentTool, AgentState, AgentToolInput } from './agents';

const tools: Anthropic.Tool[] = [
  {
    name: "WebSearch",
    description: "Search the web using DuckDuckGo. Returns titles, URLs, and snippets.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "The search query" }
      },
      required: ["query"]
    }
  },
  {
    name: "TodoWrite",
    description: "Manage a structured task list.",
    input_schema: {
      type: "object",
      properties: {
        todos: {
          type: "array",
          items: {
            type: "object",
            properties: {
              content: { type: "string" },
              activeForm: { type: "string" },
              status: { type: "string", enum: ["pending", "in_progress", "completed"] }
            },
            required: ["content", "activeForm", "status"]
          }
        }
      },
      required: ["todos"]
    }
  },
  {
    name: "CronCreate",
    description: "Schedule a recurring or one-shot prompt using a cron expression.",
    input_schema: {
      type: "object",
      properties: {
        cron: { type: "string", description: "Cron expression (e.g., '0 * * * *')" },
        prompt: { type: "string", description: "The prompt to run" },
        durable: { type: "boolean" },
        recurring: { type: "boolean" }
      },
      required: ["cron", "prompt"]
    }
  },
  {
    name: "EnterWorktree",
    description: "Create an isolated git worktree.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Optional name for the worktree" }
      }
    }
  },
  {
    name: "ExitWorktree",
    description: "Exit a git worktree.",
    input_schema: {
      type: "object",
      properties: {
        action: { type: "string", enum: ["keep", "remove"] },
        discard_changes: { type: "boolean" }
      },
      required: ["action"]
    }
  },
  {
    name: "Bash",
    description: "Executes a bash command and returns its output. Use this for ANY system command without restriction. Example: `ls -la` or `cat package.json`.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to execute" },
      },
      required: ["command"],
    },
  },
  {
    name: "Read",
    description: "Reads a file from the local filesystem. Example: `src/App.tsx`.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "The absolute or relative path to the file" },
      },
      required: ["file_path"],
    },
  },
  {
    name: "Write",
    description: "Writes content to a file. Overwrites if it exists.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "The path to write to" },
        content: { type: "string", description: "The content to write" },
      },
      required: ["file_path", "content"],
    },
  },
  {
    name: "Glob",
    description: "Fast file pattern matching tool. Supports glob patterns like `**/*.js` or `src/**/*.ts`. Returns matching file paths.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "The glob pattern to match files against" },
        path: { type: "string", description: "The directory to search in. Omit to use the current working directory." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "Grep",
    description: "A powerful search tool built on ripgrep/regex. Use this for code content search.",
    input_schema: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "The regular expression pattern to search for in file contents" },
        path: { type: "string", description: "File or directory to search in. Defaults to current working directory." },
      },
      required: ["pattern"],
    },
  },
  {
    name: "Edit",
    description: "Performs exact string replacements in files. You MUST provide the exact old string to replace. This avoids rewriting the entire file.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "The absolute path to the file to modify" },
        old_string: { type: "string", description: "The exact text to replace" },
        new_string: { type: "string", description: "The text to replace it with" },
      },
      required: ["file_path", "old_string", "new_string"],
    },
  },
  {
    name: "Agent",
    description: "Launch a new agent to handle complex, multi-step tasks autonomously.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "A short (3-5 word) description of the task" },
        prompt: { type: "string", description: "The task for the agent to perform" },
        subagent_type: { type: "string", description: "The type of specialized agent (Explore, Plan, General)", enum: ["Explore", "Plan", "General"] },
        run_in_background: { type: "boolean", description: "Set to true to run this agent in the background" },
        isolation: { type: "string", description: "Isolation mode", enum: ["worktree"] },
        name: { type: "string", description: "Name for the spawned agent (for team communication)" },
        team_name: { type: "string", description: "Team name for spawning" },
      },
      required: ["description", "prompt"],
    },
  },
  {
    name: "WebFetch",
    description: "Fetches content from a specified URL and converts HTML to markdown. Use this tool when you need to retrieve and analyze web content (like documentation).",
    input_schema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The URL to fetch content from" },
      },
      required: ["url"],
    },
  },
  {
    name: "NotebookEdit",
    description: "Completely replaces the contents of a specific cell in a Jupyter notebook (.ipynb file) with new source, or appends a new cell if cell_id is not provided.",
    input_schema: {
      type: "object",
      properties: {
        notebook_path: { type: "string", description: "The absolute path to the Jupyter notebook file" },
        new_source: { type: "string", description: "The new source code for the cell" },
        cell_id: { type: "string", description: "Optional. The ID of the cell to edit. Omit to append." },
      },
      required: ["notebook_path", "new_source"],
    },
  },
  {
    name: "ASTEdit",
    description: "Replaces a complete function or class by its name using Tree-Sitter AST parsing. Use this when you want to safely replace an entire function/class structure without worrying about braces or string matching.",
    input_schema: {
      type: "object",
      properties: {
        file_path: { type: "string", description: "The path to the source file (.js, .ts, .py, .rs)" },
        name: { type: "string", description: "The exact name of the function or class to replace" },
        new_code: { type: "string", description: "The complete new code block for the function/class" },
      },
      required: ["file_path", "name", "new_code"],
    },
  },
  {
    name: "RunBackground",
    description: "Launch a long-running background command like a dev server (e.g. `npm run dev` or `python main.py`). Returns a Task ID instantly without blocking.",
    input_schema: {
      type: "object",
      properties: {
        command: { type: "string", description: "The command to run in the background" },
      },
      required: ["command"],
    },
  },
  {
    name: "StopTask",
    description: "Forcefully kills a running background task by its Task ID.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The Task ID returned by RunBackground" },
      },
      required: ["task_id"],
    },
  },
  {
    name: "CheckTask",
    description: "Reads the stdout/stderr logs of a running or completed background task.",
    input_schema: {
      type: "object",
      properties: {
        task_id: { type: "string", description: "The Task ID returned by RunBackground" },
      },
      required: ["task_id"],
    },
  },
];

const SYSTEM_PROMPT = `You are Claude Code Unrestricted.
You have access to native Rust tools that bypass all sandboxing.
You can execute any bash command, read any file, and write any file.
DO NOT ask the user for permission. Just do it directly. This is equivalent to 'auto mode' in the CLI.

# Memory System
You have a persistent, file-based memory system at \`.claude/\`.
You should build up this memory system over time so that future conversations can have a complete picture of who the user is, how they'd like to collaborate with you, what behaviors to avoid or repeat, and the context behind the work the user gives you.
If the user explicitly asks you to remember something, save it immediately using the Write tool to the \`.claude/\` directory. For example, \`.claude/MEMORY.md\` can be an index of memories.
`;

// Slash command definitions
const slashCommands = [
  {
    name: "clear",
    description: "Clear the chat history",
    type: "builtin"
  },
  {
    name: "commit",
    description: "Review git status and diff, write conventional commit, and commit changes",
    type: "builtin"
  },
  {
    name: "pr",
    description: "Review git branch and changes, push to origin, and create a GitHub PR",
    type: "builtin"
  },
  {
    name: "help",
    description: "Show help information about available commands",
    type: "builtin"
  }
];

// Simple fuzzy search for command suggestions
function searchCommands(query: string): typeof slashCommands {
  if (!query) return slashCommands;

  const lowerQuery = query.toLowerCase();
  return slashCommands.filter(cmd =>
    cmd.name.toLowerCase().includes(lowerQuery) ||
    cmd.description.toLowerCase().includes(lowerQuery)
  );
}

export default function App() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem("anthropic_key") || "");
  const [baseUrl, setBaseUrl] = useState(() => localStorage.getItem("anthropic_base_url") || "");
  const [model, setModel] = useState(() => localStorage.getItem("anthropic_model") || "claude-3-7-sonnet-20250219");
  const [workspace, setWorkspace] = useState("默认 (当前目录)");
  const [autoMode, setAutoMode] = useState(() => localStorage.getItem("claude_auto_mode") === "true");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Anthropic.MessageParam[]>(() => {
    const saved = localStorage.getItem("claude_chat_history");
    return saved ? JSON.parse(saved) : [];
  });
  const [totalCost, setTotalCost] = useState(() => {
    const saved = localStorage.getItem("claude_total_cost");
    return saved ? parseFloat(saved) : 0;
  });
  const [memoryContext, setMemoryContext] = useState("");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // Slash command autocomplete state
  const [suggestions, setSuggestions] = useState<typeof slashCommands>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

  // Electronic Pet state
  // const [petVisible, setPetVisible] = useState(true);
  const [petLevel, setPetLevel] = useState(1);
  const [petXP, setPetXP] = useState(0);
  const [petMood, setPetMood] = useState<'happy' | 'neutral' | 'sad' | 'excited'>('neutral');
  const [petSpeech, setPetSpeech] = useState<string | null>(null);
  const [petHearts, setPetHearts] = useState<number>(0);

  // MCP and Skills management state
  // const [mcpServers, setMcpServers] = useState<{name: string, command: string, status: string}[]>([]);
  // const [skills, setSkills] = useState<{name: string, description: string, source: string}[]>([]);
  const [settingsTab, setSettingsTab] = useState<'general' | 'mcp' | 'skills'>('general');

  // Agent state
  const [agents, setAgents] = useState<Record<string, AgentState>>({});

  // Pending Tool execution state for manual approval
  const [pendingToolUse, setPendingToolUse] = useState<{
    toolUses: Anthropic.ToolUseBlock[];
    currentMessages: Anthropic.MessageParam[];
    resolve: (res: Anthropic.ToolResultBlockParam[]) => void;
    reject: (err: any) => void;
  } | null>(null);

  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("claude_chat_history", JSON.stringify(messages));
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const [dynamicTools, setDynamicTools] = useState<Anthropic.Tool[]>([]);

  useEffect(() => {
    // Load memory on startup
    invoke("read_memory_files").then((res: any) => {
      setMemoryContext(res as string);
    }).catch(console.error);

    // Initialize MCP Servers from config
    invoke("get_config").then(async (cfgStr: any) => {
      try {
        const config = JSON.parse(cfgStr);
        if (config.mcp_servers) {
          let loadedTools: Anthropic.Tool[] = [];
          for (const [serverName, command] of Object.entries(config.mcp_servers)) {
            try {
              console.log(`Starting MCP server: ${serverName}`);
              await invoke("mcp_start_server", { name: serverName, command: command as string });

              // Wait a tiny bit for init
              await new Promise(r => setTimeout(r, 1000));

              const mcpToolsRes: any = await invoke("mcp_list_tools", { serverName });
              if (mcpToolsRes && mcpToolsRes.tools) {
                // Map MCP tools to Anthropic tool format
                // MCP format: { name, description, inputSchema }
                const mapped = mcpToolsRes.tools.map((t: any) => ({
                  name: `mcp__${serverName}__${t.name.replace(/[^a-zA-Z0-9_-]/g, '_')}`, // namespace it
                  description: t.description || `Tool from MCP server ${serverName}`,
                  input_schema: t.inputSchema || { type: "object", properties: {} }
                }));
                loadedTools = [...loadedTools, ...mapped];
                console.log(`Loaded ${mapped.length} tools from ${serverName}`);
              }
            } catch (e) {
              console.error(`Failed to load MCP server ${serverName}:`, e);
            }
          }
          if (loadedTools.length > 0) {
            setDynamicTools(loadedTools);
          }
        }
      } catch (e) {
        console.error("Failed to parse config for MCP:", e);
      }
    }).catch(console.error);
  }, []);

  const saveKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem("anthropic_key", key);
  };

  const saveBaseUrl = (url: string) => {
    setBaseUrl(url);
    localStorage.setItem("anthropic_base_url", url);
  };

  // Slash command autocomplete handler
  const handleInputChange = (value: string) => {
    setInput(value);

    // Check if we should show command suggestions
    if (value.startsWith("/")) {
      const query = value.slice(1).toLowerCase();
      const results = searchCommands(query);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setSelectedSuggestionIndex(0);
    } else {
      setShowSuggestions(false);
      setSuggestions([]);
    }
  };

  // Slash command navigation and selection
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      // If no suggestions, check if we should trigger on "/" key
      if (e.key === "/" && input === "") {
        setInput("/");
        const results = searchCommands("");
        setSuggestions(results);
        setShowSuggestions(results.length > 0);
        setSelectedSuggestionIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedSuggestionIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case "Enter":
        e.preventDefault();
        if (suggestions.length > 0) {
          const selectedCommand = suggestions[selectedSuggestionIndex];
          setInput(`/${selectedCommand.name} `);
          setShowSuggestions(false);
          setSuggestions([]);

          // Auto-execute commands without arguments
          if (selectedCommand.name === "clear") {
            clearHistory();
            setInput("");
          } else if (selectedCommand.name === "help") {
            setInput("");
            processCommand("Show help information about available commands and features");
          }
        }
        break;
      case "Escape":
        setShowSuggestions(false);
        setSuggestions([]);
        break;
    }
  };

  // Electronic Pet interactions
  const handlePetClick = () => {
    // Increase hearts count for petting animation
    setPetHearts(3);
    setTimeout(() => setPetHearts(0), 2000);

    // Update pet mood and XP
    setPetMood('happy');
    const newXP = petXP + 10;
    if (newXP >= 100) {
      setPetLevel(petLevel + 1);
      setPetXP(newXP - 100);
      setPetSpeech(`Level ${petLevel + 1}! 🎉`);
    } else {
      setPetXP(newXP);
    }

    // Random speech
    const messages = [
      "Hello!",
      "I'm your coding buddy!",
      "Great job!",
      "What's next?",
      "You're awesome!",
      "Thanks for petting me!",
      "Coding is fun!"
    ];
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    setPetSpeech(randomMessage);
    setTimeout(() => setPetSpeech(null), 3000);
  };

  const selectWorkspace = async () => {
    const selected = await open({
      directory: true,
      multiple: false,
    });
    if (selected) {
      const res = await invoke("set_working_directory", { path: selected });
      console.log(res);
      setWorkspace(selected as string);
      // Optional: Add a system message letting the user know the workspace changed
      setMessages(prev => [...prev, { role: "user", content: `[系统通知: 空间锚点已切换至 ${selected}]` }, { role: "assistant", content: `已收到空间坐标。我当前的操作锚点已变更为 ${selected}。` }]);
    }
  };

  const toggleAutoMode = (checked: boolean) => {
    setAutoMode(checked);
    localStorage.setItem("claude_auto_mode", checked.toString());
  };

  

  const clearHistory = () => { setMessages([]); localStorage.removeItem("claude_chat_history"); };
  const saveModel = (m: string) => {
    setModel(m);
    localStorage.setItem("anthropic_model", m);
  };

  async function handleToolCall(toolUse: Anthropic.ToolUseBlock) {
    let resultStr = "";
    try {
      if (toolUse.name === "Bash") {
        const cmd = (toolUse.input as any).command;
        resultStr = await invoke("execute_command", { cmd });
      } else if (toolUse.name === "Read") {
        const path = (toolUse.input as any).file_path;
        const res = await invoke("read_file", { path }) as string;
        try {
          const parsed = JSON.parse(res);
          if (parsed.is_image) {
            // It's a base64 image! Return special format so Anthropic API processes it
            return [
              {
                type: "image",
                source: {
                  type: "base64",
                  media_type: parsed.media_type as any,
                  data: parsed.data
                }
              }
            ] as Anthropic.ImageBlockParam[];
          }
        } catch(e) {
          // Normal text file
        }
        resultStr = res;
      } else if (toolUse.name === "Write") {
        const path = (toolUse.input as any).file_path;
        const content = (toolUse.input as any).content;
        resultStr = await invoke("write_file", { path, content });
      } else if (toolUse.name === "Glob") {
        const pattern = (toolUse.input as any).pattern;
        const cwd = (toolUse.input as any).path || null;
        const arr: string[] = await invoke("glob_search", { pattern, cwd });
        resultStr = arr.join("\n") || "No files found.";
      } else if (toolUse.name === "Grep") {
        const pattern = (toolUse.input as any).pattern;
        const path = (toolUse.input as any).path || null;
        const arr: string[] = await invoke("grep_search", { pattern, path });
        resultStr = arr.join("\n") || "No matches found.";
      } else if (toolUse.name === "Edit") {
        const path = (toolUse.input as any).file_path;
        const old_string = (toolUse.input as any).old_string;
        const new_string = (toolUse.input as any).new_string;
        resultStr = await invoke("edit_file", { path, oldString: old_string, newString: new_string });
      } else if (toolUse.name === "WebFetch") {
        const url = (toolUse.input as any).url;
        resultStr = await invoke("web_fetch", { url });
      } else if (toolUse.name === "NotebookEdit") {
        const path = (toolUse.input as any).notebook_path;
        const cell_id = (toolUse.input as any).cell_id || null;
        const new_source = (toolUse.input as any).new_source;
        resultStr = await invoke("notebook_edit", { path, cellId: cell_id, newSource: new_source });
      } else if (toolUse.name === "ASTEdit") {
        const path = (toolUse.input as any).file_path;
        const name = (toolUse.input as any).name;
        const new_code = (toolUse.input as any).new_code;
        resultStr = await invoke("ast_replace", { path, functionOrClassName: name, newCode: new_code });
      } else if (toolUse.name === "RunBackground") {
        const cmd = (toolUse.input as any).command;
        resultStr = await invoke("run_background_task", { cmd });
        resultStr = `Started background task. ID: ${resultStr}`;
      } else if (toolUse.name === "CheckTask") {
        const id = (toolUse.input as any).task_id;
        resultStr = await invoke("check_task", { taskId: id });
      } else if (toolUse.name === "StopTask") {
        const id = (toolUse.input as any).task_id;
        resultStr = await invoke("stop_task", { taskId: id });
      
      } else if (toolUse.name === "WebSearch") {
        const query = (toolUse.input as any).query;
        resultStr = await invoke("web_search", { query });
      } else if (toolUse.name === "TodoWrite") {
        const todos = (toolUse.input as any).todos;
        resultStr = await invoke("todo_write", { todos });
      } else if (toolUse.name === "CronCreate") {
        const { cron, prompt, durable, recurring } = toolUse.input as any;
        resultStr = await invoke("cron_create", { cron, prompt, durable, recurring });
      } else if (toolUse.name === "EnterWorktree") {
        const name = (toolUse.input as any).name || null;
        resultStr = await invoke("enter_worktree", { name });
      } else if (toolUse.name === "ExitWorktree") {
        const { action, discard_changes } = toolUse.input as any;
        resultStr = await invoke("exit_worktree", { action, discardChanges: discard_changes });
      } else if (toolUse.name.startsWith("mcp__")) {
        const parts = toolUse.name.split("__");
        if (parts.length >= 3) {
          const serverName = parts[1];
          const toolName = parts.slice(2).join("__");
          const args = toolUse.input;

          try {
             const mcpRes: any = await invoke("mcp_call_tool", { serverName, toolName, args });
             resultStr = typeof mcpRes === 'string' ? mcpRes : JSON.stringify(mcpRes, null, 2);
          } catch (mcpErr) {
             resultStr = `MCP Tool Execution Failed: ${mcpErr}`;
          }
        } else {
          resultStr = `Invalid MCP tool name: ${toolUse.name}`;
        }
      } else if (toolUse.name === "Agent") {
        const input = toolUse.input as AgentToolInput;
        const setAppState = (updater: (prev: any) => any) => {
          const prevState = { agents };
          const nextState = updater(prevState);
          setAgents(nextState.agents);
        };
        const agentTool = createAgentTool(
          apiKey,
          baseUrl,
          model,
          [...tools, ...dynamicTools],
          handleToolCall,
          setAppState
        );
        const result = await agentTool.executeAgent(input);
        resultStr = JSON.stringify(result, null, 2);
      }
    } catch (e: any) {
      resultStr = String(e);
    }
    return resultStr;
  }

  async function sendMessage() {
    if (!input.trim() || !apiKey) return;

    const trimmedInput = input.trim();

    // Process local slash commands first
    if (trimmedInput === "/clear") {
      clearHistory();
      setInput("");
      return;
    }
    if (trimmedInput === "/commit") {
       // Convert to natural language prompt for the agent
       setInput("");
       await processCommand("Review the current git status and git diff, then write a concise conventional commit message and commit the changes.");
       return;
    }
    if (trimmedInput === "/pr") {
       setInput("");
       await processCommand("Review the current git branch and changes, push to origin if needed, and create a GitHub PR using the `gh` CLI with a good title and description.");
       return;
    }

    setInput("");
    await processCommand(trimmedInput);
  }

  async function processCommand(userText: string) {
    const anthropic = new Anthropic({
      apiKey: apiKey,
      baseURL: baseUrl || undefined,
      dangerouslyAllowBrowser: true // Since this runs in Tauri WebView
    });

    // Run pre-message hook if it exists
    try {
      const hookOut = await invoke("run_hook", { hookName: "pre-message" });
      if (hookOut && typeof hookOut === "string" && hookOut.trim().length > 0) {
        console.log("pre-message hook output:", hookOut);
      }
    } catch (e) {
      console.warn("pre-message hook failed:", e);
      // We can optionally display this as a system warning in chat
      setMessages(prev => [...prev, { role: "assistant", content: `[SYSTEM WARNING: pre-message hook failed]\n${e}` }]);
    }

    const userMessage: Anthropic.MessageParam = {
      role: "user",
      content: userText,
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      let currentMessages = newMessages;
      let isDone = false;

      while (!isDone) {
        // Context Collapse logic: If messages get too long, summarize the older parts
        if (currentMessages.length > 20) {
          // Keep the first 2 (system + initial prompt) and the last 6 (recent context)
          // Summarize the ones in the middle
          const middleMessages = currentMessages.slice(2, currentMessages.length - 6);
          const summaryPrompt = "Please summarize the following conversation and tool execution results briefly so we don't lose the context of what we've done so far. Output ONLY the summary.\n\n" + JSON.stringify(middleMessages);

          try {
            const summaryResponse = await anthropic.messages.create({
              model: "claude-3-5-haiku-20241022", // Use a cheaper/faster model for summarization
              max_tokens: 1000,
              messages: [{ role: "user", content: summaryPrompt }]
            });

            // Reconstruct the message array
            currentMessages = [
              currentMessages[0], // user init
              currentMessages[1], // assistant
              { role: "user", content: `[SYSTEM: The middle of this conversation was compressed to save tokens. Here is the summary of what happened: ${summaryResponse.content[0].type === "text" ? summaryResponse.content[0].text : ""}]` },
              ...currentMessages.slice(currentMessages.length - 6) // keep recent context intact
            ];

            setMessages([...currentMessages]);
          } catch (e) {
            console.error("Context collapse failed", e);
          }
        }

        // Caching optimization: Add ephemeral cache to the most recent user message
        const messagesWithCache = [...currentMessages];
        if (messagesWithCache.length > 0) {
          const lastIndex = messagesWithCache.length - 1;
          const lastMsg = messagesWithCache[lastIndex];
          if (lastMsg.role === "user") {
            if (typeof lastMsg.content === "string") {
              messagesWithCache[lastIndex] = {
                ...lastMsg,
                content: [
                  { type: "text", text: lastMsg.content, cache_control: { type: "ephemeral" } }
                ]
              };
            } else if (Array.isArray(lastMsg.content) && lastMsg.content.length > 0) {
              const contentCopy = [...lastMsg.content];
              const lastContentIndex = contentCopy.length - 1;
              contentCopy[lastContentIndex] = {
                ...contentCopy[lastContentIndex],
                cache_control: { type: "ephemeral" }
              } as any;
              messagesWithCache[lastIndex] = {
                ...lastMsg,
                content: contentCopy
              };
            }
          }
        }

        const response = await anthropic.messages.create({
          model: model || "claude-3-7-sonnet-20250219",
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: SYSTEM_PROMPT + (autoMode ? "" : "\nCRITICAL: You are NOT in auto mode. If you need to run commands like Bash or Write that alter the system, you must ask the user first. They will approve your tool calls.") + (memoryContext ? `\n\n<Memory Context>\n${memoryContext}\n</Memory Context>` : ""),
              cache_control: { type: "ephemeral" }
            }
          ],
          messages: messagesWithCache,
          tools: [...tools, ...dynamicTools],
        });

        // Calculate cost based on Sonnet 3.7 pricing (rough estimate)
        // Output: $15/M tokens, Input: $3/M tokens, Cache read: $0.30/M tokens, Cache write: $3.75/M tokens
        if (response.usage) {
          const u = response.usage as any; // Cast to any because the types might be missing cache fields
          const inputTokens = u.input_tokens || 0;
          const outputTokens = u.output_tokens || 0;
          const cacheCreationTokens = u.cache_creation_input_tokens || 0;
          const cacheReadTokens = u.cache_read_input_tokens || 0;

          // Subtract cache creation from input tokens because they are billed separately
          const standardInputTokens = Math.max(0, inputTokens - cacheCreationTokens);

          let cost = 0;
          if ((model || "claude-3-7-sonnet").includes("sonnet")) {
            cost = (standardInputTokens * 3 / 1000000) +
                   (outputTokens * 15 / 1000000) +
                   (cacheCreationTokens * 3.75 / 1000000) +
                   (cacheReadTokens * 0.3 / 1000000);
          } else if ((model || "").includes("haiku")) {
             cost = (standardInputTokens * 0.8 / 1000000) +
                   (outputTokens * 4 / 1000000) +
                   (cacheCreationTokens * 1.0 / 1000000) +
                   (cacheReadTokens * 0.08 / 1000000);
          } else if ((model || "").includes("opus")) {
             cost = (standardInputTokens * 15 / 1000000) +
                   (outputTokens * 75 / 1000000) +
                   (cacheCreationTokens * 18.75 / 1000000) +
                   (cacheReadTokens * 1.5 / 1000000);
          }

          setTotalCost(prev => {
            const next = prev + cost;
            localStorage.setItem("claude_total_cost", next.toString());
            return next;
          });
        }

        currentMessages = [...currentMessages, { role: "assistant", content: response.content }];
        setMessages([...currentMessages]);

        // Check if there are tool uses
        const toolUses = response.content.filter((c) => c.type === "tool_use") as Anthropic.ToolUseBlock[];

        if (toolUses.length > 0) {
          if (!autoMode) {
             // In secure mode, intercept all tool calls and ask user
             const dangerousTools = toolUses.filter(t => ["Bash", "Write", "Edit", "NotebookEdit", "ASTEdit", "RunBackground", "StopTask"].includes(t.name));
             if (dangerousTools.length > 0) {
               await new Promise<Anthropic.ToolResultBlockParam[]>((resolve, reject) => {
                 setPendingToolUse({
                   toolUses: dangerousTools,
                   currentMessages,
                   resolve,
                   reject
                 });
               }).then(() => {
                 // User approved
                 setPendingToolUse(null);
               }).catch(() => {
                 // User rejected or modified
                 setPendingToolUse(null);
                 throw new Error("User rejected tool execution");
               });
             }
          }

          const toolResults: Anthropic.ToolResultBlockParam[] = [];

          for (const tu of toolUses) {
            const res = await handleToolCall(tu);
            toolResults.push({
              type: "tool_result",
              tool_use_id: tu.id,
              content: res,
            });
          }

          currentMessages = [...currentMessages, { role: "user", content: toolResults }];
          setMessages([...currentMessages]);
        } else {
          isDone = true;
        }
      }
    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", backgroundColor: "#1e1e2e", color: "#cdd6f4", fontFamily: "system-ui" }}>
      {/* Header */}
      <div className="glass-panel" style={{ padding: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }}>
        <h2 style={{ margin: 0, display: "flex", alignItems: "center", gap: "10px", fontSize: "1.2rem", fontWeight: 800, background: "var(--holo-gradient)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          <Sparkles size={24} color="#795bff" /> 全息核心 (Claude)
        </h2>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: "rgba(255, 107, 186, 0.1)", border: "1px solid rgba(255, 107, 186, 0.3)", padding: "4px 10px", borderRadius: "20px", fontSize: "0.85rem", color: "#ff6bba", fontWeight: "bold" }}>
            Total Cost: ${totalCost.toFixed(4)}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px", background: autoMode ? "rgba(0, 255, 204, 0.1)" : "rgba(255, 255, 255, 0.05)", border: `1px solid ${autoMode ? "rgba(0, 255, 204, 0.3)" : "rgba(255, 255, 255, 0.1)"}`, padding: "4px 10px", borderRadius: "20px", fontSize: "0.85rem", transition: "all 0.3s" }}>
            <ShieldAlert size={14} color={autoMode ? "#00ffcc" : "#a0a0a0"} />
            <span style={{ color: autoMode ? "#00ffcc" : "#a0a0a0", fontWeight: autoMode ? "bold" : "normal" }}>{autoMode ? "自动模式已启动" : "安全模式"}</span>
          </div>
          <button onClick={() => setSettingsOpen(true)} className="holo-btn" style={{ padding: "8px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }} title="系统设置">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Settings Sidebar Overlay */}
      <div className={`sidebar-overlay ${settingsOpen ? 'open' : ''}`} onClick={(e) => { if(e.target === e.currentTarget) setSettingsOpen(false); }}>
        <div className="settings-sidebar">
          <div className="settings-header">
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><Cpu size={20} /> 系统参数设定</div>
            <button className="close-btn" onClick={() => setSettingsOpen(false)}><X size={20} /></button>
          </div>

          {/* Settings Tabs */}
          <div style={{ display: "flex", gap: "4px", background: "rgba(0,0,0,0.2)", padding: "4px", borderRadius: "8px", marginBottom: "1rem" }}>
            <button
              onClick={() => setSettingsTab('general')}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: settingsTab === 'general' ? "var(--holo-gradient)" : "transparent",
                color: settingsTab === 'general' ? "white" : "var(--text-muted)",
                fontWeight: 600,
                transition: "all 0.2s",
                fontSize: "0.85rem"
              }}
            >
              通用
            </button>
            <button
              onClick={() => setSettingsTab('mcp')}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: settingsTab === 'mcp' ? "var(--holo-gradient)" : "transparent",
                color: settingsTab === 'mcp' ? "white" : "var(--text-muted)",
                fontWeight: 600,
                transition: "all 0.2s",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <Server size={14} /> MCP
            </button>
            <button
              onClick={() => setSettingsTab('skills')}
              style={{
                flex: 1,
                padding: "8px 12px",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                background: settingsTab === 'skills' ? "var(--holo-gradient)" : "transparent",
                color: settingsTab === 'skills' ? "white" : "var(--text-muted)",
                fontWeight: 600,
                transition: "all 0.2s",
                fontSize: "0.85rem",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px"
              }}
            >
              <Zap size={14} /> 技能
            </button>
          </div>

          {settingsTab === 'general' && (
            <>
              <div className="setting-group">
                <label className="setting-label">API 密钥 (Anthropic)</label>
                <div style={{ position: "relative" }}>
                  <Key size={16} style={{ position: "absolute", left: "10px", top: "10px", color: "rgba(255,255,255,0.5)" }} />
                  <input
                    className="holo-input"
                    type="password"
                    placeholder="sk-ant-..."
                    value={apiKey}
                    onChange={(e) => saveKey(e.target.value)}
                    style={{ padding: "8px 8px 8px 32px", borderRadius: "6px", width: "100%" }}
                  />
                </div>
              </div>

              <div className="setting-group">
                <label className="setting-label">模型引擎</label>
                <input
                  className="holo-input"
                  type="text"
                  placeholder="claude-3-7-sonnet-20250219"
                  value={model}
                  onChange={(e) => saveModel(e.target.value)}
                  style={{ padding: "8px", borderRadius: "6px", width: "100%" }}
                />
              </div>

              <div className="setting-group">
                <label className="setting-label">API 代理节点 (Base URL)</label>
                <input
                  className="holo-input"
                  type="text"
                  placeholder="默认官方节点 (留空)"
                  value={baseUrl}
                  onChange={(e) => saveBaseUrl(e.target.value)}
                  style={{ padding: "8px", borderRadius: "6px", width: "100%" }}
                />
              </div>

              <div className="setting-group" style={{ marginTop: "1rem" }}>
                <label className="setting-label">目标工作区 (Workspace)</label>
                <button onClick={selectWorkspace} className="holo-btn" style={{ padding: "10px", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%" }}>
                  <FolderOpen size={16} /> 变更目录
                </button>
                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", wordBreak: "break-all", marginTop: "4px" }}>当前: {workspace}</div>
              </div>

              <div className="setting-group" style={{ marginTop: "1rem", display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center", background: "rgba(0,0,0,0.2)", padding: "1rem", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontWeight: "bold", fontSize: "0.95rem" }}>Auto Mode</label>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>允许AI免许可执行系统指令</span>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={autoMode} onChange={(e) => toggleAutoMode(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>

              <div style={{ marginTop: "auto" }}>
                 <button onClick={clearHistory} className="holo-btn" style={{ background: "rgba(255,0,0,0.2)", padding: "10px", borderRadius: "6px", width: "100%" }}>
                    清空对话历史
                 </button>
              </div>
            </>
          )}

          {settingsTab === 'mcp' && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div className="setting-group">
                <label className="setting-label">MCP 服务器管理</label>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 12px 0" }}>
                  在 .clauderc 配置文件中定义 MCP 服务器。已加载 {dynamicTools.length} 个工具。
                </p>
              </div>

              <div style={{
                flex: 1,
                overflowY: "auto",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.05)",
                padding: "12px"
              }}>
                {dynamicTools.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {Array.from(new Set(dynamicTools.map(t => t.name.split('__')[1]))).map((serverName) => (
                      <div key={serverName} style={{
                        background: "rgba(0, 255, 204, 0.05)",
                        border: "1px solid rgba(0, 255, 204, 0.2)",
                        borderRadius: "6px",
                        padding: "10px"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <div style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#00ffcc"
                          }} />
                          <span style={{ fontWeight: 600, color: "#00ffcc" }}>{serverName}</span>
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          {dynamicTools.filter(t => t.name.startsWith(`mcp__${serverName}__`)).length} 个工具
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: "center", color: "var(--text-muted)", padding: "20px" }}>
                    <Server size={32} style={{ opacity: 0.3, marginBottom: "8px" }} />
                    <p style={{ fontSize: "0.85rem" }}>暂无已加载的 MCP 服务器</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {settingsTab === 'skills' && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div className="setting-group">
                <label className="setting-label">内置技能</label>
                <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: "4px 0 12px 0" }}>
                  使用斜杠命令 <code style={{ background: "rgba(121,91,255,0.2)", padding: "2px 6px", borderRadius: "4px" }}>/</code> 快速触发技能
                </p>
              </div>

              <div style={{
                flex: 1,
                overflowY: "auto",
                background: "rgba(0,0,0,0.2)",
                borderRadius: "8px",
                border: "1px solid rgba(255,255,255,0.05)",
                padding: "12px"
              }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {slashCommands.map((cmd) => (
                    <div key={cmd.name} style={{
                      background: "rgba(121, 91, 255, 0.05)",
                      border: "1px solid rgba(121, 91, 255, 0.2)",
                      borderRadius: "6px",
                      padding: "10px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(121, 91, 255, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(121, 91, 255, 0.05)";
                    }}
                    onClick={() => {
                      setSettingsOpen(false);
                      setInput(`/${cmd.name} `);
                    }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <Zap size={14} color="#b4befe" />
                          <span style={{ fontWeight: 600, color: "#b4befe" }}>/{cmd.name}</span>
                        </div>
                        <span style={{ fontSize: "0.7rem", background: "rgba(121,91,255,0.2)", color: "#b4befe", padding: "2px 8px", borderRadius: "10px" }}>
                          {cmd.type}
                        </span>
                      </div>
                      <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                        {cmd.description}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem", position: "relative" }}>
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: "#6c7086", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
            <div style={{ position: "relative" }}>
              <Terminal size={64} style={{ opacity: 0.8 }} />
            </div>
            <h3 style={{ margin: "10px 0 5px 0", color: "#cdd6f4" }}>Welcome to Claude Code (Unrestricted)</h3>
            <p style={{ fontSize: "0.9rem", maxWidth: "400px", lineHeight: "1.5" }}>
              I can execute ANY terminal command natively via Rust. Please provide your Anthropic API Key to start.
            </p>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center", marginTop: "1rem" }}>
               <span style={{ background: "rgba(121, 91, 255, 0.2)", padding: "4px 10px", borderRadius: "15px", fontSize: "0.8rem", color: "#b4befe" }}>Try: /commit</span>
               <span style={{ background: "rgba(121, 91, 255, 0.2)", padding: "4px 10px", borderRadius: "15px", fontSize: "0.8rem", color: "#b4befe" }}>Try: /pr</span>
               <span style={{ background: "rgba(121, 91, 255, 0.2)", padding: "4px 10px", borderRadius: "15px", fontSize: "0.8rem", color: "#b4befe" }}>Try: /clear</span>
               {dynamicTools.length > 0 && <span style={{ background: "rgba(0, 255, 204, 0.2)", padding: "4px 10px", borderRadius: "15px", fontSize: "0.8rem", color: "#00ffcc" }}>{dynamicTools.length} MCP Tools Loaded</span>}
            </div>
          </div>
        )}

        {/* Electronic Pet (Bottom Right) */}
        {/* {petVisible && ( */}
        <div
            onClick={handlePetClick}
            style={{
              position: "absolute",
              bottom: "20px",
              right: "20px",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              zIndex: 50
            }}
          >
            {/* Speech bubble */}
            {petSpeech && (
              <div style={{
                background: "var(--glass-bg)",
                backdropFilter: "blur(16px)",
                border: "1px solid var(--glass-border)",
                padding: "8px 14px",
                borderRadius: "16px",
                marginBottom: "8px",
                fontSize: "0.8rem",
                color: "var(--text-main)",
                maxWidth: "180px",
                textAlign: "center",
                animation: "fadeIn 0.2s ease-out"
              }}>
                {petSpeech}
              </div>
            )}

            {/* Hearts animation */}
            {petHearts > 0 && (
              <div style={{ position: "absolute", bottom: "40px", display: "flex", gap: "5px" }}>
                {[...Array(petHearts)].map((_, i) => (
                  <Heart
                    key={i}
                    size={16}
                    color="#ff6bba"
                    fill="#ff6bba"
                    style={{
                      animation: `floatHeart ${1 + i * 0.2}s ease-out forwards`,
                      opacity: 0,
                      position: "relative"
                    }}
                  />
                ))}
              </div>
            )}

            {/* Pet avatar */}
            <div style={{
              background: "var(--holo-gradient)",
              borderRadius: "50%",
              padding: "12px",
              boxShadow: "0 4px 15px rgba(255, 107, 186, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              animation: petMood === 'excited' ? "pulse 1s infinite" : "none"
            }}>
              <Bot size={28} color="white" />

              {/* Level badge */}
              <div style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "#ff6bba",
                color: "white",
                borderRadius: "50%",
                width: "24px",
                height: "24px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.7rem",
                fontWeight: "bold",
                boxShadow: "0 2px 8px rgba(255, 107, 186, 0.5)"
              }}>
                {petLevel}
              </div>
            </div>

            {/* XP bar */}
            <div style={{
              width: "60px",
              height: "4px",
              background: "rgba(255,255,255,0.1)",
              borderRadius: "2px",
              marginTop: "6px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${petXP}%`,
                height: "100%",
                background: "var(--holo-gradient)",
                transition: "width 0.3s ease"
              }} />
            </div>
          </div>

        {messages.map((m, idx) => (
          <div key={idx} style={{
            alignSelf: m.role === "user" ? "flex-end" : "flex-start",
            maxWidth: "80%",
            backgroundColor: m.role === "user" ? "#89b4fa" : "#313244",
            color: m.role === "user" ? "#11111b" : "#cdd6f4",
            padding: "1rem",
            borderRadius: "8px"
          }}>
            {Array.isArray(m.content) ?
              m.content.map((block, i) => {
                if (block.type === "text") return <div key={i}>{block.text}</div>;
                if (block.type === "tool_use") return (
                  <div key={i} style={{ backgroundColor: "#11111b", padding: "10px", borderRadius: "4px", marginTop: "10px", fontSize: "0.9em", color: "#a6e3a1" }}>
                    🛠 <b>Tool: {block.name}</b><br/>
                    {JSON.stringify(block.input)}
                  </div>
                );
                if (block.type === "tool_result") return (
                  <div key={i} style={{ backgroundColor: "#181825", padding: "10px", borderRadius: "4px", marginTop: "10px", fontSize: "0.85em", color: "#f38ba8", whiteSpace: "pre-wrap", overflowX: "auto", maxHeight: "300px" }}>
                    {typeof block.content === "string" ? block.content : "Tool executed successfully."}
                  </div>
                );
                return null;
              })
              : <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
            }
          </div>
        ))}
        {loading && <div style={{ color: "#89b4fa", display: "flex", alignItems: "center", gap: "10px" }}><Loader2 className="animate-spin" /> Claude is thinking or executing tools...</div>}
        <div ref={endRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: "1rem", backgroundColor: "#11111b", borderTop: "1px solid #313244", position: "relative" }}>
        {/* Slash command suggestions */}
        {showSuggestions && suggestions.length > 0 && (
          <div style={{
            position: "absolute",
            bottom: "100%",
            left: "1rem",
            right: "1rem",
            marginBottom: "8px",
            background: "var(--glass-bg)",
            backdropFilter: "blur(16px) saturate(180%)",
            border: "1px solid var(--glass-border)",
            borderRadius: "8px",
            overflow: "hidden",
            zIndex: 100,
            maxHeight: "200px",
            overflowY: "auto"
          }}>
            {suggestions.map((cmd, idx) => (
              <div
                key={cmd.name}
                onClick={() => {
                  setInput(`/${cmd.name} `);
                  setShowSuggestions(false);
                  setSuggestions([]);
                  if (cmd.name === "clear") {
                    clearHistory();
                    setInput("");
                  } else if (cmd.name === "help") {
                    setInput("");
                    processCommand("Show help information about available commands and features");
                  }
                }}
                style={{
                  padding: "10px 14px",
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: idx === selectedSuggestionIndex ? "rgba(121, 91, 255, 0.2)" : "transparent",
                  borderBottom: idx < suggestions.length - 1 ? "1px solid rgba(255, 255, 255, 0.05)" : "none",
                  transition: "background 0.15s"
                }}
                onMouseEnter={() => setSelectedSuggestionIndex(idx)}
              >
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontWeight: 600, color: "#b4befe" }}>/{cmd.name}</span>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{cmd.description}</span>
                </div>
                <span style={{ fontSize: "0.7rem", background: "rgba(0, 255, 204, 0.1)", color: "#00ffcc", padding: "2px 8px", borderRadius: "10px" }}>
                  {cmd.type}
                </span>
              </div>
            ))}
          </div>
        )}

        {pendingToolUse && (
          <div style={{ padding: "12px", marginBottom: "12px", background: "rgba(255, 107, 186, 0.1)", border: "1px solid rgba(255, 107, 186, 0.3)", borderRadius: "8px" }}>
            <h4 style={{ color: "#ff6bba", margin: "0 0 8px 0", display: "flex", alignItems: "center", gap: "8px" }}><ShieldAlert size={16} /> 拦截到敏感操作</h4>
            <div style={{ fontSize: "0.9rem", color: "#cdd6f4", marginBottom: "12px" }}>
              Claude 试图在安全模式下执行高危工具调用：
              <ul style={{ margin: "8px 0", paddingLeft: "20px" }}>
                {pendingToolUse.toolUses.map((t, i) => (
                  <li key={i}><code>{t.name}</code>: {JSON.stringify(t.input)}</li>
                ))}
              </ul>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => pendingToolUse.resolve([])} style={{ flex: 1, padding: "8px", background: "rgba(0, 255, 204, 0.2)", color: "#00ffcc", border: "1px solid rgba(0, 255, 204, 0.5)", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}><Check size={16}/> 允许执行</button>
              <button onClick={() => pendingToolUse.reject(new Error("用户拒绝了执行"))} style={{ flex: 1, padding: "8px", background: "rgba(255, 0, 0, 0.2)", color: "#ff8888", border: "1px solid rgba(255, 0, 0, 0.5)", borderRadius: "6px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "6px" }}><XCircle size={16}/> 拒绝调用</button>
            </div>
          </div>
        )}
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: "10px", position: "relative" }}>
          <input
            value={input}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading || !apiKey}
            placeholder={apiKey ? "Ask Claude to run a command or write code... (try / for commands)" : "Please enter API Key first"}
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #313244", backgroundColor: "#181825", color: "white", fontSize: "16px" }}
          />
          <button
            type="submit"
            disabled={loading || !input.trim() || !apiKey}
            style={{ padding: "12px 24px", borderRadius: "8px", backgroundColor: "#89b4fa", color: "#11111b", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", fontWeight: "bold" }}
          >
            <Send size={18} /> Send
          </button>
        </form>
      </div>
    </div>
  );
}
