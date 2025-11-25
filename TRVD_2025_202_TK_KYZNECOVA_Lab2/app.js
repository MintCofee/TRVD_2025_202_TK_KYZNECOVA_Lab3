require("dotenv").config();
const express = require("express");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const connectDB = require("./config/db");

const app = express();
app.use(express.json());

connectDB();

app.use(session({
    secret: "supersecretkey",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGO_URI }),
    cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

app.use("/auth", require("./routes/auth"));
app.use("/api", require("./routes/protected"));

app.listen(3000, () => console.log("Server running on port 3000"));
