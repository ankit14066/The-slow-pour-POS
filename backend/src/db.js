const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'pos.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  price REAL NOT NULL CHECK(price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  category TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  total REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL,
  product_id INTEGER NOT NULL,
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL,
  line_total REAL NOT NULL,
  FOREIGN KEY (sale_id) REFERENCES sales(id)
);
`);

const seedCount = db.prepare('SELECT COUNT(*) AS count FROM products').get().count;
if (seedCount === 0) {
  const insert = db.prepare('INSERT INTO products (name, price, stock, category) VALUES (?, ?, ?, ?)');
  const items = [
    ['Espresso', 120, 50, 'Beverage'],
    ['Cappuccino', 160, 40, 'Beverage'],
    ['Blueberry Muffin', 90, 30, 'Bakery'],
    ['Brownie', 110, 25, 'Bakery']
  ];
  const txn = db.transaction((rows) => rows.forEach((r) => insert.run(...r)));
  txn(items);
}

module.exports = db;
