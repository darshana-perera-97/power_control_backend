const express = require("express");
const cors = require("cors");
const { initializeApp } = require("firebase/app");
const { getDatabase, ref, set, onValue } = require("firebase/database");
const moment = require("moment-timezone");
const bodyParser = require("body-parser");

const firebaseConfig = {
  apiKey: "AIzaSyDcehMQQY6D90NIiZcLyzVQkxPys9LJzTM",
  authDomain: "smart-power-meter-be704.firebaseapp.com",
  databaseURL:
    "https://smart-power-meter-be704-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-power-meter-be704",
  storageBucket: "smart-power-meter-be704.appspot.com",
  messagingSenderId: "700492789096",
  appId: "1:700492789096:web:c25633ccac57c7f4b252dd",
  measurementId: "G-NQJ882NCL3",
};

const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase();

const app = express();
app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());

let dataArray = [];
let lastOnlineStatus = null;
let units = 1; // Global variable for units
let tableData = Array(2).fill(Array(5).fill(0)); // Initialize a 2x5 array for table data

const fetchData = async () => {
  try {
    const dbRef = ref(database);
    const snapshot = await new Promise((resolve, reject) => {
      onValue(dbRef, resolve, { onlyOnce: true }, reject);
    });
    const data = snapshot.val();

    if (data && data.device1.online !== lastOnlineStatus) {
      lastOnlineStatus = data.device1.online;

      const currentDateTime = moment().tz("Asia/Colombo").format();

      const responseData = {
        data,
        timestamp: currentDateTime,
      };
      units = data.device1.senergy;

      // Select the column based on the units range
      let colIndex;
      if (units >= 0 && units <= 30) {
        colIndex = 0;
      } else if (units >= 31 && units <= 60) {
        colIndex = 1;
      } else if (units >= 61 && units <= 90) {
        colIndex = 2;
      } else if (units >= 91 && units <= 120) {
        colIndex = 3;
      } else {
        colIndex = 4;
      }

      const price =
        Number(tableData[0][colIndex]) + units * Number(tableData[1][colIndex]);
      console.log(price);

      // Send mock data to Firebase
      const mockPath = "cost";
      const mockData = {
        price: price,
      };

      await set(ref(database, mockPath), mockData); // Send mock data to Firebase

      dataArray.push(responseData);

      if (dataArray.length > 1000) {
        dataArray.shift();
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

setInterval(fetchData, 1000);

app.get("/data", async (req, res) => {
  try {
    const dbRef = ref(database);
    const snapshot = await new Promise((resolve, reject) => {
      onValue(dbRef, resolve, { onlyOnce: true }, reject);
    });
    const data = snapshot.val();

    const currentDateTime = moment().tz("Asia/Colombo").format();

    const responseData = {
      data,
      timestamp: currentDateTime,
    };

    res.json(responseData);
  } catch (error) {
    console.error("Error fetching data:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get("/dataset", (req, res) => {
  res.json(dataArray);
});

app.post("/setCost", (req, res) => {
  const { data } = req.body;

  console.log("Received data to set:", data);

  tableData = data; // Update global tableData

  res.json({ success: true, message: "Cost data updated successfully" });
});

// Modified /getCost API
app.get("/getCost", (req, res) => {
  if (!tableData || tableData.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Cost data not set" });
  }

  let colIndex;
  if (units >= 0 && units <= 30) {
    colIndex = 0;
  } else if (units >= 31 && units <= 60) {
    colIndex = 1;
  } else if (units >= 61 && units <= 90) {
    colIndex = 2;
  } else if (units >= 91 && units <= 120) {
    colIndex = 3;
  } else {
    colIndex = 4;
  }

  const result =
    Number(tableData[0][colIndex]) + units * Number(tableData[1][colIndex]);

  console.log("Calculated result:", result);

  res.json({ success: true, result });
});

// Endpoint to get global table data
app.get("/globalData", (req, res) => {
  res.json({ tableData });
});

// Endpoint to get the data in tableData
app.get("/testCost", (req, res) => {
  res.json({ tableData });
});

// New endpoint to set value
app.post("/setValue", async (req, res) => {
  const { value } = req.body;

  console.log(typeof value);

  try {
    const valuePath = "set/val"; // Update this path as necessary
    await set(ref(database, valuePath), parseFloat(value));

    res.json({ success: true, message: "Value updated successfully" });
    console.log(value);
  } catch (error) {
    console.error("Error setting value:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
