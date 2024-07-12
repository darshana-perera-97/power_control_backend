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
let state = "offline";
let time = "";
let data1 = 1; // Global variable for data1
let data2 = 1; // Global variable for data2
let units = 1; // Global variable for units
let price = 100; // Global variable for price

const fetchData = async () => {
  try {
    const dbRef = ref(database);
    const snapshot = await new Promise((resolve, reject) => {
      onValue(dbRef, resolve, { onlyOnce: true }, reject);
    });
    const data = snapshot.val();

    if (data && data.device1.online === lastOnlineStatus) {
      // state = false;
      state = "Offline";
    }
    if (data && data.device1.online !== lastOnlineStatus) {
      lastOnlineStatus = data.device1.online;
      state = "Active";

      const currentDateTime = moment().tz("Asia/Colombo").format();
      time = currentDateTime;
      console.log(time);
      const responseData = {
        data,
        timestamp: time,
      };
      units = data.device1.senergy;

      // Ensure data1 and data2 are numbers before performing calculations
      const parsedData1 = Number(data1);
      const parsedData2 = Number(data2);
      const parsedUnits = Number(units);
      if (!isNaN(parsedData1) && !isNaN(parsedData2) && !isNaN(parsedUnits)) {
        price = parsedData1 + parsedData2 * parsedUnits;
        console.log(price);

        // Send mock data to Firebase
        const mockPath = "cost"; // Define your mock path
        const mockData = {
          price: price,
        }; // Define your mock data

        await set(ref(database, mockPath), mockData); // Send mock data to Firebase
      } else {
        console.error("Invalid data for calculation:", { data1, data2, units });
      }

      dataArray.push(responseData);

      if (dataArray.length > 1000) {
        dataArray.shift();
      }
    } else {
      // console.log(state);
      // state = false;
      // console.log(state);
    }
    console.log(state);
  } catch (error) {
    console.error("Error fetching data:", error);
  }
};

setInterval(fetchData, 3000);

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
      state: state,
      timestamp: time,
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
app.post("/setValue", (req, res) => {
  const { value } = req.body;

  // Perform any necessary validation
  if (typeof value !== "number") {
    return res
      .status(400)
      .json({ success: false, message: "Invalid data provided" });
  }

  // Handle the value as needed
  console.log("Received value to set:", value);

  // Update your Firebase or any other storage here
  const setValRef = ref(database, "set/val");
  set(setValRef, value)
    .then(() => {
      res.json({ success: true, message: "Value set successfully" });
    })
    .catch((error) => {
      console.error("Error setting value:", error);
      res.status(500).json({ success: false, message: "Error setting value" });
    });
});

app.post("/setCost", (req, res) => {
  const { data1: newData1, data2: newData2 } = req.body;

  console.log("Received data to set:", { newData1, newData2 });

  if (!isNaN(newData1) && !isNaN(newData2)) {
    data1 = Number(newData1); // Update global data1
    data2 = Number(newData2); // Update global data2
    res.json({ success: true, message: "Cost data updated successfully" });
  } else {
    res.status(400).json({ success: false, message: "Invalid data provided" });
  }
});

// Get Cost API
app.get("/getCost", (req, res) => {
  if (data1 === undefined || data2 === undefined) {
    return res
      .status(400)
      .json({ success: false, message: "Cost data not set" });
  }

  const result = Number(data1) + Number(data2) * units;

  console.log("Calculated result:", result);

  res.json({ success: true, result });
});

// Endpoint to get global data1 and data2
app.get("/globalData", (req, res) => {
  res.json({ data1, data2 });
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
