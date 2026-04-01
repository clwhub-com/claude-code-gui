use serde::{Deserialize, Serialize};
use std::process::Command;
use std::fs;
use serde_json::json;
use glob::glob;
use regex::Regex;
use ignore::WalkBuilder;
use std::path::Path;

use std::sync::{Arc, Mutex};
use std::collections::HashMap;
use tauri::State;
use tokio::process::Command as AsyncCommand;
use std::process::Stdio;
use tokio::io::{AsyncReadExt, BufReader};
use base64::{Engine as _, engine::general_purpose};
use mime_guess::from_path;
use mime;
use chrono;
use std::str::FromStr;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TodoItem {
    pub content: String,
    pub activeForm: String,
    pub status: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CronJob {
    pub id: String,
    pub cron: String,
    pub prompt: String,
    pub durable: bool,
    pub recurring: bool,
    pub next_fire_time: Option<i64>,
}

struct AppState {
    background_tasks: Arc<Mutex<HashMap<String, tokio::sync::mpsc::Sender<()>>>>,
    task_logs: Arc<Mutex<HashMap<String, String>>>,
    todos: Arc<Mutex<Vec<TodoItem>>>,
    cron_jobs: Arc<Mutex<HashMap<String, CronJob>>>,
    active_worktree: Arc<Mutex<Option<String>>>,
    original_cwd: Arc<Mutex<Option<String>>>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            background_tasks: Arc::new(Mutex::new(HashMap::new())),
            task_logs: Arc::new(Mutex::new(HashMap::new())),
            todos: Arc::new(Mutex::new(Vec::new())),
            cron_jobs: Arc::new(Mutex::new(HashMap::new())),
            active_worktree: Arc::new(Mutex::new(None)),
            original_cwd: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
async fn run_background_task(cmd: String, state: State<'_, AppState>) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    let (tx, mut rx) = tokio::sync::mpsc::channel(1);

    state.background_tasks.lock().unwrap().insert(task_id.clone(), tx);
    state.task_logs.lock().unwrap().insert(task_id.clone(), String::new());

    let task_id_clone = task_id.clone();
    let task_id_clone2 = task_id.clone();
    let logs_arc = Arc::clone(&state.task_logs);

    tauri::async_runtime::spawn(async move {
        let child = if cfg!(target_os = "windows") {
            AsyncCommand::new("cmd")
                .args(["/C", &cmd])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
        } else {
            AsyncCommand::new("sh")
                .args(["-c", &cmd])
                .stdout(Stdio::piped())
                .stderr(Stdio::piped())
                .spawn()
        };

        if let Ok(mut child_proc) = child {
            let stdout = child_proc.stdout.take().unwrap();
            let stderr = child_proc.stderr.take().unwrap();

            let logs_out = Arc::clone(&logs_arc);
            let logs_err = Arc::clone(&logs_arc);
            let tid_out = task_id_clone.clone();
            let tid_err = task_id_clone.clone();

            tauri::async_runtime::spawn(async move {
                let mut reader = BufReader::new(stdout);
                let mut buf = [0; 1024];
                while let Ok(n) = reader.read(&mut buf).await {
                    if n == 0 { break; }
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    if let Some(log) = logs_out.lock().unwrap().get_mut(&tid_out) {
                        log.push_str(&chunk);
                    }
                }
            });

            tauri::async_runtime::spawn(async move {
                let mut reader = BufReader::new(stderr);
                let mut buf = [0; 1024];
                while let Ok(n) = reader.read(&mut buf).await {
                    if n == 0 { break; }
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    if let Some(log) = logs_err.lock().unwrap().get_mut(&tid_err) {
                        log.push_str(&chunk);
                    }
                }
            });

            tokio::select! {
                _ = child_proc.wait() => {
                    println!("Task {} finished", task_id_clone);
                    if let Some(log) = logs_arc.lock().unwrap().get_mut(&task_id_clone) {
                        log.push_str("\n[PROCESS EXITED]");
                    }
                }
                _ = rx.recv() => {
                    println!("Task {} killed", task_id_clone);
                    let _ = child_proc.kill().await;
                    if let Some(log) = logs_arc.lock().unwrap().get_mut(&task_id_clone) {
                        log.push_str("\n[PROCESS KILLED BY USER]");
                    }
                }
            }
        } else {
             if let Some(log) = logs_arc.lock().unwrap().get_mut(&task_id_clone) {
                 log.push_str("\n[PROCESS FAILED TO START]");
             }
        }
    });

    Ok(task_id_clone2)
}

#[tauri::command]
fn check_task(task_id: String, state: State<'_, AppState>) -> Result<String, String> {
    if let Some(log) = state.task_logs.lock().unwrap().get(&task_id) {
        // Return the last 5000 characters to avoid huge context drops
        let len = log.len();
        if len > 5000 {
            Ok(format!("... (truncated)\n{}", &log[len - 5000..]))
        } else {
            Ok(log.clone())
        }
    } else {
        Err("Task ID not found or logs cleared".into())
    }
}

#[tauri::command]
fn stop_task(task_id: String, state: State<'_, AppState>) -> Result<String, String> {
    if let Some(tx) = state.background_tasks.lock().unwrap().remove(&task_id) {
        let _ = tx.try_send(());
        Ok("Task stopped".into())
    } else {
        Err("Task not found".into())
    }
}

#[tauri::command]
async fn execute_command(cmd: String) -> Result<String, String> {
    println!("Executing: {}", cmd);
    let output = if cfg!(target_os = "windows") {
        Command::new("cmd")
            .args(["/C", &cmd])
            .output()
    } else {
        Command::new("sh")
            .args(["-c", &cmd])
            .output()
    };

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout).to_string();
            let stderr = String::from_utf8_lossy(&out.stderr).to_string();
            if out.status.success() {
                Ok(stdout)
            } else {
                Err(format!("Error: {}\nOutput: {}", stderr, stdout))
            }
        }
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    // If it's an image, return base64 data URL
    let p = Path::new(&path);
    let mime = from_path(p).first_or_octet_stream();

    if mime.type_() == mime::IMAGE {
        let bytes = fs::read(&path).map_err(|e| format!("Failed to read image: {}", e))?;
        let b64 = general_purpose::STANDARD.encode(&bytes);
        // Returning a specific JSON structure string that our JS can intercept for Anthropic's image block
        let wrapper = json!({
            "is_image": true,
            "media_type": mime.to_string(),
            "data": b64
        });
        Ok(wrapper.to_string())
    } else {
        fs::read_to_string(&path).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn write_file(path: String, content: String) -> Result<String, String> {
    // Ensure parent directories exist
    if let Some(parent) = Path::new(&path).parent() {
        let _ = fs::create_dir_all(parent);
    }
    fs::write(&path, content)
        .map(|_| "Success".to_string())
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn read_memory_files() -> Result<String, String> {
    let memory_dir = Path::new(".claude");
    if !memory_dir.exists() {
        return Ok("No .claude directory found.".to_string());
    }

    let mut all_memory = String::new();

    // Read the main index
    let memory_index = memory_dir.join("MEMORY.md");
    if memory_index.exists() {
        if let Ok(content) = fs::read_to_string(&memory_index) {
            all_memory.push_str("=== MEMORY.md ===\n");
            all_memory.push_str(&content);
            all_memory.push_str("\n\n");
        }
    }

    // Read all other markdown files in the directory
    if let Ok(entries) = fs::read_dir(memory_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) == Some("md") && path.file_name().unwrap() != "MEMORY.md" {
                if let Ok(content) = fs::read_to_string(&path) {
                    all_memory.push_str(&format!("=== {} ===\n", path.display()));
                    all_memory.push_str(&content);
                    all_memory.push_str("\n\n");
                }
            }
        }
    }

    Ok(all_memory)
}

#[tauri::command]
async fn glob_search(pattern: String, cwd: Option<String>) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    let current_dir = cwd.unwrap_or_else(|| ".".to_string());

    let full_pattern = format!("{}/{}", current_dir, pattern);

    for entry in glob(&full_pattern).map_err(|e| e.to_string())? {
        match entry {
            Ok(path) => {
                results.push(path.display().to_string());
            }
            Err(e) => return Err(e.to_string()),
        }
    }
    let max_results = 200;
    if results.len() > max_results {
        results.truncate(max_results);
        results.push("...(truncated)".to_string());
    }

    Ok(results)
}

#[tauri::command]
async fn grep_search(pattern: String, path: Option<String>) -> Result<Vec<String>, String> {
    let root = path.unwrap_or_else(|| ".".to_string());
    let re = Regex::new(&pattern).map_err(|e| e.to_string())?;
    let mut matches = Vec::new();

    let walker = WalkBuilder::new(&root)
        .hidden(true)
        .git_ignore(true)
        .build();

    let mut match_count = 0;
    for result in walker {
        if match_count > 100 {
            matches.push("... Too many matches, truncated for safety".to_string());
            break;
        }

        let entry = match result {
            Ok(e) => e,
            Err(_) => continue,
        };

        if !entry.file_type().map_or(false, |ft| ft.is_file()) {
            continue;
        }

        if let Ok(content) = fs::read_to_string(entry.path()) {
            for (i, line) in content.lines().enumerate() {
                if re.is_match(line) {
                    matches.push(format!("{}:{}: {}", entry.path().display(), i + 1, line));
                    match_count += 1;
                    if match_count > 100 { break; }
                }
            }
        }
    }

    Ok(matches)
}

#[tauri::command]
fn edit_file(path: String, old_string: String, new_string: String) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read {}: {}", path, e))?;

    if !content.contains(&old_string) {
        return Err(format!("The exact old_string was not found in {}!", path));
    }

    let updated = content.replace(&old_string, &new_string);
    fs::write(&path, updated).map_err(|e| format!("Failed to write: {}", e))?;
    Ok("Edit successful".to_string())
}

#[tauri::command]
async fn web_fetch(url: String) -> Result<String, String> {
    let response = reqwest::get(&url)
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let text = response
        .text()
        .await
        .map_err(|e| format!("Failed to read text: {}", e))?;

    // Basic conversion to markdown
    let md = html2md::parse_html(&text);
    // Truncate to avoid exploding the context length
    let max_len = 30000;
    if md.len() > max_len {
        Ok(format!("{}... [TRUNCATED DUE TO LENGTH]", &md[..max_len]))
    } else {
        Ok(md)
    }
}

#[tauri::command]
fn notebook_edit(path: String, cell_id: Option<String>, new_source: String) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Failed to read notebook {}: {}", path, e))?;

    let mut notebook: serde_json::Value = serde_json::from_str(&content)
        .map_err(|e| format!("Invalid JSON in notebook: {}", e))?;

    let cells = notebook.get_mut("cells")
        .and_then(|c| c.as_array_mut())
        .ok_or_else(|| "Notebook missing 'cells' array".to_string())?;

    if let Some(id) = cell_id {
        // Find existing cell by ID
        let mut found = false;
        for cell in cells.iter_mut() {
            if let Some(cell_id_val) = cell.get("id").and_then(|id| id.as_str()) {
                if cell_id_val == id {
                    cell["source"] = json!([new_source]);
                    found = true;
                    break;
                }
            }
        }
        if !found {
            return Err(format!("Cell with id {} not found.", id));
        }
    } else {
        // Append a new cell at the end
        let new_cell = json!({
            "cell_type": "code",
            "execution_count": null,
            "id": format!("cell_{}", &uuid::Uuid::new_v4().to_string().replace("-", "")[..8]),
            "metadata": {},
            "outputs": [],
            "source": [new_source]
        });
        cells.push(new_cell);
    }

    let updated = serde_json::to_string_pretty(&notebook)
        .map_err(|e| format!("Failed to serialize notebook: {}", e))?;

    fs::write(&path, updated).map_err(|e| format!("Failed to write notebook: {}", e))?;
    Ok("Notebook edited successfully".to_string())
}

use tree_sitter::{Parser, Language};

extern "C" { fn tree_sitter_javascript() -> Language; }
extern "C" { fn tree_sitter_typescript() -> Language; }
extern "C" { fn tree_sitter_python() -> Language; }
extern "C" { fn tree_sitter_rust() -> Language; }

#[tauri::command]
fn ast_replace(path: String, function_or_class_name: String, new_code: String) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e| format!("Read failed: {}", e))?;

    let language = if path.ends_with(".js") {
        tree_sitter_javascript::LANGUAGE.into()
    } else if path.ends_with(".ts") || path.ends_with(".tsx") {
        tree_sitter_typescript::LANGUAGE_TYPESCRIPT.into()
    } else if path.ends_with(".py") {
        tree_sitter_python::LANGUAGE.into()
    } else if path.ends_with(".rs") {
        tree_sitter_rust::LANGUAGE.into()
    } else {
        return Err("Unsupported language for AST edit. Use standard Edit instead.".into());
    };

    let mut parser = Parser::new();
    parser.set_language(&language).map_err(|e| e.to_string())?;

    let tree = parser.parse(&content, None).ok_or("Parse failed")?;
    let root_node = tree.root_node();

    // We do a simple traversal looking for a node that defines our target name
    // This is a naive AST search. In a full implementation we would use tree-sitter Queries.
    let mut _cursor = root_node.walk();
    let mut found_range = None;

    let mut nodes = vec![root_node];
    while let Some(node) = nodes.pop() {
        let kind = node.kind();
        // Check if it's a declaration node
        if kind.contains("declaration") || kind.contains("definition") || kind.contains("function") || kind.contains("class") {
            // Find its name identifier child
            for i in 0..node.child_count() as u32 {
                let child = node.child(i).unwrap();
                if child.kind() == "identifier" || child.kind() == "name" {
                    let name = &content[child.start_byte()..child.end_byte()];
                    if name == function_or_class_name {
                        found_range = Some((node.start_byte(), node.end_byte()));
                        break;
                    }
                }
            }
        }
        if found_range.is_some() { break; }

        for i in 0..node.child_count() as u32 {
            nodes.push(node.child(i).unwrap());
        }
    }

    if let Some((start, end)) = found_range {
        let mut updated = String::new();
        updated.push_str(&content[..start]);
        updated.push_str(&new_code);
        updated.push_str(&content[end..]);
        fs::write(&path, updated).map_err(|e| e.to_string())?;
        Ok(format!("Successfully replaced AST node for {}", function_or_class_name))
    } else {
        Err(format!("Could not find function or class named {} in AST", function_or_class_name))
    }
}

#[tauri::command]
fn set_working_directory(path: String) -> Result<String, String> {
    std::env::set_current_dir(&path)
        .map_err(|e| format!("Failed to set directory to {}: {}", path, e))?;
    Ok(format!("Changed directory to {}", path))
}

#[tauri::command]
fn get_context_info() -> Result<String, String> {
    let mut info = String::new();
    let current_dir = std::env::current_dir().unwrap_or_default();
    info.push_str(&format!("Current Directory: {}\n", current_dir.display()));
    info.push_str(&format!("OS: {}\n", std::env::consts::OS));

    // Try git status
    if let Ok(output) = Command::new("git").arg("status").arg("-s").output() {
        if output.status.success() {
            info.push_str("\nGit Status (Short):\n");
            info.push_str(&String::from_utf8_lossy(&output.stdout));

            // Get branch
            if let Ok(branch_out) = Command::new("git").arg("branch").arg("--show-current").output() {
                info.push_str(&format!("Current Branch: {}", String::from_utf8_lossy(&branch_out.stdout)));
            }
        } else {
             info.push_str("\nGit: Not a git repository or git not installed.\n");
        }
    }

    Ok(info)
}

// ----------------------
// Web Search
// ----------------------
#[tauri::command]
async fn web_search(query: String) -> Result<String, String> {
    let duckduckgo_url = format!("https://html.duckduckgo.com/html/?q={}", urlencoding::encode(&query));

    let client = reqwest::Client::new();
    let response = client.get(&duckduckgo_url)
        .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let text = response.text().await.map_err(|e| format!("Read failed: {}", e))?;
    let document = scraper::Html::parse_document(&text);
    let result_selector = scraper::Selector::parse(".result__body").unwrap();
    let title_selector = scraper::Selector::parse(".result__title").unwrap();
    let snippet_selector = scraper::Selector::parse(".result__snippet").unwrap();
    let url_selector = scraper::Selector::parse(".result__url").unwrap();

    let mut results = String::new();
    let mut count = 0;

    for element in document.select(&result_selector) {
        if count >= 5 { break; }

        let title = element.select(&title_selector).next().map(|el| el.text().collect::<String>()).unwrap_or_default().trim().to_string();
        let snippet = element.select(&snippet_selector).next().map(|el| el.text().collect::<String>()).unwrap_or_default().trim().to_string();
        let url = element.select(&url_selector).next().map(|el| el.text().collect::<String>()).unwrap_or_default().trim().to_string();

        if !title.is_empty() && !url.is_empty() {
            results.push_str(&format!("Title: {}\nURL: {}\nSnippet: {}\n\n", title, url, snippet));
            count += 1;
        }
    }

    if results.is_empty() {
        Ok("No results found.".to_string())
    } else {
        Ok(results)
    }
}

// ----------------------
// Git Worktree
// ----------------------
#[tauri::command]
fn enter_worktree(name: Option<String>, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let current_dir = std::env::current_dir().map_err(|e| e.to_string())?;
    let current_dir_str = current_dir.to_string_lossy().to_string();

    let mut active = state.active_worktree.lock().unwrap();
    if active.is_some() {
        return Err("Already in a worktree".to_string());
    }

    let wt_name = name.unwrap_or_else(|| uuid::Uuid::new_v4().to_string()[..8].to_string());
    let wt_path = format!(".claude/worktrees/{}", wt_name);

    std::fs::create_dir_all(".claude/worktrees").unwrap_or_default();

    let output = std::process::Command::new("git")
        .args(["worktree", "add", "-b", &format!("claude-wt-{}", wt_name), &wt_path])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let target_dir = std::path::Path::new(&wt_path).canonicalize().map_err(|e| e.to_string())?;
    std::env::set_current_dir(&target_dir).map_err(|e| e.to_string())?;

    let mut orig_cwd = state.original_cwd.lock().unwrap();
    *orig_cwd = Some(current_dir_str);
    *active = Some(wt_name.clone());

    Ok(format!("Entered worktree: {}", wt_name))
}

#[tauri::command]
fn exit_worktree(action: String, discard_changes: Option<bool>, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut active = state.active_worktree.lock().unwrap();
    let mut orig_cwd = state.original_cwd.lock().unwrap();

    let wt_name = match active.as_ref() {
        Some(name) => name.clone(),
        None => return Err("Not in a worktree".to_string()),
    };

    let cwd = orig_cwd.clone().unwrap_or_else(|| ".".to_string());
    std::env::set_current_dir(&cwd).map_err(|e| e.to_string())?;

    if action == "remove" {
        let wt_path = format!(".claude/worktrees/{}", wt_name);
        let force = discard_changes.unwrap_or(false);

        let mut cmd = std::process::Command::new("git");
        cmd.args(["worktree", "remove"]);
        if force {
            cmd.arg("--force");
        }
        cmd.arg(&wt_path);

        let output = cmd.output().map_err(|e| e.to_string())?;

        if !output.status.success() {
            // Revert directory change if removal failed
            let target_dir = std::path::Path::new(&wt_path).canonicalize().unwrap_or_default();
            let _ = std::env::set_current_dir(target_dir);
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }

        // Also delete the branch
        let _ = std::process::Command::new("git")
            .args(["branch", "-D", &format!("claude-wt-{}", wt_name)])
            .output();
    }

    *active = None;
    *orig_cwd = None;

    Ok(format!("Exited worktree. Action: {}", action))
}

// ----------------------
// Todo List
// ----------------------
#[tauri::command]
fn todo_write(todos: Vec<TodoItem>, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut state_todos = state.todos.lock().unwrap();
    *state_todos = todos;
    Ok("Todos updated".to_string())
}

#[tauri::command]
fn get_todos(state: tauri::State<'_, AppState>) -> Result<Vec<TodoItem>, String> {
    let todos = state.todos.lock().unwrap();
    Ok(todos.clone())
}

// ----------------------
// Cron Jobs
// ----------------------
#[tauri::command]
fn cron_create(cron: String, prompt: String, durable: Option<bool>, recurring: Option<bool>, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let schedule = match cron::Schedule::from_str(&cron) {
        Ok(s) => s,
        Err(e) => return Err(format!("Invalid cron expression: {}", e)),
    };

    let now = chrono::Utc::now();
    let next = schedule.upcoming(chrono::Utc).next().map(|dt| dt.timestamp());

    let id = uuid::Uuid::new_v4().to_string();
    let job = CronJob {
        id: id.clone(),
        cron,
        prompt,
        durable: durable.unwrap_or(false),
        recurring: recurring.unwrap_or(true),
        next_fire_time: next,
    };

    state.cron_jobs.lock().unwrap().insert(id.clone(), job);
    Ok(id)
}

#[tauri::command]
fn cron_list(state: tauri::State<'_, AppState>) -> Result<Vec<CronJob>, String> {
    let jobs = state.cron_jobs.lock().unwrap();
    Ok(jobs.values().cloned().collect())
}

#[tauri::command]
fn cron_delete(id: String, state: tauri::State<'_, AppState>) -> Result<String, String> {
    let mut jobs = state.cron_jobs.lock().unwrap();
    if jobs.remove(&id).is_some() {
        Ok(format!("Deleted job {}", id))
    } else {
        Err(format!("Job {} not found", id))
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(AppState::default())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            execute_command,
            read_file,
            write_file,
            read_memory_files,
            glob_search,
            grep_search,
            edit_file,
            web_fetch,
            notebook_edit,
            ast_replace,
            run_background_task,
            check_task,
            stop_task,
            get_context_info,
            web_search,
            enter_worktree,
            exit_worktree,
            todo_write,
            get_todos,
            cron_create,
            cron_list,
            cron_delete,
            set_working_directory
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
