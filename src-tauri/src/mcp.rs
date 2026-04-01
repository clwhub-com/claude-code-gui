use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::process::Stdio;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::{mpsc, Mutex};

#[derive(Clone)]
pub struct McpServer {
    pub name: String,
    pub tx: mpsc::Sender<(Value, tokio::sync::oneshot::Sender<Value>)>,
}

pub struct McpManager {
    pub servers: Arc<Mutex<HashMap<String, McpServer>>>,
}

impl McpManager {
    pub fn new() -> Self {
        Self {
            servers: Arc::new(Mutex::new(HashMap::new())),
        }
    }

    pub async fn start_server(&self, name: String, command: String) -> Result<(), String> {
        let mut parts = command.split_whitespace();
        let program = parts.next().ok_or("Empty command")?;
        let args: Vec<&str> = parts.collect();

        let mut child = Command::new(program)
            .args(&args)
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::inherit())
            .spawn()
            .map_err(|e| format!("Failed to start MCP server: {}", e))?;

        let mut stdin = child.stdin.take().unwrap();
        let stdout = child.stdout.take().unwrap();

        let (tx, mut rx) = mpsc::channel::<(Value, tokio::sync::oneshot::Sender<Value>)>(32);

        // Map of request ID to oneshot sender
        let pending_requests = Arc::new(Mutex::new(HashMap::<u64, tokio::sync::oneshot::Sender<Value>>::new()));
        let pending_requests_clone = pending_requests.clone();

        // Writer task
        tokio::spawn(async move {
            let mut req_id: u64 = 0;
            while let Some((mut req, reply_tx)) = rx.recv().await {
                req_id += 1;
                req["id"] = json!(req_id);
                req["jsonrpc"] = json!("2.0");
                
                pending_requests_clone.lock().await.insert(req_id, reply_tx);

                let mut req_str = serde_json::to_string(&req).unwrap();
                req_str.push('\n');
                if stdin.write_all(req_str.as_bytes()).await.is_err() {
                    break;
                }
            }
        });

        // Reader task
        let pending_requests_reader = pending_requests.clone();
        tokio::spawn(async move {
            let mut reader = BufReader::new(stdout).lines();
            while let Ok(Some(line)) = reader.next_line().await {
                if let Ok(resp) = serde_json::from_str::<Value>(&line) {
                    if let Some(id_val) = resp.get("id") {
                        if let Some(id) = id_val.as_u64() {
                            if let Some(reply_tx) = pending_requests_reader.lock().await.remove(&id) {
                                let _ = reply_tx.send(resp);
                            }
                        }
                    }
                }
            }
        });

        // Send initialization request
        let (init_tx, init_rx) = tokio::sync::oneshot::channel();
        let init_req = json!({
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {},
                "clientInfo": {
                    "name": "claude-code-gui",
                    "version": "0.1.0"
                }
            }
        });
        
        tx.send((init_req, init_tx)).await.map_err(|_| "Failed to send init")?;
        let _init_resp = init_rx.await.map_err(|_| "Failed to receive init response")?;

        // Send notifications/initialized
        let (notif_tx, _notif_rx) = tokio::sync::oneshot::channel();
        let notif_req = json!({
            "method": "notifications/initialized"
        });
        let _ = tx.send((notif_req, notif_tx)).await;

        self.servers.lock().await.insert(name.clone(), McpServer { name, tx });
        Ok(())
    }

    pub async fn list_tools(&self, server_name: &str) -> Result<Value, String> {
        let tx = {
            let servers = self.servers.lock().await;
            servers.get(server_name).ok_or("Server not found")?.tx.clone()
        };

        let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
        let req = json!({
            "method": "tools/list"
        });

        tx.send((req, reply_tx)).await.map_err(|_| "Send failed")?;
        let resp = reply_rx.await.map_err(|_| "Recv failed")?;

        if let Some(err) = resp.get("error") {
            return Err(err.to_string());
        }

        Ok(resp["result"].clone())
    }

    pub async fn call_tool(&self, server_name: &str, tool_name: &str, args: Value) -> Result<Value, String> {
        let tx = {
            let servers = self.servers.lock().await;
            servers.get(server_name).ok_or("Server not found")?.tx.clone()
        };

        let (reply_tx, reply_rx) = tokio::sync::oneshot::channel();
        let req = json!({
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": args
            }
        });

        tx.send((req, reply_tx)).await.map_err(|_| "Send failed")?;
        let resp = reply_rx.await.map_err(|_| "Recv failed")?;

        if let Some(err) = resp.get("error") {
            return Err(err.to_string());
        }

        Ok(resp["result"].clone())
    }
}
