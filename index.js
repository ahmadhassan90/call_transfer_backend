// const express = require("express");
// const { Pool } = require("pg");
// require("dotenv").config();

// const app = express();

// // Load environment variables
// const {
//   PGHOST,
//   PGDATABASE,
//   PGUSER,
//   PGPASSWORD,
//   PGPORT,
// } = process.env;

// // Database connection pool
// const pool = new Pool({
//   host: PGHOST,
//   database: PGDATABASE,
//   user: PGUSER,
//   password: PGPASSWORD,
//   port: PGPORT || 5432,
//   ssl: {
//     rejectUnauthorized: false, // required for Neon
//   },
// });

// // Route to query the database
// app.get("/posts", async (req, res) => {
//   let status = 404;
//   let client;
//   try {
//     client = await pool.connect();
//     const result = await client.query("SELECT * FROM doctors where id = 1");
//     res.json(result.rows);
//     status = 200;
//   } catch (error) {
//     console.error("Database error:", error);
//     res.status(status).json({ error: "Failed to fetch data" });
//   } finally {
//     if (client) client.release();
//   }
// });

// app.listen(3001, () => {
//   console.log("Server Running on http://localhost:3001");
// });


const express = require("express");
const { Pool } = require("pg");
require("dotenv").config();

const app = express();
app.use(express.json());
const {
  PGHOST,
  PGDATABASE,
  PGUSER,
  PGPASSWORD,
  PGPORT,
} = process.env;


const pool = new Pool({
  host: PGHOST,
  database: PGDATABASE,
  user: PGUSER,
  password: PGPASSWORD,
  port: PGPORT || 5432,
  ssl: {
    rejectUnauthorized: false,
  },
});

app.post("/transfer-destination", async (req, res) => {
  let client;
  try {
    const functionCall = req.body.functionCall;
    const personName = functionCall?.parameters?.name;
    console.log(personName)
    if (!personName) {
      return res.status(400).json({
        error: "Person name is required"
      });
    }

    client = await pool.connect();
    const result = await client.query(
      "SELECT person_name, phone_number  FROM doctors WHERE person_name ILIKE $1",
      [personName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Contact not found"
      });
    }

    // Return transfer destination with the exact configuration format
    res.json({
      destination: {
        type: "number",
        number: result.rows[0].phone_number,
        message: "I'm transferring your call. Kindly Wait",
        description:   "Contact",
        transferPlan: {
          mode: "warm-transfer-experimental",
          message: "",
          sipVerb: "refer",
          summaryPlan: {
            enabled: false,
            messages: [
              {
                role: "system",
                content: "Please provide a summary of the call."
              },
              {
                role: "user",
                content: "Here is the transcript:\n\n{{transcript}}\n\n"
              }
            ],
            timeoutSeconds: 1,
            useAssistantLlm: false
          },
          fallbackPlan: {
            message: "My colleague isn't available right now. I'll leave a message, and they'll get back to you as soon as possible.",
            endCallEnabled: false
          }
        },
        numberE164CheckEnabled: true
      }
    });

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Transfer failed"
    });
  } finally {
    if (client) client.release();
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

app.listen(3001, () => {
  console.log("Transfer Server Running on http://localhost:3001");
});
