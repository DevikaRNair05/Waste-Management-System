const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const app = express();
const multer = require('multer');
const path = require('path');


mongoose.connect('mongodb://localhost:27017/waste-mgmt', {
  // These two are now default and deprecated in latest MongoDB driver,
  // but including for backward compatibility.
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log("MongoDB connected"))
  .catch(err => console.log(err));

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));



// SCHEMAS
const Payment = mongoose.model('Payment', new mongoose.Schema({
  name: String,
  amount: Number,
  date: { type: Date, default: Date.now }
}));

// const Customer = mongoose.model('Customer', new mongoose.Schema({
//   customerName: String,
//   email: String,
//   phone: String,
//   dateAdded: { type: Date, default: Date.now }
// }));

const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  password: String,
  isAdmin: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}));
const Report = mongoose.model('Report', new mongoose.Schema({
  image: String, // URL of the waste image
  location: String,
  description: String,
  redVotes: { type: Number, default: 0 },
  yellowVotes: { type: Number, default: 0 },
  greenVotes: { type: Number, default: 0 },
  date: { type: Date, default: Date.now }
}));

const Recycling = mongoose.model('Recycling', new mongoose.Schema({
  wasteType: String,
  description: String,
  price: Number,
  image: String,
  date: { type: Date, default: Date.now }
}));


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// ROUTES

// ✅ Register
app.post('/register', async (req, res) => {
  const { username, email, password,isAdmin } = req.body;

  try {
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists with this email." });
    }

    const user = new User({ username, email, password,isAdmin });
    await user.save();

    res.json({ message: "User registered successfully." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "User not found." });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid credentials." });
    }

    res.json({ message: "Login successful." });
  } catch (error) {
    res.status(500).json({ message: "Server error." });
  }
});

// ✅ Payment
app.post('/payment', async (req, res) => {
  const { name, amount } = req.body;
  const payment = new Payment({ name, amount });
  await payment.save();
  res.json({ message: 'Payment saved successfully!' });
});

// ✅ Reports
//app.get('/reports', async (req, res) => {
  //const payments = await Payment.find().sort({ date: -1 });
  //res.json(payments);
//});
app.get('/reports', async (req, res) => {
  try {
    const reports = await Report.find().sort({ date: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ message: "Server error fetching reports." });
  }
});


app.post('/vote/:id', async (req, res) => {
  const { type } = req.body; // 'red', 'yellow', 'green'
  const { id } = req.params;

  try {
    const report = await Report.findById(id);
    if (!report) return res.status(404).json({ message: "Report not found" });

    if (type === 'red') report.redVotes += 1;
    else if (type === 'yellow') report.yellowVotes += 1;
    else if (type === 'green') report.greenVotes += 1;

    await report.save();
    res.json({ message: "Vote counted" });
  } catch (err) {
    res.status(500).json({ message: "Server error voting." });
  }
});

// ✅ Customer Add
// app.post('/customer', async (req, res) => {
//   const { customerName, email, phone } = req.body;
//   const customer = new Customer({ customerName, email, phone });
//   await customer.save();
//   res.json({ message: 'Customer added successfully!' });
// });

// ✅ Get Customers

app.get('/getuser/:email', async (req, res) => {
  const email = req.params.email;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Submit a new report
app.post('/report', async (req, res) => {
  const { image, location, description } = req.body;

  try {
    const newReport = new Report({
      image,
      location,
      description
    });

    await newReport.save();
    res.json({ message: "Report submitted successfully." });
  } catch (err) {
    console.error("Error saving report:", err);
    res.status(500).json({ message: "Server error submitting report." });
  }
});


app.post('/recycling', upload.single('image'), async (req, res) => {
  const { wasteType, description, price } = req.body;

  try {
    const item = new Recycling({
      wasteType,
      description,
      price,
      image: `uploads/${req.file.filename}` // save relative path to file
    });
    await item.save();
    res.json({ message: "Recyclable item listed successfully." });
  } catch (err) {
    console.error("Error adding recycling item:", err);
    res.status(500).json({ message: "Failed to add item." });
  }
});

// ✅ Fetch all recycling listings (for recycle-feed.html)
app.get('/recycling', async (req, res) => {
  try {
    const listings = await Recycling.find().sort({ date: -1 });
    res.json(listings);
  } catch (err) {
    console.error("Error fetching listings:", err);
    res.status(500).json({ message: "Failed to fetch listings." });
  }
});


// ✅ Server Start
app.listen(3000, () => console.log("Server running on http://localhost:3000"));
