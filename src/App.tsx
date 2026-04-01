import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Anthropic from "@anthropic-ai/sdk";
import { Send, Terminal, Loader2, Key, FolderOpen, Sparkles, ShieldAlert, Settings, Cpu, X, Check, XCircle } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import "./App.css";

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
    description: "Launch a new specialized agent (subprocess) to handle complex, multi-step tasks autonomously in the background. Useful for deep code exploration or drafting complex plans without cluttering this chat.",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "A short description of what the agent will do" },
        prompt: { type: "string", description: "The detailed task for the agent to perform" },
        subagent_type: { type: "string", enum: ["Explore", "Plan", "General"], description: "Type of specialized agent" },
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

  useEffect(() => {
    // Load memory on startup
    invoke("read_memory_files").then((res: any) => {
      setMemoryContext(res as string);
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
} else if (toolUse.name === "Agent") {
        const prompt = (toolUse.input as any).prompt;
        const subagent_type = (toolUse.input as any).subagent_type || "General";
        const desc = (toolUse.input as any).description;

        // Display that a sub-agent is running (this takes time)
        resultStr = `[Sub-Agent ${subagent_type} started]: ${desc}\n\n`;

        // Launch an isolated API call for the sub-agent
        const anthropic = new Anthropic({ apiKey: localStorage.getItem("anthropic_key") || "", baseURL: localStorage.getItem("anthropic_base_url") || undefined, dangerouslyAllowBrowser: true });

        let agentMessages: Anthropic.MessageParam[] = [
          { role: "user", content: `You are a specialized ${subagent_type} sub-agent.\nYour task:\n${prompt}` }
        ];

        // Let the sub-agent run its own isolated tool loop
        let isAgentDone = false;
        let finalAgentResult = "";
        let steps = 0;

        while (!isAgentDone && steps < 15) {
          steps++;
          const res = await anthropic.messages.create({
            model: model || "claude-3-7-sonnet-20250219",
            max_tokens: 4096,
            system: `You are an autonomous sub-agent. Complete the task using tools. Once you have the final answer, simply state it in text without using any more tools.`,
            messages: agentMessages,
            tools: tools.filter(t => t.name !== "Agent") // Sub-agents cannot spawn sub-agents
          });

          agentMessages.push({ role: "assistant", content: res.content });

          const tu = res.content.filter((c) => c.type === "tool_use") as Anthropic.ToolUseBlock[];
          if (tu.length > 0) {
            const tr: Anthropic.ToolResultBlockParam[] = [];
            for (const t of tu) {
               // We recursively call our exact same handleToolCall function
               const executedStr = await handleToolCall(t);
               tr.push({ type: "tool_result", tool_use_id: t.id, content: executedStr });
            }
            agentMessages.push({ role: "user", content: tr });
          } else {
            isAgentDone = true;
            // The last text block is the answer
            finalAgentResult = res.content.map(c => c.type === "text" ? c.text : "").join("\n");
          }
        }

        resultStr += `[Sub-Agent Finished]\n${finalAgentResult}`;
      }
    } catch (e: any) {
      resultStr = String(e);
    }
    return resultStr;
  }

  async function sendMessage() {
    if (!input.trim() || !apiKey) return;

    const anthropic = new Anthropic({
      apiKey: apiKey,
      baseURL: baseUrl || undefined,
      dangerouslyAllowBrowser: true // Since this runs in Tauri WebView
    });

    const userMessage: Anthropic.MessageParam = {
      role: "user",
      content: input,
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
          tools: tools,
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
        </div>
      </div>

      {/* Chat Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
        {messages.length === 0 && (
          <div style={{ margin: "auto", textAlign: "center", color: "#6c7086" }}>
            <Terminal size={48} style={{ marginBottom: "1rem" }} />
            <p>Welcome to Unrestricted Claude Code via Rust & Tauri.</p>
            <p>I can execute ANY terminal command natively. Please provide your Anthropic API Key above to start.</p>
          </div>
        )}

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
      <div style={{ padding: "1rem", backgroundColor: "#11111b", borderTop: "1px solid #313244" }}>
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
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} style={{ display: "flex", gap: "10px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading || !apiKey}
            placeholder={apiKey ? "Ask Claude to run a command or write code..." : "Please enter API Key first"}
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
