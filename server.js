   
const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const { WebSocketServer } = require('ws');

const app = express();
const port = 5000;
const db = new sqlite3.Database(':memory:');
const wss = new WebSocketServer({ port: 5001 });

app.use(cors());
app.use(express.json());

db.serialize(() => {
  db.run("CREATE TABLE messages (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, message TEXT, timestamp DATETIME DEFAULT CURRENT_TIMESTAMP)");
});

app.get('/messages', (req, res) => {
  db.all("SELECT * FROM messages ORDER BY timestamp ASC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

wss.on('connection', (ws) => {
  ws.on('message', (message) => {
    const data = JSON.parse(message);
    const stmt = db.prepare("INSERT INTO messages (username, message) VALUES (?, ?)");
    stmt.run(data.username, data.message, function (err) {
      if (err) {
        return console.error(err.message);
      }
      const messageData = { id: this.lastID, username: data.username, message: data.message, timestamp: new Date() };
      wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
          client.send(JSON.stringify(messageData));
        }
      });
    });
    stmt.finalize();
  });
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
