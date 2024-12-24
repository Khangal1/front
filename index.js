const express = require("express");
const mysql = require("mysql2");
const app = express();
const cors = require("cors");

app.use(express.json());
app.use(cors());

const pool = mysql.createPool({
host: "localhost",  
user: "root",
password: "Nest123$",
database: "e_commerse",
waitForConnections: true,
connectionLimit: 10,
queueLimit: 0,
});

pool.getConnection((err, connection) => {
if (err) {
  console.error("Error connecting to MySQL:", err);
  return;
}
console.log("Connected to MySQL!");
connection.release();
});

app.get("/reviews", (req, res) => {
const query = `
  SELECT r.review_id, r.user_id, r.product_id, r.rating, r.review_text, r.created_at, 
         u.username AS user_name, p.product_name AS product_name
  FROM reviews r
  JOIN users u ON r.user_id = u.user_id
  JOIN products p ON r.product_id = p.product_id
`;

pool.query(query, (err, rows) => {
  if (err) {
    console.error("Error fetching reviews:", err);
    res.status(500).send("Error fetching reviews from database");
    return;
  }
  res.json(rows);
});
});


app.post("/reviews", (req, res) => {
const { user_id, product_id, rating, review_text } = req.body;

if (!user_id || !product_id || !rating) {
  return res.status(400).json({ error: "User ID, Product ID, and Rating are required." });
}

if (rating < 1 || rating > 5) {
  return res.status(400).json({ error: "Rating must be between 1 and 5." });
}

const query = "INSERT INTO reviews (user_id, product_id, rating, review_text) VALUES (?, ?, ?, ?)";
pool.query(query, [user_id, product_id, rating, review_text], (err, result) => {
  if (err) {
    console.error("Error creating review:", err);
    return res.status(500).json({ error: "Failed to create review." });
  }
  res.status(201).json({ message: "Review created successfully!", reviewId: result.insertId });
});
});


app.patch("/reviews/:id", (req, res) => {
const { id } = req.params;
const { rating, review_text } = req.body;

if (rating && (rating < 1 || rating > 5)) {
  return res.status(400).json({ error: "Rating must be between 1 and 5." });
}

const query = `
  UPDATE reviews 
  SET rating = IFNULL(?, rating), 
      review_text = IFNULL(?, review_text) 
  WHERE review_id = ?`;
pool.query(query, [rating, review_text, id], (err, result) => {
  if (err) {
    console.error("Error updating review:", err);
    res.status(500).json({ error: "Failed to update review." });
    return;
  }
  res.status(200).json({ message: "Review updated successfully!" });
});
});


app.delete("/reviews/:id", (req, res) => {
const { id } = req.params;

const query = "DELETE FROM reviews WHERE review_id = ?";
pool.query(query, [id], (err, result) => {
  if (err) {
    console.error("Error deleting review:", err);
    res.status(500).json({ error: "Failed to delete review." });
    return;
  }
  res.status(200).json({ message: "Review deleted successfully!" });
});
});


app.get("/users", (req, res) => {
pool.query("SELECT * FROM users", (err, rows) => {
  if (err) {
    console.error("Error fetching users:", err);
    res.status(500).send("Error fetching users from database");
    return;
  }
  res.json(rows);
});
});


app.post("/users", (req, res) => {
const { username, email, password } = req.body;

if (!username || !email || !password) {
  return res.status(400).json({ error: "All fields are required." });
}

const query = "INSERT INTO users (username, email, password) VALUES (?, ?, ?)";
pool.query(query, [username, email, password], (err, result) => {
  if (err) {
    console.error("Error inserting user:", err);
    return res.status(500).json({ error: "Failed to create user." });
  }
  res.status(201).json({ message: "User created successfully!", userId: result.insertId });
});
});


app.post("/products", (req, res) => {
const { product_name, price, stock, description } = req.body;

if (!product_name || !price || !stock) {
  return res.status(400).send("Missing required fields.");
}

const query = "INSERT INTO products (product_name, price, stock, description) VALUES (?, ?, ?, ?)";
pool.query(query, [product_name, price, stock, description], (err, result) => {
  if (err) {
    console.error("Error adding product:", err);
    return res.status(500).send("Failed to add product.");
  }
  res.status(201).send({ message: "Product created successfully.", productId: result.insertId });
});
});


app.get("/products", (req, res) => {
pool.query("SELECT * FROM products", (err, rows) => {
  if (err) {
    console.error("Error fetching products:", err);
    res.status(500).send("Failed to fetch products.");
    return;
  }
  res.json(rows);
});
});


app.patch("/products/:id", (req, res) => {
const { id } = req.params;
const { product_name, price, stock, description } = req.body;

const query = `
  UPDATE products
  SET product_name = IFNULL(?, product_name),
      price = IFNULL(?, price),
      stock = IFNULL(?, stock),
      description = IFNULL(?, description)
  WHERE product_id = ?`;

pool.query(query, [product_name, price, stock, description, id], (err, result) => {
  if (err) {
    console.error("Error updating product:", err);
    res.status(500).send("Failed to update product.");
    return;
  }
  res.status(200).send("Product updated successfully.");
});
});




app.patch("/users", (req, res) => {
const { username, email, password } = req.body;

if (!username || !email || !password) {
  return res.status(400).send("Missing required fields.");
}

const query = "UPDATE users SET username = ?, email = ?, password = ?";
pool.query(query, [username, email, password], (err, result) => {
  if (err) {
    console.error("Error updating user:", err);
    return res.status(500).send("Failed to update user.");
  }
  res.status(200).send("User updated successfully.");
});
});


app.get("/order_items", (req, res) => {
  const query = "SELECT * FROM order_items";
  pool.query(query, (err, rows) => {
    if (err) {
      console.error("Error fetching order items:", err);
      res.status(500).send("Failed to fetch order items.");
      return;
    }
    res.json(rows);
  });
});


app.post("/order_items", (req, res) => {
  const { order_id, product_id, quantity, price } = req.body;

  if (!order_id || !product_id || !quantity || !price) {
    return res.status(400).json({ error: "All fields are required: order_id, product_id, quantity, price." });
  }

  const query = `
    INSERT INTO order_items (order_id, product_id, quantity, price) 
    VALUES (?, ?, ?, ?)
  `;
  pool.query(query, [order_id, product_id, quantity, price], (err, result) => {
    if (err) {
      console.error("Error adding order item:", err);
      return res.status(500).send("Failed to add order item.");
    }
    res.status(201).send({ message: "Order item created successfully.", orderItemId: result.insertId });
  });
});


app.patch("/order_items/:id", (req, res) => {
  const { id } = req.params;
  const { order_id, product_id, quantity, price } = req.body;

  if (!order_id || !product_id || !quantity || !price) {
    return res.status(400).json({ error: "All fields are required: order_id, product_id, quantity, price." });
  }

  const query = `
    UPDATE order_items 
    SET order_id = ?, product_id = ?, quantity = ?, price = ? 
    WHERE order_item_id = ?
  `;
  pool.query(query, [order_id, product_id, quantity, price, id], (err, result) => {
    if (err) {
      console.error("Error updating order item:", err);
      return res.status(500).send("Failed to update order item.");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Order item not found.");
    }
    res.status(200).send("Order item updated successfully.");
  });
});




app.get("/orders", (req, res) => {
  const query = `
    SELECT o.order_id, o.user_id, u.username AS user_name, o.order_date, 
           o.total_amount, o.status
    FROM orders o
    JOIN users u ON o.user_id = u.user_id
  `;
  pool.query(query, (err, rows) => {
    if (err) {
      console.error("Error fetching orders:", err);
      res.status(500).send("Failed to fetch orders.");
      return;
    }
    res.json(rows);
  });
});

app.post("/orders", (req, res) => {
  const { user_id, total_amount, status } = req.body;

  if (!user_id || !total_amount || !status) {
    return res.status(400).json({ error: "User ID, total amount, and status are required." });
  }

  const query = "INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)";
  pool.query(query, [user_id, total_amount, status], (err, result) => {
    if (err) {
      console.error("Error creating order:", err);
      return res.status(500).send("Failed to create order.");
    }
    res.status(201).send({ message: "Order created successfully.", orderId: result.insertId });
  });
});


app.patch("/orders/:id", (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ error: "Order status is required." });
  }

  const query = "UPDATE orders SET status = ? WHERE order_id = ?";
  pool.query(query, [status, id], (err, result) => {
    if (err) {
      console.error("Error updating order:", err);
      return res.status(500).send("Failed to update order.");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Order not found.");
    }
    res.status(200).send("Order updated successfully.");
  });
});
app.get("/categories", (req, res) => {
  const query = `
    SELECT c.id, c.name, c.created_at
    FROM categories c
  `;
  pool.query(query, (err, rows) => {
    if (err) {
      console.error("Error fetching categories:", err);
      res.status(500).send("Failed to fetch categories.");
      return;
    }
    res.json(rows);
  });
});

app.post("/createCategories", (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Category name is required." });
  }

  const query = "INSERT INTO categories (name) VALUES (?)";
  pool.query(query, [name], (err, result) => {
    if (err) {
      console.error("Error creating category:", err);
      return res.status(500).send("Failed to create category.");
    }
    res.status(201).send({ message: "Category created successfully.", categoryId: result.insertId });
  });
});

app.patch("/categories/:id", (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Category name is required." });
  }

  const query = "UPDATE categories SET name = ? WHERE id = ?";
  pool.query(query, [name, id], (err, result) => {
    if (err) {
      console.error("Error updating category:", err);
      return res.status(500).send("Failed to update category.");
    }
    if (result.affectedRows === 0) {
      return res.status(404).send("Category not found.");
    }
    res.status(200).send("Category updated successfully.");
  });
});


app.get("/", (req, res) => res.send("Server is working"));

const PORT = 4000;
app.listen(PORT, () => {
console.log(`Server running on port ${PORT}`);
});
